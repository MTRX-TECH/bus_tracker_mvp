import mongoose, { Schema, Document } from "mongoose";
import { UserRole } from "@mtrx/shared";

export interface IAuditLogDoc extends Document {
  userId?: mongoose.Types.ObjectId;
  userRole?: UserRole;
  orgId?: mongoose.Types.ObjectId;
  action: string;
  details: string;
  ipAddress?: string;
  createdAt: Date;
}

const AuditLogSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    userRole: { type: String, enum: Object.values(UserRole), default: null },
    orgId: { type: Schema.Types.ObjectId, ref: "Organization", default: null, index: true },
    action: { type: String, required: true, index: true },
    details: { type: String, default: "" },
    ipAddress: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

// Retain audit logs for 120 days on free tier
AuditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 120 });

export const AuditLogModel = mongoose.model<IAuditLogDoc>("AuditLog", AuditLogSchema);
