"use client";
import { useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { PageShell } from "@/components/layout/PageShell";

const initialAlerts = [
  {
    id: 1, color: "var(--rb)", bg: "var(--rb-l)", stroke: "var(--rb)", type: "error",
    title: "Edu Leaders — 14 days overdue",
    sub: "LKR 3,000 · Basic · +94 771 234 567",
    actions: [
      { label: "Mark paid", cls: "btn-ok" },
      { label: "Suspend", cls: "btn-d" },
    ],
  },
  {
    id: 2, color: "var(--sf)", bg: "var(--sf-l)", stroke: "var(--sf)", type: "warn",
    title: "Bright Minds — due today",
    sub: "LKR 3,000 · Basic · #INV-0079",
    actions: [
      { label: "Mark paid", cls: "btn-ok" },
      { label: "Send reminder", cls: "btn-s" },
    ],
  },
  {
    id: 3, color: "var(--sp)", bg: "var(--sp-l)", stroke: "var(--sp)", type: "info",
    title: "Alpha Lanka — trial ends in 3 days",
    sub: "Basic trial · admin@alphalanka.lk",
    actions: [
      { label: "Send upgrade nudge", cls: "btn-p" },
      { label: "End trial", cls: "btn-d" },
    ],
  },
  {
    id: 4, color: "var(--rb)", bg: "var(--rb-l)", stroke: "var(--rb)", type: "error",
    title: "Glow Institute — 7 days overdue",
    sub: "LKR 3,000 · Basic · +94 778 876 543",
    actions: [
      { label: "Mark paid", cls: "btn-ok" },
      { label: "Suspend", cls: "btn-d" },
    ],
  },
];

const toggleData = [
  { label: "WhatsApp reminder — day 3 overdue", sub: "Auto-message overdue institutes", key: "wa_remind" },
  { label: "Auto-suspend — day 21 overdue", sub: "Locks institute login", key: "auto_suspend" },
  { label: "Trial expiry email — 3 days before", sub: "Includes upgrade link", key: "trial_email" },
  { label: "Monthly income summary to developer", sub: "Sent on 1st of each month", key: "monthly_summary" },
];

export default function AlertsPage() {
  const [alerts, setAlerts] = useState(initialAlerts);
  const [toggles, setToggles] = useState<Record<string, boolean>>({
    wa_remind: true, auto_suspend: true, trial_email: true, monthly_summary: true,
  });

  const dismiss = (id: number) => setAlerts((prev) => prev.filter((a) => a.id !== id));

  const iconFor = (type: string, stroke: string) => {
    if (type === "error") return (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke={stroke} strokeWidth="1.75">
        <circle cx="7.5" cy="7.5" r="6"/><path d="M7.5 4.5v4M7.5 10.5h.01"/>
      </svg>
    );
    if (type === "warn") return (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke={stroke} strokeWidth="1.75">
        <path d="M7.5 2L1 13h13L7.5 2zM7.5 6v4M7.5 11.5h.01"/>
      </svg>
    );
    return (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke={stroke} strokeWidth="1.75">
        <circle cx="7.5" cy="7.5" r="6"/><path d="M7.5 6.5v4M7.5 5h.01"/>
      </svg>
    );
  };

  return (
    <PageShell>
      <Topbar title="Alerts" subtitle={`${alerts.length} items need action`} />
      <div className="pb fi">
        <div className="g2">
          <div>
            <div className="sec-hdr"><span className="sec-title">Requiring action now</span></div>
            {alerts.length === 0 ? (
              <div className="card" style={{ textAlign: "center", color: "var(--ink3)", padding: "32px 0" }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>✓</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>All clear</div>
                <div style={{ fontSize: 11, marginTop: 4 }}>No alerts requiring action</div>
              </div>
            ) : (
              alerts.map((a) => (
                <div key={a.id} className="alert-c" style={{ borderLeft: `3px solid ${a.color}` }}>
                  <div className="alert-ic" style={{ background: a.bg }}>
                    {iconFor(a.type, a.stroke)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="alert-tl">{a.title}</div>
                    <div className="alert-sb">{a.sub}</div>
                    <div className="alert-ac">
                      {a.actions.map((ac) => (
                        <button key={ac.label} className={`btn btn-xs ${ac.cls}`} onClick={() => dismiss(a.id)}>
                          {ac.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div>
            <div className="sec-hdr"><span className="sec-title">Auto-action settings</span></div>
            <div className="card">
              {toggleData.map((t) => (
                <div key={t.key} className="tog-row">
                  <div>
                    <div className="tog-lbl">{t.label}</div>
                    <div className="tog-sub">{t.sub}</div>
                  </div>
                  <button
                    className={`toggle ${toggles[t.key] ? "on" : ""}`}
                    onClick={() => setToggles((prev) => ({ ...prev, [t.key]: !prev[t.key] }))}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
