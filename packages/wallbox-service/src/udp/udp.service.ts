import { Injectable, Logger } from '@nestjs/common';
import { Socket, createSocket, RemoteInfo } from 'dgram';
import { Interval } from '@nestjs/schedule';
import { IWallbox, IWallboxData, WallboxStatus } from '../types/wallbox.type';
import { from, of, Observable, Subject } from 'rxjs';
import { delay, concatMap, distinct, scan, concat } from 'rxjs/operators';
import { MqttService } from 'src/mqtt/mqtt.service';
import config from '@cmls/config'

@Injectable()
export class UdpService {
  private logger: Logger;
  private socket: Socket;
  private devices: IWallbox[];
  private nrOfDevices: number;
  private currentDevice = 0;

  private isDebug = process.env.IS_DEBUG === 'true';

  constructor(private readonly mqttService: MqttService) {
    const { wallbox } = config();
    this.nrOfDevices = wallbox.devices.length;
    this.devices = wallbox.devices;

    this.logger = new Logger('UDP', true);

    const port = wallbox.clientPort
    this.socket = createSocket('udp4');

    this.socket.bind(port, () => {
      this.logger.log(`UDP Socket bound to port: ${port}`);

      // Initialize Wallbox-Data
      wallbox.devices.forEach(v => {
        this.wallboxMap[v.serial] = { address: v.address, port: v.port, serial: v.serial }
      })

      this.Poller();
      this.mountMessageListener();
      this.publishInterval();
    });
  }

  public getWallbox(serial: string) {
    return this.wallboxMap[serial];
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
      if (!this.socket) {
        reject('Socket nicht gestartet!');
      }
      console.log('Sending ', msg);
      this.socket.send(msg, port, address, error => {
        if (error) {
          return reject();
        }
        resolve();
      });
    });
  }

  public startWallbox(serial: string): Promise<void> {
    const msg = 'ena 1';
    const address = this.wallboxMap[serial].address;
    const port = 7090;
    return this.sendMessage({ msg, port, address });
  }

  public async stopWallbox(serial: string): Promise<boolean> {
    const msg = 'ena 0';
    const address = this.wallboxMap[serial].address;
    const port = 7090;
    await this.sendMessage({ msg, port, address });
    return true;
  }

  public displayMessage(serial: string, message: string) {
    const address = this.wallboxMap[serial].address;
    const port = this.wallboxMap[serial].port;
    return this.sendMessage({ msg: `display 0 0 0 0 ${message}`, address, port });
  }

  public setUser(serial: string, user: string | null = null) {
    this.wallboxMap[serial].user = user
  }

  public async setRange(serial: string, range: number) {
    const wb = this.getWallbox(serial)
    await this.sendMessage({
      msg: `setenergy ${range*1000*10}`, // in 0,1Wh
      address: wb.address,
      port: wb.port
    })
  }

  public async setCurrTime(serial: string, time: number) {
    const wb = this.getWallbox(serial)
    await this.sendMessage({
      msg: `currtime 0 ${time*60}`, // in sekunden
      address: wb.address,
      port: wb.port
    })
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
        return { ...this.wallboxMap[cur.serial], ...cur };
      }), // Scan merges the before and the after value
      concat(
        // Only emits a new value when one of those values change
        distinct((e: IWallboxData) => e.secondsActive), // COMMENT OUT IN ACTIVE USE
        distinct((e: IWallboxData) => e.sessionEnergy),
        distinct((e: IWallboxData) => e.state),
        distinct((e: IWallboxData) => e.isEnabled),
      ),
    );
    this.wallboxStateChange$.subscribe(n => {
      this.wallboxMap[n.serial] = n;
      this.logger.log(`${n.serial} has changed!`);
    });

    this.socket.on('message', (buff, rinfo) => {
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
          format = this.processReport2(data, rinfo);
          sub.next(format);
          break;
        case '3':
          format = this.processReport3(data, rinfo);
          sub.next(format);
          break;
      }
    });
  }

  /**
   * Wallbox Map aller Wallboxen
   */
  wallboxMap: { [key: string]: IWallboxData } = {};

  /**
   * Compute & Reducer Functions --------------------------------------------
   */

  /**
   * Process Respone logic
   */
  private computeState(state, plug): WallboxStatus {
    // TODO: Compute State
    if (state === 1 && plug === 0) {
      return WallboxStatus.isUnplugged;
    } else if (state === 2) {
      return WallboxStatus.isPlugged;
    } else if (state === 3 && plug === 7) {
      return WallboxStatus.isCharging;
    } else if (state === 4) {
      return WallboxStatus.isError;
    }
    return WallboxStatus.isError;
  }

  private processReport2(data: any, rinfo: RemoteInfo) {
    const serial = data.Serial as string;
    const formatted = {
      serial,
      address: rinfo.address,
      port: rinfo.port,
      state: this.computeState(data.State, data.Plug),
      //   error: this.computeError(data.Error1, data.Error2) as string,
      isEnabled: data['Enable sys'] === 1 ? true : false,
      remainingEnergy: data.Setenergy,
      maxCurrentHW: data['Curr HW'] as number,
      errors: {
        error1: data.Error1,
        error2: data.Error2,
      },
      secondsActive: data.Sec,
    } as IWallboxData;
    return formatted;
  }

  private processReport3(data: any, rinfo: RemoteInfo) {
    const serial = data.Serial;
    const { U1, U2, U3, I1, I2, I3, P, PF } = data;
    const sessionEnergy = data['E pres'];
    const formatted = {
      address: rinfo.address,
      port: rinfo.port,
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

  // [END] Compute & Reducer Functions

  /**
   * Poller Intervall
   */
  @Interval(config().wallbox.pollInterval)
  private async Poller() {
    // Load device data
    const { address, port  } = this.devices[this.currentDevice];
    this.logger.log(`${address}: POLLING`);
    from(['report 2', 'report 3']) // get status messages
      .pipe(
        concatMap(device => {
          return of(device) // observable of each array element
            .pipe(delay(200)) // delay the message
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
    if (Object.keys(this.wallboxMap).length !== 0) {
      this.mqttService.sendMessageToTopic(
        'energie/wallboxData',
        JSON.stringify(this.wallboxMap),
      );
    }
  }
}
