import React, { useState, useEffect } from "react";
import { useSocket } from "../context/SocketContext";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { GlassCard } from "../components/GlassCard";
import { MapView } from "../components/MapView";
import { Bus, Clock, Navigation, Heart, Shield, Bell, AlertCircle, Phone, Compass, CheckCircle2, MapPin, Volume2 } from "lucide-react";

interface StudentDashboardProps {
  isGuest?: boolean;
  onExitGuest?: () => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ isGuest = false, onExitGuest }) => {
  const { user } = useAuth();
  const { activeBusLocations } = useSocket();
  const [activeTrips, setActiveTrips] = useState<any[]>([]);
  const [favoriteBusId, setFavoriteBusId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Proximity Arrival Alert System States
  const [proximityEnabled, setProximityEnabled] = useState<boolean>(false);
  const [selectedStop, setSelectedStop] = useState<any | null>(null);
  const [proximityMessage, setProximityMessage] = useState<string | null>(null);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);

  const fetchTrips = async () => {
    setLoading(true);
    try {
      const res = await api.get("/trips/active");
      if (res.data.success) {
        setActiveTrips(res.data.data);
      }
    } catch (e) {
      console.error("Failed to load live student trips");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrips();
    // Attempt to request user's browser geolocation for ultra-precise proximity alarms
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => console.warn("Geolocation permission denied, defaulting to selected bus stop coords.")
      );
    }
  }, []);

  // Sync real-time socket coordinates onto initial REST list
  const mergedTrips = activeTrips.map((trip) => {
    const busId = trip.busId?._id || trip.busId;
    const socketData = activeBusLocations[busId];
    if (socketData) {
      return {
        ...trip,
        liveLat: socketData.latitude,
        liveLng: socketData.longitude,
        speed: socketData.speed,
        heading: socketData.heading,
        etaInfo: socketData.etaInfo,
      };
    }
    return {
      ...trip,
      liveLat: trip.busId?.currentLocation?.latitude || trip.routeId?.stops?.[0]?.latitude || 0,
      liveLng: trip.busId?.currentLocation?.longitude || trip.routeId?.stops?.[0]?.longitude || 0,
      speed: trip.busId?.currentLocation?.speed || 0,
    };
  });

  // Calculate distance via Haversine formula in kilometers
  const calculateDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
  };

  // Play polite pleasant arrival chime
  const playArrivalChime = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.2); // E5
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.5);
    } catch (e) {}
  };

  // Proximity Alert Watchdog check on telemetry stream updates
  useEffect(() => {
    if (!proximityEnabled || mergedTrips.length === 0) return;

    // Use selected stop or user GPS or Ramco campus coordinate as target
    const targetLat = selectedStop?.latitude || userCoords?.lat || 9.4975;
    const targetLng = selectedStop?.longitude || userCoords?.lng || 77.5582;

    for (const trip of mergedTrips) {
      const busNum = trip.busId?.busNumber || "Bus";
      const dist = calculateDistanceKm(targetLat, targetLng, trip.liveLat, trip.liveLng);
      const etaMins = trip.etaInfo?.estimatedTimeMins || Math.round(dist * 2.5);

      if (dist <= 2.0 || etaMins <= 5) {
        const msg = `🚍 PROXIMITY ARRIVAL ALERT: ${busNum} is only ${dist} km away (~${etaMins} mins) from your boarding zone! Please proceed to the stop.`;
        if (proximityMessage !== msg) {
          setProximityMessage(msg);
          playArrivalChime();
          if ("vibrate" in navigator) {
            navigator.vibrate([200, 100, 200]);
          }
        }
        break;
      }
    }
  }, [mergedTrips, proximityEnabled, selectedStop, userCoords]);

  const defaultStops = mergedTrips[0]?.routeId?.stops || [];

  return (
    <div className="space-y-6 relative">
      {/* Guest / Public Passenger View Mode Banner */}
      {isGuest && (
        <div className="glass-panel p-4 sm:p-5 rounded-2xl border-2 border-gold-500/60 bg-gradient-to-r from-zinc-900 via-zinc-950 to-amber-950/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xl">
          <div className="flex items-center gap-3.5">
            <div className="p-3.5 rounded-2xl bg-gold-500/10 text-gold-400 border border-gold-500/40 shadow-inner shrink-0">
              <Compass size={28} className="animate-spin-slow text-gold-400" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-white tracking-wide">🎓 Student & Passenger Real-Time Transit View</h3>
              <p className="text-xs text-silver-300 leading-relaxed mt-0.5">No login required! Streaming dynamic live GPS telemetry and stop arrival predictions across campus routes.</p>
            </div>
          </div>
          {onExitGuest && (
            <button
              type="button"
              onClick={onExitGuest}
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-gold-500 via-amber-500 to-gold-400 hover:brightness-110 text-black font-black text-xs uppercase tracking-widest shadow-gold cursor-pointer shrink-0 flex items-center gap-2 transform active:scale-95 transition-all"
            >
              🔐 Staff & Admin SSO Login ➡️
            </button>
          )}
        </div>
      )}

      {/* High-Priority Floating Proximity Arrival Toast */}
      {proximityMessage && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md bg-gradient-to-r from-zinc-900 via-zinc-950 to-amber-950/90 border-2 border-gold-400 text-white p-5 rounded-2xl shadow-2xl shadow-gold-500/20 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-gold-500/20 text-gold-400 rounded-xl animate-bounce shrink-0">
              <Bell size={24} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-gold-400 flex items-center gap-1">
                  <Volume2 size={13} className="animate-pulse" /> Live Telemetry Alarm
                </span>
                <button
                  onClick={() => setProximityMessage(null)}
                  className="text-[11px] text-zinc-400 hover:text-white bg-zinc-800 px-2 py-0.5 rounded"
                >
                  Dismiss
                </button>
              </div>
              <p className="text-sm font-bold text-white mt-1 leading-relaxed">{proximityMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* Student Greeting Banner */}
      <GlassCard className="bg-gradient-to-r from-zinc-900 via-zinc-900 to-amber-950/20 border-gold-500/30">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-gold-400">🎓 Collegiate Transit Tracker</span>
            <h1 className="text-2xl font-bold text-white mt-0.5">Live Route & ETA Prediction</h1>
            <p className="text-xs text-silver-300">Tracking buses for: <strong className="text-white">{user?.orgName || (isGuest ? "All Active Campus Fleets (Public View)" : "Institutional Fleet")}</strong></p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                setProximityEnabled(!proximityEnabled);
                if (!proximityEnabled && !selectedStop && defaultStops.length > 0) {
                  setSelectedStop(defaultStops[0]);
                }
              }}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-lg ${
                proximityEnabled
                  ? "bg-gradient-to-r from-emerald-600 to-emerald-700 text-white border border-emerald-400/50 animate-pulse"
                  : "bg-gradient-to-r from-amber-500 to-gold-500 text-black font-extrabold hover:brightness-110"
              }`}
            >
              <Bell size={16} className={proximityEnabled ? "animate-bounce" : ""} />
              <span>{proximityEnabled ? "Proximity Radar Active (Armed)" : "Arm Proximity Arrival Alarm"}</span>
            </button>
            <div className="px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-silver-300 font-semibold">{mergedTrips.length} Active College Buses Online</span>
            </div>
          </div>
        </div>

        {/* Proximity Alarm Stop Selector Bar */}
        {proximityEnabled && (
          <div className="mt-4 pt-3 border-t border-zinc-800/80 flex flex-wrap items-center gap-3 text-xs bg-zinc-950/50 p-3 rounded-xl border border-amber-500/20">
            <MapPin size={15} className="text-gold-400 shrink-0" />
            <span className="text-silver-300 font-semibold">Select Boarding Stop for Proximity Alert Trigger:</span>
            <select
              value={selectedStop?.name || ""}
              onChange={(e) => {
                const stop = defaultStops.find((s: any) => s.name === e.target.value);
                setSelectedStop(stop || null);
              }}
              className="bg-zinc-900 text-gold-400 border border-gold-500/40 rounded-lg px-3 py-1 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-gold-500"
            >
              <option value="">-- Live Device GPS / Campus Center --</option>
              {defaultStops.map((stop: any, i: number) => (
                <option key={i} value={stop.name}>
                  {stop.name} (Stop {i + 1})
                </option>
              ))}
            </select>
            <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-mono ml-auto">
              <CheckCircle2 size={13} /> Audible Chime Ready
            </span>
          </div>
        )}
      </GlassCard>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Interactive OpenStreetMap Canvas */}
        <div className="lg:col-span-2">
          <GlassCard title="Real-Time Campus GPS Map" subtitle="Smooth marker interpolation without paid API keys">
            <MapView
              height="440px"
              buses={mergedTrips.map((t) => ({
                id: t.busId?._id || "1",
                busNumber: t.busId?.busNumber || "RIT-BUS-01",
                latitude: t.liveLat,
                longitude: t.liveLng,
                speed: t.speed || 25,
                heading: t.heading || 90,
                isDelayed: t.etaInfo?.isDelayed,
                etaMins: t.etaInfo?.estimatedTimeMins || 12,
              }))}
              routeStops={defaultStops}
              routePolyline={mergedTrips[0]?.routeId?.polyline || [
                [9.4532, 77.5521],
                [9.4680, 77.5540],
                [9.4975, 77.5582]
              ]}
            />
          </GlassCard>
        </div>

        {/* Live Telemetry & Favorite Bus Selector */}
        <div>
          <GlassCard title="Active Bus Schedules & ETA" subtitle="Select your preferred morning pickup route">
            {loading ? (
              <p className="text-xs text-gray-400 py-6 text-center">Checking active bus sensors...</p>
            ) : mergedTrips.length === 0 ? (
              <div className="text-center py-8 text-silver-400 text-xs">
                <Bus size={32} className="mx-auto mb-2 text-gray-600" />
                <p>No active bus trips currently live on road.</p>
                <p className="mt-1 text-[11px]">Drivers scan QR code before leaving terminal.</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[440px] overflow-y-auto pr-1">
                {mergedTrips.map((trip) => {
                  const busNum = trip.busId?.busNumber || "BUS-01";
                  const driverName = trip.driverId?.name || "Kumar Driver";
                  const driverPhone = trip.driverId?.phone || "+91-9443012345";
                  const etaMins = trip.etaInfo?.estimatedTimeMins || 12;
                  const isFav = favoriteBusId === trip._id;
                  const targetLat = selectedStop?.latitude || userCoords?.lat || 9.4975;
                  const targetLng = selectedStop?.longitude || userCoords?.lng || 77.5582;
                  const distKm = calculateDistanceKm(targetLat, targetLng, trip.liveLat, trip.liveLng);

                  return (
                    <div
                      key={trip._id}
                      className={`p-4 rounded-xl border transition-all ${
                        isFav ? "bg-amber-950/20 border-gold-500/60 shadow-lg shadow-gold-500/10" : "bg-zinc-900/80 border-zinc-800"
                      }`}
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-zinc-800/60">
                        <div className="flex items-center gap-2">
                          <Bus className="text-gold-400" size={18} />
                          <span className="font-bold text-white text-base">{busNum}</span>
                          {trip.etaInfo?.isDelayed && (
                            <span className="px-2 py-0.5 rounded text-[10px] bg-rose-500/20 text-rose-400 font-bold">Delayed</span>
                          )}
                        </div>
                        <button
                          onClick={() => setFavoriteBusId(isFav ? null : trip._id)}
                          className="p-1 text-gold-400 hover:scale-110 transition-transform"
                          title="Bookmark Favorite Bus"
                        >
                          <Heart size={18} fill={isFav ? "#D4AF37" : "transparent"} />
                        </button>
                      </div>

                      <div className="my-3 space-y-2 text-xs text-silver-300">
                        <p className="flex items-center justify-between">
                          <span className="text-gray-400">Route:</span>
                          <strong className="text-white truncate max-w-[170px]">{trip.routeId?.name || "Rajapalayam Route"}</strong>
                        </p>
                        <p className="flex items-center justify-between">
                          <span className="text-gray-400">Distance to Target:</span>
                          <strong className="text-gold-300 font-mono font-semibold">{distKm} km away</strong>
                        </p>
                        <p className="flex items-center justify-between">
                          <span className="text-gray-400">Next Stop ETA:</span>
                          <span className="text-emerald-400 font-mono font-bold text-sm flex items-center gap-1">
                            <Clock size={13} /> ~{etaMins} Minutes
                          </span>
                        </p>
                        <p className="flex items-center justify-between">
                          <span className="text-gray-400">Live Speed:</span>
                          <strong className="text-white">{trip.speed || 0} km/h</strong>
                        </p>
                        <p className="flex items-center justify-between">
                          <span className="text-gray-400">Driver Contact:</span>
                          <a href={`tel:${driverPhone}`} className="text-gold-400 hover:underline inline-flex items-center gap-1 font-medium">
                            <Phone size={11} /> {driverName}
                          </a>
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  );
};

export const ParentDashboard = StudentDashboard; // Adaptable responsive layout shares real-time ETA telemetry!
