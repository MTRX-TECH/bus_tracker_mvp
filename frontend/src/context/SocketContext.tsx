import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { SOCKET_EVENTS } from "@mtrx/shared";
import { useAuth } from "./AuthContext";

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  activeBusLocations: Record<string, any>;
  emergencyAlert: any | null;
  dismissEmergency: () => void;
  joinBusRoom: (busId: string) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [activeBusLocations, setActiveBusLocations] = useState<Record<string, any>>({});
  const [emergencyAlert, setEmergencyAlert] = useState<any | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const SOCKET_URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace("/api", "") : "http://localhost:5000";
    
    const socketInstance = io(SOCKET_URL, {
      withCredentials: true,
      reconnectionAttempts: 25,
      reconnectionDelay: 1000,
      transports: ["websocket", "polling"],
    });

    socketInstance.on("connect", () => {
      setIsConnected(true);
      if (user?.orgId) {
        socketInstance.emit(SOCKET_EVENTS.JOIN_ORG_ROOM, user.orgId);
      }
    });

    socketInstance.on("disconnect", () => {
      setIsConnected(false);
    });

    // Receive live GPS broadcasts down from drivers and telemetry engine
    const handleLocationUpdate = (data: any) => {
      const busId = data.busId || data.busNumber || data.tripId;
      if (!busId) return;
      setActiveBusLocations((prev) => ({
        ...prev,
        [busId]: {
          ...data,
          latitude: data.latitude || data.lat,
          longitude: data.longitude || data.lng,
          speed: data.speed || 0,
          updatedAt: new Date().toISOString(),
        },
      }));
    };

    socketInstance.on(SOCKET_EVENTS.LIVE_BUS_LOCATION, handleLocationUpdate);
    socketInstance.on("telemetry_update", handleLocationUpdate);

    // Built-in Web Audio API Alarm generator (no external audio file dependencies required)
    const playEmergencyAlarm = () => {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(800, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(400, audioCtx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
      } catch (e) {}

      if ("vibrate" in navigator) {
        navigator.vibrate([300, 100, 300, 100, 300]);
      }
    };

    // Listen for Emergency SOS alerts & Watchdog GPS Silence warnings!
    const handleEmergencyAlert = (alertData: any) => {
      setEmergencyAlert(alertData);
      playEmergencyAlarm();
    };

    socketInstance.on(SOCKET_EVENTS.EMERGENCY_ALERT_BROADCAST, handleEmergencyAlert);
    socketInstance.on("emergency_alert", handleEmergencyAlert);
    socketInstance.on("sos_broadcast", handleEmergencyAlert);

    socketRef.current = socketInstance;

    return () => {
      socketInstance.disconnect();
    };
  }, [user?.orgId, user?.email]);

  const joinBusRoom = (busId: string) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit(SOCKET_EVENTS.JOIN_BUS_ROOM, busId);
    }
  };

  const dismissEmergency = () => setEmergencyAlert(null);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, isConnected, activeBusLocations, emergencyAlert, dismissEmergency, joinBusRoom }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) throw new Error("useSocket must be used within a SocketProvider");
  return context;
};
