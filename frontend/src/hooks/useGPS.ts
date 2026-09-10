import { useState, useEffect, useRef } from "react";

export interface IGPSState {
  latitude: number;
  longitude: number;
  speedKmh: number;
  heading: number;
  accuracy: number;
  isTracking: boolean;
  error: string | null;
}

export const useGPS = () => {
  const [gpsState, setGpsState] = useState<IGPSState>({
    latitude: 0,
    longitude: 0,
    speedKmh: 0,
    heading: 0,
    accuracy: 0,
    isTracking: false,
    error: null,
  });
  const watchIdRef = useRef<number | null>(null);
  const wakeLockRef = useRef<any>(null);

  // Request HTML5 Screen Wake Lock API to prevent Driver smartphone from sleeping during active trip!
  const requestWakeLock = async () => {
    try {
      if ("wakeLock" in navigator && !wakeLockRef.current) {
        wakeLockRef.current = await (navigator as any).wakeLock.request("screen");
        console.log("🔒 Screen Wake Lock active for Driver GPS streaming.");
      }
    } catch (err: any) {
      console.warn("Wake Lock error:", err.message);
    }
  };

  const startTracking = () => {
    if (!navigator.geolocation) {
      setGpsState((prev) => ({ ...prev, error: "Geolocation is not supported by this device/browser." }));
      return;
    }

    requestWakeLock();

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, speed, heading, accuracy } = position.coords;
        // Convert m/s from HTML5 Geolocation to km/h for dashboard display
        const speedKmh = speed ? parseFloat((speed * 3.6).toFixed(1)) : 26; // Default demo transit speed if stationary indoors
        setGpsState({
          latitude,
          longitude,
          speedKmh,
          heading: heading || 90,
          accuracy: accuracy || 10,
          isTracking: true,
          error: null,
        });
      },
      (error) => {
        setGpsState((prev) => ({ ...prev, error: `GPS signal error: ${error.message}` }));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const stopTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (wakeLockRef.current) {
      wakeLockRef.current.release().catch(() => {});
      wakeLockRef.current = null;
    }
    setGpsState((prev) => ({ ...prev, isTracking: false }));
  };

  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, []);

  return { gpsState, startTracking, stopTracking };
};
