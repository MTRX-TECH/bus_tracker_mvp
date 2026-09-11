import React from "react";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, className = "", title, subtitle, action }) => {
  return (
    <div className={`bg-white border border-gray-200 shadow-sm rounded-xl p-5 sm:p-6 rounded-xl border border-gray-200/80 shadow-glass transition-all ${className}`}>
      {(title || subtitle || action) && (
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200/60">
          <div>
            {title && <h3 className="text-lg font-bold text-gray-900 tracking-wide">{title}</h3>}
            {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
};
