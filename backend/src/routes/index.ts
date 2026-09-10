import { Router, Request, Response } from "express";
import authRoutes from "./auth.routes";
import orgRoutes from "./org.routes";
import busRoutes from "./bus.routes";
import tripRoutes from "./trip.routes";
import reportRoutes from "./report.routes";
import routeRoutes from "./route.routes";
import notificationRoutes from "./notification.routes";
import { MTRX_TEAM_MEMBERS } from "@mtrx/shared";

const router = Router();

// Global Public API Endpoint for "About Team" (Visible Everywhere without Authentication!)
router.get("/team", (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "RIT — ",
    team: MTRX_TEAM_MEMBERS,
    specialThanks: "RAMCO INSTITUTE OF TECHNOLOGY",
    copyright: "© All Rights Reserved. Developed by RIT.",
  });
});

// System Health Check Endpoint for zero-cost Render / Fly.io wakeup monitors
router.get("/health", (req: Request, res: Response) => {
  res.status(200).json({
    status: "HEALTHY",
    platform: "RIT Bus Tracker SaaS",
    developer: "RIT",
    ceo: "",
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// Mount protected feature routes
router.use("/auth", authRoutes);
router.use(["/orgs", "/organizations"], orgRoutes);
router.use("/buses", busRoutes);
router.use("/trips", tripRoutes);
router.use("/reports", reportRoutes);
router.use("/routes", routeRoutes);
router.use("/notifications", notificationRoutes);

export default router;
