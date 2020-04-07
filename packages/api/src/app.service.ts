import { Injectable, Inject, Logger } from '@nestjs/common';
import {connect, Client} from 'mqtt'
import config from '@cmls/config'
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class AppService {

  mqtt: Client

  constructor(
    @Inject('WALLBOX_SERVICE') private wallboxClient: ClientProxy,
  ) {
    const { brokerUrl, password,port,host,username } = config.mqtt
    this.mqtt = connect(brokerUrl, {
      host,
      username,
      password,
      port,
      protocol: 'mqtt'
    })
    this.mqttListener()
  }

  getHello(): string {
    return 'Hello World!';
  }

  private mqttListener() {
    // Add all subscriptions
    this.mqtt.subscribe('energie/tankenLogin')
    this.mqtt.subscribe('energie/tankenInterrupt')

    // Reduce Messages
    this.mqtt.on('message', (topic, payload) => {
      const msg = payload.toString()
      
      switch(topic) {
        case 'energie/tankenLogin':
          return this.handleLogin(msg)
      }
    })
  }

  // Handle login
  private async handleLogin(msg: string) {
    let payload
    try {
      payload = JSON.parse(msg)
    } catch(error) {
      return error // send auth error 
    }

    /**
     * user: Untis kurzzeichen
     * serial: wallbox serial
     * rangeKW: maximale KW anzahl für ladevorgang; 0 unlimitiert
     * maxClientTime: maximale ladezeit in Minuten; 0 unlimitiert
     */
    const { user, serial, rangeKW, maxClientTime } = payload

    try {
      let res
      if (rangeKW && rangeKW > 0) {
        res = await this.wallboxClient.send({ cmd: 'tankenRange' }, { rangeKW, serial, user }).toPromise()
      } else if (maxClientTime && maxClientTime > 0) {
        res = await this.wallboxClient.send({ cmd: 'tankenTime' }, { maxClientTime, serial, user }).toPromise()
      } else {
        res = await this.wallboxClient.send({ cmd: 'tankenStart' }, { serial, user }).toPromise()
      }
      if (res && res.error) {
        await this.mqtt.publish('energie/error', JSON.stringify(res))
        throw res
      }
      
    } catch (error) {
      await this.mqtt.publish('energie/error', JSON.stringify(error))
      Logger.error(error)
    }
  }
}

