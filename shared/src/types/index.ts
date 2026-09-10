// ============================================================================
// RIT - RIT Bus Tracker - Shared Types
// 
// ============================================================================

export enum UserRole {
  SUPER_ADMIN = "SUPER_ADMIN",
  ORG_ADMIN = "ORG_ADMIN",
  DRIVER = "DRIVER",
  STUDENT = "STUDENT",
  PARENT = "PARENT",
}

export enum TripStatus {
  SCHEDULED = "SCHEDULED",
  ACTIVE = "ACTIVE",
  PAUSED = "PAUSED",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

export enum BusStatus {
  IDLE = "IDLE",
  ON_TRIP = "ON_TRIP",
  MAINTENANCE = "MAINTENANCE",
  OFFLINE = "OFFLINE",
}

export interface IAuthResponse {
  success: boolean;
  token: string;
  user: {
    id: string;
    email: string;
    role: UserRole;
    name: string;
    orgId?: string;
    hasConsentedToLocationTracking?: boolean;
    consentTimestamp?: string;
    mustChangePassword?: boolean;
  };
}


export interface IOrganization {
  _id?: string;
  name: string;
  code: string;
  email: string;
  phone: string;
  address?: string;
  isActive: boolean;
  subscriptionPlan?: "FREE_TIER" | "ENTERPRISE";
  plan?: "basic" | "standard" | "premium";
  busLimit?: number;
  adminLimit?: number;
  additionalBusesPurchased?: number;
  retentionPeriodDays?: number; // Data retention window for telemetry & trip archiving
  brandingLogoUrl?: string;
  brandingPrimaryColor?: string;
  brandingHeaderText?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface IUser {
  _id?: string;
  orgId?: string; // Null for RIT Super Admin
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  isOnline?: boolean;
  assignedBusId?: string; // For Driver or Student favorite bus
  assignedRouteId?: string;
  shiftType?: "MORNING" | "EVENING" | "FULL_DAY" | "FLEX";
  shiftStart?: string;
  shiftEnd?: string;
  hasConsentedToLocationTracking?: boolean;
  consentTimestamp?: string;
  favoriteBusIds?: string[];
  avatarUrl?: string;
  mustChangePassword?: boolean;
  createdAt?: string;
}

export interface IStop {
  _id?: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  arrivalTimeEstimate?: string;
  order?: number;
  scheduledMinutesFromStart?: number;
}

export interface IRoute {
  _id?: string;
  orgId: string;
  name: string;
  routeCode: string;
  description?: string;
  stops: IStop[];
  polyline?: [number, number][]; // Array of [lat, lng] for OpenStreetMap Leaflet rendering
  totalDistanceKm?: number;
  estimatedDurationMins?: number;
  isActive: boolean;
}

export interface IBus {
  _id?: string;
  orgId: string;
  busNumber: string;
  registrationPlate: string;
  capacity: number;
  currentDriverId?: string;
  assignedRouteId?: string;
  status: BusStatus;
  qrCodeSecret: string; // Unique encoded cryptographic payload scanned by driver
  currentLocation?: {
    latitude: number;
    longitude: number;
    speed: number;
    heading: number;
    updatedAt: string;
  };
}

export interface ITripStopLog {
  stopName: string;
  scheduledMinutesFromStart?: number;
  actualMinutesFromStart?: number;
  status: "ON_TIME" | "DELAYED" | "EARLY";
  recordedAt?: string;
}

export interface ITrip {
  _id?: string;
  orgId: string;
  busId: string | IBus;
  driverId: string | IUser;
  routeId: string | IRoute;
  status: TripStatus;
  startTime?: string;
  endTime?: string;
  startLat?: number;
  startLng?: number;
  endLat?: number;
  endLng?: number;
  livePassengerCount?: number;
  distanceCoveredKm?: number;
  averageSpeedKmh?: number;
  onTimePercentage?: number;
  stopTimes?: ITripStopLog[];
  odometerStart?: number;
  odometerEnd?: number;
  fuelLitersAdded?: number;
  fuelCost?: number;
  driverNotes?: string;
  pausedAt?: string;
  isArchived?: boolean;
}

export interface IGPSLog {
  _id?: string;
  tripId: string;
  busId: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  accuracy: number;
  timestamp: string;
}

export type NotificationType = "INFO" | "WARNING" | "EMERGENCY" | "TRIP_START" | "TRIP_END" | "ETA_ALERT" | "ANNOUNCEMENT" | "SOS" | "GPS_SILENCE" | "OFFLINE_MID_TRIP" | "PROXIMITY_ALERT" | "GENERAL";

export interface INotification {
  _id?: string;
  orgId?: string;
  recipientRole?: UserRole;
  recipientId?: string; // Null implies org-wide or role-wide announcement
  title: string;
  message: string;
  type: NotificationType;
  read?: boolean;
  isRead?: boolean;
  meta?: {
    tripId?: string;
    busId?: string;
    driverId?: string;
    latitude?: number;
    longitude?: number;
  };
  createdAt: string;
}

export interface ITeamMember {
  name: string;
  role: string;
  title: string;
  bio: string;
  category: "EXECUTIVE" | "CORE_TEAM" | "MENTORSHIP" | "INSTITUTE";
  image?: string;
  linkedin?: string;
  github?: string;
}

export interface IAuditLog {
  _id?: string;
  userId?: string;
  userRole?: UserRole;
  orgId?: string;
  action: string;
  details: string;
  ipAddress?: string;
  createdAt?: string;
}

