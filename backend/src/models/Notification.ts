import mongoose, { Schema, Document } from "mongoose";
import { INotification, UserRole } from "@mtrx/shared";

export interface INotificationDoc extends Omit<INotification, "_id" | "orgId" | "createdAt">, Document {
  orgId?: mongoose.Types.ObjectId;
  createdAt: Date;
}

const NotificationSchema = new Schema(
  {
    orgId: { type: Schema.Types.ObjectId, ref: "Organization", index: true },
    recipientRole: { type: String, enum: Object.values(UserRole) },
    recipientId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, required: true, default: "INFO", index: true },
    read: { type: Boolean, default: false },
    isRead: { type: Boolean, default: false },
    meta: {
      tripId: { type: Schema.Types.ObjectId, ref: "Trip" },
      busId: { type: Schema.Types.ObjectId, ref: "Bus" },
      driverId: { type: Schema.Types.ObjectId, ref: "User" },
      latitude: { type: Number },
      longitude: { type: Number },
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const NotificationModel = mongoose.model<INotificationDoc>("Notification", NotificationSchema);
