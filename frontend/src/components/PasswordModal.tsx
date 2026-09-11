import React, { useState } from "react";
import { X, Key, ShieldCheck, Lock, Sparkles, CheckCircle2, AlertCircle } from "lucide-react";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";

interface PasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "change" | "reset";
  isFirstLogin?: boolean;
}

export const PasswordModal: React.FC<PasswordModalProps> = ({ isOpen, onClose, mode, isFirstLogin = false }) => {
  const { setUser } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [email, setEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setLoading(true);
    try {
      if (mode === "change") {
        const res = await api.post("/auth/change-password", {
          currentPassword: currentPassword || undefined,
          newPassword,
        });
        if (res.data.success) {
          setSuccessMessage(res.data.message || "Password updated successfully!");
          setUser((prev) => (prev ? { ...prev, mustChangePassword: false } : null));
          setTimeout(() => {
            onClose();
          }, 2000);
        }
      } else {
        const res = await api.post("/auth/reset-password", {
          email,
          verificationCode,
          newPassword,
        });
        if (res.data.success) {
          setSuccessMessage(res.data.message || "Password reset successfully! You can now log in.");
          setTimeout(() => {
            onClose();
          }, 2500);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "An unexpected security error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white backdrop-blur-md animate-fade-in">
      <div className="bg-gray-50 border-2 border-gray-200 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-md shadow-sm relative overflow-hidden">
        
        {/* Glow Effects */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-blue-600 rounded-full blur-[60px] pointer-events-none" />
        
        {/* Close Button (if not strictly forced first login or allowing dismissal) */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-gray-50 text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors z-10"
          title="Close modal"
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-6 flex flex-col items-center">
          <div className="w-14 h-14 bg-gradient-to-tr from-gold-500 via-amber-600 to-gold-400 rounded-2xl flex items-center justify-center mb-3 shadow-sm">
            {mode === "change" ? <Key className="w-7 h-7 text-black" /> : <ShieldCheck className="w-7 h-7 text-black" />}
          </div>
          <h2 className="text-[11px] tracking-[0.25em] uppercase text-blue-600 font-bold mb-1 flex items-center gap-1">
            <Sparkles size={12} className="text-blue-700" /> Enterprise Identity Security
          </h2>
          <h3 className="text-2xl font-bold text-gray-900 tracking-wide">
            {mode === "change" ? (isFirstLogin ? "Initial Login Security" : "Update Your Password") : "Reset Login Password"}
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            {mode === "change"
              ? isFirstLogin
                ? "Welcome! For institutional compliance, please replace your admin-assigned initial password with a personal secure key."
                : "Enhance your account defense by updating your collegiate transport login credentials."
              : "Verify your identity with your College Code, Phone, or Recovery Key to instantly reset your password."}
          </p>
        </div>

        {/* Success Feedback */}
        {successMessage ? (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/40 rounded-xl text-emerald-300 text-center space-y-2 mb-4">
            <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-400" />
            <p className="font-semibold text-sm">{successMessage}</p>
            <p className="text-[11px] text-emerald-400/80">Closing window automatically...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {mode === "reset" && (
              <>
                <div>
                  <label className="block text-xs text-gray-600 font-medium mb-1">Official Login Email</label>
                  <input
                    type="email"
                    required
                    placeholder="admin@college.edu or driver@rit.ac.in"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-sm focus:border-gray-200 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 font-medium mb-1">
                    Verification Identifier <span className="text-[10px] text-blue-600">(College Code / Phone / MTRX2026)</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. RIT-CAMPUS or +91-9876543210"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-mono text-sm focus:border-gray-200 transition-colors"
                  />
                  <p className="text-[10px] text-gray-500 mt-1">
                    Super Admins can verify using recovery key <span className="text-blue-600 font-mono">MTRX2026</span>.
                  </p>
                </div>
              </>
            )}

            {mode === "change" && !isFirstLogin && (
              <div>
                <label className="block text-xs text-gray-600 font-medium mb-1">Current Password</label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    placeholder="Enter your current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-sm font-mono focus:border-gray-200 transition-colors"
                  />
                  <Lock className="absolute right-3 top-3 w-4 h-4 text-gray-500" />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs text-gray-600 font-medium mb-1">New Security Password</label>
              <input
                type="password"
                required
                placeholder="At least 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-sm font-mono focus:border-gray-200 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-600 font-medium mb-1">Confirm New Password</label>
              <input
                type="password"
                required
                placeholder="Re-type new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-sm font-mono focus:border-gray-200 transition-colors"
              />
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-gold-500 via-amber-500 to-gold-400 text-black font-bold text-sm rounded-xl shadow-lg hover:shadow-sm transition-all uppercase tracking-wide disabled:opacity-50"
              >
                {loading ? "Verifying Security & Encrypting..." : mode === "change" ? "Save & Apply Password" : "Reset & Activate Password"}
              </button>
              
              {isFirstLogin && (
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2 text-xs text-gray-500 hover:text-gray-900 transition-colors"
                >
                  Skip for this session (Continue with initial password)
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
