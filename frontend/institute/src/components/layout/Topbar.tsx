import React from "react";

interface TopbarProps {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}

export function Topbar({ title, subtitle, right }: TopbarProps) {
  return (
    <div className="topbar">
      <div>
        <div className="topbar-title">{title}</div>
        {subtitle && <div className="topbar-sub">{subtitle}</div>}
      </div>
      {right && <div className="tb-right">{right}</div>}
    </div>
  );
}
