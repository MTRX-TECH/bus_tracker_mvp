import React, { useState, useEffect, useRef } from "react";
import { useGPS } from "../hooks/useGPS";
import { useSocket } from "../context/SocketContext";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { GlassCard } from "../components/GlassCard";
import { SOCKET_EVENTS } from "@mtrx/shared";
import {
  QrCode,
  Play,
  Square,
  AlertTriangle,
  BatteryCharging,
  Radio,
  Compass,
  Clock,
  Pause,
  RefreshCw,
  Fuel,
  MapPin,
  WifiOff,
  CheckCircle2,
  FileText,
  Shield,
  X,
  Camera
} from "lucide-react";
import { Html5QrcodeScanner } from "html5-qrcode";

export const DriverDashboard: React.FC = () => {
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  const { gpsState, startTracking, stopTracking } = useGPS();

  const [activeTripId, setActiveTripId] = useState<string | null>(null);
  const [activeBus, setActiveBus] = useState<any | null>(null);
  const [activeRoute, setActiveRoute] = useState<any | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [qrSecretInput, setQrSecretInput] = useState("");
  const [isScanning, setIsScanning] = useState(false);

  // Live smartphone camera QR scanner lifecycle
  useEffect(() => {
    let scanner: any = null;
    let timer: any = null;
    if (isScanning && !activeTripId) {
      timer = setTimeout(() => {
        try {
          const readerEl = document.getElementById("reader");
          if (readerEl) {
            scanner = new Html5QrcodeScanner(
              "reader",
              { fps: 10, qrbox: { width: 240, height: 240 }, aspectRatio: 1.0 },
              false
            );
            scanner.render(
              (decodedText: string) => {
                if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
                setQrSecretInput(decodedText);
                setIsScanning(false);
                if (scanner) scanner.clear().catch(() => {});
              },
              (err: any) => {
                // Ignore routine frame read misses during camera positioning
              }
            );
          }
        } catch (e) {
          console.error("Error launching live camera scanner:", e);
        }
      }, 250);
    }
    return () => {
      if (timer) clearTimeout(timer);
      if (scanner) {
        scanner.clear().catch(() => {});
      }
    };
  }, [isScanning, activeTripId]);
  
  // Routes Selector State
  const [availableRoutes, setAvailableRoutes] = useState<any[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string>("");

  // Resilience & Control States
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [offlineQueueSize, setOfflineQueueSize] = useState<number>(0);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  // Fuel & Mileage Expense Logging Modal States
  const [isFuelModalOpen, setIsFuelModalOpen] = useState<boolean>(false);
  const [odometerStart, setOdometerStart] = useState("");
  const [odometerEnd, setOdometerEnd] = useState("");
  const [fuelLiters, setFuelLiters] = useState("");
  const [fuelCost, setFuelCost] = useState("");
  const [driverNotes, setDriverNotes] = useState("");
  const [submittingExpense, setSubmittingExpense] = useState(false);

  // Compliance & Telemetry Privacy State (Task 7)
  const [hasConsented, setHasConsented] = useState<boolean>(
    user?.hasConsentedToLocationTracking || false
  );
  const [submittingConsent, setSubmittingConsent] = useState(false);

  const handleGrantConsent = async () => {
    setSubmittingConsent(true);
    try {
      await api.post("/auth/consent");
      setHasConsented(true);
      if (user) user.hasConsentedToLocationTracking = true;
    } catch (err: any) {
      alert("Failed to submit compliance consent: " + (err.response?.data?.error || err.message));
    } finally {
      setSubmittingConsent(false);
    }
  };

  // Fetch institution transit routes upon mount
  useEffect(() => {
    const fetchRoutes = async () => {
      try {
        const res = await api.get("/routes");
        if (res.data.success) {
          setAvailableRoutes(res.data.data || []);
          if (res.data.data && res.data.data.length > 0) {
            setSelectedRouteId(res.data.data[0]._id || "");
          }
        }
      } catch (e) {
        console.error("Failed to fetch available routes:", e);
      }
    };
    fetchRoutes();

    // Check existing offline queue from browser LocalStorage
    const queue = JSON.parse(localStorage.getItem("rit_offline_gps_queue") || "[]");
    setOfflineQueueSize(queue.length);
  }, []);

  // Trip timer (stops incrementing when paused)
  useEffect(() => {
    let timer: any;
    if (activeTripId && !isPaused) {
      timer = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(timer);
    }
    return () => clearInterval(timer);
  }, [activeTripId, isPaused]);

  // PWA OFFLINE QUEUE SYNCHRONIZATION ENGINE
  const syncOfflineQueue = async () => {
    const queue: any[] = JSON.parse(localStorage.getItem("rit_offline_gps_queue") || "[]");
    if (queue.length === 0) return;

    if (navigator.onLine && socket && isConnected) {
      setSyncStatus(`⚡ Syncing ${queue.length} backordered GPS records...`);
      try {
        // Bulk or sequential re-sync to institutional database
        for (const log of queue) {
          socket.emit(SOCKET_EVENTS.DRIVER_LOCATION_UPDATE, log);
        }
        localStorage.removeItem("rit_offline_gps_queue");
        setOfflineQueueSize(0);
        setSyncStatus("✅ Offline cache synchronized successfully!");
        setTimeout(() => setSyncStatus(null), 4000);
      } catch (err) {
        console.warn("Retrying offline queue sync on next pulse.");
      }
    }
  };

  // Listen for online restore event
  useEffect(() => {
    window.addEventListener("online", syncOfflineQueue);
    if (isConnected) syncOfflineQueue();
    return () => window.removeEventListener("online", syncOfflineQueue);
  }, [isConnected, socket]);

  // Emit GPS to backend socket every 3 seconds while active & unpaused
  useEffect(() => {
    if (!activeTripId || !gpsState.isTracking || !activeBus || isPaused) return;

    const streamInterval = setInterval(() => {
      const payload = {
        tripId: activeTripId,
        busId: activeBus.id || activeBus._id,
        orgId: user?.orgId,
        latitude: gpsState.latitude || 9.4975,
        longitude: gpsState.longitude || 77.5582,
        speed: gpsState.speedKmh || 25,
        heading: gpsState.heading || 90,
        accuracy: gpsState.accuracy || 10,
        timestamp: new Date().toISOString(),
      };

      if (navigator.onLine && socket && isConnected) {
        socket.emit(SOCKET_EVENTS.DRIVER_LOCATION_UPDATE, payload);
      } else {
        // Cellular drop: Push immediately to offline LocalStorage queue
        const currentQueue = JSON.parse(localStorage.getItem("rit_offline_gps_queue") || "[]");
        currentQueue.push(payload);
        localStorage.setItem("rit_offline_gps_queue", JSON.stringify(currentQueue));
        setOfflineQueueSize(currentQueue.length);
      }
    }, 3000);

    return () => clearInterval(streamInterval);
  }, [activeTripId, gpsState, socket, isConnected, activeBus, user, isPaused]);

  const handleScanAndStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRouteId) {
      alert("⚠️ Please select your assigned transit destination route before starting.");
      return;
    }
    try {
      startTracking();
      const res = await api.post("/trips/scan-start", {
        qrSecret: qrSecretInput || "MTRX-SEC-BUS-RIT-01-V2", // Default fallback if field empty for demo testing
        routeId: selectedRouteId,
        startLat: gpsState.latitude || 9.4975,
        startLng: gpsState.longitude || 77.5582,
      });

      if (res.data.success) {
        setActiveTripId(res.data.data._id || res.data.data.trip?._id);
        setActiveBus(res.data.data.busId || { busNumber: "BUS-01", registrationPlate: "TN-67-MTRX-101" });
        setActiveRoute(availableRoutes.find((r) => r._id === selectedRouteId) || { name: "Assigned Campus Route" });
        setIsPaused(false);
        alert(`✅ Trip auto-initiated via QR Scan! Streaming live GPS telemetry to college dashboard.`);
      }
    } catch (err: any) {
      stopTracking();
      alert(`❌ Scan Failed: ${err.response?.data?.error || err.message}`);
    }
  };

  // Trip Pause / Resume Operational Resilience
  const handleTogglePause = async () => {
    if (!activeTripId) return;
    try {
      const endpoint = isPaused ? `/trips/${activeTripId}/resume` : `/trips/${activeTripId}/pause`;
      const res = await api.put(endpoint);
      if (res.data.success) {
        setIsPaused(!isPaused);
        if (isPaused) {
          startTracking();
        } else {
          stopTracking();
        }
      }
    } catch (err: any) {
      alert(`Error toggling trip pause state: ${err.response?.data?.error || err.message}`);
    }
  };

  const handleEndTrip = async () => {
    if (!activeTripId) return;
    if (!window.confirm("🏁 Confirm shift completion: Are you sure you want to end this transit trip and release vehicle?")) return;
    try {
      // Prompt if fuel log wasn't filled
      await api.post(`/trips/${activeTripId}/end`, {
        endLat: gpsState.latitude || 9.4975,
        endLng: gpsState.longitude || 77.5582,
      });
      stopTracking();
      setActiveTripId(null);
      setActiveBus(null);
      setActiveRoute(null);
      setIsPaused(false);
      setElapsedSeconds(0);
      alert("✅ Trip ended successfully. Vehicle status reset to Idle.");
    } catch (err) {
      alert("Error concluding trip session.");
    }
  };

  const handleTriggerSOS = () => {
    if (!activeBus) {
      alert("⚠️ Start a trip before sending an emergency SOS signal!");
      return;
    }
    if (window.confirm("🚨 URGENT: Are you sure you want to trigger an Emergency SOS distress alert across the entire organization?")) {
      api.post(`/trips/${activeTripId}/sos`, {
        lat: gpsState.latitude || 9.4975,
        lng: gpsState.longitude || 77.5582,
        reason: "Driver mobile console emergency panic switch deployed!",
      });
      socket?.emit(SOCKET_EVENTS.DRIVER_SOS_EMERGENCY, {
        tripId: activeTripId,
        busId: activeBus.id || activeBus._id,
        orgId: user?.orgId,
        driverName: user?.name || "Driver",
        lat: gpsState.latitude || 9.4975,
        lng: gpsState.longitude || 77.5582,
      });
      alert("🚨 Emergency SOS signal blasted to College Principal and Super Admin dashboards!");
    }
  };

  const handleSubmitExpenseLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTripId) {
      alert("⚠️ No active trip session selected to attach fuel expense record.");
      return;
    }
    setSubmittingExpense(true);
    try {
      const res = await api.post(`/trips/${activeTripId}/fuel-mileage`, {
        odometerStart: Number(odometerStart) || 0,
        odometerEnd: Number(odometerEnd) || 0,
        fuelLitersAdded: Number(fuelLiters) || 0,
        fuelCost: Number(fuelCost) || 0,
        driverNotes,
      });
      if (res.data.success) {
        setIsFuelModalOpen(false);
        alert("✅ Operating fuel and mileage expense record successfully uploaded to fleet analytics!");
      }
    } catch (err: any) {
      alert(`Failed to save expense log: ${err.response?.data?.error || err.message}`);
    } finally {
      setSubmittingExpense(false);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <div className="max-w-md mx-auto space-y-5 py-2 relative">
      {/* Mobile PWA Header */}
      <GlassCard className="text-center bg-gradient-to-b from-white to-black border-gray-200">
        <span className="text-[11px] font-semibold text-blue-600 uppercase tracking-[0.2em]">Driver Mobile PWA Console</span>
        <h1 className="text-xl font-bold text-gray-900 mt-1">{user?.name || "Professional Transit Driver"}</h1>
        <p className="text-xs text-gray-500">Assigned Organization: {user?.orgName || "Institutional Fleet"}</p>

        {/* Signal & Offline Cache Indicators */}
        <div className="flex flex-wrap items-center justify-center gap-3 mt-4 pt-4 border-t border-gray-200/80 text-xs">
          <div className="flex items-center gap-1.5 text-emerald-400 font-medium bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-500/30">
            <Radio size={13} className="animate-pulse" />
            <span>{isConnected ? "Socket Sync On" : "Reconnecting..."}</span>
          </div>
          <div className="flex items-center gap-1.5 text-blue-600 font-medium bg-amber-950/40 px-2.5 py-1 rounded-full border border-gray-200">
            <BatteryCharging size={13} />
            <span>Wake-Lock Ready</span>
          </div>
          {offlineQueueSize > 0 && (
            <div
              onClick={syncOfflineQueue}
              className="flex items-center gap-1.5 text-rose-300 font-bold bg-rose-950/80 px-3 py-1 rounded-full border border-rose-500 cursor-pointer animate-bounce shadow-lg w-full justify-center"
            >
              <WifiOff size={13} />
              <span>📶 Offline Cache: {offlineQueueSize} logs queued (Tap to Sync)</span>
            </div>
          )}
        </div>
        {syncStatus && <p className="text-[11px] text-gold-300 font-mono mt-2 animate-pulse">{syncStatus}</p>}
      </GlassCard>

      {!activeTripId ? (
        /* QR SCAN START TRIP FORM */
        <GlassCard title="Step 1: Scan Vehicle QR Code" subtitle="Initiate automated trip session and live GPS sharing">
          <form onSubmit={handleScanAndStart} className="space-y-4 mt-2">
            {/* Transit Route Assignment Dropdown */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-blue-600 uppercase tracking-wider flex items-center gap-1">
                <MapPin size={13} /> Select Assigned Transit Route:
              </label>
              <select
                value={selectedRouteId}
                onChange={(e) => setSelectedRouteId(e.target.value)}
                required
                className="w-full bg-gray-50 text-gray-900 border border-gray-300 rounded-xl px-3 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-gold-500"
              >
                <option value="" disabled>-- Choose Destination Route --</option>
                {availableRoutes.map((route) => (
                  <option key={route._id} value={route._id}>
                    {route.routeCode || "ROUTE"} — {route.name} ({route.stops?.length || 0} stops)
                  </option>
                ))}
                {availableRoutes.length === 0 && <option value="test-route">Main Rajapalayam Campus Route (Default)</option>}
              </select>
            </div>

            {/* Interactive Live Smartphone Camera Scanner Showcase */}
            {isScanning ? (
              <div className="p-4 rounded-2xl bg-white border-2 border-gray-200 shadow-md text-center relative overflow-hidden">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Camera className="text-blue-600 animate-pulse" size={20} />
                  <span className="text-xs font-black uppercase tracking-wider text-gray-900">Live Camera Scanner Active</span>
                </div>
                <div id="reader" className="w-full mx-auto rounded-xl overflow-hidden bg-gray-50 border border-gray-300 text-left min-h-[260px] text-gray-900 font-sans text-xs"></div>
                <p className="text-[11px] text-zinc-400 mt-3 font-medium">Position your mobile device camera directly facing the bus windshield sticker to extract QR secret automatically.</p>
                <button
                  type="button"
                  onClick={() => setIsScanning(false)}
                  className="mt-3 w-full py-2.5 rounded-xl bg-gray-100 hover:bg-zinc-700 text-red-400 font-extrabold text-xs uppercase tracking-wider transition-all cursor-pointer"
                >
                  ❌ Close Camera & Return
                </button>
              </div>
            ) : qrSecretInput ? (
              <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/60 text-center shadow-lg transition-all animate-in fade-in-50">
                <div className="w-12 h-12 bg-emerald-500 text-black rounded-full flex items-center justify-center mx-auto mb-2 shadow-md">
                  <CheckCircle2 size={30} className="stroke-[2.5]" />
                </div>
                <h4 className="text-sm font-black text-gray-900 uppercase tracking-wide">QR Data Extracted Successfully!</h4>
                <p className="text-[11px] text-emerald-300 font-mono mt-1.5 p-2 bg-white rounded-lg border border-emerald-500/30 font-bold truncate">Secret: {qrSecretInput}</p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setQrSecretInput(""); setIsScanning(true); }}
                    className="flex-1 py-2 px-3 bg-gray-100 hover:bg-zinc-700 text-blue-600 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Camera size={14} /> Scan Another Bus
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-5 rounded-2xl bg-gradient-to-b from-white to-black border-2 border-dashed border-gray-200 text-center shadow-lg">
                <div className="relative inline-block mb-2">
                  <div className="p-4 bg-blue-600 text-blue-600 rounded-full border border-gray-200 shadow-inner">
                    <Camera size={42} className="animate-bounce text-blue-600" />
                  </div>
                </div>
                <h4 className="text-sm font-extrabold text-gray-900 uppercase tracking-wide mt-1">Windshield Camera Scanner</h4>
                <p className="text-xs text-zinc-300 max-w-[260px] mx-auto mt-1 leading-relaxed">
                  Tap below to launch your camera viewfinder and automatically read the high-resolution QR sticker on the bus windshield.
                </p>
                <button
                  type="button"
                  onClick={() => setIsScanning(true)}
                  className="w-full mt-4 py-3.5 px-4 rounded-xl bg-gradient-to-r from-gold-500 via-amber-500 to-gold-400 hover:brightness-110 text-black font-black text-xs uppercase tracking-widest shadow-sm transition-all flex items-center justify-center gap-2 transform active:scale-95 cursor-pointer"
                >
                  <Camera size={18} /> 📷 Open Camera QR Scanner
                </button>
                <div className="mt-4 pt-3 border-t border-gray-200/80">
                  <p className="text-[11px] text-zinc-500 uppercase font-semibold mb-1">Or paste code manually for testing:</p>
                  <input
                    type="text"
                    value={qrSecretInput}
                    onChange={(e) => setQrSecretInput(e.target.value)}
                    className="w-full p-2.5 text-center text-xs font-mono bg-zinc-950 border border-gray-200 rounded-xl text-blue-600 font-bold focus:outline-none focus:border-gray-200"
                    placeholder="Paste secret (e.g. MTRX-BUS-QR-...)"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400 hover:brightness-110 text-black font-black text-sm uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer transform active:scale-95"
            >
              <Play size={18} fill="black" /> ⚡ Confirm & Launch Duty Shift
            </button>
          </form>
        </GlassCard>
      ) : (
        /* ACTIVE TRIP TELEMETRY & RESILIENCE CONSOLE */
        <div className="space-y-4">
          <GlassCard
            className={`transition-all duration-300 ${
              isPaused
                ? "bg-amber-950/30 border-2 border-amber-500/80 shadow-lg shadow-amber-500/10"
                : "bg-emerald-950/20 border-emerald-500/40"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <span
                  className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide border inline-flex items-center gap-1 ${
                    isPaused ? "bg-amber-500/20 text-amber-300 border-amber-400" : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                  }`}
                >
                  {isPaused ? <Pause size={12} className="animate-pulse" /> : "⚡"} {isPaused ? "TRIP PAUSED (OFF-DUTY/STOP)" : "Live Trip Active"}
                </span>
                <h3 className="text-lg font-bold text-gray-900 mt-2">
                  {activeBus?.busNumber || "RIT-BUS-01"} ({activeBus?.registrationPlate || "TN-67-101"})
                </h3>
                <p className="text-xs text-gray-600 truncate max-w-[200px]">Route: {activeRoute?.name || "Main Campus Route"}</p>
              </div>
              <div className="text-right">
                <span className="text-xs text-gray-600 flex items-center gap-1 justify-end">
                  <Clock size={12} /> Duration
                </span>
                <span className={`text-3xl font-mono font-black ${isPaused ? "text-amber-400" : "text-blue-600"}`}>
                  {formatTime(elapsedSeconds)}
                </span>
              </div>
            </div>

            {/* Real-time GPS HUD */}
            <div className="grid grid-cols-3 gap-2 mt-5 pt-4 border-t border-gray-200/80 text-center">
              <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-200">
                <span className="text-[10px] text-gray-600 uppercase font-semibold">Speed</span>
                <p className="text-base font-black text-gray-900">
                  {isPaused ? 0 : gpsState.speedKmh} <small className="text-[10px] font-normal">km/h</small>
                </p>
              </div>
              <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-200">
                <span className="text-[10px] text-gray-600 uppercase font-semibold">Heading</span>
                <p className="text-base font-black text-gray-900 flex items-center justify-center gap-1">
                  <Compass size={13} className="text-blue-600" /> {Math.round(gpsState.heading || 0)}°
                </p>
              </div>
              <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-200">
                <span className="text-[10px] text-gray-600 uppercase font-semibold">GPS Accuracy</span>
                <p className="text-base font-black text-emerald-400">±{Math.round(gpsState.accuracy || 10)}m</p>
              </div>
            </div>
          </GlassCard>

          {/* Operational Resilience Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            {/* Pause / Resume Button */}
            <button
              onClick={handleTogglePause}
              className={`py-3.5 px-3 rounded-xl font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer ${
                isPaused
                  ? "bg-emerald-600 hover:bg-emerald-500 text-gray-900 border border-emerald-400 animate-bounce"
                  : "bg-amber-600/90 hover:bg-amber-500 text-black border border-amber-400"
              }`}
            >
              {isPaused ? <Play size={16} fill="white" /> : <Pause size={16} fill="black" />}
              <span>{isPaused ? "Resume Transit" : "Pause Trip"}</span>
            </button>

            {/* Log Fuel & Mileage Expense Button */}
            <button
              onClick={() => setIsFuelModalOpen(true)}
              className="py-3.5 px-3 rounded-xl bg-gradient-to-r from-zinc-800 to-gray-50 hover:bg-gray-100 text-blue-600 border border-gray-200 font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md"
            >
              <Fuel size={16} className="text-blue-600 animate-pulse" />
              <span>Log Fuel / Expense</span>
            </button>
          </div>

          {/* Emergency SOS Distress Button */}
          <button
            onClick={handleTriggerSOS}
            className="w-full py-5 rounded-2xl bg-gradient-to-r from-rose-700 via-rose-600 to-rose-700 hover:from-rose-600 hover:to-rose-800 text-gray-900 font-extrabold text-base sm:text-lg tracking-wider uppercase shadow-md border-2 border-rose-400 flex items-center justify-center gap-2.5 animate-pulse transition-all cursor-pointer transform active:scale-95"
          >
            <AlertTriangle size={24} className="animate-bounce" /> Trigger Emergency SOS
          </button>

          {/* End Trip Action */}
          <button
            onClick={handleEndTrip}
            className="w-full py-4 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-600 hover:text-gray-900 font-black text-xs sm:text-sm uppercase tracking-widest border border-gray-300 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg hover:border-zinc-500"
          >
            <Square size={16} fill="currentColor" /> Conclude & Terminate Shift
          </button>
        </div>
      )}

      {/* FUEL & MILEAGE EXPENSE LOGGING MODAL */}
      {isFuelModalOpen && (
        <div className="fixed inset-0 bg-white backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-zinc-950 border border-amber-500/40 rounded-2xl p-6 shadow-md space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
              <div className="flex items-center gap-2 text-blue-600 font-bold">
                <Fuel size={20} />
                <h3 className="text-gray-900 text-base tracking-wider uppercase">Operating Expense Log</h3>
              </div>
              <button onClick={() => setIsFuelModalOpen(false)} className="text-zinc-400 hover:text-gray-900 p-1">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitExpenseLog} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-600 font-semibold block mb-1">Start Odometer (km):</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 45210"
                    value={odometerStart}
                    onChange={(e) => setOdometerStart(e.target.value)}
                    required
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 font-mono focus:border-gray-200 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-gray-600 font-semibold block mb-1">End Odometer (km):</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 45248"
                    value={odometerEnd}
                    onChange={(e) => setOdometerEnd(e.target.value)}
                    required
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 font-mono focus:border-gray-200 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-600 font-semibold block mb-1">Fuel Added (Liters):</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 25.5"
                    value={fuelLiters}
                    onChange={(e) => setFuelLiters(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 font-mono focus:border-gray-200 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-gray-600 font-semibold block mb-1">Total Fuel Cost (₹/$):</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 2450"
                    value={fuelCost}
                    onChange={(e) => setFuelCost(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 font-mono focus:border-gray-200 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-gray-600 font-semibold block mb-1">Route & Maintenance Notes:</label>
                <textarea
                  rows={3}
                  placeholder="Record any vehicle warning lights, tire pressure notes, or traffic incidents..."
                  value={driverNotes}
                  onChange={(e) => setDriverNotes(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:border-gray-200 focus:outline-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsFuelModalOpen(false)}
                  className="w-1/2 py-3 rounded-xl bg-gray-100 text-zinc-300 hover:bg-zinc-700 font-bold uppercase text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingExpense}
                  className="w-1/2 py-3 rounded-xl bg-gradient-to-r from-gold-500 to-amber-600 hover:brightness-110 text-black font-black uppercase text-xs shadow-sm transition-all flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 size={16} /> {submittingExpense ? "Saving..." : "Save Expense Log"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task 7: Mandatory Data Governance & Privacy Consent Modal */}
      {!hasConsented && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white backdrop-blur-md animate-fade-in">
          <div className="bg-gradient-to-b from-white to-black border-2 border-gray-200 rounded-3xl p-6 w-full max-w-sm shadow-md shadow-sm/20 text-left space-y-4">
            <div className="flex items-center gap-3 border-b border-gray-200 pb-3">
              <div className="p-2.5 bg-gradient-to-tr from-gold-500/20 to-amber-500/20 text-blue-600 rounded-2xl border border-gray-200">
                <Shield size={24} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Enterprise Telemetry</h3>
                <p className="text-[11px] text-blue-600 font-medium">Privacy & Compliance Disclosure</p>
              </div>
            </div>

            <div className="text-xs text-gray-600 space-y-2 leading-relaxed">
              <p>
                To comply with institutional vehicle telemetry & driver safety governance, RIT Bus Tracker requires continuous high-precision GPS tracking during official transit duty hours.
              </p>
              <div className="bg-zinc-950/80 border border-gray-200 p-3 rounded-xl space-y-1.5 text-[11px]">
                <div className="flex items-center gap-2 text-emerald-400 font-medium">
                  <CheckCircle2 size={13} /> Only active during official campus trips
                </div>
                <div className="flex items-center gap-2 text-emerald-400 font-medium">
                  <CheckCircle2 size={13} /> Auto-purging retention policies applied
                </div>
                <div className="flex items-center gap-2 text-emerald-400 font-medium">
                  <CheckCircle2 size={13} /> Encrypted real-time campus socket stream
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGrantConsent}
              disabled={submittingConsent}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-gold-500 via-amber-500 to-yellow-600 hover:brightness-110 text-black font-black uppercase text-xs tracking-wider shadow-sm transition-all flex items-center justify-center gap-2"
            >
              <Shield size={16} className="fill-black" />
              {submittingConsent ? "Recording Consent..." : "I Consent & Accept Terms"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

