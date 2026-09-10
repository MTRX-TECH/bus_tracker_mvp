import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { AboutTeamModal } from "./AboutTeamModal";
import { PasswordModal } from "./PasswordModal";
import { LogOut, Radio, Shield, Users, Bus, AlertTriangle, Bell, CheckCircle, Clock, Volume2, Key } from "lucide-react";
import { api } from "../services/api";
import { INotification } from "@mtrx/shared";

export const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const { isConnected, emergencyAlert, dismissEmergency } = useSocket();
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [dismissFirstLogin, setDismissFirstLogin] = useState(false);
  const [notifications, setNotifications] = useState<INotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isNotifOpen, setIsNotifOpen] = useState<boolean>(false);

  useEffect(() => {
    if (user?.mustChangePassword && !dismissFirstLogin) {
      setIsPasswordModalOpen(true);
    }
  }, [user, dismissFirstLogin]);

  // Fetch notifications for authenticated staff and administrators
  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const res = await api.get("/notifications");
      if (res.data.success) {
        setNotifications(res.data.data || []);
        setUnreadCount(res.data.unreadCount || 0);
      }
    } catch (e) {
      // Quiet fail if offline or unauthorized
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user, emergencyAlert]);

  const handleMarkAllRead = async () => {
    try {
      await api.put("/notifications/read-all");
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true, isRead: true })));
    } catch (e) {}
  };

  const handleMarkOneRead = async (id: string) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (e) {}
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full glass-panel border-b border-zinc-800/80 px-4 md:px-8 py-3.5 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo & Branding */}
          <div className="flex items-center gap-3">
            <img src="/rit-logo.png" alt="MTRX Brand Logo" className="w-11 h-11 object-cover rounded-2xl overflow-hidden shrink-0 border border-gold-500/40 shadow-lg shadow-gold-500/20 bg-black/50" />
            <div>
              <h1 className="text-lg md:text-xl font-bold tracking-wider gold-gradient-text">RIT Bus Tracker</h1>
              <p className="text-[10px] text-silver-400 tracking-[0.2em] uppercase font-medium">Developed by RIT</p>
            </div>
          </div>

          {/* Navigation & Persistent About Team Trigger */}
          <div className="flex items-center gap-2.5 sm:gap-4 md:gap-5">
            {/* Online socket streaming indicator */}
            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-zinc-900/90 border border-zinc-800 text-xs text-silver-300">
              <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
              <span>{isConnected ? "GPS Sync Online" : "Reconnecting..."}</span>
            </div>

            {/* Persistent Global "About Team" Button - Works Everywhere! */}
            <button
              onClick={() => setIsTeamModalOpen(true)}
              className="px-3.5 py-1.5 rounded-lg bg-gold-500/10 border border-gold-500/30 text-gold-400 hover:bg-gold-500 hover:text-black font-medium text-xs sm:text-sm transition-all shadow-sm flex items-center gap-1.5 duration-200"
            >
              <Users size={15} />
              <span className="hidden xs:inline">About us</span>
            </button>

            {/* Logged-In Admin / Staff Interactive Notification Center */}
            {user && (
              <div className="relative">
                <button
                  onClick={() => setIsNotifOpen(!isNotifOpen)}
                  className={`p-2 rounded-lg transition-all border relative ${
                    unreadCount > 0
                      ? "bg-amber-500/10 border-amber-500/40 text-gold-400 hover:bg-amber-500/20"
                      : "bg-zinc-800/80 border-zinc-700/50 text-gray-400 hover:text-white"
                  }`}
                  title="Notification & Alert Center"
                >
                  <Bell size={18} className={unreadCount > 0 ? "animate-bounce" : ""} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border border-black shadow-lg">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>

                {/* Glassmorphic Luxury Dropdown Menu */}
                {isNotifOpen && (
                  <div className="absolute right-0 mt-3 w-80 sm:w-96 rounded-2xl bg-zinc-950/95 border border-amber-500/30 shadow-2xl backdrop-blur-xl z-50 overflow-hidden divide-y divide-zinc-800 animate-in fade-in zoom-in-95 duration-150">
                    <div className="p-4 flex items-center justify-between bg-gradient-to-r from-zinc-900 via-zinc-900/80 to-zinc-900 text-white">
                      <div className="flex items-center gap-2">
                        <Bell size={16} className="text-gold-400" />
                        <h3 className="font-bold text-sm text-white tracking-wide">RIT ALERT CENTER</h3>
                      </div>
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllRead}
                          className="text-[11px] font-medium text-gold-400 hover:text-gold-300 flex items-center gap-1 bg-zinc-800/80 px-2 py-1 rounded transition-colors"
                        >
                          <CheckCircle size={12} />
                          <span>Acknowledge All</span>
                        </button>
                      )}
                    </div>

                    <div className="max-h-[360px] overflow-y-auto divide-y divide-zinc-900/80">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center text-silver-400 text-xs">
                          No active emergency alarms or transit warnings.
                        </div>
                      ) : (
                        notifications.map((n) => {
                          const isEmergency = n.type === "SOS" || n.type === "OFFLINE_MID_TRIP" || n.type === "EMERGENCY";
                          return (
                            <div
                              key={n._id}
                              onClick={() => n._id && handleMarkOneRead(n._id)}
                              className={`p-3.5 transition-colors cursor-pointer flex gap-3 ${
                                !n.read && !n.isRead
                                  ? isEmergency
                                    ? "bg-rose-950/40 hover:bg-rose-950/60 border-l-4 border-rose-500"
                                    : "bg-amber-950/20 hover:bg-amber-950/30 border-l-4 border-amber-500"
                                  : "bg-zinc-900/30 hover:bg-zinc-900/60 text-zinc-400"
                              }`}
                            >
                              <div className="shrink-0 mt-0.5">
                                {n.type === "SOS" ? (
                                  <AlertTriangle size={18} className="text-rose-500 animate-pulse" />
                                ) : n.type === "OFFLINE_MID_TRIP" ? (
                                  <Radio size={18} className="text-amber-500" />
                                ) : (
                                  <Bell size={18} className="text-silver-400" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1 mb-1">
                                  <span className={`text-xs font-bold truncate ${isEmergency ? "text-rose-300" : "text-white"}`}>
                                    {n.title}
                                  </span>
                                  <span className="text-[10px] text-zinc-500 shrink-0 flex items-center gap-0.5">
                                    <Clock size={10} />
                                    {new Date(n.createdAt || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                  </span>
                                </div>
                                <p className="text-xs text-silver-300 line-clamp-3 leading-relaxed">{n.message}</p>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    <div className="p-2.5 bg-zinc-900/50 text-center text-[10px] text-zinc-500 font-mono uppercase tracking-widest">
                      Real-Time Safety Telemetry Engine Active
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Logged in User actions */}
            {user && (
              <div className="flex items-center gap-3 pl-2 border-l border-zinc-800">
                <div className="hidden lg:flex flex-col text-right">
                  <span className="text-xs font-semibold text-white truncate max-w-[150px]">{user.name}</span>
                  <span className="text-[10px] text-gold-400 uppercase tracking-wider">{user.role}</span>
                </div>
                <button
                  onClick={() => setIsPasswordModalOpen(true)}
                  className="p-2 rounded-lg bg-zinc-800/80 hover:bg-gold-500/20 hover:text-gold-400 hover:border hover:border-gold-500/30 transition-all text-gray-400"
                  title="Change Security Password"
                >
                  <Key size={17} />
                </button>
                <button
                  onClick={() => logout()}
                  className="p-2 rounded-lg bg-zinc-800/80 hover:bg-rose-500/20 hover:text-rose-400 hover:border hover:border-rose-500/30 transition-all text-gray-400"
                  title="Logout session"
                >
                  <LogOut size={17} />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Emergency SOS Banner Broadcast Overlay */}
      {emergencyAlert && (
        <div className="bg-gradient-to-r from-rose-700 via-rose-600 to-rose-700 border-b-2 border-rose-400 text-white px-4 py-3 shadow-2xl flex flex-wrap items-center justify-between gap-3 z-50 animate-pulse">
          <div className="flex items-center gap-3 text-sm md:text-base font-bold tracking-wide">
            <div className="p-2 bg-black/40 rounded-lg text-amber-300 animate-bounce">
              <AlertTriangle size={22} />
            </div>
            <div>
              <div className="uppercase tracking-widest text-xs text-amber-300 font-extrabold flex items-center gap-1.5">
                <Volume2 size={14} className="animate-ping" />
                <span>LIVE HIGH-PRIORITY SAFETY ALARM</span>
              </div>
              <div className="mt-0.5">
                🚨 EMERGENCY SOS ON BUS <span className="underline decoration-amber-400 font-black">{emergencyAlert.busNumber || emergencyAlert.busId || "UNKNOWN"}</span>
                {emergencyAlert.driverName ? ` BY DRIVER ${emergencyAlert.driverName}` : ""}! 
                {emergencyAlert.latitude || emergencyAlert.coordinates ? ` GPS: [${emergencyAlert.latitude || emergencyAlert.coordinates?.lat}, ${emergencyAlert.longitude || emergencyAlert.coordinates?.lng}]` : ""}
              </div>
            </div>
          </div>
          <button
            onClick={dismissEmergency}
            className="px-4 py-2 bg-black/60 hover:bg-black/90 text-amber-400 border border-amber-400/50 rounded-lg font-bold text-xs uppercase tracking-wider transition-all shadow-lg hover:scale-105"
          >
            Acknowledge & Silence Alarm
          </button>
        </div>
      )}

      {/* Persistent Global Modal Render */}
      <AboutTeamModal isOpen={isTeamModalOpen} onClose={() => setIsTeamModalOpen(false)} />
      
      {/* Enterprise Security & Password Management Modal */}
      <PasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => {
          setIsPasswordModalOpen(false);
          setDismissFirstLogin(true);
        }}
        mode="change"
        isFirstLogin={!!user?.mustChangePassword && !dismissFirstLogin}
      />
    </>
  );
};
