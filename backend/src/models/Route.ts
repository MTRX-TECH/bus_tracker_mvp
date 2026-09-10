import mongoose, { Schema, Document } from "mongoose";
import { IRoute } from "@mtrx/shared";

export interface IRouteDoc extends Omit<IRoute, "_id">, Document {}

const StopSubSchema = new Schema({
  name: { type: String, required: true },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  radiusMeters: { type: Number, default: 300 },
  arrivalTimeEstimate: { type: String, default: "" },
  order: { type: Number, default: 1 },
  scheduledMinutesFromStart: { type: Number, default: 0 },
});

const RouteSchema = new Schema(
  {
    orgId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    name: { type: String, required: true, trim: true },
    routeCode: { type: String, required: true, uppercase: true, trim: true },
    description: { type: String, default: "" },
    stops: [StopSubSchema],
    polyline: { type: [[Number]], default: [] }, // Array of [lat, lng]
    totalDistanceKm: { type: Number, default: 0 },
    estimatedDurationMins: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const RouteModel = mongoose.model<IRouteDoc>("Route", RouteSchema);
