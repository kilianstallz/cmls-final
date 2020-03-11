import { Injectable, Logger } from '@nestjs/common';
import { MqttClient, connect } from 'mqtt';

@Injectable()
export class MqttService {
  private _mqtt: MqttClient;

  constructor() {
    this._mqtt = connect('docker.htl-wels.at', {
      protocol: 'mqtt',
      host: 'docker.htl-wels.at',
      port: 1883,
      username: 'energieHTL',
      password: 'NiceWeather',
    });
    this._mqtt.on('error', error => {
      Logger.error(error.message, error.stack, 'MQTT Client');
    });
  }

  get mqttClient(): MqttClient {
    return this._mqtt;
  }
}
