import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { OrganizationModel } from "../models/Organization";
import { UserModel } from "../models/User";
import { BusModel } from "../models/Bus";
import { RouteModel } from "../models/Route";
import { TripModel } from "../models/Trip";
import { GPSLogModel } from "../models/GPSLog";
import { AuditLogModel } from "../models/AuditLog";
import { NotFoundError, BadRequestError } from "../utils/errors";
import { UserRole } from "@mtrx/shared";
import bcrypt from "bcryptjs";

export class OrgController {
  // Super Admin: View all organizations & demo colleges
  static async getAllOrganizations(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgs = await OrganizationModel.find().sort({ createdAt: -1 });
      
      // Calculate active KPIs for each organization
      const orgsWithMetrics = await Promise.all(
        orgs.map(async (org) => {
          const busCount = await BusModel.countDocuments({ orgId: org._id });
          const userCount = await UserModel.countDocuments({ orgId: org._id });
          const activeTrips = await TripModel.countDocuments({ orgId: org._id, status: "ACTIVE" });
          return {
            ...org.toObject(),
            stats: { busCount, userCount, activeTrips },
          };
        })
      );

      res.status(200).json({ success: true, count: orgs.length, data: orgsWithMetrics });
    } catch (error) {
      next(error);
    }
  }

  // Super Admin: Create a new organization or College Account with mandatory College Admin login
  static async createOrganization(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, code, email, phone = "", address = "", adminEmail, adminPassword, adminName } = req.body;

      const cleanCode = code.trim().toUpperCase();
      const existingCode = await OrganizationModel.findOne({ code: cleanCode });
      if (existingCode) {
        throw new BadRequestError(`Organization with code '${cleanCode}' already exists.`);
      }

      const org = await OrganizationModel.create({
        name,
        code: cleanCode,
        email,
        phone,
        address,
        isActive: true,
        subscriptionPlan: "FREE_TIER",
      });

      // Always ensure a College Admin account is created for this institution
      const finalAdminEmail = (adminEmail && adminEmail.trim() ? adminEmail : email).trim().toLowerCase();
      const finalAdminPassword = (adminPassword && adminPassword.trim() ? adminPassword : `${cleanCode}@2026!`);
      const finalAdminName = adminName && adminName.trim() ? adminName : `${name} Admin`;

      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(finalAdminPassword, salt);

      const existingUser = await UserModel.findOne({ email: finalAdminEmail });
      if (existingUser) {
        existingUser.orgId = org._id as any;
        existingUser.role = UserRole.ORG_ADMIN;
        existingUser.passwordHash = hash;
        existingUser.name = finalAdminName;
        await existingUser.save();
      } else {
        await UserModel.create({
          orgId: org._id as any,
          name: finalAdminName,
          email: finalAdminEmail,
          passwordHash: hash,
          role: UserRole.ORG_ADMIN,
          phone: phone || "",
        });
      }

      await AuditLogModel.create({
        userId: req.user?.userId,
        userRole: req.user?.role,
        action: "CREATE_ORG",
        details: `Super Admin enrolled organization: ${name} (${cleanCode}) and generated College Admin account: ${finalAdminEmail}`,
        ipAddress: req.ip,
      });

      res.status(201).json({
        success: true,
        message: "Organization and College Admin login created successfully.",
        data: org,
        adminAccount: {
          email: finalAdminEmail,
          password: finalAdminPassword,
          name: finalAdminName,
          role: "ORG_ADMIN",
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // Super Admin & Org Admin: Update organization details or suspend status
  static async updateOrganization(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { orgId } = req.params;
      const updates = req.body;

      const org = await OrganizationModel.findByIdAndUpdate(orgId, updates, { new: true });
      if (!org) throw new NotFoundError("Organization not found.");

      res.status(200).json({ success: true, message: "Organization updated successfully.", data: org });
    } catch (error) {
      next(error);
    }
  }

  // Super Admin: Permanently DELETE organization and wipe associated college accounts / buses / routes
  static async deleteOrganization(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { orgId } = req.params;
      const org = await OrganizationModel.findById(orgId);
      if (!org) {
        throw new NotFoundError("Organization not found.");
      }

      // Remove all linked resources cleanly
      const deletedUsers = await UserModel.deleteMany({ orgId: org._id });
      const deletedBuses = await BusModel.deleteMany({ orgId: org._id });
      const deletedRoutes = await RouteModel.deleteMany({ orgId: org._id });
      const deletedTrips = await TripModel.deleteMany({ orgId: org._id });
      
      await OrganizationModel.findByIdAndDelete(orgId);

      await AuditLogModel.create({
        userId: req.user?.userId,
        userRole: req.user?.role,
        action: "DELETE_ORG",
        details: `Super Admin deleted college organization: ${org.name} (${org.code}). Removed ${deletedUsers.deletedCount} users, ${deletedBuses.deletedCount} buses.`,
        ipAddress: req.ip,
      });

      res.status(200).json({
        success: true,
        message: `Organization '${org.name}' and all associated buses, routes, and user accounts have been successfully deleted.`,
      });
    } catch (error) {
      next(error);
    }
  }

  // Shared Admin: Create staff account (Org Admin, Driver, Student) under an organization
  static async createOrgUser(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { orgId } = req.params;
      const { name, email, password, role = UserRole.DRIVER, phone, assignedBusId } = req.body;

      const org = await OrganizationModel.findById(orgId);
      if (!org) throw new NotFoundError("Organization not found.");

      const existingUser = await UserModel.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        throw new BadRequestError(`User with email '${email}' already exists.`);
      }

      const finalPassword = password || "MtrxStaff@2026!";
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(finalPassword, salt);

      const newUser = await UserModel.create({
        orgId: org._id,
        name,
        email: email.toLowerCase(),
        passwordHash: hash,
        role,
        phone,
        assignedBusId: assignedBusId || null,
        mustChangePassword: true,
      });

      // Fire-and-forget background audit log to eliminate button latency
      AuditLogModel.create({
        userId: req.user?.userId,
        userRole: req.user?.role,
        orgId: org._id,
        action: "CREATE_USER",
        details: `Created user account: ${name} (${role}) for organization ${org.name}`,
        ipAddress: req.ip,
      }).catch(() => {});

      res.status(201).json({ 
        success: true, 
        message: "User account created successfully.", 
        data: { 
          id: newUser._id, 
          name, 
          email: email.toLowerCase(), 
          role, 
          phone,
          password: finalPassword,
          mustChangePassword: true
        } 
      });
    } catch (error) {
      next(error);
    }
  }

  // Shared Admin: List all staff and users belonging to an organization
  static async getOrgUsers(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { orgId } = req.params;
      const users = await UserModel.find({ orgId })
        .select("-passwordHash -refreshTokens")
        .populate("assignedBusId", "busNumber registrationPlate")
        .populate("assignedRouteId", "name routeCode")
        .sort({ createdAt: -1 });
      res.status(200).json({ success: true, count: users.length, data: users });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DRIVER SHIFT & DUTY ASSIGNMENT ENGINE
   * Assigns operational shifts and vehicle/route responsibilities to driver personnel, with permanent Audit Trail logging.
   */
  static async assignDriverShift(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { orgId, driverId } = req.params;
      const { assignedBusId, assignedRouteId, shiftType, shiftStart, shiftEnd } = req.body;

      const driver = await UserModel.findOne({ _id: driverId, orgId });
      if (!driver || driver.role !== UserRole.DRIVER) {
        throw new NotFoundError("Driver record not found in this institutional organization.");
      }

      const previousBus = driver.assignedBusId;
      if (assignedBusId !== undefined) {
        driver.assignedBusId = assignedBusId || null;
        if (assignedBusId) {
          await BusModel.findByIdAndUpdate(assignedBusId, { currentDriverId: driver._id });
        }
      }
      if (assignedRouteId !== undefined) driver.assignedRouteId = assignedRouteId || null;
      if (shiftType) driver.shiftType = shiftType;
      if (shiftStart) driver.shiftStart = shiftStart;
      if (shiftEnd) driver.shiftEnd = shiftEnd;

      await driver.save();

      // Create permanent audit log trail for governance compliance
      await AuditLogModel.create({
        userId: req.user?.userId,
        userRole: req.user?.role,
        orgId: orgId as any,
        action: "DRIVER_REASSIGNMENT",
        details: `Assigned Driver ${driver.name} to shift (${driver.shiftType || "FULL_DAY"}, ${driver.shiftStart || "06:00"}-${driver.shiftEnd || "18:00"})${assignedBusId ? ` on Bus ID: ${assignedBusId}` : ""}`,
        ipAddress: req.ip,
      });

      res.status(200).json({ success: true, message: `Driver ${driver.name} shift assignment updated and logged in Audit Trail.`, data: driver });
    } catch (error) {
      next(error);
    }
  }

  /**
   * AUDIT TRAIL LOGS RETRIEVAL
   */
  static async getAuditLogs(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { orgId } = req.params;
      const logs = await AuditLogModel.find({ orgId })
        .populate("userId", "name email role")
        .sort({ createdAt: -1 })
        .limit(100);
      res.status(200).json({ success: true, count: logs.length, data: logs });
    } catch (error) {
      next(error);
    }
  }

  /**
   * BULK CSV IMPORT FOR FLEET & DRIVERS
   * Facilitates rapid institutional deployment by onboarding dozens of staff and vehicles simultaneously.
   */
  static async bulkImportDrivers(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { orgId } = req.params;
      const { drivers } = req.body;

      if (!Array.isArray(drivers) || drivers.length === 0) {
        throw new BadRequestError("An array of driver records is required for bulk CSV import.");
      }

      const org = await OrganizationModel.findById(orgId);
      if (!org) throw new NotFoundError("Organization not found.");

      const salt = await bcrypt.genSalt(10);
      const defaultHash = await bcrypt.hash("MtrxDriver@2026!", salt);

      const createdDrivers = [];
      const errors = [];

      for (const d of drivers) {
        try {
          if (!d.email || !d.name) {
            errors.push({ email: d.email || "unknown", reason: "Name and Email required" });
            continue;
          }
          const exists = await UserModel.findOne({ email: d.email.toLowerCase() });
          if (exists) {
            errors.push({ email: d.email, reason: "Email already exists in database" });
            continue;
          }
          const user = await UserModel.create({
            orgId: org._id,
            name: d.name,
            email: d.email.toLowerCase(),
            phone: d.phone || "",
            role: UserRole.DRIVER,
            passwordHash: d.password ? await bcrypt.hash(d.password, salt) : defaultHash,
            shiftType: d.shiftType || "FULL_DAY",
            shiftStart: d.shiftStart || "06:00 AM",
            shiftEnd: d.shiftEnd || "06:00 PM",
          });
          createdDrivers.push({ id: user._id, name: user.name, email: user.email });
        } catch (e: any) {
          errors.push({ email: d.email, reason: e.message });
        }
      }

      await AuditLogModel.create({
        userId: req.user?.userId,
        userRole: req.user?.role,
        orgId: org._id,
        action: "BULK_IMPORT_DRIVERS",
        details: `Bulk imported ${createdDrivers.length} drivers via CSV loader (${errors.length} failed/skipped)`,
        ipAddress: req.ip,
      });

      res.status(200).json({
        success: true,
        message: `Successfully batch imported ${createdDrivers.length} drivers!`,
        data: { created: createdDrivers, errors },
      });
    } catch (error) {
      next(error);
    }
  }

  static async bulkImportBuses(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { orgId } = req.params;
      const { buses } = req.body;

      if (!Array.isArray(buses) || buses.length === 0) {
        throw new BadRequestError("An array of bus vehicle records is required for bulk CSV import.");
      }

      const org = await OrganizationModel.findById(orgId);
      if (!org) throw new NotFoundError("Organization not found.");

      const createdBuses = [];
      const errors = [];

      for (const b of buses) {
        try {
          if (!b.busNumber || !b.registrationPlate) {
            errors.push({ busNumber: b.busNumber || "unknown", reason: "Bus Number and Registration Plate required" });
            continue;
          }
          const qrCodeSecret = b.qrCodeSecret || `MTRX-SEC-${org.code || "COLLEGE"}-${b.busNumber.replace(/\s+/g, "").toUpperCase()}-${Date.now().toString().slice(-4)}`;
          
          const bus = await BusModel.create({
            orgId: org._id,
            busNumber: b.busNumber,
            registrationPlate: b.registrationPlate.toUpperCase(),
            capacity: Number(b.capacity) || 45,
            qrCodeSecret,
          });
          createdBuses.push({ id: bus._id, busNumber: bus.busNumber, registrationPlate: bus.registrationPlate, qrCodeSecret });
        } catch (e: any) {
          errors.push({ busNumber: b.busNumber, reason: e.message });
        }
      }

      await AuditLogModel.create({
        userId: req.user?.userId,
        userRole: req.user?.role,
        orgId: org._id,
        action: "BULK_IMPORT_BUSES",
        details: `Bulk imported ${createdBuses.length} transit vehicles via CSV loader (${errors.length} failed/skipped)`,
        ipAddress: req.ip,
      });

      res.status(200).json({
        success: true,
        message: `Successfully batch imported ${createdBuses.length} campus vehicles!`,
        data: { created: createdBuses, errors },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DATA GOVERNANCE & RETENTION POLICY MANAGEMENT
   * Configures automatic telemetry pruning window and institutional branding
   */
  static async updateGovernancePolicy(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { orgId } = req.params;
      const { retentionPeriodDays, brandingLogoUrl, brandingPrimaryColor, brandingHeaderText } = req.body;

      const org = await OrganizationModel.findById(orgId);
      if (!org) throw new NotFoundError("Organization not found.");

      if (retentionPeriodDays !== undefined) org.retentionPeriodDays = Number(retentionPeriodDays);
      if (brandingLogoUrl !== undefined) org.brandingLogoUrl = brandingLogoUrl;
      if (brandingPrimaryColor !== undefined) org.brandingPrimaryColor = brandingPrimaryColor;
      if (brandingHeaderText !== undefined) org.brandingHeaderText = brandingHeaderText;

      await org.save();

      await AuditLogModel.create({
        userId: req.user?.userId,
        userRole: req.user?.role,
        orgId: org._id,
        action: "UPDATED_GOVERNANCE_POLICY",
        details: `Updated Data Retention policy window to ${org.retentionPeriodDays} days and applied enterprise institutional branding themes.`,
        ipAddress: req.ip || req.socket?.remoteAddress,
      });

      res.status(200).json({ success: true, message: "Institutional Governance & Retention policies saved in Audit Trail.", data: org });
    } catch (error) {
      next(error);
    }
  }

  /**
   * EXECUTE DATA RETENTION PURGE & TELEMETRY ARCHIVAL
   */
  static async runDataRetentionPurge(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { orgId } = req.params;
      const org = await OrganizationModel.findById(orgId);
      if (!org) throw new NotFoundError("Organization not found.");

      const retentionDays = org.retentionPeriodDays || 60;
      const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

      const buses = await BusModel.find({ orgId: org._id }).select("_id");
      const busIds = buses.map((b) => b._id);

      const gpsRes = await GPSLogModel.deleteMany({
        busId: { $in: busIds },
        timestamp: { $lt: cutoffDate },
      });

      const tripRes = await TripModel.updateMany(
        {
          orgId: org._id,
          startTime: { $lt: cutoffDate },
          status: "COMPLETED",
          isArchived: { $ne: true },
        },
        { $set: { isArchived: true } }
      );

      const logMsg = `Executed Data Retention Governance Purge (Window: ${retentionDays} days): Expunged ${gpsRes.deletedCount} obsolete GPS telemetry points and permanently archived ${tripRes.modifiedCount} historical trips.`;

      await AuditLogModel.create({
        userId: req.user?.userId,
        userRole: req.user?.role,
        orgId: org._id,
        action: "DATA_RETENTION_PURGE_EXECUTED",
        details: logMsg,
        ipAddress: req.ip || req.socket?.remoteAddress,
      });

      res.status(200).json({
        success: true,
        message: logMsg,
        data: {
          retentionDays,
          gpsLogsPurged: gpsRes.deletedCount,
          tripsArchived: tripRes.modifiedCount,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

