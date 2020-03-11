import { Document, Schema } from 'mongoose';

export interface IChargingSession extends Document {
  userId: string;
  startedAt: Date;
  sessionEnded: boolean;
  sessionEnergy: number;
}

export const ChargingSessionSchema = new Schema({
  userId: String,
  startedAt: Date,
  sessionEnded: Boolean,
  sessionEnergy: Number,
});
