import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { RouteModel } from "../models/Route";
import { BusModel } from "../models/Bus";
import { NotFoundError, BadRequestError } from "../utils/errors";
import { UserRole } from "@mtrx/shared";

export class RouteController {
  static async getRoutes(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const query: any = { isActive: true };
      if (req.user && req.user.role !== UserRole.SUPER_ADMIN && req.user.orgId) {
        query.orgId = req.user.orgId;
      }

      const routes = await RouteModel.find(query).sort({ createdAt: -1 });
      res.status(200).json({ success: true, count: routes.length, data: routes });
    } catch (error) {
      next(error);
    }
  }

  static async createRoute(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { orgId, name, routeCode, description = "", stops = [], polyline = [], totalDistanceKm = 0, estimatedDurationMins = 0 } = req.body;
      const targetOrgId = req.user?.role === UserRole.SUPER_ADMIN ? (orgId || req.user?.orgId) : req.user?.orgId;

      if (!targetOrgId) {
        throw new BadRequestError("Organization ID is required to create a transit route.");
      }

      // Automatically sort and index stops by order if provided
      const orderedStops = stops.map((s: any, idx: number) => ({
        ...s,
        order: s.order !== undefined ? s.order : idx + 1,
        scheduledMinutesFromStart: s.scheduledMinutesFromStart || 0,
      }));

      const newRoute = await RouteModel.create({
        orgId: targetOrgId,
        name,
        routeCode: routeCode.toUpperCase(),
        description,
        stops: orderedStops,
        polyline,
        totalDistanceKm,
        estimatedDurationMins,
        isActive: true,
      });

      res.status(201).json({ success: true, message: "Route and ordered stop schedule created successfully.", data: newRoute });
    } catch (error) {
      next(error);
    }
  }

  static async updateRoute(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { routeId } = req.params;
      const updates = req.body;
      delete updates._id;
      delete updates.orgId;

      if (updates.stops) {
        updates.stops = updates.stops.map((s: any, idx: number) => ({
          ...s,
          order: s.order !== undefined ? s.order : idx + 1,
        }));
      }

      const updated = await RouteModel.findByIdAndUpdate(routeId, updates, { new: true });
      if (!updated) throw new NotFoundError("Route not found.");

      res.status(200).json({ success: true, message: "Route schedule updated.", data: updated });
    } catch (error) {
      next(error);
    }
  }

  static async deleteRoute(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { routeId } = req.params;
      const deleted = await RouteModel.findByIdAndDelete(routeId);
      if (!deleted) throw new NotFoundError("Route not found.");

      // Clear route assignments on buses
      await BusModel.updateMany({ assignedRouteId: routeId }, { $unset: { assignedRouteId: 1 } });

      res.status(200).json({ success: true, message: "Route deleted and detached from enrolled fleet." });
    } catch (error) {
      next(error);
    }
  }

  // Assign route to a bus
  static async assignRouteToBus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { routeId } = req.params;
      const { busId } = req.body;

      const route = await RouteModel.findById(routeId);
      if (!route) throw new NotFoundError("Route not found.");

      const bus = await BusModel.findByIdAndUpdate(busId, { assignedRouteId: route._id }, { new: true });
      if (!bus) throw new NotFoundError("Bus not found.");

      res.status(200).json({ success: true, message: `Route '${route.name}' successfully attached to Bus '${bus.busNumber}'.`, data: bus });
    } catch (error) {
      next(error);
    }
  }
}
