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
    <div className={`glass-panel p-5 sm:p-6 rounded-xl border border-zinc-800/80 shadow-glass transition-all ${className}`}>
      {(title || subtitle || action) && (
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-800/60">
          <div>
            {title && <h3 className="text-lg font-bold text-white tracking-wide">{title}</h3>}
            {subtitle && <p className="text-xs text-silver-400 mt-0.5">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
};
