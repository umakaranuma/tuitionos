import React from "react";

interface TopbarProps {
  title: string;
  subtitle?: string;
  /** Optional leading avatar/photo — used by single-record detail pages
      (a teacher, a student) to show who this page belongs to right next
      to their name, instead of burying their photo further down. */
  avatar?: React.ReactNode;
  right?: React.ReactNode;
  onBack?: () => void;
  backLabel?: string;
}

export function Topbar({ title, subtitle, avatar, right, onBack, backLabel = "Back" }: TopbarProps) {
  return (
    <div>
      {onBack && (
        <div className="breadcrumb">
          <button className="tb-back" onClick={onBack} aria-label={backLabel}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 14 14">
              <path d="M8.5 3L4.5 7l4 4"/>
            </svg>
            <span>{backLabel}</span>
          </button>
        </div>
      )}
      <div className="topbar">
        {avatar}
        <div>
          <div className="topbar-title">{title}</div>
          {subtitle && <div className="topbar-sub">{subtitle}</div>}
        </div>
        {right && <div className="tb-right">{right}</div>}
      </div>
    </div>
  );
}
