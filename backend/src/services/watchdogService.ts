import { TripModel } from "../models/Trip";
import { BusModel } from "../models/Bus";
import { NotificationModel } from "../models/Notification";
import { TripStatus, NotificationType } from "@mtrx/shared";
import { getIO } from "../socket";

export class WatchdogService {
  private static timer: NodeJS.Timeout | null = null;

  /**
   * Starts the Automated Safety Watchdog Engine.
   * Runs an asynchronous interval checking active buses for GPS signal loss (GPS silence / offline mid-trip).
   */
  static start(): void {
    if (this.timer) return;
    console.log("🛡️ MTRX Real-Time Telemetry & Safety Watchdog online (3-min threshold).");

    this.timer = setInterval(async () => {
      try {
        await this.checkActiveTripsTelemetry();
      } catch (error) {
        console.error("Watchdog monitoring cycle encountered an error:", error);
      }
    }, 60000); // Verify every 60 seconds
  }

  static stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private static async checkActiveTripsTelemetry(): Promise<void> {
    const activeTrips = await TripModel.find({ status: TripStatus.ACTIVE }).populate("busId driverId");

    const now = Date.now();
    const SILENCE_THRESHOLD_MS = 3 * 60 * 1000; // 3 minutes

    for (const trip of activeTrips) {
      const bus: any = trip.busId;
      if (!bus || !bus.currentLocation) continue;

      const lastUpdate = new Date(bus.currentLocation.updatedAt || (trip as any).updatedAt || trip.startTime || Date.now()).getTime();
      const elapsed = now - lastUpdate;

      if (elapsed > SILENCE_THRESHOLD_MS) {
        // Check if an unread GPS silence warning already exists for this trip in the last 15 minutes to avoid flooding
        const existingAlert = await NotificationModel.findOne({
          "meta.tripId": trip._id,
          type: { $in: ["GPS_SILENCE", "OFFLINE_MID_TRIP"] },
          createdAt: { $gte: new Date(now - 15 * 60 * 1000) },
        });

        if (!existingAlert) {
          const type: NotificationType = "OFFLINE_MID_TRIP";
          const title = `⚠️ GPS Signal Silent: Bus ${bus.busNumber}`;
          const message = `Active trip has lost telemetry stream for over ${Math.round(elapsed / 60000)} minutes. Last reported speed: ${bus.currentLocation.speed || 0} km/h.`;

          const notification = await NotificationModel.create({
            orgId: trip.orgId,
            title,
            message,
            type,
            read: false,
            isRead: false,
            meta: {
              tripId: trip._id,
              busId: bus._id,
              driverId: (trip.driverId as any)?._id || trip.driverId,
              latitude: bus.currentLocation.latitude,
              longitude: bus.currentLocation.longitude,
            },
          });

          // Broadcast high-priority real-time WebSocket alert
          try {
            const io = getIO();
            const alertPayload = {
              _id: notification._id,
              title,
              message,
              type,
              timestamp: new Date().toISOString(),
              busNumber: bus.busNumber,
              tripId: trip._id,
            };
            io.to(`org_${trip.orgId}`).to("super_admin").emit("emergency_alert", alertPayload);
          } catch (e) {
            // Socket instance might be initializing
          }
        }
      }
    }
  }

  /**
   * Immediate SOS Distress Dispatch from Driver Vehicle
   */
  static async triggerSOS(tripId: string, lat?: number, lng?: number, reason: string = "Emergency distress triggered by driver"): Promise<any> {
    const trip = await TripModel.findById(tripId).populate("busId driverId");
    if (!trip) throw new Error("Active trip not found for SOS dispatch.");

    const bus: any = trip.busId;
    const driver: any = trip.driverId;

    const title = `🚨 SOS EMERGENCY ALERT: BUS ${bus?.busNumber || "UNKNOWN"}`;
    const message = `IMMEDIATE ATTENTION REQUIRED! Driver ${driver?.name || "Staff"} activated SOS distress signal on active transit route! Reason: ${reason}`;

    const notification = await NotificationModel.create({
      orgId: trip.orgId,
      title,
      message,
      type: "SOS",
      read: false,
      isRead: false,
      meta: {
        tripId: trip._id,
        busId: bus?._id,
        driverId: driver?._id,
        latitude: lat || bus?.currentLocation?.latitude || 0,
        longitude: lng || bus?.currentLocation?.longitude || 0,
      },
    });

    try {
      const io = getIO();
      const payload = {
        _id: notification._id,
        title,
        message,
        type: "SOS",
        timestamp: new Date().toISOString(),
        busNumber: bus?.busNumber || "N/A",
        driverName: driver?.name || "Driver",
        latitude: lat || bus?.currentLocation?.latitude || 0,
        longitude: lng || bus?.currentLocation?.longitude || 0,
      };
      io.to(`org_${trip.orgId}`).to("super_admin").to(`trip_${trip._id}`).emit("emergency_alert", payload);
      io.emit("sos_broadcast", payload);
    } catch (e) {}

    return notification;
  }
}
