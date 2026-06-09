import React from "react";

interface TopbarProps {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onBack?: () => void;
  backLabel?: string;
  /** Breadcrumb path items shown above the title, e.g. [{label:"Institutes", onClick:...}] */
  crumbs?: { label: string; onClick?: () => void }[];
}

export function Topbar({ title, subtitle, right, onBack, backLabel = "Back", crumbs }: TopbarProps) {
  const hasCrumbs = crumbs && crumbs.length > 0;

  return (
    <div>
      {/* Breadcrumb / back navigation */}
      {(onBack || hasCrumbs) && (
        <div className="breadcrumb">
          {onBack && !hasCrumbs && (
            <button className="tb-back" onClick={onBack} aria-label={backLabel}>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 14 14">
                <path d="M8.5 3L4.5 7l4 4"/>
              </svg>
              <span>{backLabel}</span>
            </button>
          )}
          {hasCrumbs && crumbs!.map((c, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span className="breadcrumb-sep">/</span>}
              {c.onClick ? (
                <button onClick={c.onClick}>{c.label}</button>
              ) : (
                <span className={i === crumbs!.length - 1 ? "breadcrumb-current" : ""}>{c.label}</span>
              )}
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Page header row */}
      <div className="topbar">
        <div>
          <div className="topbar-title">{title}</div>
          {subtitle && <div className="topbar-sub">{subtitle}</div>}
        </div>
        {right && <div className="tb-right">{right}</div>}
      </div>
    </div>
  );
}
