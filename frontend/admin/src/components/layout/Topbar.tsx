import React from "react";

interface TopbarProps {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onBack?: () => void;
  backLabel?: string;
}

export function Topbar({ title, subtitle, right, onBack, backLabel = "Back" }: TopbarProps) {
  return (
    <div className="topbar">
      {onBack && (
        <button className="tb-back" onClick={onBack} aria-label={backLabel}>
          <svg width="15" height="15" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8.5 3L4.5 7l4 4" />
          </svg>
          <span>{backLabel}</span>
        </button>
      )}
      <div>
        <div className="topbar-title">{title}</div>
        {subtitle && <div className="topbar-sub">{subtitle}</div>}
      </div>
      {right && <div className="tb-right">{right}</div>}
    </div>
  );
}
