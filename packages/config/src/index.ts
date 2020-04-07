export default {
    solar: {
        pollInterval: 5000
    },
    mqtt: {
        brokerUrl: 'https://docker.htl-wels.at',
        host: 'docker.htl-wels.at',
        port: 1883,
        username: 'energieHTL',
        password: 'NiceWeather'
    },
    wallbox: {
        pollInterval: 2500,
        clientPort: 7090,
        devices: [
            { address: '', port: 7090, serial: ''}
        ],

    }
}