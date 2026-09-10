import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { BusModel } from "../models/Bus";
import { generateBusQRSecret, generateQRCodeImageURL } from "../utils/qr";
import { NotFoundError, BadRequestError } from "../utils/errors";
import { BusStatus, UserRole } from "@mtrx/shared";

export class BusController {
  static async getBuses(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const query: any = {};
      if (req.user && req.user.role !== UserRole.SUPER_ADMIN && req.user.orgId) {
        query.orgId = req.user.orgId;
      }

      const buses = await BusModel.find(query).populate("currentDriverId", "name email phone").populate("assignedRouteId", "name routeCode");
      res.status(200).json({ success: true, count: buses.length, data: buses });
    } catch (error) {
      next(error);
    }
  }

  static async createBus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { orgId, busNumber, registrationPlate, capacity = 45, assignedRouteId, currentDriverId } = req.body;
      const targetOrgId = req.user?.role === UserRole.SUPER_ADMIN ? orgId : req.user?.orgId;

      if (!targetOrgId) {
        throw new BadRequestError("Organization ID required for bus enrollment.");
      }

      // Generate unique cryptographic QR Code secret for Driver Scan & start-trip auto-binding
      const qrSecret = generateBusQRSecret(busNumber, targetOrgId);

      const newBus = await BusModel.create({
        orgId: targetOrgId,
        busNumber,
        registrationPlate: registrationPlate.toUpperCase(),
        capacity,
        assignedRouteId: assignedRouteId || null,
        currentDriverId: currentDriverId || null,
        status: BusStatus.IDLE,
        qrCodeSecret: qrSecret,
        currentLocation: {
          latitude: 0,
          longitude: 0,
          speed: 0,
          heading: 0,
          updatedAt: new Date(),
        },
      });

      res.status(201).json({ success: true, message: "Bus enrolled successfully.", data: newBus });
    } catch (error) {
      next(error);
    }
  }

  static async getBusQRCode(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { busId } = req.params;
      const bus = await BusModel.findById(busId).populate("assignedRouteId", "routeCode name");
      if (!bus) throw new NotFoundError("Bus not found.");

      if (!bus.qrCodeSecret) {
        bus.qrCodeSecret = `MTRX-BUS-QR-${bus.busNumber.replace(/\s+/g, "").toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
        await bus.save();
      }

      const qrImageUrl = await generateQRCodeImageURL(bus.qrCodeSecret);
      const routeData = bus.assignedRouteId as any;
      const routeFormatted = routeData?.routeCode || routeData?.name || "R12 (CAMPUS)";

      res.status(200).json({
        success: true,
        data: {
          busNumber: bus.busNumber,
          registrationPlate: bus.registrationPlate,
          route: routeFormatted,
          qrSecret: bus.qrCodeSecret,
          qrImagePngDataUrl: qrImageUrl,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // Delete bus from institutional fleet if added accidentally or retired
  static async deleteBus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { busId } = req.params;
      const bus = await BusModel.findById(busId);
      if (!bus) throw new NotFoundError("Bus not found in fleet.");

      if (req.user?.role !== UserRole.SUPER_ADMIN && bus.orgId.toString() !== req.user?.orgId) {
        throw new BadRequestError("Unauthorized to remove this transport vehicle.");
      }

      await BusModel.findByIdAndDelete(busId);
      res.status(200).json({ success: true, message: "Bus vehicle successfully removed from fleet database." });
    } catch (error) {
      next(error);
    }
  }
}
