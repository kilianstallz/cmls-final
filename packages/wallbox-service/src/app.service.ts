import { Injectable, Logger } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { UdpService } from './udp/udp.service';
import { Interval } from '@nestjs/schedule';
import { WallboxStatus } from './types/wallbox.type';

@Injectable()
export class AppService {

  constructor(
    private readonly udpService: UdpService
  ) {}

  getHello(): string {
    return 'Hello World!';
  }

  // Deactivate Unplugged wallboxes; check every 2 minutes
  @Interval(2*60*1000)
  async deactivateUnused() {
    const map = this.udpService.wallboxMap
    const devices = Object.keys(map)
    for(let i = devices.length; i--;) {
      const device = map[devices[i]]
      if (device.user && device.state !== WallboxStatus.isCharging) {
        this.udpService.setUser(device.serial)
        this.udpService.stopWallbox(device.serial)
      }
    }
  }

}
