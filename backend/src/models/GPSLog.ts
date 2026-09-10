import mongoose, { Schema, Document } from "mongoose";
import { IGPSLog } from "@mtrx/shared";

export interface IGPSLogDoc extends Omit<IGPSLog, "_id">, Document {}

const GPSLogSchema = new Schema(
  {
    tripId: { type: Schema.Types.ObjectId, ref: "Trip", required: true, index: true },
    busId: { type: Schema.Types.ObjectId, ref: "Bus", required: true, index: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    speed: { type: Number, default: 0 },
    heading: { type: Number, default: 0 },
    accuracy: { type: Number, default: 10 },
    timestamp: { type: Date, default: Date.now },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

// TTL index to automatically prune historical raw GPS logs after 60 days on Free Tier Atlas to never exhaust free space
GPSLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 60 });

export const GPSLogModel = mongoose.model<IGPSLogDoc>("GPSLog", GPSLogSchema);
