import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Shield } from "lucide-react";

interface AboutTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutTeamModal: React.FC<AboutTeamModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-white backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.3 }}
          className="relative w-full max-w-3xl bg-gray-50 border border-gray-200 rounded-2xl p-5 md:p-8 shadow-md shadow-sm my-auto max-h-[88vh] overflow-y-auto text-gray-800"
        >
          {/* Decorative gold background glow */}
          <div className="absolute top-0 right-0 w-72 h-72 bg-blue-600 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

          <button
            onClick={onClose}
            className="absolute top-6 right-6 p-2 rounded-full bg-gray-100 text-gray-600 hover:text-gray-900 hover:bg-zinc-700 transition-colors z-10"
            title="Close modal"
          >
            <X size={22} />
          </button>

          <div className="text-center mb-8 flex flex-col items-center">
            
            <h1 className="text-3xl md:text-4xl font-bold text-blue-700 font-bold tracking-wide">About us</h1>
          </div>

          <div className="mb-8">
            <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-6 rounded-xl border border-gray-200 bg-gradient-to-r from-white via-gray-50/90 to-gray-100/20 shadow-lg">
              <div className="flex flex-col md:flex-row items-center md:items-start gap-6 text-center md:text-left">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br bg-blue-600 p-[2px] shadow-sm shrink-0">
                  <div className="w-full h-full bg-white rounded-full flex items-center justify-center text-blue-600 text-2xl font-bold">
                    MK
                  </div>
                </div>
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-600 border border-gray-200 text-blue-600 text-xs font-semibold uppercase tracking-wider mb-2">
                    <Shield size={14} className="text-blue-700" /> Developer
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 tracking-wide">Developed by Manoj Kumar</h3>
                  <p className="text-blue-600 font-medium text-sm md:text-base mb-2">B.E Mech (2025-2029 batch)</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
