import mongoose, { Schema, Document } from "mongoose";
import { ITrip, TripStatus } from "@mtrx/shared";

export interface ITripDoc extends Omit<ITrip, "_id" | "orgId" | "busId" | "driverId" | "routeId" | "startTime" | "endTime" | "stopTimes" | "pausedAt">, Document {
  orgId: mongoose.Types.ObjectId;
  busId: mongoose.Types.ObjectId;
  driverId: mongoose.Types.ObjectId;
  routeId: mongoose.Types.ObjectId;
  startTime: Date;
  endTime?: Date;
  pausedAt?: Date;
  stopTimes?: Array<{
    stopName: string;
    scheduledMinutesFromStart?: number;
    actualMinutesFromStart?: number;
    status: "ON_TIME" | "DELAYED" | "EARLY";
    recordedAt?: Date;
  }>;
}

const TripSchema = new Schema(
  {
    orgId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    busId: { type: Schema.Types.ObjectId, ref: "Bus", required: true, index: true },
    driverId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    routeId: { type: Schema.Types.ObjectId, ref: "Route", required: true },
    status: {
      type: String,
      enum: Object.values(TripStatus),
      default: TripStatus.ACTIVE,
      index: true,
    },
    startTime: { type: Date, default: Date.now },
    endTime: { type: Date, default: null },
    pausedAt: { type: Date, default: null },
    startLat: { type: Number, default: 0 },
    startLng: { type: Number, default: 0 },
    endLat: { type: Number, default: 0 },
    endLng: { type: Number, default: 0 },
    livePassengerCount: { type: Number, default: 0 },
    distanceCoveredKm: { type: Number, default: 0 },
    averageSpeedKmh: { type: Number, default: 0 },
    onTimePercentage: { type: Number, default: 100 },
    odometerStart: { type: Number, default: null },
    odometerEnd: { type: Number, default: null },
    fuelLitersAdded: { type: Number, default: null },
    fuelCost: { type: Number, default: null },
    driverNotes: { type: String, default: "" },
    stopTimes: [
      {
        stopName: { type: String, required: true },
        scheduledMinutesFromStart: { type: Number, default: 0 },
        actualMinutesFromStart: { type: Number, default: 0 },
        status: { type: String, enum: ["ON_TIME", "DELAYED", "EARLY"], default: "ON_TIME" },
        recordedAt: { type: Date, default: Date.now },
      },
    ],
    isArchived: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

export const TripModel = mongoose.model<ITripDoc>("Trip", TripSchema);
