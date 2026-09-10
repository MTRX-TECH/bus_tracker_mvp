import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "./auth";
import { OrganizationModel } from "../models/Organization";
import { BusModel } from "../models/Bus";
import { UserModel } from "../models/User";
import { ForbiddenError, NotFoundError, BadRequestError } from "../utils/errors";
import { UserRole } from "@mtrx/shared";

export const enforceBusLimit = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const targetOrgId = req.user?.role === UserRole.SUPER_ADMIN ? (req.body.orgId || req.user?.orgId) : req.user?.orgId;

    if (!targetOrgId) {
      throw new BadRequestError("Organization ID required to enforce bus quota.");
    }

    const org = await OrganizationModel.findById(targetOrgId);
    if (!org) {
      throw new NotFoundError("Organization not found.");
    }

    // Default basic limits if undefined
    const busLimit = org.busLimit !== undefined ? org.busLimit : 15;
    const additional = org.additionalBusesPurchased !== undefined ? org.additionalBusesPurchased : 0;
    const maxAllowedBuses = busLimit + additional;

    const currentBusCount = await BusModel.countDocuments({ orgId: org._id });
    if (currentBusCount >= maxAllowedBuses) {
      throw new ForbiddenError(
        `PLAN_LIMIT_REACHED: Your current subscription plan (${(org.plan || "basic").toUpperCase()}) allows a maximum of ${maxAllowedBuses} buses. Please contact Super Admin to upgrade your plan or allocate additional buses.`
      );
    }

    next();
  } catch (error) {
    next(error);
  }
};

export const enforceAdminLimit = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Only enforce if creating a user account with ORG_ADMIN role
    const { role, orgId } = req.body;
    if (role !== UserRole.ORG_ADMIN && req.path !== "/orgs") {
      return next();
    }

    const targetOrgId = req.params.orgId || orgId || req.user?.orgId;
    if (!targetOrgId) {
      return next();
    }

    const org = await OrganizationModel.findById(targetOrgId);
    if (!org) {
      throw new NotFoundError("Organization not found.");
    }

    const adminLimit = org.adminLimit !== undefined ? org.adminLimit : 2;
    const currentAdminCount = await UserModel.countDocuments({ orgId: org._id, role: UserRole.ORG_ADMIN });

    if (currentAdminCount >= adminLimit) {
      throw new ForbiddenError(
        `PLAN_LIMIT_REACHED: Your current subscription plan (${(org.plan || "basic").toUpperCase()}) allows a maximum of ${adminLimit} Admin accounts. Please upgrade your plan for higher administrative seating.`
      );
    }

    next();
  } catch (error) {
    next(error);
  }
};
