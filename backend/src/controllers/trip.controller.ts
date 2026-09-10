import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { TripModel } from "../models/Trip";
import { BusModel } from "../models/Bus";
import { RouteModel } from "../models/Route";
import { GPSLogModel } from "../models/GPSLog";
import { NotFoundError, BadRequestError, ForbiddenError } from "../utils/errors";
import { TripStatus, BusStatus, SOCKET_EVENTS } from "@mtrx/shared";
import { getIO } from "../socket";
import { WatchdogService } from "../services/watchdogService";

export class TripController {
  /**
   * QR SCAN TRIP INITIATION:
   * Driver scans the unique Bus QR code. The server validates the cryptographic secret,
   * associates the driver with the bus's assigned route, generates a Trip ID, opens live GPS streaming,
   * and blocks any manual fabrication of trip history.
   */
  static async scanQRAndStartTrip(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { qrSecret, latitude = 0, longitude = 0 } = req.body;

      if (!qrSecret) {
        throw new BadRequestError("QR Code secret payload is required.");
      }

      const bus = await BusModel.findOne({ qrCodeSecret: qrSecret });
      if (!bus) {
        throw new NotFoundError("Invalid QR code! No registered bus matches this cryptographic secret.");
      }

      if (!bus.assignedRouteId) {
        throw new BadRequestError(`Bus ${bus.busNumber} has no assigned route. Organization Admin must attach a route first.`);
      }

      // End any previously active trip for this bus or driver to prevent duplicate streams
      await TripModel.updateMany(
        { $or: [{ busId: bus._id }, { driverId: req.user?.userId }], status: TripStatus.ACTIVE },
        { status: TripStatus.COMPLETED, endTime: new Date() }
      );

      const route = await RouteModel.findById(bus.assignedRouteId);
      if (!route) {
        throw new NotFoundError("Assigned route for this bus could not be located in database.");
      }

      // Auto-initiate immutable trip record
      const newTrip = await TripModel.create({
        orgId: bus.orgId,
        busId: bus._id,
        driverId: req.user?.userId,
        routeId: route._id,
        status: TripStatus.ACTIVE,
        startTime: new Date(),
        startLat: latitude,
        startLng: longitude,
        livePassengerCount: 0,
      });

      // Update bus state to active trip
      bus.status = BusStatus.ON_TRIP;
      bus.currentDriverId = req.user?.userId as any;
      if (latitude !== 0 && longitude !== 0) {
        bus.currentLocation = {
          latitude,
          longitude,
          speed: 0,
          heading: 0,
          updatedAt: new Date(),
          location: { type: "Point", coordinates: [longitude, latitude] },
        } as any;
      }
      await bus.save();

      // Emit live alert over WebSocket to all institutional dashboards
      try {
        const io = getIO();
        io.to(`org_${bus.orgId}`).emit(SOCKET_EVENTS.TRIP_STATUS_CHANGED, {
          tripId: newTrip._id,
          busId: bus._id,
          busNumber: bus.busNumber,
          route: route.name,
          status: TripStatus.ACTIVE,
          message: `Trip started on Bus ${bus.busNumber} (${route.name})`,
        });
      } catch (e) {
        // Socket server not ready or in test environment
      }

      res.status(201).json({
        success: true,
        message: `Trip successfully started via QR Scan! Live GPS synchronization activated.`,
        data: {
          trip: newTrip,
          bus: { id: bus._id, busNumber: bus.busNumber, registrationPlate: bus.registrationPlate },
          route: { id: route._id, name: route.name, stops: route.stops },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getActiveTrips(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const query: any = { status: { $in: [TripStatus.ACTIVE, TripStatus.PAUSED] } };
      if (req.user && req.user.role !== "SUPER_ADMIN" && req.user.orgId) {
        query.orgId = req.user.orgId;
      }
      const trips = await TripModel.find(query)
        .populate("busId", "busNumber registrationPlate currentLocation")
        .populate("driverId", "name phone")
        .populate("routeId", "name stops polyline totalDistanceKm");

      res.status(200).json({ success: true, count: trips.length, data: trips });
    } catch (error) {
      next(error);
    }
  }

  static async endTrip(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tripId } = req.params;
      const { endLat = 0, endLng = 0 } = req.body;

      const trip = await TripModel.findById(tripId);
      if (!trip) throw new NotFoundError("Trip session not found.");

      trip.status = TripStatus.COMPLETED;
      trip.endTime = new Date();
      if (endLat && endLng) {
        trip.endLat = endLat;
        trip.endLng = endLng;
      }
      await trip.save();

      const bus = await BusModel.findById(trip.busId);
      if (bus) {
        bus.status = BusStatus.IDLE;
        bus.currentDriverId = undefined;
        await bus.save();
      }

      try {
        const io = getIO();
        io.to(`org_${trip.orgId}`).emit("trip_ended", { tripId: trip._id });
      } catch (e) {}

      res.status(200).json({ success: true, message: "Trip successfully terminated.", data: trip });
    } catch (error) {
      next(error);
    }
  }


  static async getTripHistory(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const query: any = {};
      if (req.user?.role === "DRIVER") {
        query.driverId = req.user.userId;
      } else if (req.user?.role !== "SUPER_ADMIN") {
        query.orgId = req.user?.orgId;
      }

      const trips = await TripModel.find(query)
        .sort({ createdAt: -1 })
        .limit(50)
        .populate("busId", "busNumber")
        .populate("driverId", "name")
        .populate("routeId", "name");

      res.status(200).json({ success: true, data: trips });
    } catch (error) {
      next(error);
    }
  }

  /**
   * STOP ARRIVAL & ON-TIME PERFORMANCE ENGINE
   */
  static async logStopArrival(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tripId } = req.params;
      const { stopName, scheduledMinutesFromStart = 0 } = req.body;

      const trip = await TripModel.findById(tripId);
      if (!trip) throw new NotFoundError("Active trip session not found.");

      const actualMins = Math.max(0, Math.round((Date.now() - new Date(trip.startTime).getTime()) / 60000));

      let status: "ON_TIME" | "DELAYED" | "EARLY" = "ON_TIME";
      if (scheduledMinutesFromStart > 0) {
        if (actualMins > scheduledMinutesFromStart + 5) {
          status = "DELAYED";
        } else if (actualMins < scheduledMinutesFromStart - 5) {
          status = "EARLY";
        }
      }

      if (!trip.stopTimes) {
        trip.stopTimes = [];
      }

      trip.stopTimes.push({
        stopName,
        scheduledMinutesFromStart,
        actualMinutesFromStart: actualMins,
        status,
        recordedAt: new Date(),
      });

      const onTimeCount = trip.stopTimes.filter((s) => s.status === "ON_TIME" || s.status === "EARLY").length;
      trip.onTimePercentage = Math.round((onTimeCount / trip.stopTimes.length) * 100);

      await trip.save();

      try {
        const io = getIO();
        io.to(`org_${trip.orgId}`).to(`trip_${trip._id}`).emit("stop_arrival", {
          tripId: trip._id,
          stopName,
          actualMins,
          status,
          onTimePercentage: trip.onTimePercentage,
        });
      } catch (e) {}

      res.status(200).json({ success: true, message: `Stop '${stopName}' recorded as ${status}.`, data: trip });
    } catch (error) {
      next(error);
    }
  }

  /**
   * SOS DISTRESS DISPATCH ENGINE
   * Instantly alerts College Authorities and Super Admin with real-time Socket.IO alarms.
   */
  static async triggerSOS(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tripId } = req.params;
      const { lat, lng, reason = "Emergency distress signal triggered by driver vehicle" } = req.body;
      
      const alert = await WatchdogService.triggerSOS(tripId, lat, lng, reason);
      res.status(200).json({ success: true, message: "SOS Distress alarm dispatched to Super Admin & institutional authorities!", data: alert });
    } catch (error) {
      next(error);
    }
  }

  /**
   * TRIP PAUSE & RESUME OPERATIONAL RESILIENCE
   * Allows drivers to temporarily halt GPS telemetry tracking during official rest stops or emergencies without ending the trip.
   */
  static async pauseTrip(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tripId } = req.params;
      const trip = await TripModel.findById(tripId);
      if (!trip) throw new NotFoundError("Active trip session not found.");
      if (trip.status !== TripStatus.ACTIVE) throw new BadRequestError("Only active trips can be paused.");

      trip.status = TripStatus.PAUSED;
      trip.pausedAt = new Date();
      await trip.save();

      try {
        const io = getIO();
        io.to(`org_${trip.orgId}`).to(`trip_${trip._id}`).emit("trip_paused", { tripId: trip._id });
      } catch (e) {}

      res.status(200).json({ success: true, message: "Trip tracking temporarily paused.", data: trip });
    } catch (error) {
      next(error);
    }
  }

  static async resumeTrip(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tripId } = req.params;
      const trip = await TripModel.findById(tripId);
      if (!trip) throw new NotFoundError("Trip session not found.");
      if (trip.status !== TripStatus.PAUSED) throw new BadRequestError("Only paused trips can be resumed.");

      trip.status = TripStatus.ACTIVE;
      trip.pausedAt = undefined;
      await trip.save();

      try {
        const io = getIO();
        io.to(`org_${trip.orgId}`).to(`trip_${trip._id}`).emit("trip_resumed", { tripId: trip._id });
      } catch (e) {}

      res.status(200).json({ success: true, message: "Trip tracking actively resumed.", data: trip });
    } catch (error) {
      next(error);
    }
  }

  /**
   * FUEL & MILEAGE LOGGING ENGINE
   * Captures driver operating expense records at shift completion for fleet maintenance efficiency analytics.
   */
  static async logFuelAndMileage(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tripId } = req.params;
      const { odometerStart, odometerEnd, fuelLitersAdded, fuelCost, driverNotes } = req.body;

      const trip = await TripModel.findById(tripId);
      if (!trip) throw new NotFoundError("Trip record not found.");

      if (odometerStart !== undefined) trip.odometerStart = Number(odometerStart);
      if (odometerEnd !== undefined) trip.odometerEnd = Number(odometerEnd);
      if (fuelLitersAdded !== undefined) trip.fuelLitersAdded = Number(fuelLitersAdded);
      if (fuelCost !== undefined) trip.fuelCost = Number(fuelCost);
      if (driverNotes !== undefined) trip.driverNotes = driverNotes;

      await trip.save();

      res.status(200).json({ success: true, message: "Fuel and mileage expense record successfully archived.", data: trip });
    } catch (error) {
      next(error);
    }
  }
}

