declare const _default: {
    solar: {
        pollInterval: number;
    };
    mqtt: {
        brokerUrl: string;
        host: string;
        port: number;
        username: string;
        password: string;
    };
    wallbox: {
        pollInterval: number;
        clientPort: number;
        devices: {
            address: string;
            port: number;
            serial: string;
        }[];
    };
};
export default _default;
