import { Injectable } from '@nestjs/common';
import { IWallbox } from '../types/wallbox.type';

@Injectable()
export class ConfigService {
  static isDebug = false;

  static globalConfig = {
    wallboxPort: 7090,
    devicePollingInterval: 2000,
    messageDelayInterval: 500,
    wallboxes: ConfigService.isDebug
      ? ([{ address: '127.0.0.1', port: 7090, transport: 'udp' }] as IWallbox[])
      : ([
          { address: '172.17.68.81', port: 7090, transport: 'udp' },
          { address: '172.17.68.83', port: 7090, transport: 'udp' },
        ] as IWallbox[]),
    wallboxStatusMessages: ['report 1', 'report 2', 'report 3'],
    wallboxCommands: {
      start: 'ena 1',
      stop: 'ena 0',
    },
  };
}
