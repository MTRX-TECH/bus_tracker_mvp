import mongoose, { Schema, Document } from "mongoose";
import { IOrganization } from "@mtrx/shared";

export interface IOrganizationDoc extends Omit<IOrganization, "_id">, Document {}

const OrganizationSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    email: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    address: { type: String, default: "" },
    isActive: { type: Boolean, default: true, index: true },
    subscriptionPlan: { type: String, enum: ["FREE_TIER", "ENTERPRISE"], default: "FREE_TIER" },
    plan: { type: String, enum: ["basic", "standard", "premium"], default: "basic" },
    busLimit: { type: Number, default: 15 },
    adminLimit: { type: Number, default: 2 },
    additionalBusesPurchased: { type: Number, default: 0 },
    retentionPeriodDays: { type: Number, default: 60 },
    brandingLogoUrl: { type: String, default: "" },
    brandingPrimaryColor: { type: String, default: "#D4AF37" },
    brandingHeaderText: { type: String, default: "RIT Campus Transit Engine" },
  },
  { timestamps: true }
);

export const OrganizationModel = mongoose.model<IOrganizationDoc>("Organization", OrganizationSchema);
