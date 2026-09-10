import { z } from "zod";
import { UserRole, BusStatus, TripStatus } from "../types";

export const LoginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const RegisterUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters with letters and numbers"),
  phone: z.string().optional(),
  role: z.nativeEnum(UserRole),
  orgId: z.string().optional(),
  assignedBusId: z.string().optional(),
});

export const OrganizationSchema = z.object({
  name: z.string().min(2, "Organization name required"),
  code: z.string().min(2, "Org code required").toUpperCase(),
  email: z.string().email("Contact email required"),
  phone: z.string().min(8, "Valid contact phone required"),
  address: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const StopSchema = z.object({
  name: z.string().min(1, "Stop name required"),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radiusMeters: z.number().default(300),
});

export const RouteSchema = z.object({
  orgId: z.string(),
  name: z.string().min(2, "Route name required"),
  routeCode: z.string().min(1, "Route code required"),
  description: z.string().optional(),
  stops: z.array(StopSchema).min(2, "Route must contain at least a start and end stop"),
  polyline: z.array(z.tuple([z.number(), z.number()])).optional(),
});

export const BusSchema = z.object({
  orgId: z.string(),
  busNumber: z.string().min(1, "Bus number required (e.g. BUS-01)"),
  registrationPlate: z.string().min(3, "Registration plate required"),
  capacity: z.number().min(1, "Capacity must be greater than 0"),
  assignedRouteId: z.string().optional(),
  currentDriverId: z.string().optional(),
  status: z.nativeEnum(BusStatus).default(BusStatus.IDLE),
});

export const GPSUpdateSchema = z.object({
  tripId: z.string(),
  busId: z.string(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  speed: z.number().min(0),
  heading: z.number().min(0).max(360),
  accuracy: z.number().default(10),
  timestamp: z.string(),
});

export const QRScanTripStartSchema = z.object({
  qrSecret: z.string().min(10, "Invalid QR cryptographic payload"),
  driverId: z.string(),
  latitude: z.number(),
  longitude: z.number(),
});

export const NotificationSchema = z.object({
  title: z.string().min(1),
  message: z.string().min(1),
  recipientRole: z.nativeEnum(UserRole).optional(),
  recipientId: z.string().optional(),
  type: z.enum(["INFO", "WARNING", "EMERGENCY", "TRIP_START", "TRIP_END", "ETA_ALERT", "ANNOUNCEMENT"]),
});

export type LoginInput = z.infer<typeof LoginSchema>;
export type RegisterUserInput = z.infer<typeof RegisterUserSchema>;
export type OrganizationInput = z.infer<typeof OrganizationSchema>;
export type RouteInput = z.infer<typeof RouteSchema>;
export type BusInput = z.infer<typeof BusSchema>;
export type GPSUpdateInput = z.infer<typeof GPSUpdateSchema>;
export type QRScanTripStartInput = z.infer<typeof QRScanTripStartSchema>;
export type NotificationInput = z.infer<typeof NotificationSchema>;
