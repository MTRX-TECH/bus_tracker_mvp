import { Server as HttpServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { SOCKET_EVENTS, GPS_STREAM_INTERVAL_MS, TripStatus } from "@mtrx/shared";
import { Logger } from "../utils/logger";
import { GPSLogModel } from "../models/GPSLog";
import { TripModel } from "../models/Trip";
import { BusModel } from "../models/Bus";
import { RouteModel } from "../models/Route";
import { NotificationModel } from "../models/Notification";
import { ETAService } from "../services/etaService";

let io: SocketIOServer | null = null;

export const initSocketIO = (httpServer: HttpServer): SocketIOServer => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: true, // Echo request origin, perfectly compatible with credentials: true
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      credentials: true,
    },
    pingTimeout: 30000,
    pingInterval: 10000,
  });

  io.on("connection", (socket: Socket) => {
    Logger.info(`⚡ New Socket client connected: ${socket.id}`);

    // Room Subscription Engine (Students/Parents join bus or org rooms to view live GPS)
    socket.on(SOCKET_EVENTS.JOIN_ORG_ROOM, (orgId: string) => {
      socket.join(`org_${orgId}`);
      Logger.debug(`Socket ${socket.id} joined org room: org_${orgId}`);
    });

    socket.on(SOCKET_EVENTS.JOIN_TRIP_ROOM, (tripId: string) => {
      socket.join(`trip_${tripId}`);
      Logger.debug(`Socket ${socket.id} joined trip room: trip_${tripId}`);
    });

    socket.on(SOCKET_EVENTS.JOIN_BUS_ROOM, (busId: string) => {
      socket.join(`bus_${busId}`);
      Logger.debug(`Socket ${socket.id} joined bus room: bus_${busId}`);
    });

    socket.on(SOCKET_EVENTS.LEAVE_ROOM, (roomName: string) => {
      socket.leave(roomName);
    });

    // ========================================================================
    // DRIVER TELEMETRY UPSTREAM STREAM (Real-time Smartphone GPS)
    // ========================================================================
    socket.on(SOCKET_EVENTS.DRIVER_LOCATION_UPDATE, async (payload: {
      tripId: string;
      busId: string;
      orgId: string;
      latitude: number;
      longitude: number;
      speed: number;
      heading: number;
      accuracy?: number;
      timestamp: string;
      offlineBuffer?: Array<{ latitude: number; longitude: number; speed: number; heading: number; timestamp: string }>;
    }) => {
      try {
        const { tripId, busId, orgId, latitude, longitude, speed = 0, heading = 0, accuracy = 10, offlineBuffer } = payload;
        
        if (!tripId || !busId) return;

        // 1. Process offline buffered location array if driver experienced brief signal dropouts!
        if (offlineBuffer && offlineBuffer.length > 0) {
          Logger.info(`📥 Synchronizing ${offlineBuffer.length} buffered offline GPS points for bus ${busId}`);
          const bufferedLogs = offlineBuffer.map((b) => ({
            tripId,
            busId,
            latitude: b.latitude,
            longitude: b.longitude,
            speed: b.speed,
            heading: b.heading,
            accuracy: 15,
            timestamp: new Date(b.timestamp),
          }));
          await GPSLogModel.insertMany(bufferedLogs, { ordered: false }).catch(() => {});
        }

        // 2. Persist real-time GPS coordinates into MongoDB free tier
        await GPSLogModel.create({
          tripId,
          busId,
          latitude,
          longitude,
          speed,
          heading,
          accuracy,
          timestamp: new Date(payload.timestamp || Date.now()),
        });

        // 3. Update Bus latest Geo-Point index in Mongoose for fast bounding Box mapping
        await BusModel.findByIdAndUpdate(busId, {
          "currentLocation.latitude": latitude,
          "currentLocation.longitude": longitude,
          "currentLocation.speed": speed,
          "currentLocation.heading": heading,
          "currentLocation.updatedAt": new Date(),
          "currentLocation.location": {
            type: "Point",
            coordinates: [longitude, latitude], // Longitude first!
          },
        });

        // 4. Fetch trip and route stops for accurate local ETA calculations
        const activeTrip = await TripModel.findById(tripId).populate("routeId");
        let etaInfo = null;
        if (activeTrip && activeTrip.routeId) {
          const route: any = activeTrip.routeId;
          etaInfo = ETAService.calculateLiveETA(latitude, longitude, speed, route.stops || []);
          
          // Update trip running statistics
          activeTrip.distanceCoveredKm = parseFloat(((activeTrip.distanceCoveredKm || 0) + 0.05).toFixed(2)); // approximate increment per interval
          activeTrip.averageSpeedKmh = speed > 0 ? parseFloat(((activeTrip.averageSpeedKmh || speed + speed) / 2).toFixed(1)) : activeTrip.averageSpeedKmh;
          await activeTrip.save();

          // If bus entered a Geopolygon / Stop geofence radius, broadcast approaching warning!
          if (etaInfo.inStopGeofence && etaInfo.nextStopName) {
            const notifMsg = `Bus is currently arriving at stop: ${etaInfo.nextStopName}`;
            io?.to(`bus_${busId}`).to(`org_${orgId}`).emit(SOCKET_EVENTS.BUS_APPROACHING_STOP, {
              busId,
              stopName: etaInfo.nextStopName,
              message: notifMsg,
            });
          }
        }

        // 5. Downstream Broadcast to subscribed Student, Parent, and Admin rooms
        const liveBroadcastPayload = {
          busId,
          tripId,
          orgId,
          latitude,
          longitude,
          speed,
          heading,
          accuracy,
          etaInfo,
          updatedAt: new Date().toISOString(),
        };

        io?.to(`trip_${tripId}`).to(`bus_${busId}`).to(`org_${orgId}`).emit(SOCKET_EVENTS.LIVE_BUS_LOCATION, liveBroadcastPayload);
      } catch (error: any) {
        Logger.error(`Error handling DRIVER_LOCATION_UPDATE socket event: ${error.message}`);
      }
    });

    // Emergency SOS Button Alert Triggered by Driver!
    socket.on(SOCKET_EVENTS.DRIVER_SOS_EMERGENCY, async (data: { tripId: string; busId: string; orgId: string; driverName: string; lat: number; lng: number }) => {
      Logger.warn(`🚨 EMERGENCY SOS TRIGGERED FOR BUS ${data.busId} BY DRIVER ${data.driverName}`);
      const sosMessage = `URGENT: Emergency SOS triggered by driver ${data.driverName} on Bus ${data.busId} at GPS [${data.lat}, ${data.lng}]!`;

      await NotificationModel.create({
        orgId: data.orgId,
        title: "🚨 EMERGENCY SOS ALERT",
        message: sosMessage,
        type: "EMERGENCY",
      });

      // Blast emergency signal immediately across organization and super-admin monitoring rooms!
      io?.to(`org_${data.orgId}`).to(`bus_${data.busId}`).to("super_admin_monitor").emit(SOCKET_EVENTS.EMERGENCY_ALERT_BROADCAST, {
        busId: data.busId,
        tripId: data.tripId,
        driverName: data.driverName,
        coordinates: { lat: data.lat, lng: data.lng },
        timestamp: new Date().toISOString(),
      });
    });

    socket.on("disconnect", () => {
      Logger.debug(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error("Socket.IO server instance not initialized!");
  }
  return io;
};
