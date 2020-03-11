import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { MessagePattern } from '@nestjs/microservices';
import { IWallboxData, WallboxStatus } from './types/wallbox.type';
import { UdpService } from './udp/udp.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly udpService: UdpService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  /**
   * Returns if the wallbox is free to use and free of errors
   */
  @MessagePattern({ cmd: 'tankenLogin' })
  handleTankenLogin(data: any) {
    const map = this.udpService.wallboxMap[data.serial];
    if (!map) {
      return { error: true, message: 'Device not found', code: 'NOT_FOUND' };
    }
    if (
      map.state === WallboxStatus.isCharging ||
      map.state === WallboxStatus.isPlugged
    ) {
      return {
        error: true,
        message: 'Device in use',
        code: 'IN_USE',
      };
    }
    return {
      error: false,
    };
  }

  @MessagePattern({ cmd: 'tankenStart' })
  tankStart(data: any) {
    console.log(
      `Tanken start on ${data.serial} for ${data.limit.value} ${data.limit.type}`,
    );
    this.startWallbox(data.serial);
    return data;
  }

  @MessagePattern({ cmd: 'getFullMap' })
  getFullMap(): { [key: string]: IWallboxData } {
    return this.udpService.wallboxMap;
  }

  @MessagePattern({ cmd: 'getDeviceMap' })
  getDeviceMap(serial: string) {
    return this.udpService.getWallbox(serial);
  }

  @MessagePattern({ cmd: 'stopWallbox' })
  stopWallbox(serial: string) {
    return this.udpService.stopWallbox(serial);
  }

  @MessagePattern({ cmd: 'startWallbox' })
  startWallbox(serial: string) {
    return this.udpService.startWallbox(serial);
  }
}
