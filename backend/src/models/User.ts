import mongoose, { Schema, Document } from "mongoose";
import { IUser, UserRole } from "@mtrx/shared";

export interface IUserDoc extends Omit<IUser, "_id" | "assignedBusId" | "assignedRouteId" | "consentTimestamp">, Document {
  assignedBusId?: mongoose.Types.ObjectId;
  assignedRouteId?: mongoose.Types.ObjectId;
  consentTimestamp?: Date | string;
  passwordHash: string;
  refreshTokens: string[];
  failedLoginAttempts: number;
  lockUntil?: Date;
  mustChangePassword?: boolean;
}

const UserSchema = new Schema(
  {
    orgId: { type: Schema.Types.ObjectId, ref: "Organization", default: null, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    phone: { type: String, default: "" },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.STUDENT,
      index: true,
    },
    isOnline: { type: Boolean, default: false },
    assignedBusId: { type: Schema.Types.ObjectId, ref: "Bus", default: null },
    assignedRouteId: { type: Schema.Types.ObjectId, ref: "Route", default: null },
    shiftType: { type: String, enum: ["MORNING", "EVENING", "FULL_DAY", "FLEX"], default: "FULL_DAY" },
    shiftStart: { type: String, default: "06:00 AM" },
    shiftEnd: { type: String, default: "06:00 PM" },
    favoriteBusIds: [{ type: Schema.Types.ObjectId, ref: "Bus" }],
    hasConsentedToLocationTracking: { type: Boolean, default: false },
    consentTimestamp: { type: Date, default: null },
    avatarUrl: { type: String, default: "" },
    refreshTokens: [{ type: String }],
    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },
    mustChangePassword: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const UserModel = mongoose.model<IUserDoc>("User", UserSchema);
