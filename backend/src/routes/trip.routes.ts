import { Router } from "express";
import { TripController } from "../controllers/trip.controller";
import { authenticate, requireRole } from "../middleware/auth";
import { UserRole } from "@mtrx/shared";

const router = Router();

// Public monitor endpoint for unauthenticated students and passengers
router.get("/active", TripController.getActiveTrips);

router.use(authenticate);

// Driver QR Scan endpoints
router.post("/scan-start", requireRole(UserRole.DRIVER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN), TripController.scanQRAndStartTrip);
router.post("/:tripId/end", requireRole(UserRole.DRIVER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN), TripController.endTrip);

// Monitor & history endpoints
router.get("/history", TripController.getTripHistory);
router.post("/:tripId/stop-arrival", requireRole(UserRole.DRIVER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN), TripController.logStopArrival);
router.post("/:tripId/sos", requireRole(UserRole.DRIVER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN), TripController.triggerSOS);

// Operational Resilience: Pause, Resume, and Fuel/Mileage Logging
router.put("/:tripId/pause", requireRole(UserRole.DRIVER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN), TripController.pauseTrip);
router.put("/:tripId/resume", requireRole(UserRole.DRIVER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN), TripController.resumeTrip);
router.post("/:tripId/fuel-mileage", requireRole(UserRole.DRIVER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN), TripController.logFuelAndMileage);

export default router;
