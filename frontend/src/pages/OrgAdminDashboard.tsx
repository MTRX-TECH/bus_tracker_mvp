import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import { GlassCard } from "../components/GlassCard";
import { MapView } from "../components/MapView";
import { Bus, QrCode, MapPin, Plus, Download, Radio, Eye, Route as RouteIcon, BarChart3, Clock, Calendar, Filter, FileText, Table as TableIcon, CheckCircle2, Navigation, Users, ShieldCheck, Upload, UserCheck, RefreshCw, X, FileSpreadsheet, Settings, Award, Flame, Timer, TrendingUp, Trash2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import html2canvas from "html2canvas";

export const OrgAdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"fleet" | "routes" | "drivers" | "audit" | "reports">("fleet");

  // Fleet state
  const [buses, setBuses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQR, setSelectedQR] = useState<any | null>(null);
  const [showNewBusModal, setShowNewBusModal] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState<string | null>(null);
  const [newBusForm, setNewBusForm] = useState({
    busNumber: "",
    registrationPlate: "",
    capacity: 45,
  });

  // Routes state
  const [routes, setRoutes] = useState<any[]>([]);
  const [showNewRouteModal, setShowNewRouteModal] = useState(false);
  const [newRouteForm, setNewRouteForm] = useState({
    name: "",
    routeCode: "",
    description: "",
    estimatedDurationMins: 45,
    stops: [
      { name: "Main Gate Departure", latitude: 9.4975, longitude: 77.5582, radiusMeters: 300, order: 1, scheduledMinutesFromStart: 0 },
      { name: "Campus Core Arrival", latitude: 9.5012, longitude: 77.562, radiusMeters: 300, order: 2, scheduledMinutesFromStart: 25 },
    ],
  });

  // Analytics & Reports state
  const [analytics, setAnalytics] = useState<any>({ count: 0, kpis: {}, data: [] });
  const [filters, setFilters] = useState({ startDate: "", endDate: "", status: "" });
  const [reportsLoading, setReportsLoading] = useState(false);

  const fetchBuses = async () => {
    setLoading(true);
    try {
      const res = await api.get("/buses");
      if (res.data.success) setBuses(res.data.data);
    } catch (e) {
      console.error("Failed to fetch fleet buses");
    } finally {
      setLoading(false);
    }
  };

  const fetchRoutes = async () => {
    try {
      const res = await api.get("/routes");
      if (res.data.success) setRoutes(res.data.data);
    } catch (e) {
      console.error("Failed to fetch routes");
    }
  };

  const fetchAnalytics = async () => {
    setReportsLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (filters.startDate) queryParams.append("startDate", filters.startDate);
      if (filters.endDate) queryParams.append("endDate", filters.endDate);
      if (filters.status) queryParams.append("status", filters.status);

      const res = await api.get(`/reports/analytics?${queryParams.toString()}`);
      if (res.data.success) setAnalytics(res.data);
    } catch (e) {
      console.error("Failed to load analytics");
    } finally {
      setReportsLoading(false);
    }
  };

  // Drivers & Duty Shift Assignment state
  const [drivers, setDrivers] = useState<any[]>([]);
  const [driversLoading, setDriversLoading] = useState(false);
  const [selectedDriverForShift, setSelectedDriverForShift] = useState<any | null>(null);
  const [shiftForm, setShiftForm] = useState({ assignedBusId: "", assignedRouteId: "", shiftType: "FULL_DAY", shiftStart: "06:00 AM", shiftEnd: "06:00 PM" });

  // Manual Driver Onboarding state
  const [showNewDriverModal, setShowNewDriverModal] = useState(false);
  const [newDriverForm, setNewDriverForm] = useState({ name: "", email: "", phone: "", assignedBusId: "", shiftType: "FULL_DAY" });
  const [newDriverCreatedModal, setNewDriverCreatedModal] = useState<any | null>(null);
  const [driverCreating, setDriverCreating] = useState(false);

  // Governance Audit Trails state
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  // Bulk CSV Onboarding modal state
  const [showCSVModal, setShowCSVModal] = useState<{ isOpen: boolean; type: "drivers" | "buses" }>({ isOpen: false, type: "drivers" });
  const [csvInput, setCsvInput] = useState("");
  const [csvImporting, setCsvImporting] = useState(false);

  // Data Retention & Institutional Governance State (Tasks 7 & 8)
  const [retentionDays, setRetentionDays] = useState(60);
  const [brandingLogo, setBrandingLogo] = useState("");
  const [brandingColor, setBrandingColor] = useState("#D4AF37");
  const [brandingHeader, setBrandingHeader] = useState("RIT Campus Transit Engine");
  const [savingGovernance, setSavingGovernance] = useState(false);
  const [purgingRetention, setPurgingRetention] = useState(false);
  const [purgeResult, setPurgeResult] = useState<string | null>(null);

  const handleSaveGovernance = async () => {
    if (!user?.orgId) return;
    setSavingGovernance(true);
    try {
      const res = await api.put(`/organizations/${user.orgId}/governance`, {
        retentionPeriodDays: retentionDays,
        brandingLogoUrl: brandingLogo,
        brandingPrimaryColor: brandingColor,
        brandingHeaderText: brandingHeader,
      });
      if (res.data.success) {
        alert("✅ Enterprise Data Retention policy and Institutional Branding themes saved successfully!");
        fetchAuditLogs();
      }
    } catch (err: any) {
      alert("Failed to save governance policies: " + (err.response?.data?.error || err.message));
    } finally {
      setSavingGovernance(false);
    }
  };

  const handleRunRetentionPurge = async () => {
    if (!user?.orgId) return;
    if (!window.confirm(`⚠️ Execute Data Governance Purge? This will permanently expunge obsolete raw GPS logs older than ${retentionDays} days and archive historical trips.`)) return;
    setPurgingRetention(true);
    try {
      const res = await api.post(`/organizations/${user.orgId}/retention-purge`);
      if (res.data.success) {
        setPurgeResult(res.data.message);
        fetchAuditLogs();
      }
    } catch (err: any) {
      alert("Failed to execute retention purge: " + (err.response?.data?.error || err.message));
    } finally {
      setPurgingRetention(false);
    }
  };

  const fetchDrivers = async () => {
    if (!user?.orgId) return;
    setDriversLoading(true);
    try {
      const res = await api.get(`/organizations/${user.orgId}/users`);
      if (res.data.success) {
        setDrivers((res.data.data || []).filter((u: any) => u.role === "DRIVER" || u.role === "ORG_ADMIN"));
      }
    } catch (e) {
      console.error("Failed to load staff drivers");
    } finally {
      setDriversLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    if (!user?.orgId) return;
    setAuditLoading(true);
    try {
      const res = await api.get(`/organizations/${user.orgId}/audit-logs`);
      if (res.data.success) setAuditLogs(res.data.data || []);
    } catch (e) {
      console.error("Failed to load governance audit trail");
    } finally {
      setAuditLoading(false);
    }
  };

  useEffect(() => {
    fetchBuses();
    fetchRoutes();
    fetchAnalytics();
    if (user?.orgId) {
      fetchDrivers();
      fetchAuditLogs();
    }
  }, [user?.orgId]);

  const handleGenerateQR = async (busId: string) => {
    try {
      const res = await api.get(`/buses/${busId}/qrcode`);
      if (res.data.success) setSelectedQR(res.data.data);
    } catch (e) {
      alert("Failed to generate cryptographic QR data URL.");
    }
  };

  const handleDownloadFullSticker = async () => {
    const element = document.getElementById("windshield-qr-card");
    if (!element || !selectedQR) return;
    try {
      const canvas = await html2canvas(element, {
        scale: 3, // 3x ultra-high resolution for crystal clear windshield printing
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });
      const image = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = image;
      link.download = `RIT_Windshield_Card_${selectedQR.busNumber.replace(/\s+/g, "_")}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert("Error generating downloadable printable card image.");
    }
  };

  const handleAddBus = async (e: React.FormEvent) => {
    e.preventDefault();
    const tempId = `temp-${Date.now()}`;
    const optimisticBus = {
      _id: tempId,
      ...newBusForm,
      registrationPlate: newBusForm.registrationPlate.toUpperCase(),
      status: "IDLE",
    };
    // Optimistic zero-latency update
    setBuses((prev) => [optimisticBus, ...prev]);
    setShowNewBusModal(false);
    try {
      const res = await api.post("/buses", newBusForm);
      if (res.data.success) {
        setBuses((prev) => prev.map((b) => (b._id === tempId ? res.data.data : b)));
        fetchBuses();
      }
    } catch (err: any) {
      setBuses((prev) => prev.filter((b) => b._id !== tempId));
      const errorMsg = err.response?.data?.error || err.message || "";
      if (err.response?.status === 403 || errorMsg.includes("PLAN_LIMIT_REACHED") || errorMsg.includes("maximum of")) {
        setShowUpgradePrompt(errorMsg.replace("PLAN_LIMIT_REACHED:", "").trim());
      } else {
        alert(`Error enrolling bus: ${errorMsg}`);
      }
    }
  };

  const handleDeleteBus = async (busId: string, busNumber: string) => {
    if (!window.confirm(`⚠️ Are you sure you want to permanently remove Bus ${busNumber} from your institutional transport fleet?`)) return;
    const previousBuses = [...buses];
    // Instant optimistic removal
    setBuses((prev) => prev.filter((b) => b._id !== busId));
    try {
      await api.delete(`/buses/${busId}`);
    } catch (err: any) {
      alert(`Error removing bus: ${err.response?.data?.error || err.message}`);
      setBuses(previousBuses);
    }
  };

  const handleCreateDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.orgId) return;
    setDriverCreating(true);
    try {
      const res = await api.post(`/organizations/${user.orgId}/users`, { ...newDriverForm, role: "DRIVER" });
      if (res.data.success) {
        setDrivers((prev) => [res.data.data, ...prev]);
        setShowNewDriverModal(false);
        setNewDriverCreatedModal({
          name: res.data.data.name || newDriverForm.name,
          email: res.data.data.email || newDriverForm.email,
          password: res.data.data.password || "MtrxStaff@2026!",
          role: "DRIVER",
        });
        setNewDriverForm({ name: "", email: "", phone: "", assignedBusId: "", shiftType: "FULL_DAY" });
        fetchDrivers();
        fetchAuditLogs();
      }
    } catch (err: any) {
      alert(`Error manually adding driver: ${err.response?.data?.error || err.message}`);
    } finally {
      setDriverCreating(false);
    }
  };

  const handleCreateRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    const tempId = `temp-route-${Date.now()}`;
    const optimisticRoute = { _id: tempId, ...newRouteForm };
    setRoutes((prev) => [optimisticRoute, ...prev]);
    setShowNewRouteModal(false);
    try {
      const res = await api.post("/routes", newRouteForm);
      if (res.data.success) {
        setRoutes((prev) => prev.map((r) => (r._id === tempId ? res.data.data : r)));
        fetchRoutes();
      }
    } catch (err: any) {
      setRoutes((prev) => prev.filter((r) => r._id !== tempId));
      alert(`Route creation error: ${err.response?.data?.error || err.message}`);
    }
  };

  const handleAssignRoute = async (busId: string, routeId: string) => {
    // Instant zero-latency UI reflection
    setBuses((prev) => prev.map((b) => (b._id === busId ? { ...b, assignedRouteId: routeId || null } : b)));
    try {
      await api.post(`/routes/${routeId || ""}/assign`, { busId });
      fetchBuses();
    } catch (err: any) {
      fetchBuses();
    }
  };

  const handleExportReport = async (format: "pdf" | "xlsx") => {
    try {
      const queryParams = new URLSearchParams({ format });
      if (filters.startDate) queryParams.append("startDate", filters.startDate);
      if (filters.endDate) queryParams.append("endDate", filters.endDate);
      if (filters.status) queryParams.append("status", filters.status);

      const res = await api.get(`/reports/export?${queryParams.toString()}`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `RIT_Enterprise_Report.${format === "xlsx" ? "xlsx" : "pdf"}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      alert("Failed to export Report file.");
    }
  };

  const handleAssignDriverShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.orgId || !selectedDriverForShift) return;
    const driverId = selectedDriverForShift._id;
    // Optimistic instant UI update
    setDrivers((prev) =>
      prev.map((d) => (d._id === driverId ? { ...d, ...shiftForm } : d))
    );
    setSelectedDriverForShift(null);
    try {
      await api.put(`/organizations/${user.orgId}/drivers/${driverId}/shift`, shiftForm);
      fetchDrivers();
      fetchAuditLogs();
    } catch (err: any) {
      alert(`Error updating assignment: ${err.response?.data?.error || err.message}`);
      fetchDrivers();
    }
  };

  const handleBulkCSVImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.orgId) return;
    setCsvImporting(true);
    try {
      const lines = csvInput.trim().split("\n").filter((l) => l.trim().length > 0);
      if (showCSVModal.type === "drivers") {
        const parsedDrivers = lines.map((line) => {
          const parts = line.split(",").map((s) => s.trim());
          return { name: parts[0] || "New Driver", email: parts[1] || `driver_${Date.now()}@college.edu`, phone: parts[2] || "", shiftType: parts[3] || "FULL_DAY" };
        });
        const res = await api.post(`/organizations/${user.orgId}/import-drivers`, { drivers: parsedDrivers });
        alert(`✅ Bulk Imported ${res.data.data?.created?.length || 0} drivers successfully!`);
        fetchDrivers();
      } else {
        const parsedBuses = lines.map((line) => {
          const parts = line.split(",").map((s) => s.trim());
          return { busNumber: parts[0] || "BUS-99", registrationPlate: parts[1] || "TN-67-TEMP-000", capacity: Number(parts[2]) || 45 };
        });
        const res = await api.post(`/organizations/${user.orgId}/import-buses`, { buses: parsedBuses });
        alert(`✅ Bulk Imported ${res.data.data?.created?.length || 0} transit vehicles successfully!`);
        fetchBuses();
      }
      setShowCSVModal({ isOpen: false, type: "drivers" });
      setCsvInput("");
      fetchAuditLogs();
    } catch (err: any) {
      alert(`Bulk Import Error: ${err.response?.data?.error || err.message}`);
    } finally {
      setCsvImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Luxury Navigation Tabs */}
      <div className="flex bg-[#121212] border border-gray-200 rounded-2xl p-1.5 shadow-sm gap-1 max-w-4xl mx-auto overflow-x-auto">
        <button
          onClick={() => setActiveTab("fleet")}
          className={`flex-1 min-w-[140px] py-2.5 px-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
            activeTab === "fleet" ? "bg-gradient-to-r from-gold-500 via-amber-500 to-gold-400 text-black shadow-lg" : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
          }`}
        >
          <Bus size={15} /> Fleet Command
        </button>
        <button
          onClick={() => setActiveTab("routes")}
          className={`flex-1 min-w-[140px] py-2.5 px-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
            activeTab === "routes" ? "bg-gradient-to-r from-gold-500 via-amber-500 to-gold-400 text-black shadow-lg" : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
          }`}
        >
          <RouteIcon size={15} /> Route Intelligence
        </button>
        <button
          onClick={() => setActiveTab("drivers")}
          className={`flex-1 min-w-[140px] py-2.5 px-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
            activeTab === "drivers" ? "bg-gradient-to-r from-gold-500 via-amber-500 to-gold-400 text-black shadow-lg" : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
          }`}
        >
          <Users size={15} /> Staff & Shifts
        </button>
        <button
          onClick={() => setActiveTab("audit")}
          className={`flex-1 min-w-[140px] py-2.5 px-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
            activeTab === "audit" ? "bg-gradient-to-r from-gold-500 via-amber-500 to-gold-400 text-black shadow-lg" : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
          }`}
        >
          <ShieldCheck size={15} /> Governance Audit
        </button>
        <button
          onClick={() => setActiveTab("reports")}
          className={`flex-1 min-w-[140px] py-2.5 px-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
            activeTab === "reports" ? "bg-gradient-to-r from-gold-500 via-amber-500 to-gold-400 text-black shadow-lg" : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
          }`}
        >
          <BarChart3 size={15} /> Analytics & Reports
        </button>
      </div>


      {/* TAB 1: FLEET COMMAND */}
      {activeTab === "fleet" && (
        <>
          <GlassCard title="College Transportation Fleet Command" subtitle="Live monitoring and QR security administration for institutional buses">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                <span className="text-xs text-gray-600 uppercase">Total Enrolled Buses</span>
                <p className="text-2xl font-bold text-blue-600 mt-1">{buses.length}</p>
              </div>
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                <span className="text-xs text-gray-600 uppercase">On Active Transit</span>
                <p className="text-2xl font-bold text-emerald-400 mt-1">
                  {buses.filter((b) => b.status === "ON_TRIP").length}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-between gap-2">
                <div>
                  <span className="text-xs text-gray-600 uppercase">QR Cryptographic Shield</span>
                  <p className="text-sm font-bold text-gray-900 mt-1">Active (SHA-256 Seed)</p>
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  <button
                    onClick={() => setShowNewBusModal(true)}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 text-black text-[11px] font-bold hover:bg-blue-700 flex items-center justify-center gap-1 shadow-sm cursor-pointer"
                  >
                    <Plus size={14} /> Add Bus
                  </button>
                  <button
                    onClick={() => { setCsvInput(""); setShowCSVModal({ isOpen: true, type: "buses" }); }}
                    className="px-2.5 py-1.5 rounded-lg bg-gray-100 border border-gray-200 text-blue-600 hover:bg-zinc-700 text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer"
                  >
                    <Upload size={13} /> Bulk CSV Import
                  </button>
                </div>
              </div>
            </div>
          </GlassCard>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <GlassCard title="Real-Time Institutional Fleet Map" subtitle="OpenStreetMap high-frequency interpolation">
                <MapView
                  height="400px"
                  buses={buses.map((b) => ({
                    id: b._id,
                    busNumber: b.busNumber,
                    latitude: b.currentLocation?.latitude || 9.4975,
                    longitude: b.currentLocation?.longitude || 77.5582,
                    speed: b.currentLocation?.speed || 0,
                    heading: b.currentLocation?.heading || 90,
                  }))}
                />
              </GlassCard>
            </div>

            <div>
              <GlassCard title="Enrolled Fleet & Route Binding" subtitle="Assign routes and download windshield codes">
                {loading ? (
                  <p className="text-xs text-gray-600">Loading bus records...</p>
                ) : (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                    {buses.map((bus) => (
                      <div key={bus._id} className="p-3 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-bold text-gray-900 text-sm">{bus.busNumber}</h4>
                            <p className="text-[11px] font-mono text-blue-600">{bus.registrationPlate}</p>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${bus.status === "ON_TRIP" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-gray-100 text-gray-600"}`}>
                            {bus.status}
                          </span>
                        </div>

                        {/* Route Selector Binding */}
                        <div className="flex items-center gap-2 pt-1 border-t border-gray-200/70">
                          <select
                            value={bus.assignedRouteId?._id || bus.assignedRouteId || ""}
                            onChange={(e) => handleAssignRoute(bus._id, e.target.value)}
                            className="flex-1 text-xs bg-zinc-950 text-gray-600 rounded border border-gray-200 p-1.5 font-medium"
                          >
                            <option value="">-- No Route Attached --</option>
                            {routes.map((r) => (
                              <option key={r._id} value={r._id}>📍 {r.routeCode}: {r.name}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleGenerateQR(bus._id)}
                            className="p-1.5 px-2.5 rounded-lg bg-blue-600 hover:bg-blue-600 hover:text-black border border-gray-200 text-blue-600 font-bold transition-all text-xs flex items-center gap-1 cursor-pointer"
                            title="View QR Code"
                          >
                            <QrCode size={14} /> QR
                          </button>
                          <button
                            onClick={() => handleDeleteBus(bus._id, bus.busNumber)}
                            className="p-1.5 px-2.5 rounded-lg bg-rose-500/10 hover:bg-rose-600 hover:text-gray-900 border border-rose-500/30 text-rose-400 font-bold transition-all text-xs flex items-center gap-1 cursor-pointer"
                            title="Remove Bus (if added accidentally)"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </GlassCard>
            </div>
          </div>
        </>
      )}

      {/* TAB 2: ROUTE INTELLIGENCE */}
      {activeTab === "routes" && (
        <div className="space-y-6">
          <GlassCard title="Route Schedules & Ordered Stop Sequencing" subtitle="Configure transit itineraries and chronological bus stops">
            <div className="flex justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6">
              <div className="text-sm text-gray-600">
                <span className="text-blue-600 font-bold">{routes.length} Active Routes</span> configured with chronological waypoint sequencing and GPS arrival buffers.
              </div>
              <button
                onClick={() => setShowNewRouteModal(true)}
                className="px-4 py-2 bg-gradient-to-r from-gold-500 to-amber-500 hover:from-gold-400 hover:to-gold-600 text-black font-bold rounded-xl text-xs flex items-center gap-2 shadow-sm cursor-pointer"
              >
                <Plus size={16} /> Define New Route Schedule
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {routes.map((r) => (
                <div key={r._id} className="p-5 rounded-2xl bg-gradient-to-b from-white to-zinc-950 border border-gray-200 hover:border-gray-200 transition-all shadow-sm space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="px-2 py-0.5 rounded bg-blue-600 text-blue-600 font-mono text-xs font-bold border border-gray-200">{r.routeCode}</span>
                      <h3 className="text-lg font-bold text-gray-900 mt-1.5">{r.name}</h3>
                      {r.description && <p className="text-xs text-gray-500 mt-0.5">{r.description}</p>}
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-gray-500 font-semibold block">Est. Duration</span>
                      <span className="text-emerald-400 font-mono font-bold text-sm">⏱️ {r.estimatedDurationMins || 45} mins</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-200 space-y-2">
                    <p className="text-[11px] uppercase font-bold text-blue-600 tracking-wider">Chronological Stop Sequencing ({r.stops?.length || 0} Stops)</p>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {r.stops?.map((stop: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 border border-gray-200 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-blue-600 text-black font-extrabold text-[10px] flex items-center justify-center">
                              {stop.order || idx + 1}
                            </span>
                            <span className="font-semibold text-gray-900">{stop.name}</span>
                          </div>
                          <span className="text-[11px] font-mono text-gray-500">+ {stop.scheduledMinutesFromStart || 0} mins</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      )}

      {/* TAB 3: STAFF & DUTY SHIFTS */}
      {activeTab === "drivers" && (
        <div className="space-y-6">
          <GlassCard title="Driver Workforce & Shift Schedule Administration" subtitle="Assign operational shifts and match transit personnel to specific fleet vehicles">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6 bg-zinc-950/60 p-4 rounded-2xl border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-blue-600 text-blue-600">
                  <UserCheck size={24} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900">Active Transit Staff Roster</h4>
                  <p className="text-xs text-gray-500">{drivers.length} registered personnel inside organization</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setShowNewDriverModal(true)}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-gold-500 to-amber-500 hover:brightness-110 text-black font-extrabold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <Plus size={16} /> Add Single Driver Manually
                </button>
                <button
                  onClick={() => { setCsvInput(""); setShowCSVModal({ isOpen: true, type: "drivers" }); }}
                  className="px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-blue-600 hover:bg-gray-100 font-extrabold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-sm"
                >
                  <FileSpreadsheet size={16} /> 📥 Bulk CSV Driver Onboard
                </button>
              </div>
            </div>

            {driversLoading ? (
              <p className="text-center py-8 text-gray-500 text-xs animate-pulse">Loading transit staff credentials...</p>
            ) : drivers.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-2xl border border-gray-200 text-gray-500">
                <Users size={36} className="mx-auto text-blue-700/50 mb-3" />
                <p className="text-sm font-bold text-gray-900">No drivers found in this college organization.</p>
                <p className="text-xs text-zinc-400 mt-1">Click the Bulk CSV Onboard button above to quickly batch import driver staff.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-gray-200/80">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50 text-blue-600 border-b border-gray-200 text-[11px] uppercase tracking-wider">
                      <th className="p-4">Driver Name</th>
                      <th className="p-4">Contact Email & Phone</th>
                      <th className="p-4">Assigned Vehicle</th>
                      <th className="p-4">Assigned Route</th>
                      <th className="p-4">Operational Shift</th>
                      <th className="p-4 text-right">Duty Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 bg-white">
                    {drivers.map((d) => (
                      <tr key={d._id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-4 font-extrabold text-gray-900 flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
                          {d.name}
                        </td>
                        <td className="p-4 text-gray-600">
                          <div>{d.email}</div>
                          <div className="text-[11px] text-blue-600 font-mono">{d.phone || "+91-94430-TRANSIT"}</div>
                        </td>
                        <td className="p-4 font-bold text-gray-900">
                          {d.assignedBusId?.busNumber ? (
                            <span className="px-2 py-1 rounded bg-gray-100 border border-gray-200 text-gold-300">
                              🚍 {d.assignedBusId.busNumber}
                            </span>
                          ) : (
                            <span className="text-zinc-500 italic">Unassigned</span>
                          )}
                        </td>
                        <td className="p-4 text-gray-600 font-semibold">
                          {d.assignedRouteId?.name || <span className="text-zinc-500 italic">No Fixed Route</span>}
                        </td>
                        <td className="p-4">
                          <span className="px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 font-extrabold text-[11px]">
                            ⏰ {d.shiftType || "FULL_DAY"} ({d.shiftStart || "06:00"}-{d.shiftEnd || "18:00"})
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => {
                              setSelectedDriverForShift(d);
                              setShiftForm({
                                assignedBusId: d.assignedBusId?._id || d.assignedBusId || "",
                                assignedRouteId: d.assignedRouteId?._id || d.assignedRouteId || "",
                                shiftType: d.shiftType || "FULL_DAY",
                                shiftStart: d.shiftStart || "06:00 AM",
                                shiftEnd: d.shiftEnd || "06:00 PM",
                              });
                            }}
                            className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-zinc-700 text-gray-900 font-extrabold text-xs border border-gray-300 inline-flex items-center gap-1 cursor-pointer hover:border-gray-200"
                          >
                            <Settings size={13} className="text-blue-600" /> Assign Shift
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </GlassCard>
        </div>
      )}

      {/* TAB 4: GOVERNANCE & AUDIT LOGS */}
      {activeTab === "audit" && (
        <div className="space-y-6">
          {/* Tasks 7 & 8: Enterprise Data Retention Engine & Institutional Branding */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <GlassCard title="Data Retention Governance Policy" subtitle="Configure automated telemetry TTL auto-purge and trip archiving windows">
              <div className="space-y-4 text-xs text-gray-600">
                <p>
                  To comply with institutional privacy directives and preserve DB storage, historical high-frequency GPS stream logs and completed trips beyond the retention window are automatically pruned or archived.
                </p>
                <div className="flex items-center justify-between p-3.5 bg-gray-50 border border-gray-200 rounded-xl">
                  <div className="space-y-0.5">
                    <label className="font-bold text-gray-900 uppercase tracking-wider text-[11px]">Retention Window (Days)</label>
                    <p className="text-[10px] text-zinc-400">Default is 60 days on standard deployments</p>
                  </div>
                  <input
                    type="number"
                    min="7"
                    max="365"
                    value={retentionDays}
                    onChange={(e) => setRetentionDays(Number(e.target.value))}
                    className="w-24 p-2 bg-white border border-gray-200 rounded-lg text-center font-bold text-blue-600 font-mono text-sm focus:outline-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleSaveGovernance}
                    disabled={savingGovernance}
                    className="w-1/2 py-2.5 rounded-xl bg-gradient-to-r from-gold-500 to-amber-600 hover:brightness-110 text-black font-black uppercase text-[11px] tracking-wider shadow-sm transition-all cursor-pointer"
                  >
                    {savingGovernance ? "Saving..." : "Save Policy"}
                  </button>
                  <button
                    onClick={handleRunRetentionPurge}
                    disabled={purgingRetention}
                    className="w-1/2 py-2.5 rounded-xl bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-500/40 font-extrabold uppercase text-[11px] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 size={14} /> {purgingRetention ? "Purging..." : "Execute Purge Now"}
                  </button>
                </div>

                {purgeResult && (
                  <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs font-mono font-medium">
                    ✅ {purgeResult}
                  </div>
                )}
              </div>
            </GlassCard>

            <GlassCard title="Institutional Branding & Theme Customization" subtitle="Tailor campus portal identity, logos, and accent styling (Task 8)">
              <div className="space-y-3.5 text-xs text-gray-600">
                <div>
                  <label className="block text-[11px] font-bold text-gray-900 uppercase mb-1">Campus Portal Header Text</label>
                  <input
                    type="text"
                    value={brandingHeader}
                    onChange={(e) => setBrandingHeader(e.target.value)}
                    placeholder="RIT Campus Transit Engine"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 font-medium focus:border-gray-200 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-900 uppercase mb-1">Institutional Logo URL (.PNG / .SVG)</label>
                  <input
                    type="text"
                    value={brandingLogo}
                    onChange={(e) => setBrandingLogo(e.target.value)}
                    placeholder="https://campus.edu/assets/logo.png"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 font-mono text-[11px] focus:border-gray-200 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-900 uppercase mb-1">Primary Brand Accent Color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={brandingColor}
                      onChange={(e) => setBrandingColor(e.target.value)}
                      className="w-12 h-9 p-1 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer"
                    />
                    <span className="font-mono font-bold text-blue-600 text-sm uppercase">{brandingColor}</span>
                  </div>
                </div>
              </div>
            </GlassCard>
          </div>

          <GlassCard title="Enterprise Governance & Permanent Audit Trail" subtitle="Cryptographically tamper-proof log of staff shift assignments, vehicle transfers, and data uploads">
            <div className="flex items-center justify-between gap-4 mb-4 pb-3 border-b border-gray-200 text-xs">
              <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                <ShieldCheck size={16} /> Regulatory Compliance Logging Active
              </span>
              <button
                onClick={fetchAuditLogs}
                className="p-2 rounded-lg bg-gray-50 hover:bg-gray-100 text-blue-600 border border-gray-300 flex items-center gap-1 font-semibold transition-transform active:scale-95"
              >
                <RefreshCw size={14} className={auditLoading ? "animate-spin" : ""} /> Refresh Logs
              </button>
            </div>

            {auditLoading ? (
              <p className="text-center py-10 text-zinc-400 text-xs animate-pulse">Scanning immutable audit trail records...</p>
            ) : auditLogs.length === 0 ? (
              <div className="text-center py-12 text-zinc-500 text-xs">
                <ShieldCheck size={32} className="mx-auto mb-2 text-zinc-600" />
                <p>No governance audit records logged for this organization yet.</p>
                <p className="mt-1 text-[11px]">Any driver reassignment or CSV batch upload will be automatically permanently inscribed here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-gray-200/80">
                <table className="w-full text-left border-collapse text-xs font-mono">
                  <thead>
                    <tr className="bg-gray-50 text-blue-600 border-b border-gray-200 text-[11px] uppercase">
                      <th className="p-3.5">Timestamp</th>
                      <th className="p-3.5">Admin Staff</th>
                      <th className="p-3.5">Governance Action</th>
                      <th className="p-3.5">Detailed Execution Summary</th>
                      <th className="p-3.5 text-right">Origin IP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 bg-white">
                    {auditLogs.map((log) => (
                      <tr key={log._id} className="hover:bg-gray-50">
                        <td className="p-3.5 text-gray-600 font-semibold whitespace-nowrap">
                          {new Date(log.createdAt || Date.now()).toLocaleString()}
                        </td>
                        <td className="p-3.5 font-bold text-gray-900">
                          {log.userId?.name || log.userRole || "Administrator"} <span className="text-[10px] text-zinc-400 font-normal">({log.userId?.email || "system"})</span>
                        </td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded bg-blue-600 text-gold-300 font-bold text-[10px]">
                            {log.action}
                          </span>
                        </td>
                        <td className="p-3.5 text-silver-200 font-sans">{log.details}</td>
                        <td className="p-3.5 text-right text-zinc-400 font-mono">{log.ipAddress || "::1"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </GlassCard>
        </div>
      )}

      {/* TAB 5: ANALYTICS & REPORTS */}
      {activeTab === "reports" && (
        <div className="space-y-6">
          <GlassCard title="Enterprise Telemetry Analytics & Export" subtitle="Filter trip history, analyze On-Time Performance (%), and download institutional reports">
            {/* KPI Executive Bar - Extended Fleet Utilization Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
              <div className="p-4 rounded-xl bg-gradient-to-br from-white to-zinc-950 border border-gray-200 shadow-md">
                <div className="flex items-center justify-between text-gray-500 mb-1">
                  <span className="text-[11px] uppercase font-semibold">Total Trips</span>
                  <Navigation size={17} className="text-blue-600" />
                </div>
                <p className="text-2xl font-extrabold text-gray-900">{analytics.kpis?.totalTrips || 0}</p>
                <p className="text-[10px] text-emerald-400 font-semibold mt-1">✓ Live telemetry sync</p>
              </div>
              <div className="p-4 rounded-xl bg-gradient-to-br from-white to-zinc-950 border border-gray-200 shadow-md">
                <div className="flex items-center justify-between text-gray-500 mb-1">
                  <span className="text-[11px] uppercase font-semibold">On-Time %</span>
                  <Clock size={17} className="text-emerald-400" />
                </div>
                <p className="text-2xl font-extrabold text-emerald-400">{analytics.kpis?.avgOnTimePercentage !== undefined ? `${analytics.kpis.avgOnTimePercentage}%` : "0%"}</p>
                <p className="text-[10px] text-gray-500 mt-1">Schedule adherence rate</p>
              </div>
              <div className="p-4 rounded-xl bg-gradient-to-br from-white to-zinc-950 border border-gray-200 shadow-md">
                <div className="flex items-center justify-between text-gray-500 mb-1">
                  <span className="text-[11px] uppercase font-semibold">Total Distance</span>
                  <BarChart3 size={17} className="text-amber-400" />
                </div>
                <p className="text-2xl font-extrabold text-amber-400">{analytics.kpis?.totalDistanceKm || 0} <span className="text-xs font-normal text-gray-500">km</span></p>
                <p className="text-[10px] text-gray-500 mt-1">GPS odometer aggregated</p>
              </div>
              <div className="p-4 rounded-xl bg-gradient-to-br from-white to-zinc-950 border border-gray-200 shadow-md">
                <div className="flex items-center justify-between text-gray-500 mb-1">
                  <span className="text-[11px] uppercase font-semibold">Avg Speed</span>
                  <CheckCircle2 size={17} className="text-blue-600" />
                </div>
                <p className="text-2xl font-extrabold text-blue-600">{analytics.kpis?.avgSpeedKmh || 0} <span className="text-xs font-normal text-gray-500">km/h</span></p>
                <p className="text-[10px] text-gray-500 mt-1">Campus speed limit: 40km/h</p>
              </div>
              <div className="p-4 rounded-xl bg-gradient-to-br from-white/90 to-amber-500/10 border border-amber-500/30 shadow-md">
                <div className="flex items-center justify-between text-gray-500 mb-1">
                  <span className="text-[11px] uppercase font-bold text-amber-300">Fleet Utilization</span>
                  <TrendingUp size={17} className="text-amber-400" />
                </div>
                <p className="text-2xl font-extrabold text-amber-300">{buses.length > 0 ? Math.round((buses.filter((b) => b.status !== "IDLE" && b.status !== "OFFLINE").length / buses.length) * 100) : (analytics.kpis?.fleetUtilizationPercentage || 0)}%</p>
                <div className="w-full bg-gray-100 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div className="bg-gradient-to-r from-amber-500 to-gold-400 h-full" style={{ width: `${buses.length > 0 ? Math.round((buses.filter((b) => b.status !== "IDLE" && b.status !== "OFFLINE").length / buses.length) * 100) : (analytics.kpis?.fleetUtilizationPercentage || 0)}%` }} />
                </div>
              </div>
              <div className="p-4 rounded-xl bg-gradient-to-br from-white/90 to-red-500/10 border border-red-500/30 shadow-md">
                <div className="flex items-center justify-between text-gray-500 mb-1">
                  <span className="text-[11px] uppercase font-bold text-rose-300">Idle / Fuel Added</span>
                  <Flame size={17} className="text-rose-400" />
                </div>
                <p className="text-xl font-extrabold text-gray-900">{analytics.kpis?.totalIdleTimeMins || 0} <span className="text-xs font-normal text-gray-500">m idle</span></p>
                <p className="text-[11px] text-rose-400 font-semibold mt-1">⛽ {analytics.kpis?.totalFuelLiters || 0} L diesel logged</p>
              </div>
            </div>

            {/* Filter controls & export triggers */}
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 flex flex-wrap gap-4 items-center justify-between mb-6">
              <div className="flex flex-wrap gap-3 items-center text-xs">
                <span className="text-blue-600 font-bold flex items-center gap-1"><Filter size={15} /> Filters:</span>
                <div>
                  <span className="text-gray-500 mr-1">Status:</span>
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                    className="p-1.5 bg-zinc-950 border border-gray-200 rounded text-gray-900 font-semibold"
                  >
                    <option value="">All Statuses</option>
                    <option value="ACTIVE">Active Transit</option>
                    <option value="COMPLETED">Completed Trips</option>
                  </select>
                </div>
                <div>
                  <span className="text-gray-500 mr-1">From:</span>
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                    className="p-1 bg-zinc-950 border border-gray-200 rounded text-gray-900"
                  />
                </div>
                <div>
                  <span className="text-gray-500 mr-1">To:</span>
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                    className="p-1 bg-zinc-950 border border-gray-200 rounded text-gray-900"
                  />
                </div>
                <button
                  onClick={fetchAnalytics}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-zinc-700 text-gray-900 font-bold rounded border border-gray-300 transition-all cursor-pointer"
                >
                  Apply Filter
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleExportReport("pdf")}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-gray-900 font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
                >
                  <FileText size={15} /> Export PDF Report
                </button>
                <button
                  onClick={() => handleExportReport("xlsx")}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-gray-900 font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
                >
                  <TableIcon size={15} /> Export Excel (.xlsx)
                </button>
              </div>
            </div>

            {/* Driver Performance Scoring Leaderboard */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Award size={20} className="text-blue-600" />
                  <h3 className="text-base font-extrabold text-gray-900 tracking-wide uppercase">Driver Workforce Performance & Safety Scorecard</h3>
                </div>
                <span className="px-3 py-1 rounded-full bg-gray-50 border border-gray-200 text-gray-500 text-xs font-mono font-bold">
                  🛡️ Algorithmic Safety & Compliance Index
                </span>
              </div>
              <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-lg">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-blue-600 uppercase tracking-wider font-extrabold text-[11px]">
                      <th className="py-3 px-4">Driver Staff Member</th>
                      <th className="py-3 px-4">Performance Rank Badge</th>
                      <th className="py-3 px-4">Safety Compliance Score</th>
                      <th className="py-3 px-4">Schedule On-Time (%)</th>
                      <th className="py-3 px-4">Total Distance / Trips</th>
                      <th className="py-3 px-4">Avg Speed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 text-gray-600">
                    {reportsLoading ? (
                      <tr><td colSpan={6} className="py-6 text-center text-gray-500">Computing algorithm workforce performance indexes...</td></tr>
                    ) : !analytics.driverScores || analytics.driverScores.length === 0 ? (
                      <tr><td colSpan={6} className="py-6 text-center text-gray-500 italic">No driver telemetry logged for this period.</td></tr>
                    ) : (
                      analytics.driverScores.map((d: any) => (
                        <tr key={d.driverId || d.name} className="hover:bg-gray-50 transition-colors font-semibold">
                          <td className="py-3 px-4 font-bold text-gray-900">
                            <div className="text-sm">{d.name}</div>
                            <div className="text-[11px] font-mono text-gray-500 font-normal">{d.email}</div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-3 py-1 rounded-full bg-blue-600 border border-gray-200 text-gold-300 font-extrabold text-xs inline-block">
                              {d.performanceBadge || "🌟 GOLD STAR DRIVER"}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className={`text-base font-black ${
                                (d.safetyScore || 0) >= 90 ? "text-emerald-400" : (d.safetyScore || 0) >= 80 ? "text-amber-400" : "text-rose-400"
                              }`}>
                                {d.safetyScore !== undefined ? d.safetyScore : 0} / 100
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono font-extrabold text-emerald-400 text-sm">
                            {d.onTimePercentage !== undefined ? d.onTimePercentage : 0}%
                          </td>
                          <td className="py-3 px-4 text-gray-600 font-mono">
                            <span className="text-gray-900 font-bold">{d.totalDistanceKm || 0} km</span> ({d.totalTrips || 0} trips)
                          </td>
                          <td className="py-3 px-4 text-gray-600 font-mono">
                            {d.avgSpeedKmh || 0} km/h
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Filtered Trip Records Table */}
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-blue-600 uppercase tracking-wider font-extrabold">
                    <th className="py-3 px-4">Trip Session ID</th>
                    <th className="py-3 px-4">Bus / Route</th>
                    <th className="py-3 px-4">Driver</th>
                    <th className="py-3 px-4">On-Time (%)</th>
                    <th className="py-3 px-4">Distance / Speed</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Start Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800 text-gray-600">
                  {reportsLoading ? (
                    <tr><td colSpan={7} className="py-8 text-center text-gray-500 font-semibold">Analyzing telemetry & calculating variances...</td></tr>
                  ) : analytics.data?.length === 0 ? (
                    <tr><td colSpan={7} className="py-8 text-center text-gray-500 italic">No historical trips match the active filter parameters.</td></tr>
                  ) : (
                    analytics.data?.map((trip: any) => (
                      <tr key={trip._id} className="hover:bg-gray-50 transition-colors font-medium">
                        <td className="py-3 px-4 font-mono font-bold text-gray-900 uppercase">{trip._id.slice(-6)}</td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-gray-900 block">{trip.busId?.busNumber || "N/A"}</span>
                          <span className="text-[10px] text-blue-600 font-mono">{trip.routeId?.name || "Unassigned Route"}</span>
                        </td>
                        <td className="py-3 px-4 text-gray-900 font-semibold">{trip.driverId?.name || "Staff Driver"}</td>
                        <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                          {trip.onTimePercentage !== undefined ? `${trip.onTimePercentage}%` : "100%"}
                        </td>
                        <td className="py-3 px-4 text-gray-600 font-mono">
                          {trip.distanceCoveredKm || 0} km | ~{trip.averageSpeedKmh || 25} km/h
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                            trip.status === "ACTIVE" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-gray-100 text-gray-600"
                          }`}>
                            {trip.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-500 text-[11px] font-mono">
                          {trip.startTime ? new Date(trip.startTime).toLocaleString() : "N/A"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>
      )}

      {/* QR Code Printable Windshield Card Dialog */}
      {selectedQR && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-white backdrop-blur-md overflow-y-auto">
          {/* Main Windshield Sticker Card (Exact Match to Design Reference) */}
          <div id="windshield-qr-card" className="bg-white border-[5px] border-black rounded-[2.2rem] p-6 max-w-[360px] w-full shadow-[0_25px_60px_rgba(0,0,0,0.7)] text-center text-black font-sans my-auto transition-all animate-in zoom-in-95 duration-200">
            
            {/* Top Bus + GPS Pin Icon Composition */}
            <div className="relative inline-block mx-auto mb-2">
              <div className="p-2.5 bg-[#002868] text-gray-900 rounded-2xl shadow-md inline-flex items-center justify-center">
                <Bus size={42} className="text-gray-900" />
              </div>
              <div className="absolute -bottom-1.5 -right-1.5 p-1.5 bg-[#003c96] text-gray-900 rounded-full border-[3px] border-white shadow-lg">
                <MapPin size={18} className="fill-white text-gray-900" />
              </div>
            </div>

            {/* Brand Title & Subtitle */}
            <h2 className="text-[27px] font-black tracking-wider text-[#07193a] uppercase leading-none mt-1">
              BUS TRACKER
            </h2>
            <h3 className="text-[20px] font-extrabold tracking-wider text-[#003366] uppercase mt-1">
              RIT
            </h3>
            <div className="w-full h-1 bg-[#003366] my-3.5 rounded-full" />

            {/* Center QR Code Showcase */}
            <div className="border-[4.5px] border-black rounded-[2rem] p-3.5 my-2 mx-auto w-64 h-64 flex items-center justify-center bg-white shadow-sm">
              <img src={selectedQR.qrImagePngDataUrl} alt="Bus Windshield QR Code" className="w-full h-full object-contain" />
            </div>

            {/* Pill Box 1: Bus Number */}
            <div className="mt-4 border-[2.5px] border-black rounded-2xl overflow-hidden bg-white shadow-sm flex items-center">
              <div className="flex items-center gap-3 pl-3.5 pr-2 py-2.5 flex-1 text-left">
                <div className="p-2 bg-white text-gray-900 rounded-xl flex items-center justify-center shrink-0">
                  <Bus size={22} />
                </div>
                <span className="font-bold text-black text-[15px] tracking-wide">Bus Number</span>
              </div>
              <div className="w-[2px] h-10 bg-white my-auto" />
              <div className="px-4 py-2 text-center font-black text-[26px] text-[#003366] font-mono shrink-0 min-w-[105px]">
                {selectedQR.busNumber}
              </div>
            </div>

            {/* Pill Box 2: Route */}
            <div className="mt-2.5 border-[2.5px] border-black rounded-2xl overflow-hidden bg-white shadow-sm flex items-center">
              <div className="flex items-center gap-3 pl-3.5 pr-2 py-2.5 flex-1 text-left">
                <div className="p-2 bg-white text-gray-900 rounded-xl flex items-center justify-center shrink-0">
                  <RouteIcon size={22} />
                </div>
                <span className="font-bold text-black text-[15px] tracking-wide">Route</span>
              </div>
              <div className="w-[2px] h-10 bg-white my-auto" />
              <div className="px-3 py-2 text-center font-black text-xl text-[#003366] font-mono shrink-0 min-w-[105px] truncate">
                {selectedQR.route || selectedQR.registrationPlate || "R12"}
              </div>
            </div>

            {/* Pill Box 3: Scan Call to Action Banner */}
            <div className="mt-3 py-3.5 px-4 bg-[#07193a] rounded-2xl flex items-center justify-center gap-3 text-gray-900 shadow-lg">
              <div className="p-1 border border-white/50 rounded-lg shrink-0 flex items-center justify-center">
                <QrCode size={20} className="text-gray-900 animate-pulse" />
              </div>
              <span className="font-extrabold text-[17px] tracking-wide text-gray-900 uppercase">Scan Before Every Trip</span>
            </div>

            {/* Brand Identity & Logo Footer */}
            <div className="mt-4 pt-3 border-t-2 border-zinc-200 flex flex-col items-center justify-center text-center">
              <div className="flex items-center justify-center gap-2 mb-0.5">
                
                <span className="font-black text-[12px] uppercase tracking-widest text-[#07193a]">DEVELOPED BY RIT</span>
              </div>
              <span className="text-[9px] font-extrabold text-zinc-500 uppercase tracking-wider"></span>
            </div>
          </div>

          {/* Dialog Action Bar (Outside Card) */}
          <div className="mt-5 flex gap-4 justify-center w-full max-w-[360px] pb-4">
            <button
              onClick={() => setSelectedQR(null)}
              className="flex-1 py-3 px-4 bg-gray-100 hover:bg-zinc-700 text-gray-900 font-extrabold rounded-2xl text-xs transition-all cursor-pointer border border-gray-300 shadow-sm uppercase tracking-wider"
            >
              Close Dialog
            </button>
            <button
              onClick={handleDownloadFullSticker}
              className="flex-1 py-3 px-4 bg-gradient-to-r from-gold-500 via-amber-500 to-gold-400 hover:brightness-110 text-black font-extrabold rounded-2xl text-xs transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer uppercase tracking-wider"
            >
              <Download size={15} /> Download Card PNG
            </button>
          </div>
        </div>
      )}

      {/* New Bus Modal */}
      {showNewBusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white backdrop-blur-sm">
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Enroll New Bus Vehicle</h3>
            <form onSubmit={handleAddBus} className="space-y-3 text-sm">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Bus Number / Alias</label>
                <input
                  type="text"
                  required
                  placeholder="RIT-BUS-02"
                  value={newBusForm.busNumber}
                  onChange={(e) => setNewBusForm({ ...newBusForm, busNumber: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Registration License Plate</label>
                <input
                  type="text"
                  required
                  placeholder="TN-67-AP-3000"
                  value={newBusForm.registrationPlate}
                  onChange={(e) => setNewBusForm({ ...newBusForm, registrationPlate: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 uppercase font-mono"
                />
              </div>
              <div className="pt-3 border-t border-gray-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowNewBusModal(false)}
                  className="px-4 py-2 bg-gray-100 rounded-lg text-gray-900 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-black font-bold rounded-lg cursor-pointer">
                  Enroll Vehicle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Define New Route Schedule Modal */}
      {showNewRouteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white backdrop-blur-sm">
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 max-w-lg w-full shadow-md">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Configure Route Schedule & Stops</h3>
            <p className="text-xs text-blue-600 mb-4">Define ordered stops and estimated transit durations</p>
            <form onSubmit={handleCreateRoute} className="space-y-4 text-sm">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Route Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Campus Core to City Terminus"
                    value={newRouteForm.name}
                    onChange={(e) => setNewRouteForm({ ...newRouteForm, name: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Route Code</label>
                  <input
                    type="text"
                    required
                    placeholder="RIT-R1"
                    value={newRouteForm.routeCode}
                    onChange={(e) => setNewRouteForm({ ...newRouteForm, routeCode: e.target.value.toUpperCase() })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 font-mono uppercase font-bold"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Estimated Transit Duration (Minutes)</label>
                <input
                  type="number"
                  min={5}
                  required
                  value={newRouteForm.estimatedDurationMins}
                  onChange={(e) => setNewRouteForm({ ...newRouteForm, estimatedDurationMins: parseInt(e.target.value) || 45 })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900"
                />
              </div>
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
                <span className="text-xs font-bold text-blue-600 uppercase">Configured Stop Sequence (2 Default Waypoints)</span>
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  Stops are initialized with GPS radii and automated time buffer tracking (+0 mins Departure, +25 mins Terminal Arrival). Further stops can be appended dynamically.
                </p>
              </div>
              <div className="pt-3 border-t border-gray-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowNewRouteModal(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-zinc-700 rounded-lg text-gray-900 font-semibold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-black font-bold rounded-lg text-xs cursor-pointer">
                  Save Transit Route
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Subscription Tier Upgrade Prompt Modal */}
      {showUpgradePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white backdrop-blur-md">
          <div className="bg-gray-50 border border-amber-500/60 rounded-2xl p-6 max-w-md w-full shadow-md text-center relative">
            <div className="w-12 h-12 rounded-full bg-blue-600 text-blue-600 flex items-center justify-center mx-auto mb-3 border border-gray-200 font-bold text-2xl">
              🚀
            </div>
            <h3 className="text-xl font-extrabold text-gray-900">Subscription Upgrade Required</h3>
            <p className="text-xs font-semibold text-blue-600 mt-1 uppercase tracking-wider">RIT Enterprise Scaling</p>
            
            <div className="my-4 p-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-600 text-xs text-left leading-relaxed">
              <p>{showUpgradePrompt}</p>
            </div>

            <p className="text-[11px] text-gray-500 mb-6">
              To expand your active bus fleet or allocate more administration seats, please contact RIT Executive Support () for instant quota adjustment.
            </p>

            <button
              onClick={() => setShowUpgradePrompt(null)}
              className="w-full py-3 bg-gradient-to-r from-gold-500 via-amber-500 to-gold-400 hover:from-gold-400 hover:to-gold-600 text-black font-bold rounded-xl text-sm transition-all shadow-sm uppercase tracking-wider cursor-pointer"
            >
              Understand & Close
            </button>
          </div>
        </div>
      )}

      {/* DRIVER SHIFT ASSIGNMENT MODAL */}
      {selectedDriverForShift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white backdrop-blur-md">
          <div className="w-full max-w-lg bg-zinc-950 border border-gray-200 rounded-2xl p-6 shadow-md space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
              <div className="flex items-center gap-2 text-blue-600 font-extrabold text-base">
                <Settings size={20} /> Assign Shift & Duty: {selectedDriverForShift.name}
              </div>
              <button onClick={() => setSelectedDriverForShift(null)} className="text-zinc-400 hover:text-gray-900 p-1">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAssignDriverShift} className="space-y-4 text-xs">
              <div>
                <label className="block text-gray-600 font-semibold mb-1">Assign Transit Vehicle:</label>
                <select
                  value={shiftForm.assignedBusId}
                  onChange={(e) => setShiftForm({ ...shiftForm, assignedBusId: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 font-bold focus:outline-none focus:ring-1 focus:ring-gold-500"
                >
                  <option value="">-- No Vehicle Assigned (Pool Float) --</option>
                  {buses.map((b) => (
                    <option key={b._id} value={b._id}>
                      🚍 {b.busNumber} ({b.registrationPlate}) — Capacity {b.capacity}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-600 font-semibold mb-1">Assign Destination Transit Route:</label>
                <select
                  value={shiftForm.assignedRouteId}
                  onChange={(e) => setShiftForm({ ...shiftForm, assignedRouteId: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 font-bold focus:outline-none focus:ring-1 focus:ring-gold-500"
                >
                  <option value="">-- Flexible / Any Route --</option>
                  {routes.map((r) => (
                    <option key={r._id} value={r._id}>
                      📍 {r.routeCode || "ROUTE"} — {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-gray-600 font-semibold mb-1">Shift Type:</label>
                  <select
                    value={shiftForm.shiftType}
                    onChange={(e) => setShiftForm({ ...shiftForm, shiftType: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-blue-600 font-bold"
                  >
                    <option value="MORNING">Morning Shift</option>
                    <option value="EVENING">Evening Shift</option>
                    <option value="FULL_DAY">Full Day Shift</option>
                    <option value="FLEX">Flexible Hours</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-600 font-semibold mb-1">Shift Start:</label>
                  <input
                    type="text"
                    value={shiftForm.shiftStart}
                    onChange={(e) => setShiftForm({ ...shiftForm, shiftStart: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 font-semibold mb-1">Shift End:</label>
                  <input
                    type="text"
                    value={shiftForm.shiftEnd}
                    onChange={(e) => setShiftForm({ ...shiftForm, shiftEnd: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 font-mono"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/40 text-[11px] text-amber-300 flex items-center gap-2">
                <ShieldCheck size={18} className="shrink-0" />
                <span>This reassignment will be permanently catalogued into the institution's Governance Audit Trail.</span>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedDriverForShift(null)}
                  className="px-5 py-2.5 rounded-xl bg-gray-100 text-zinc-300 hover:bg-zinc-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-gold-500 to-amber-600 hover:brightness-110 text-black font-extrabold uppercase tracking-wider shadow-sm"
                >
                  Confirm & Inscribe Audit Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BULK CSV ONBOARDING MODAL */}
      {showCSVModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white backdrop-blur-md">
          <div className="w-full max-w-xl bg-zinc-950 border border-gray-200 rounded-2xl p-6 shadow-md space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
              <div className="flex items-center gap-2 text-blue-600 font-extrabold text-base">
                <Upload size={20} /> Bulk CSV Onboarding ({showCSVModal.type === "drivers" ? "Staff Drivers" : "Transit Fleet"})
              </div>
              <button onClick={() => setShowCSVModal({ isOpen: false, type: "drivers" })} className="text-zinc-400 hover:text-gray-900 p-1">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleBulkCSVImport} className="space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-600 space-y-2">
                <span className="font-bold text-gray-900 block">Required CSV Row Formatting (One record per line):</span>
                {showCSVModal.type === "drivers" ? (
                  <p className="font-mono text-[11px] text-blue-600">
                    Name, Email, Phone Number, Shift Type (MORNING/EVENING/FULL_DAY)<br />
                    <span className="text-zinc-400">e.g., Ramesh Kumar, ramesh@college.edu, +91944300001, MORNING</span>
                  </p>
                ) : (
                  <p className="font-mono text-[11px] text-blue-600">
                    Bus Number, Registration Plate, Passenger Capacity<br />
                    <span className="text-zinc-400">e.g., CAMPUS EXPRESS 10, TN-67-MTRX-500, 48</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-gray-600 font-semibold mb-1">Paste CSV Contents Below:</label>
                <textarea
                  rows={7}
                  required
                  placeholder={showCSVModal.type === "drivers" ? "Ramesh Kumar, ramesh@college.edu, +91900010001, MORNING\nSuresh V, suresh@college.edu, +91900010002, EVENING" : "RIT BUS 01, TN-67-MTRX-101, 45\nRIT BUS 02, TN-67-MTRX-102, 50"}
                  value={csvInput}
                  onChange={(e) => setCsvInput(e.target.value)}
                  className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 font-mono text-xs focus:outline-none focus:border-gray-200 leading-relaxed"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCSVModal({ isOpen: false, type: "drivers" })}
                  className="px-5 py-2.5 rounded-xl bg-gray-100 text-zinc-300 hover:bg-zinc-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={csvImporting}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-gold-500 via-amber-500 to-gold-400 hover:brightness-110 text-black font-extrabold uppercase tracking-wider shadow-sm flex items-center gap-2"
                >
                  <CheckCircle2 size={16} /> {csvImporting ? "Processing Batch..." : "Execute Bulk Import"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MANUAL SINGLE DRIVER ONBOARDING MODAL */}
      {showNewDriverModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-gray-50 border-2 border-gray-200 rounded-2xl p-6 max-w-lg w-full shadow-md shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
              <div className="flex items-center gap-2 text-blue-600 font-extrabold text-base">
                <UserCheck size={20} className="text-blue-700" /> Enroll Single Driver Account
              </div>
              <button onClick={() => setShowNewDriverModal(false)} className="text-zinc-400 hover:text-gray-900">
                <X size={18} />
              </button>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              Enrolled transit staff automatically receive secure credentials with mandatory password replacement enabled on first sign-in.
            </p>
            <form onSubmit={handleCreateDriver} className="space-y-4 text-xs">
              <div>
                <label className="block text-gray-600 font-medium mb-1">Driver Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., MANOJ KUMAR S"
                  value={newDriverForm.name}
                  onChange={(e) => setNewDriverForm({ ...newDriverForm, name: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:border-gray-200 transition-colors"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-600 font-medium mb-1">Login Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="driver@college.edu"
                    value={newDriverForm.email}
                    onChange={(e) => setNewDriverForm({ ...newDriverForm, email: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:border-gray-200 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 font-medium mb-1">Contact Phone</label>
                  <input
                    type="text"
                    required
                    placeholder="+91-9876543210"
                    value={newDriverForm.phone}
                    onChange={(e) => setNewDriverForm({ ...newDriverForm, phone: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:border-gray-200 font-mono transition-colors"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-600 font-medium mb-1">Initial Vehicle Assignment</label>
                  <select
                    value={newDriverForm.assignedBusId}
                    onChange={(e) => setNewDriverForm({ ...newDriverForm, assignedBusId: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:border-gray-200 transition-colors"
                  >
                    <option value="">-- No Bus Attached Yet --</option>
                    {buses.map((b) => (
                      <option key={b._id} value={b._id}>🚍 {b.busNumber} ({b.registrationPlate})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-600 font-medium mb-1">Operational Shift</label>
                  <select
                    value={newDriverForm.shiftType}
                    onChange={(e) => setNewDriverForm({ ...newDriverForm, shiftType: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:border-gray-200 transition-colors font-bold text-amber-300"
                  >
                    <option value="FULL_DAY">Full Day Duty (06:00 - 18:00)</option>
                    <option value="MORNING">Morning Shift (06:00 - 12:00)</option>
                    <option value="EVENING">Evening Shift (12:00 - 18:00)</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewDriverModal(false)}
                  className="px-5 py-2.5 rounded-xl bg-gray-100 text-zinc-300 hover:bg-zinc-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={driverCreating}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-gold-500 via-amber-500 to-gold-400 text-black font-extrabold shadow-sm uppercase tracking-wider"
                >
                  {driverCreating ? "Enrolling..." : "Create & Authorize Driver"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CELEBRATORY DRIVER CREDENTIAL GENERATION MODAL */}
      {newDriverCreatedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white backdrop-blur-md animate-in zoom-in-95 duration-200">
          <div className="bg-gray-50 border-2 border-emerald-500/50 rounded-3xl p-6 max-w-md w-full shadow-md space-y-4 text-center">
            <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto shadow-lg border border-emerald-500/30">
              <CheckCircle2 size={32} />
            </div>
            <h3 className="text-xl font-extrabold text-gray-900">Driver Account Enrolled!</h3>
            <p className="text-xs text-gray-600">
              Please share these initial login credentials with driver <span className="font-bold text-gray-900">{newDriverCreatedModal.name}</span>. They will be prompted to change their password on first sign-in.
            </p>
            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 text-left space-y-2 font-mono text-xs">
              <div>
                <span className="text-zinc-400 block text-[10px]">DRIVER LOGIN EMAIL:</span>
                <span className="text-gray-900 font-bold text-sm">{newDriverCreatedModal.email}</span>
              </div>
              <div>
                <span className="text-zinc-400 block text-[10px]">INITIAL SECURITY PASSWORD:</span>
                <span className="text-emerald-400 font-bold text-sm">{newDriverCreatedModal.password}</span>
              </div>
            </div>
            <button
              onClick={() => setNewDriverCreatedModal(null)}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 text-black font-extrabold uppercase tracking-wide shadow-lg"
            >
              Copy & Close Dialog
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

