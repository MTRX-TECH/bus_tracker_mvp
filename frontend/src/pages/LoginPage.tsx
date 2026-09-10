import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { AboutTeamModal } from "../components/AboutTeamModal";
import { PasswordModal } from "../components/PasswordModal";
import { Lock, Mail, Users, Shield, ArrowRight, Sparkles } from "lucide-react";

interface LoginPageProps {
  onOpenStudentView?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onOpenStudentView }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.response?.data?.error || "Login failed. Verify your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full max-w-full flex flex-col justify-between p-4 relative overflow-x-hidden overflow-y-auto">
      {/* Background Luxury Ambient Lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] sm:w-[450px] h-[350px] sm:h-[450px] max-w-[90vw] bg-gold-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Top Bar with Persistent About Team Button */}
      <div className="w-full max-w-7xl mx-auto flex items-center justify-between py-4">
        <div className="flex items-center gap-3">
          <img src="/rit-logo.png" alt="MTRX Brand Logo" className="w-11 h-11 object-cover rounded-2xl overflow-hidden shrink-0 border border-gold-500/40 shadow-lg shadow-gold-500/20 bg-black/50" />
          <span className="font-bold tracking-wider gold-gradient-text text-lg sm:text-xl">RIT Bus Tracker</span>
        </div>
        <button
          onClick={() => setIsTeamModalOpen(true)}
          className="px-4 py-2 rounded-lg bg-zinc-800/80 hover:bg-gold-500/20 border border-gold-500/30 text-gold-400 font-medium text-sm transition-all flex items-center gap-2"
        >
          <Users size={16} />
          <span>About us</span>
        </button>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-md mx-auto my-auto relative z-10">
        <div className="glass-panel p-8 rounded-2xl border border-zinc-800 shadow-2xl shadow-black/80">
          <div className="text-center mb-8 flex flex-col items-center">
            <img src="/rit-logo.png" alt="MTRX Brand Emblem" className="w-24 h-24 object-cover rounded-3xl overflow-hidden mb-4 border-2 border-gold-500/50 shadow-2xl shadow-gold-500/30 bg-black/60 p-0.5" />
            <h2 className="text-xs uppercase tracking-[0.25em] text-gold-400 font-semibold mb-2 flex items-center justify-center gap-1.5">
              <Sparkles size={14} className="text-gold-500" /> Developed by RIT
            </h2>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-wide">Enterprise SSO Portal</h1>
            <p className="text-xs text-silver-400 mt-2">Sign in to manage collegiate transit fleets or stream live GPS.</p>
          </div>

          {error && (
            <div className="mb-6 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium text-center">
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-silver-300 mb-1.5 uppercase tracking-wider">Email Address</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-zinc-900/90 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:border-gold-500 transition-colors"
                  placeholder="admin@mtrxtech.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-silver-300 mb-1.5 uppercase tracking-wider">Security Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-zinc-900/90 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:border-gold-500 transition-colors"
                  placeholder="••••••••••••"
                />
              </div>
            </div>

            <div className="flex items-center justify-end -mt-1">
              <button
                type="button"
                onClick={() => setIsResetModalOpen(true)}
                className="text-xs text-gold-400 hover:text-gold-300 font-medium transition-colors cursor-pointer"
              >
                Forgot / Reset Password?
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-gold-500 via-amber-500 to-gold-400 hover:from-gold-400 hover:to-gold-600 text-black font-bold text-sm uppercase tracking-wider transition-all shadow-gold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? "Authenticating Session..." : <>Sign In to Platform <ArrowRight size={16} /></>}
            </button>
          </form>

          {/* Student & Passenger Public Tracking Card - No Login Needed */}
          {onOpenStudentView && (
            <div className="mt-6 pt-6 border-t border-zinc-800/80 text-center">
              <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/40 via-zinc-900 to-emerald-950/40 border border-emerald-500/50 shadow-lg hover:border-emerald-400 transition-all">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-extrabold text-[10px] uppercase tracking-wider mb-2">
                  🎓 Public Student & Passenger Portal
                </span>
                <p className="text-xs text-zinc-300 font-medium leading-relaxed mb-3.5">
                  Are you a student, scholar, or parent? View live college bus telemetries, route maps, and stop arrival times instantly without a login account!
                </p>
                <button
                  type="button"
                  onClick={onOpenStudentView}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400 hover:brightness-110 text-black font-black text-xs uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 transform active:scale-95 transition-all cursor-pointer"
                >
                  🚍 Open Student Live Tracking Portal ➡️
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer credits */}
      <footer className="w-full text-center py-4 text-xs text-silver-400">
        Developed by <span className="text-gold-400 font-semibold">RIT</span> 
      </footer>

      <AboutTeamModal isOpen={isTeamModalOpen} onClose={() => setIsTeamModalOpen(false)} />
      <PasswordModal isOpen={isResetModalOpen} onClose={() => setIsResetModalOpen(false)} mode="reset" />
    </div>
  );
};
