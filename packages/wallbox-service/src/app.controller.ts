import { Controller, Get, Logger, Inject } from '@nestjs/common';
import { AppService } from './app.service';
import { MessagePattern } from '@nestjs/microservices';
import { IWallboxData, WallboxStatus } from './types/wallbox.type';
import { UdpService } from './udp/udp.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly udpService: UdpService
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @MessagePattern({ cmd: 'tankenRange' })
  async tankenRange(data: { rangeKW: number, serial: string, user: string }) {
    Logger.log('Tanken Range', 'LOGIN')
    const wallbox = this.udpService.getWallbox(data.serial)
    if (!wallbox) {
      return { error: 'NOT_FOUND' }
    }
    if (wallbox.user) {
      return { error: 'TAKEN' }
    }
    this.udpService.setUser(data.serial, data.user)
    await this.udpService.setRange(data.serial, data.rangeKW)
    await this.udpService.startWallbox(data.serial)
    return {
      error: '',
      message: 'OK'
    } 
  }

  @MessagePattern({ cmd: 'tankenTime' })
  async tankenTime(data: { maxClientTime: number, serial: string, user: string }) {
    Logger.log('Tanken Time', 'LOGIN')
    const wallbox = this.udpService.getWallbox(data.serial)
    if (!wallbox) {
      return { error: 'NOT_FOUND' }
    }
    if (wallbox.user) {
      return { error: 'TAKEN' }
    }
    this.udpService.setUser(data.serial, data.user)
    await this.udpService.setCurrTime(data.serial, data.maxClientTime)
    await this.udpService.startWallbox(data.serial)
    return {
      error: '',
      message: 'OK'
    } 
  }

  @MessagePattern({ cmd: 'tankenStart' })
  async tankenStart(data) {
    Logger.log('Tanken Full', 'LOGIN')
    const wallbox = this.udpService.getWallbox(data.serial)
    if (!wallbox) {
      return { error: 'NOT_FOUND' }
    }
    if (wallbox.user) {
      return { error: 'TAKEN' }
    }
    this.udpService.setUser(data.serial, data.user)
    await this.udpService.startWallbox(data.serial)
    return {
      error: '',
      message: 'OK'
    } 
  }

  @MessagePattern({ cmd: 'tankenStop' })
  async tankenStop(data: { serial: string, user: string }) {
    const wb = this.udpService.getWallbox(data.serial)
    if (!wb) {
      return { error: 'NOT_FOUND' }
    }
    this.udpService.setUser(data.serial)
    await this.udpService.stopWallbox(data.serial)
  }
}
