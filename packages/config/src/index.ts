import { config } from 'dotenv'

export default () => {
    config()
    return {
    solar: {
        pollInterval: 5000
    },
    mqtt: {
        brokerUrl: 'https://docker.htl-wels.at',
        host: 'docker.htl-wels.at',
        port: 1883,
        username: process.env.MQTT_USER, // .env Muss in jedem Package vorhanden sein
        password: process.env.MQTT_PASSWORD // .env muss in jedem Package vorhanden sein
    },
    wallbox: {
        pollInterval: 2500,
        clientPort: 7090,
        devices: [
            { address: '', port: 7090, serial: ''}
        ],

    }
}}