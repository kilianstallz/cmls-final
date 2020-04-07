export interface IWallbox {
  address: string;
  port: number;
  serial: string
}

export interface IWallboxData {
  serial: string;
  user?: string
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
  remainingEnergy?: number
  state?: WallboxStatus;
  isEnabled?: boolean;
  maxCurrentHW?: number;
  secondsActive?: number;
  errors?: {
    error1?: number
    error2?: number
  }
}

export enum WallboxStatus {
  isUnplugged,
  isPlugged,
  isCharging,
  isError,
}
