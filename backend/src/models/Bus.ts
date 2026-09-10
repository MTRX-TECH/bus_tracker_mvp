import mongoose, { Schema, Document } from "mongoose";
import { IBus, BusStatus } from "@mtrx/shared";

export interface IBusDoc extends Omit<IBus, "_id" | "currentLocation">, Document {
  currentLocation?: {
    latitude: number;
    longitude: number;
    speed: number;
    heading: number;
    updatedAt: Date;
    location: {
      type: "Point";
      coordinates: [number, number]; // [longitude, latitude] for 2dsphere index
    };
  };
}

const BusSchema = new Schema(
  {
    orgId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    busNumber: { type: String, required: true, trim: true },
    registrationPlate: { type: String, required: true, trim: true, uppercase: true },
    capacity: { type: Number, required: true, default: 40 },
    currentDriverId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    assignedRouteId: { type: Schema.Types.ObjectId, ref: "Route", default: null },
    status: {
      type: String,
      enum: Object.values(BusStatus),
      default: BusStatus.IDLE,
      index: true,
    },
    qrCodeSecret: { type: String, required: true, unique: true, index: true },
    currentLocation: {
      latitude: { type: Number },
      longitude: { type: Number },
      speed: { type: Number, default: 0 },
      heading: { type: Number, default: 0 },
      updatedAt: { type: Date, default: Date.now },
      location: {
        type: { type: String, enum: ["Point"], default: "Point" },
        coordinates: { type: [Number], default: [0, 0] },
      },
    },
  },
  { timestamps: true }
);

// Add Geospatial Index for high performance proximity searches & geofence mapping
BusSchema.index({ "currentLocation.location": "2dsphere" });

export const BusModel = mongoose.model<IBusDoc>("Bus", BusSchema);
