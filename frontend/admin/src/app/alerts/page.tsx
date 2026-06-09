"use client";
import { useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { PageShell } from "@/components/layout/PageShell";
import { ALERTS, AlertIcon } from "@/lib/notifications";

const toggleData = [
  { label: "WhatsApp reminder — day 3 overdue", sub: "Auto-message overdue institutes", key: "wa_remind" },
  { label: "Auto-suspend — day 21 overdue", sub: "Locks institute login", key: "auto_suspend" },
  { label: "Trial expiry email — 3 days before", sub: "Includes upgrade link", key: "trial_email" },
  { label: "Monthly income summary to developer", sub: "Sent on 1st of each month", key: "monthly_summary" },
];

export default function AlertsPage() {
  const [alerts, setAlerts] = useState(ALERTS);
  const [toggles, setToggles] = useState<Record<string, boolean>>({
    wa_remind: true, auto_suspend: true, trial_email: true, monthly_summary: true,
  });

  const dismiss = (id: number) => setAlerts((prev) => prev.filter((a) => a.id !== id));

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
                    <AlertIcon type={a.type} stroke={a.stroke} />
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
