import { Injectable, Logger } from '@nestjs/common';
import { Socket, createSocket } from 'dgram';
import { Interval } from '@nestjs/schedule';
import { IWallbox, IWallboxData, WallboxStatus } from '../types/wallbox.type';
import { from, of, Observable, Subject } from 'rxjs';
import { delay, concatMap, distinct, scan, concat } from 'rxjs/operators';
import { ConfigService } from '../config/config.service';
import { MqttService } from 'src/mqtt/mqtt.service';

@Injectable()
export class UdpService {
  private logger: Logger;
  private _socket: Socket;
  private devices: IWallbox[];
  private nrOfDevices: number;
  private statusMessages: string[];
  private currentDevice = 0;

  private isDebug = process.env.IS_DEBUG === 'true';

  constructor(private readonly mqttService: MqttService) {
    const { globalConfig } = ConfigService;
    this.nrOfDevices = globalConfig.wallboxes.length;
    this.statusMessages = globalConfig.wallboxStatusMessages;
    this.devices = globalConfig.wallboxes;
    this.logger = new Logger('UDP', true);
    const port = globalConfig.wallboxPort;
    this._socket = createSocket('udp4');
    this._socket.bind(port, () => {
      this.logger.log(`UDP Socket bound to port: ${port}`);
      this.Poller();
      this.mountMessageListener();
      this.publishInterval();
    });
  }

  get socket(): Socket {
    return this._socket;
  }

  get wallboxMap() {
    return this._wallboxMap;
  }

  public getWallbox(serial: string) {
    return this._wallboxMap[serial];
  }

  sendMessage({
    msg,
    address,
    port,
  }: {
    msg: string | Buffer;
    address?: string;
    port?: number;
  }): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this._socket) {
        reject('Socket nicht gestartet!');
      }
      console.log('Sending ', msg);
      this._socket.send(msg, port, address, error => {
        if (error) {
          return reject();
        }
        resolve();
      });
    });
  }

  public startWallbox(serial: string): Promise<void> {
    const msg = ConfigService.globalConfig.wallboxCommands.start;
    const address = this.wallboxMap[serial].address;
    const port = this.wallboxMap[serial].port;
    return this.sendMessage({ msg, port, address });
  }

  public stopWallbox(serial: string): Promise<void> {
    const msg = ConfigService.globalConfig.wallboxCommands.stop;
    const address = this.wallboxMap[serial].address;
    const port = this.wallboxMap[serial].port;
    return this.sendMessage({ msg, port, address });
  }

  public displayMessage(serial: string, message: string) {
    const msg = ConfigService.globalConfig.wallboxCommands.stop;
    const address = this.wallboxMap[serial].address;
    const port = this.wallboxMap[serial].port;
    return this.sendMessage({ msg: `display 0 0 0 0 ${msg}`, address, port });
  }

  private debugResponse(payload, rinfo) {
    switch (payload) {
      case 'report 3':
        setTimeout(() => {
          this.sendMessage({
            msg: JSON.stringify({
              ID: '3',
              U1: 0,
              U2: 0,
              U3: 0,
              I1: 0,
              I2: 0,
              I3: 0,
              P: 0,
              PF: 0,
              'E pres': 259256,
              'E total': 18772360,
              Serial: '19237584',
            }),
            port: rinfo.port,
            address: rinfo.address,
          });
        }, 130);
        break;
      case 'report 2':
        setTimeout(() => {
          this.sendMessage({
            msg: JSON.stringify({
              ID: '2',
              State: 1,
              Error1: 0,
              Error2: 0,
              Plug: 0,
              AuthON: 0,
              Authreq: 0,
              'Enable sys': 1,
              'Enable user': 1,
              'Max curr': 0,
              'Max curr %': 1000,
              'Curr HW': 0,
              'Curr user': 63000,
              'Curr FS': 0,
              'Tmo FS': 0,
              'Curr timer': 0,
              'Tmo CT': 0,
              Setenergy: 0,
              Output: 0,
              Input: 0,
              Serial: '19237584',
              Sec: 2437337,
            }),
            port: rinfo.port,
            address: rinfo.address,
          });
        }, 150);
        break;
    }
  }

  /**
   * Emits the updated device Map when device data has changed
   */
  public wallboxStateChange$: Observable<IWallboxData>;

  private mountMessageListener() {
    /**
     * [START] State Change Detector
     */
    const sub = new Subject(); // Subject to subscribe
    this.wallboxStateChange$ = sub.pipe(
      scan((acc, cur: any) => {
        return { ...this._wallboxMap[cur.serial], ...cur };
      }), // Scan merges the before and the after value
      concat(
        // Only emits a new value when one of those values change
        distinct((e: IWallboxData) => e.secondsActive), // COMMENT OUT IN ACTIVE USE
        distinct((e: IWallboxData) => e.sessionEnergy),
        distinct((e: IWallboxData) => e.state),
        distinct((e: IWallboxData) => e.context.Error1),
        distinct((e: IWallboxData) => e.context.Error2),
        distinct((e: IWallboxData) => e.context.plug),
        distinct((e: IWallboxData) => e.isEnabled),
      ),
    );
    this.wallboxStateChange$.subscribe(n => {
      this._wallboxMap[n.serial] = n;
      this.logger.log(`${n.serial} has changed!`);
    });

    this._socket.on('message', (buff, rinfo) => {
      const payload = buff.toString();
      if (!payload.startsWith('{')) {
        if (this.isDebug) {
          this.debugResponse(payload, rinfo);
        }
        return;
      }
      const data = JSON.parse(payload);
      let format = {};
      switch (data.ID) {
        case '1':
          break;
        case '2':
          console.log('Report 2');
          format = this.processReport2(data);
          sub.next(format);
          break;
        case '3':
          console.log('Report 3');
          format = this.processReport3(data);
          sub.next(format);
          break;
      }
    });
  }

  // WALLBOX LOCAL MAP
  private _wallboxMap: { [key: string]: IWallboxData } = {};

  /**
   * Process Respone logic
   */
  private computeState(state, plug): WallboxStatus {
    // TODO: Compute State
    console.log(state, plug);
    if (state === 1) {
      return WallboxStatus.isUnplugged;
    } else if (state === 2) {
      return WallboxStatus.isPlugged;
    } else if (state === 3) {
      return WallboxStatus.isCharging;
    } else if (state === 4) {
      return WallboxStatus.isError;
    }
    return WallboxStatus.isUnplugged;
  }
  private processReport2(data: any) {
    const serial = data.Serial as string;
    const formatted = {
      serial,
      state: this.computeState(data.State, data.Plug),
      //   error: this.computeError(data.Error1, data.Error2) as string,
      isEnabled: data['Enable sys'] == 1 ? true : false,
      maxCurrentHW: data['Curr HW'] as number,
      context: {
        Error1: data.Error1,
        Error2: data.Error2,
        plug: data.Plug,
        state: data.State,
      },
      secondsActive: data.Sec,
    } as IWallboxData;
    return formatted;
  }

  private processReport3(data: any) {
    const serial = data.Serial;
    const { U1, U2, U3, I1, I2, I3, P, PF } = data;
    const sessionEnergy = data['E pres'];
    const formatted = {
      serial,
      U1,
      U2,
      U3,
      I1,
      I2,
      I3,
      P,
      secondsActive: data.Sec,
      PF,
      sessionEnergy,
    } as IWallboxData;
    return formatted;
  }

  // [END] Process Response Logic

  /**
   * Poller Intervall
   */
  @Interval(ConfigService.globalConfig.devicePollingInterval)
  private async Poller() {
    // Load device data
    const { address, port, transport } = this.devices[this.currentDevice];
    // only do udp poll on udp devices
    if (transport !== 'udp') {
      return;
    }
    this.logger.log(`${address}: POLLING`);
    from(this.statusMessages) // get status messages
      .pipe(
        concatMap(device => {
          return of(device) // observable of each array element
            .pipe(delay(ConfigService.globalConfig.messageDelayInterval)) // delay the message
            .pipe(
              concatMap(msg => {
                // concat to send message
                return this.sendMessage({ msg, address, port })
                  .then(() => msg) // return the message to the observer
                  .catch(error => {
                    throw new Error(error); // Throw error in observable
                  });
              }),
            );
        }),
      )
      .subscribe(
        val => this.logger.log(`Message sent: ${val}`),
        this.logger.error, // Log Sending error
      );
    this.currentDevice++; // Go to next device after poll
    if (this.currentDevice >= this.nrOfDevices) {
      this.currentDevice = 0; // go back to first device after all devices have been looped over
    }
  }

  /**
   * Publish Map Interval
   */
  @Interval(4000)
  publishInterval() {
    // DO not publish emptry objects
    if (Object.keys(this._wallboxMap).length !== 0) {
      this.mqttService.sendMessageToTopic(
        'energie/wallboxData',
        JSON.stringify(this._wallboxMap),
      );
    }
  }
}
