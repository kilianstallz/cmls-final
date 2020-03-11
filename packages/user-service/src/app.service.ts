import { Injectable, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { MqttService } from './mqtt/mqtt.service';
import { TankenLoginDTO } from './types/DTO';

@Injectable()
export class AppService {
  constructor(
    @Inject('WALLBOX_SERVICE') private readonly wallboxService: ClientProxy,
    private readonly mqttService: MqttService,
  ) {
    this.mountMqttListeners();
  }

  private mountMqttListeners() {
    this.mqttService.mqttClient.subscribe('energie/tankenLogin');
    this.mqttService.mqttClient.subscribe('energie/tankenInterrupt');

    this.mqttService.mqttClient.on('message', (topic, buff) => {
      const payload = buff.toString();
      const data = JSON.parse(payload);
      switch (topic) {
        case 'energie/tankenLogin':
          this.handleLogin(data as TankenLoginDTO);
          break;
        case 'energie/tankenInterrupt':
          this.handleInterrupt(data);
          break;
      }
    });
  }

  async handleLogin(data: TankenLoginDTO) {
    const user = data.user;
    const wallboxSerial = data.serial;
    const timeLimit = data.maxTime;
    const energyLimit = data.maxKW;
    const primaryLimit = {
      value:
        timeLimit && energyLimit
          ? timeLimit
          : timeLimit
          ? timeLimit
          : energyLimit
          ? energyLimit
          : null,
      type:
        timeLimit && energyLimit
          ? 'seconds'
          : timeLimit
          ? 'seconds'
          : energyLimit
          ? 'Wh'
          : null,
    };
    // Get the max value
    // Store the session in instance
    // Store the session on db
    console.log(
      `User ${user} requests login on Wallbox: ${wallboxSerial} for ${primaryLimit.value} ${primaryLimit.type}.`,
    );
    const res = await this.wallboxService
      .send({ cmd: 'tankenLogin' }, { serial: wallboxSerial })
      .toPromise();
    if (!res.error) {
      await this.wallboxService
        .send(
          { cmd: 'tankenStart' },
          { serial: wallboxSerial, limit: primaryLimit },
        )
        .toPromise();
    }
  }

  async handleInterrupt(data) {
    const res = await this.wallboxService
      .send({ cmd: 'stopWallbox' }, { serial: data.serial })
      .toPromise();
    console.log(res);
  }

  getHello(): string {
    return 'Hello World!';
  }
}
