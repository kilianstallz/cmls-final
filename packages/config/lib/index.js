"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var dotenv_1 = require("dotenv");
exports.default = (function () {
    dotenv_1.config({
        path: 'C:\Users\Kilian\Documents\Diplomarbeit\final\packages\config\.env'
    });
    return {
        solar: {
            pollInterval: 5000
        },
        mqtt: {
            brokerUrl: 'https://docker.htl-wels.at',
            host: 'docker.htl-wels.at',
            port: 1883,
            username: process.env.MQTT_USER,
            password: process.env.MQTT_PASSWORD
        },
        wallbox: {
            pollInterval: 2500,
            clientPort: 7090,
            devices: [
                { address: '', port: 7090, serial: '' }
            ],
        }
    };
});
