import React, { useState } from "react";
import { AboutTeamModal } from "./AboutTeamModal";
import { Users, ShieldCheck } from "lucide-react";

export const Footer: React.FC = () => {
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);

  return (
    <>
      <footer className="w-full bg-[#0D0D0D] border-t border-gray-200/70 py-6 px-4 text-center text-xs text-gray-500 mt-auto">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-left">
            <ShieldCheck size={18} className="text-blue-700 shrink-0" />
            <div>
              <p className="font-semibold text-gray-900">Developed by <span className="text-blue-600">RIT</span></p>
              <p className="text-[11px]">Founder & CEO – <span className="text-gray-600 font-medium"></span></p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <button
              onClick={() => setIsTeamModalOpen(true)}
              className="inline-flex items-center gap-1 text-blue-600 hover:text-gold-300 transition-colors font-medium cursor-pointer underline underline-offset-4"
            >
              <Users size={14} />
              <span>About us</span>
            </button>
            <span>•</span>
            <span>Zero-Cost SaaS Architecture</span>
          </div>

          <p className="text-silver-500">
            © {new Date().getFullYear()} RIT. All Rights Reserved.
          </p>
        </div>
      </footer>

      <AboutTeamModal isOpen={isTeamModalOpen} onClose={() => setIsTeamModalOpen(false)} />
    </>
  );
};
