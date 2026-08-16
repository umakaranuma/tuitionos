"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getStoredUser, logout } from "@/lib/auth";
import { Avatar } from "@/components/ui/Avatar";

type Inst = { name?: string; subdomain?: string; plan?: string; status?: string; trial_ends_at?: string | null };
type User = { name?: string; role?: string; avatar?: string | null; institute?: Inst };

const YEARS = [2024, 2025, 2026, 2027, 2028, 2029, 2030];

export function TopNav() {
  const [user, setUser] = useState<User | null>(null);
  const [year, setYear] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    const sync = () => setUser(getStoredUser());
    sync();
    window.addEventListener("storage", sync);
    const stored = typeof window !== "undefined" ? localStorage.getItem("academic_year") : null;
    if (stored) setYear(parseInt(stored, 10));
    return () => window.removeEventListener("storage", sync);
  }, []);

  const onYear = (v: string) => {
    const y = parseInt(v, 10);
    setYear(y);
    localStorage.setItem("academic_year", String(y));
    window.location.reload();
  };

  const inst = user?.institute;

  // Trial countdown — show only when the institute is on trial and the end date is near.
  let trialBanner: { days: number; expired: boolean } | null = null;
  if (inst?.status === "trial" && inst.trial_ends_at) {
    const end = new Date(inst.trial_ends_at);
    const days = Math.ceil((end.getTime() - Date.now()) / 86_400_000);
    if (days <= 14) trialBanner = { days, expired: days < 0 };
  }

  return (
    <div className="top-nav">
      {trialBanner && (
        <div className="trial-banner" style={{
          background: trialBanner.expired ? "var(--rb-l)" : "var(--ac-l)",
          color: trialBanner.expired ? "var(--rb)" : "#9a5b14",
        }}>
          <span style={{ fontWeight: 700 }}>
            {trialBanner.expired ? "Trial expired" : `${trialBanner.days} day${trialBanner.days !== 1 ? "s" : ""} left in trial`}
          </span>
          <Link href="/settings" className="btn btn-p btn-xs">Upgrade now</Link>
        </div>
      )}

      <div className="tnav-acts">
        {/* Academic year switcher */}
        <div className="tnav-acad-year">
          <span className="tnav-acad-lbl">Academic year</span>
          <select value={year} onChange={e => onYear(e.target.value)} className="tnav-acad-sel">
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        <div style={{ width: 1, height: 20, background: "var(--ln)", margin: "0 4px" }} />

        <Link href="/settings" className="tnav-user-ava" title="Profile & settings">
          <Avatar src={user?.avatar} name={user?.name || "User"} size={30} radius={15} bg="var(--tc)" fg="#fff" />
        </Link>

        <button className="tnav-btn" onClick={() => logout()} title="Sign out" aria-label="Sign out">
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 16 16">
            <path d="M6 14H3a1 1 0 01-1-1V3a1 1 0 011-1h3"/>
            <path d="M10.5 11L14 7.5 10.5 4M14 7.5H6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
