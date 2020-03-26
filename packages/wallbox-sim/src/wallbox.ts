import { Socket, createSocket, RemoteInfo } from "dgram";
import { timer, interval } from "rxjs";
import { takeUntil } from "rxjs/operators";

export default class Wallbox {
  public socket: Socket;
  private _timeStarted: number;

  private _state = {
    serial: "",
    State: 0,
    Plug: 0,
    enabled: 1,
    error1: 0,
    error2: 0,
    ePres: 0,
    U1: 0,
    U2: 0,
    U3: 0,
    I1: 0,
    I2: 0,
    I3: 0,
    P: 0
  };

  constructor(serial: string) {
    this.socket = createSocket("udp4");
    this._state.serial = serial;
    this._timeStarted = Date.now() / 1000;
  }

  /**
   * PRIVATE and Util Methods
   */
  private sendMessage(
    msg: { [key: string]: string | number } | string,
    rinfo: RemoteInfo
  ) {
    const payload = JSON.stringify(msg);
    const { address, port } = rinfo;
    this.socket.send(payload, port, address);
  }

  /**
   * Getters
   */
  get state() {
    return this._state;
  }
  get errors() {
    return [this._state.error1, this._state.error2];
  }
  get enabled() {
    return this._state.enabled;
  }

  get serial() {
    return this._state.serial;
  }

  get secondsActive() {
    return Date.now() / 1000 - this._timeStarted;
  }

  public startSocket() {
    this.socket.bind(7090);
    this.socket.on("listening", () => {});
    this.socket.on("message", (msg: any, rinfo: RemoteInfo) => {
      const recvPayload = msg.toString();
      const { address, port } = rinfo;
      switch (recvPayload) {
        case "report 1":
          return this.sendMessage(
            {
              ID: "1",
              Product: "KC-P30-ES240022-E0R",
              Serial: `${this.serial}`,
              Firmware: "P30 v 3.9.14 (180227-111537)",
              "COM-module": 0,
              Backend: 0,
              timeQ: 0,
              Sec: this.secondsActive
            },
            rinfo
          );
        case "report 2":
          return this.sendMessage(
            {
              ID: "2",
              State: this.state.State,
              Error1: this.errors[0],
              Error2: this.errors[1],
              Plug: this.state.Plug,
              AuthON: 0,
              Authreq: 0,
              "Enable sys": this._state.enabled,
              "Enable user": 1,
              "Max curr": 0,
              "Max curr %": 1000,
              "Curr HW": 0,
              "Curr user": 63000,
              "Curr FS": 0,
              "Tmo FS": 0,
              "Curr timer": 0,
              "Tmo CT": 0,
              Setenergy: 0,
              Output: 0,
              Input: 0,
              Serial: this.serial,
              Sec: this.secondsActive
            },
            rinfo
          );
        case "report 3":
          return this.sendMessage(
            {
              ID: 3,
              U1: this.state.U1,
              U2: this.state.U2,
              U3: this.state.U3,
              I1: this.state.I1,
              I2: this.state.I2,
              I3: this.state.I3,
              P: this.state.P,
              PF: 1,
              "E pres": this.state.ePres,
              "E total": this.state.ePres,
              Serial: this.serial,
              Sec: this.secondsActive
            },
            rinfo
          );
        case "ena 0":
          this._state.enabled = 0;
          // stop current session
          console.log(this._state);
          return this.sendMessage("TCH-OK :done", rinfo);
        case "ena 1":
          this._state.enabled = 1;

          this._state.State = this.state.Plug === 7 ? 3 : 1; // get state from plug
          if (this.state.State === 3) {
            this.startChargingSession();
          }

          return this.sendMessage("TCH-OK :done", rinfo);
        // Test Commands
        case "plugIn":
          this.setPlug(7);
          break;
        default:
          return this.sendMessage("TCH-OK :done", rinfo);
      }
    });
  }

  setPlug(number: number) {
    this._state.Plug = number;
    this._state.State = this.enabled ? 3 : 1;
  }

  sessionEnergyTimer: any = null;
  sessionCurrentTimer: any = null;
  public startChargingSession(startCurrent: number = 10) {
    console.log("Start charging session");
    const startedAt: number = Date.now();
    let tick = 0;
    let current = startCurrent;
    let currentPower = 0;
    this._state.ePres = 0;
    this._state.U1 = 230;
    this._state.U2 = 230;
    this._state.U3 = 230;
    this.sessionCurrentTimer = timer(0, 2000000).subscribe(() => {
      current = startCurrent - tick;
      tick = tick + 1;
      this._state.I1 = current;
      this._state.I2 = current;
      this._state.I3 = current;
      currentPower = Math.round(
        this._state.U1 * this._state.I1 * Math.sqrt(3) * 1000
      ); // Power in mW
      this._state.P = currentPower;
      if (current === 0) {
        this.sessionCurrentTimer.unsubscribe();
        this.sessionEnergyTimer.unsubscribe();
      }
    });
    // Calculate energy use in mWh
    this.sessionEnergyTimer = timer(0, 1000).subscribe(() => {
      let p = currentPower; // mW
      const timeDiff = Date.now() - startedAt; // ms
      let chargingTime = timeDiff / (1000 * 60 * 60); // ms / 1000ms / 60s / 60min => 1h
      this._state.ePres = Math.round(p * chargingTime);
      console.log(this._state.ePres + "mWh / " + currentPower + "mW");
    });
  }
  public stopChargingSession() {
    this.sessionCurrentTimer.unsubscribe();
    this.sessionEnergyTimer.unsubscribe();
  }
}

const wb = new Wallbox("179643");
wb.startSocket();
