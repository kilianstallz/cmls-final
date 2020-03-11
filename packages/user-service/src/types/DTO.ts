interface BaseDTO {
  user: string;
  serial: number;
  currTime: number;
}

export interface TankenLoginDTO extends BaseDTO {
  maxKW: number;
  maxTime: number;
}

export interface TankenInterruptDTO extends BaseDTO {}

export interface TankenStoppDTO extends BaseDTO {
  sessionEnergy: number;
  sessionTime: number;
}
