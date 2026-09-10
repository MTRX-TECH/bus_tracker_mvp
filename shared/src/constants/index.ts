// ============================================================================
// RIT - RIT Bus Tracker - Shared Constants & Team Metadata
// ============================================================================

export const SOCKET_EVENTS = {
  // Authentication & Room management
  JOIN_ORG_ROOM: "JOIN_ORG_ROOM",
  JOIN_TRIP_ROOM: "JOIN_TRIP_ROOM",
  JOIN_BUS_ROOM: "JOIN_BUS_ROOM",
  LEAVE_ROOM: "LEAVE_ROOM",

  // Driver Realtime Events (Upstream from Driver PWA)
  DRIVER_LOCATION_UPDATE: "DRIVER_LOCATION_UPDATE",
  DRIVER_START_TRIP: "DRIVER_START_TRIP",
  DRIVER_END_TRIP: "DRIVER_END_TRIP",
  DRIVER_SOS_EMERGENCY: "DRIVER_SOS_EMERGENCY",
  DRIVER_PASSENGER_COUNT_UPDATE: "DRIVER_PASSENGER_COUNT_UPDATE",

  // Broadcast Realtime Events (Downstream to Student, Parent, Admin)
  LIVE_BUS_LOCATION: "LIVE_BUS_LOCATION",
  TRIP_STATUS_CHANGED: "TRIP_STATUS_CHANGED",
  EMERGENCY_ALERT_BROADCAST: "EMERGENCY_ALERT_BROADCAST",
  BUS_APPROACHING_STOP: "BUS_APPROACHING_STOP",
  BUS_DELAYED_WARNING: "BUS_DELAYED_WARNING",
  ANNOUNCEMENT_RECEIVED: "ANNOUNCEMENT_RECEIVED",
} as const;

export const DEFAULT_SUPER_ADMIN = {
  EMAIL: "admin@mtrxtech.com",
  NAME: " (Founder & CEO)",
  ORG_NAME: "RIT SUPER ADMIN",
};

export const MTRX_TEAM_MEMBERS = [
  {
    name: "Manoj Kumar",
    role: "Developer",
    title: "B.E Mech 2025-2029 batch",
    bio: "Developer behind the transit tracking architecture.",
    category: "CORE_TEAM" as const,
  },
];

export const GEOFENCE_DEFAULT_RADIUS_METERS = 300;
export const GPS_STREAM_INTERVAL_MS = 3000; // Driver GPS emitted every 3 seconds
export const MAX_OFFLINE_BUFFER_ITEMS = 100;
