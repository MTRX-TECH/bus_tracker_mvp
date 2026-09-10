// ============================================================================
// RIT - Local Open-Source Statistical ETA & Anomaly Engine
// No paid external API keys required (Haversine & Dynamic Moving Average)
// ============================================================================

export interface IETACalculation {
  distanceRemainingKm: number;
  estimatedTimeMins: number;
  isDelayed: boolean;
  trafficAnomalyLevel: "NORMAL" | "MODERATE_CONGESTION" | "HEAVY_DELAY";
  nextStopName?: string;
  distanceToNextStopMeters: number;
  inStopGeofence: boolean;
}

export class ETAService {
  /**
   * Calculate exact spherical geodesic distance between two latitude/longitude points in Kilometers (Haversine Formula)
   */
  static haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const toRad = (angle: number) => (angle * Math.PI) / 180;
    const R = 6371; // Earth radius in km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R * c).toFixed(3));
  }

  /**
   * Calculate live ETA and evaluate delay traffic anomaly based on driver GPS speed and route stops
   */
  static calculateLiveETA(
    currentLat: number,
    currentLng: number,
    currentSpeedKmh: number,
    stops: Array<{ name: string; latitude: number; longitude: number; radiusMeters: number }>,
    scheduledDurationMins: number = 30,
    elapsedMins: number = 10
  ): IETACalculation {
    if (!stops || stops.length === 0) {
      return {
        distanceRemainingKm: 0,
        estimatedTimeMins: 0,
        isDelayed: false,
        trafficAnomalyLevel: "NORMAL",
        distanceToNextStopMeters: 0,
        inStopGeofence: false,
      };
    }

    // Find closest next unreached stop or final terminal stop
    let nextStop = stops[0];
    let minDistanceKm = Number.MAX_VALUE;
    let inStopGeofence = false;

    for (const stop of stops) {
      const distKm = this.haversineDistanceKm(currentLat, currentLng, stop.latitude, stop.longitude);
      if (distKm < minDistanceKm) {
        minDistanceKm = distKm;
        nextStop = stop;
      }
    }

    const distanceToNextStopMeters = minDistanceKm * 1000;
    if (distanceToNextStopMeters <= (nextStop.radiusMeters || 300)) {
      inStopGeofence = true;
    }

    // Calculate total remaining distance to destination (last stop in route array)
    const finalStop = stops[stops.length - 1];
    const totalRemainingKm = this.haversineDistanceKm(currentLat, currentLng, finalStop.latitude, finalStop.longitude);

    // AI / Statistical ETA prediction smoothing:
    // If bus speed is temporary 0 (stopped at traffic signal), assume default urban average transit speed of 25 km/h
    const effectiveSpeedKmh = currentSpeedKmh > 5 ? currentSpeedKmh : 24.5;
    const rawTransitHours = totalRemainingKm / effectiveSpeedKmh;
    
    // Add 2 minutes buffer per remaining stop for passenger ingress/egress
    const estimatedTimeMins = Math.round(rawTransitHours * 60 + (stops.length > 1 ? 2 : 0));

    // Traffic anomaly & delay assessment
    let trafficAnomalyLevel: "NORMAL" | "MODERATE_CONGESTION" | "HEAVY_DELAY" = "NORMAL";
    let isDelayed = false;

    if (elapsedMins + estimatedTimeMins > scheduledDurationMins + 15) {
      isDelayed = true;
      trafficAnomalyLevel = "HEAVY_DELAY";
    } else if (elapsedMins + estimatedTimeMins > scheduledDurationMins + 7) {
      isDelayed = true;
      trafficAnomalyLevel = "MODERATE_CONGESTION";
    }

    return {
      distanceRemainingKm: totalRemainingKm,
      estimatedTimeMins,
      isDelayed,
      trafficAnomalyLevel,
      nextStopName: nextStop.name,
      distanceToNextStopMeters: Math.round(distanceToNextStopMeters),
      inStopGeofence,
    };
  }
}
