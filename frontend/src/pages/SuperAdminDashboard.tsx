import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import { GlassCard } from "../components/GlassCard";
import { Shield, Building2, Trash2, Plus, FileText, Download, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

export const SuperAdminDashboard: React.FC = () => {
  const [orgs, setOrgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmOrg, setDeleteConfirmOrg] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Plan Quota override state
  const [editingQuotaOrg, setEditingQuotaOrg] = useState<any | null>(null);
  const [quotaForm, setQuotaForm] = useState({
    plan: "basic",
    busLimit: 15,
    adminLimit: 2,
    additionalBusesPurchased: 0,
  });

  const handleOpenQuotaModal = (org: any) => {
    setEditingQuotaOrg(org);
    setQuotaForm({
      plan: org.plan || "basic",
      busLimit: org.busLimit !== undefined ? org.busLimit : 15,
      adminLimit: org.adminLimit !== undefined ? org.adminLimit : 2,
      additionalBusesPurchased: org.additionalBusesPurchased !== undefined ? org.additionalBusesPurchased : 0,
    });
  };

  const handleUpdateQuota = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuotaOrg) return;
    try {
      const res = await api.put(`/orgs/${editingQuotaOrg._id}`, quotaForm);
      if (res.data.success) {
        setEditingQuotaOrg(null);
        fetchOrganizations();
      }
    } catch (err: any) {
      alert(`Update Error: ${err.response?.data?.error || err.message}`);
    }
  };

  // New Organization modal state
  const [showNewOrgModal, setShowNewOrgModal] = useState(false);
  const [createdOrgAdmin, setCreatedOrgAdmin] = useState<{ orgName: string; email: string; password: string } | null>(null);
  const [newOrgForm, setNewOrgForm] = useState({
    name: "",
    code: "",
    email: "",
    phone: "",
    address: "",
    adminEmail: "",
    adminPassword: "",
  });

  const fetchOrganizations = async () => {
    setLoading(true);
    try {
      const res = await api.get("/orgs");
      if (res.data.success) {
        setOrgs(res.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to load enterprise organizations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const handleDeleteOrganization = async () => {
    if (!deleteConfirmOrg) return;
    setIsDeleting(true);
    try {
      const res = await api.delete(`/orgs/${deleteConfirmOrg._id}`);
      if (res.data.success) {
        setOrgs((prev) => prev.filter((o) => o._id !== deleteConfirmOrg._id));
        setDeleteConfirmOrg(null);
      }
    } catch (err: any) {
      alert(`Delete Error: ${err.response?.data?.error || err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post("/orgs", newOrgForm);
      if (res.data.success) {
        setShowNewOrgModal(false);
        setNewOrgForm({
          name: "",
          code: "",
          email: "",
          phone: "",
          address: "",
          adminEmail: "",
          adminPassword: "",
        });
        if (res.data.adminAccount) {
          setCreatedOrgAdmin({
            orgName: res.data.data.name,
            email: res.data.adminAccount.email,
            password: res.data.adminAccount.password,
          });
        }
        fetchOrganizations();
      }
    } catch (err: any) {
      alert(`Create Error: ${err.response?.data?.error || err.message}`);
    }
  };

  const handleExportReport = async (format: "pdf" | "excel") => {
    try {
      const response = await api.get(`/reports/export?format=${format}`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `RIT_SuperAdmin_Report_${Date.now()}.${format === "excel" ? "xlsx" : "pdf"}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      alert("Failed to export telemetry report.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Super Admin Welcome Banner */}
      <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-6 rounded-2xl border border-gray-200 bg-gradient-to-r from-white via-gray-50/90 to-gray-100/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-600 border border-gray-200 text-blue-600 text-xs font-bold uppercase tracking-wider mb-2">
            <Shield size={14} /> RIT Super Administration
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-wide">Global Fleet & College Management</h1>
          <p className="text-gray-600 text-sm mt-1">Founder & CEO Executive Console — Manage educational institution accounts, subscription limits, and enterprise analytics.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => handleExportReport("pdf")}
            className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-zinc-700 border border-gray-300 text-gray-600 text-xs font-semibold flex items-center gap-1.5 transition-all"
          >
            <Download size={14} /> Export PDF Report
          </button>
          <button
            onClick={() => handleExportReport("excel")}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-600 border border-gray-200 text-blue-600 text-xs font-semibold flex items-center gap-1.5 transition-all"
          >
            <FileText size={14} /> Export Excel
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassCard title="Enrolled Colleges" subtitle="Active institutional clients">
          <p className="text-3xl font-extrabold text-blue-600 mt-2">{orgs.length}</p>
        </GlassCard>
        <GlassCard title="Total Active Fleet" subtitle="Buses across all orgs">
          <p className="text-3xl font-extrabold text-gray-900 mt-2">
            {orgs.reduce((acc, curr) => acc + (curr.stats?.busCount || 0), 0)}
          </p>
        </GlassCard>
        <GlassCard title="Active Live Trips" subtitle="Currently broadcasting GPS">
          <p className="text-3xl font-extrabold text-emerald-400 mt-2">
            {orgs.reduce((acc, curr) => acc + (curr.stats?.activeTrips || 0), 0)}
          </p>
        </GlassCard>
        <GlassCard title="Server Telemetry" subtitle="Zero-cost infrastructure">
          <div className="flex items-center gap-2 mt-2">
            <CheckCircle2 className="text-emerald-400" size={24} />
            <span className="text-lg font-bold text-gray-900">Atlas Free Tier Online</span>
          </div>
        </GlassCard>
      </div>

      {/* Organizations & College Table */}
      <GlassCard
        title="College Organizations & Demo Accounts"
        subtitle="Full administrative lifecycle control over registered educational campuses"
        action={
          <button
            onClick={() => setShowNewOrgModal(true)}
            className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-black text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Plus size={15} /> Add College Organization
          </button>
        }
      >
        {loading ? (
          <p className="text-sm text-gray-500 py-4 text-center">Loading institutional records...</p>
        ) : error ? (
          <p className="text-sm text-rose-400 py-4 text-center">⚠️ {error}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500 font-semibold uppercase tracking-wider text-xs">
                  <th className="py-3 px-4">Organization / College</th>
                  <th className="py-3 px-4">Org Code</th>
                  <th className="py-3 px-4">Plan Tier</th>
                  <th className="py-3 px-4">Buses / Staff</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Super Admin Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-medium">
                {orgs.map((org) => (
                  <tr key={org._id} className="hover:bg-gray-100 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <Building2 className="text-blue-600 shrink-0" size={18} />
                        <div>
                          <p className="text-gray-900 font-bold">{org.name}</p>
                          <p className="text-xs text-gray-600">{org.email} | {org.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4"><span className="px-2 py-1 rounded bg-gray-100 text-blue-600 text-xs font-mono">{org.code}</span></td>
                    <td className="py-3.5 px-4">
                      <span className="text-emerald-400 font-bold text-xs uppercase block">{org.plan || "basic"}</span>
                      <span className="text-[10px] text-gray-500">Cap: {(org.busLimit ?? 15) + (org.additionalBusesPurchased ?? 0)} Buses | {org.adminLimit ?? 2} Admins</span>
                    </td>
                    <td className="py-3.5 px-4 text-gray-600">
                      {org.stats?.busCount || 0} Buses | {org.stats?.userCount || 0} Users
                    </td>
                    <td className="py-3.5 px-4">
                      {org.isActive ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 text-xs"><CheckCircle2 size={13} /> Active</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-400 text-xs"><XCircle size={13} /> Suspended</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <button
                        onClick={() => handleOpenQuotaModal(org)}
                        className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-blue-600 hover:text-black text-blue-600 border border-gray-200 font-semibold text-xs transition-all inline-flex items-center gap-1 cursor-pointer"
                        title="Override plan limits and quotas"
                      >
                        ⚙️ Edit Plan
                      </button>
                      {/* DELETE COLLEGE ACCOUNT BUTTON - SUPER ADMIN PRIVILEGE */}
                      <button
                        onClick={() => setDeleteConfirmOrg(org)}
                        className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-600 hover:text-gray-900 text-rose-400 border border-rose-500/30 font-semibold text-xs transition-all inline-flex items-center gap-1 shadow-sm cursor-pointer"
                        title="Permanently delete this organization and wipe associated buses/users"
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {/* Confirmation Dialog for Deleting a College Account */}
      {deleteConfirmOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white backdrop-blur-sm">
          <div className="bg-gray-50 border border-rose-500/50 rounded-2xl p-6 max-w-md w-full shadow-md text-center">
            <AlertTriangle className="text-rose-500 mx-auto mb-3 animate-bounce" size={40} />
            <h3 className="text-xl font-bold text-gray-900">Permanently Delete College?</h3>
            <p className="text-sm text-gray-600 mt-2">
              Are you sure you want to delete <strong className="text-blue-600">{deleteConfirmOrg.name}</strong>? This will permanently wipe all associated bus QR profiles, driver logs, and student accounts.
            </p>
            <div className="flex gap-3 justify-center mt-6">
              <button
                onClick={() => setDeleteConfirmOrg(null)}
                className="px-5 py-2.5 rounded-xl bg-gray-100 hover:bg-zinc-700 text-gray-900 text-sm font-semibold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteOrganization}
                disabled={isDeleting}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-gray-900 text-sm font-bold transition-all flex items-center gap-2"
              >
                {isDeleting ? "Wiping Records..." : <>Yes, Delete Permanently</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Plan & Quota Override Modal (Manual Lever before Billing Integration) */}
      {editingQuotaOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white backdrop-blur-sm">
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 max-w-md w-full shadow-md">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Override Subscription Quotas</h3>
            <p className="text-xs text-blue-600 mb-4 font-mono">{editingQuotaOrg.name}</p>
            <form onSubmit={handleUpdateQuota} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Subscription Tier</label>
                <select
                  value={quotaForm.plan}
                  onChange={(e) => setQuotaForm({ ...quotaForm, plan: e.target.value as any })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 capitalize font-medium"
                >
                  <option value="basic">Basic (Up to 15 Buses / 2 Admins)</option>
                  <option value="standard">Standard (Up to 30 Buses / 5 Admins)</option>
                  <option value="premium">Premium (Up to 100+ Buses / 20 Admins)</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Base Bus Limit</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={quotaForm.busLimit}
                    onChange={(e) => setQuotaForm({ ...quotaForm, busLimit: parseInt(e.target.value) || 0 })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Additional Buses Purchased</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={quotaForm.additionalBusesPurchased}
                    onChange={(e) => setQuotaForm({ ...quotaForm, additionalBusesPurchased: parseInt(e.target.value) || 0 })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Admin Seat Limit</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={quotaForm.adminLimit}
                  onChange={(e) => setQuotaForm({ ...quotaForm, adminLimit: parseInt(e.target.value) || 1 })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900"
                />
              </div>
              <p className="text-[11px] text-gray-500 italic bg-gray-50 p-2.5 rounded border border-gray-200">
                ⚡ Total Allowed Fleet: <strong>{quotaForm.busLimit + quotaForm.additionalBusesPurchased}</strong> buses. Changes enforce instantly on institutional POST requests.
              </p>
              <div className="pt-3 border-t border-gray-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingQuotaOrg(null)}
                  className="px-4 py-2 bg-gray-100 hover:bg-zinc-700 rounded-lg text-gray-900 font-semibold text-xs"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-black font-bold rounded-lg text-xs">
                  Save Override Limits
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Organization Modal */}
      {showNewOrgModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white backdrop-blur-sm">
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 max-w-lg w-full shadow-md">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Enroll New College Organization</h3>
            <form onSubmit={handleCreateOrg} className="space-y-3 text-sm">
              <div>
                <label className="block text-xs text-gray-600 mb-1">College / Institution Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramco Institute of Technology"
                  value={newOrgForm.name}
                  onChange={(e) => setNewOrgForm({ ...newOrgForm, name: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Organization Code (Unique)</label>
                  <input
                    type="text"
                    required
                    placeholder="RIT-CAMPUS"
                    value={newOrgForm.code}
                    onChange={(e) => setNewOrgForm({ ...newOrgForm, code: e.target.value.toUpperCase() })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Contact Phone</label>
                  <input
                    type="text"
                    required
                    placeholder="+91 94430..."
                    value={newOrgForm.phone}
                    onChange={(e) => setNewOrgForm({ ...newOrgForm, phone: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Official Contact Email</label>
                <input
                  type="email"
                  required
                  placeholder="admin@rit.ac.in"
                  value={newOrgForm.email}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewOrgForm((prev) => ({
                      ...prev,
                      email: val,
                      adminEmail: prev.adminEmail === prev.email ? val : prev.adminEmail,
                    }));
                  }}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900"
                />
              </div>

              <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-3 shadow-sm">
                <div className="flex items-center gap-1.5 text-blue-600 font-semibold text-xs">
                  <Shield size={14} className="text-blue-700" />
                  <span>College Admin Login Account (Automated)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Admin Login Email</label>
                    <input
                      type="email"
                      placeholder={newOrgForm.email || "admin@college.edu"}
                      value={newOrgForm.adminEmail}
                      onChange={(e) => setNewOrgForm({ ...newOrgForm, adminEmail: e.target.value })}
                      className="w-full p-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Admin Login Password</label>
                    <input
                      type="text"
                      placeholder={newOrgForm.code ? `${newOrgForm.code}@2026!` : "CollegeCode@2026!"}
                      value={newOrgForm.adminPassword}
                      onChange={(e) => setNewOrgForm({ ...newOrgForm, adminPassword: e.target.value })}
                      className="w-full p-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-xs font-mono"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-gray-500">
                  An institutional admin login will be instantly generated for transport management. Defaults to contact email & <span className="text-blue-600 font-mono">{newOrgForm.code ? `${newOrgForm.code}@2026!` : "CODE@2026!"}</span> if left blank.
                </p>
              </div>

              <div className="pt-3 border-t border-gray-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowNewOrgModal(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-zinc-700 rounded-lg text-gray-900 font-semibold"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-black font-bold rounded-lg hover:bg-blue-700">
                  Enroll College & Admin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Celebratory College Admin Created Credentials Modal */}
      {createdOrgAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white backdrop-blur-md">
          <div className="bg-gray-50 border-2 border-gray-200 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-md shadow-sm text-center relative">
            <div className="w-16 h-16 bg-gradient-to-tr from-gold-500 via-amber-600 to-gold-400 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-sm">
              <Shield className="w-9 h-9 text-black" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-1">College Admin Enrolled!</h3>
            <p className="text-xs text-gray-600 mb-6">
              An institutional transport administrator account has been actively deployed for <span className="text-blue-600 font-bold">{createdOrgAdmin.orgName}</span>.
            </p>
            
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6 text-left space-y-3">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-0.5 font-bold">Portal Access URL</p>
                <p className="text-xs text-gray-900 font-mono bg-white p-2 rounded border border-gray-200">http://localhost:5173 (Enterprise SSO)</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-blue-600 mb-0.5 font-bold">College Admin Login Email</p>
                <p className="text-sm text-gray-900 font-mono font-semibold bg-white p-2 rounded border border-gray-200 select-all">{createdOrgAdmin.email}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-emerald-400 mb-0.5 font-bold">Initial Security Password</p>
                <p className="text-sm text-emerald-300 font-mono font-semibold bg-white p-2 rounded border border-gray-200 select-all">{createdOrgAdmin.password}</p>
              </div>
            </div>

            <button
              onClick={() => setCreatedOrgAdmin(null)}
              className="w-full py-3 bg-gradient-to-r from-gold-500 via-amber-500 to-gold-400 text-black font-bold text-sm rounded-xl shadow-lg hover:shadow-sm transition-all uppercase tracking-wide cursor-pointer"
            >
              Done & Copy Credentials
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
