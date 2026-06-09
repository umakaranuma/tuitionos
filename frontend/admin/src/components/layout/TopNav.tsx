"use client";
import { useState } from "react";

export function TopNav() {
  const [search, setSearch] = useState("");

  return (
    <div className="top-nav">
      {/* Workspace selector */}
      <div className="tnav-ws">
        <div className="tnav-ws-ava">TO</div>
        <span className="tnav-ws-name">TuitionOS Admin</span>
      </div>

      {/* Global search */}
      <div className="tnav-search">
        <span className="tnav-search-ic">
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 16 16">
            <circle cx="7" cy="7" r="5"/>
            <path d="M10.5 10.5L14 14" strokeLinecap="round"/>
          </svg>
        </span>
        <input
          placeholder="Search..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Action icons */}
      <div className="tnav-acts">
        {/* Notifications */}
        <button className="tnav-btn" title="Notifications">
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 16 16">
            <path d="M8 2a4 4 0 014 4v3l1.5 2.5h-11L4 9V6a4 4 0 014-4z"/>
            <path d="M6.5 12.5a1.5 1.5 0 003 0"/>
          </svg>
        </button>
        {/* App grid */}
        <button className="tnav-btn" title="Apps">
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 16 16">
            <rect x="1.5" y="1.5" width="4.5" height="4.5" rx="1"/>
            <rect x="10" y="1.5" width="4.5" height="4.5" rx="1"/>
            <rect x="1.5" y="10" width="4.5" height="4.5" rx="1"/>
            <rect x="10" y="10" width="4.5" height="4.5" rx="1"/>
          </svg>
        </button>
        {/* Divider */}
        <div style={{ width: 1, height: 20, background: "var(--ln)", margin: "0 4px" }} />
        {/* User avatar */}
        <div className="tnav-user-ava" title="Admin account">SD</div>
      </div>
    </div>
  );
}
