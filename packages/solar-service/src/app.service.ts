import { Injectable, Logger } from '@nestjs/common';
// @ts-ignore
import * as modbus from 'jsmodbus'
import { Socket } from 'net'
import { connect, Client } from 'mqtt'
import config from '@cmls/config'
import { Interval } from '@nestjs/schedule';

@Injectable()
export class AppService {

  private socket: Socket
  private modbusClient: any
  private devices: {address: string, port: number}[]
  private mqtt: Client

  public currentProduction = 0
  public dayProduction: bigint

  constructor() {
    this.mqtt = connect(config.mqtt.brokerUrl, {
      host: config.mqtt.host,
      port: config.mqtt.port,
      password: config.mqtt.password,
      username: config.mqtt.username,
      protocol: 'mqtt'
    })
    this.socket = new Socket()
    this.modbusClient = new modbus.client.TCP(this.socket)
  }

  
  readHoldingRegisters(from: number, size: number): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      this.modbusClient.readHoldingRegisters(from, size)
        .then(v => resolve(v.response.body.valueAsBuffer))
        .catch(error => reject(error))
    })
  }

  @Interval(config.solar.pollInterval)
  getCurrentProduction(): Promise<void> {
    return this.readHoldingRegisters(499, 2)
      .then((v: Buffer) => v.readInt32BE(0))
      .then(val => {
        this.currentProduction = val
        this.mqtt.publish('solarCurrent', val.toString())
      })
      .catch(error => {
        Logger.error(error)
      })
  }

  @Interval(config.solar.pollInterval)
  getDayProduction(): Promise<void> {
    return this.readHoldingRegisters(499, 2)
      .then((v: Buffer) => v.readBigInt64BE(0))
      .then(val => {
        this.dayProduction = val
        this.mqtt.publish('solarDay', val.toString())
      })
      .catch(error => {
        Logger.error(error)
      })
  }
}
