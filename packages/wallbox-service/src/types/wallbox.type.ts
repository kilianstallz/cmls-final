export interface IWallbox {
  address: string;
  port: number;
  transport: string;
}

export interface IWallboxData {
  serial: string;
  address: string;
  port: number;
  U1?: number;
  U2?: number;
  U3?: number;
  I1?: number;
  I2?: number;
  I3?: number;
  P?: number;
  PF?: number;
  sessionEnergy?: number;
  state?: WallboxStatus;
  isEnabled?: boolean;
  maxCurrentHW?: number;
  secondsActive?: number;
  context?: {
    state: number;
    plug: number;
    Error1: number;
    Error2: number;
  };
}

export enum WallboxStatus {
  isUnplugged,
  isPlugged,
  isCharging,
  isError,
}
