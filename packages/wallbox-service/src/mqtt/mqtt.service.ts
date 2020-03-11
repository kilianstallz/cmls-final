import { Injectable } from '@nestjs/common';
import { MqttClient, connect } from 'mqtt';

@Injectable()
export class MqttService {
  private _mqtt: MqttClient;

  constructor() {
    this._mqtt = connect('docker.htl-wels.at', {
      protocol: 'mqtt',
      host: 'docker.htl-wels.at',
      port: 1883,
      password: 'NiceWeather',
      username: 'energieHTL',
    });
  }

  public sendMessageToTopic(topic: string, message: string) {
    this._mqtt.publish(topic, message);
  }

  get mqtt() {
    return this._mqtt;
  }
}
