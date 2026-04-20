"use client";
import { useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { PageShell } from "@/components/layout/PageShell";

const notifHistory = [
  {
    bg: "var(--sf-l)", stroke: "var(--sf)", title: "Fee reminders — April 2026",
    sub: "312 messages sent · 9:00 AM", time: "Apr 1 2026", channel: "WA", cost: "LKR 624",
    iconPath: "M2 2h10a.5.5 0 01.5.5v10l-1-1-1 1-1-1-1 1-1-1-1 1V2.5A.5.5 0 012 2z M4 5.5h6M4 7.5h4"
  },
  {
    bg: "var(--tc-l)", stroke: "var(--tc-d)", title: "Fee paid — Dinesh Raj",
    sub: "LKR 7,000 · Ref: PAY-0382", time: "Apr 3 2026 · 3:12 PM", channel: "WA", cost: "LKR 2",
    iconPath: "M2 8l4 4 7-7"
  },
  {
    bg: "var(--sp-l)", stroke: "var(--sp)", title: "Timetable change — Physics",
    sub: "44 students · Grade 10 batch", time: "Apr 8 2026 · 11:30 AM", channel: "WA", cost: "LKR 88",
    iconPath: "M1 2h12a0 0 0 01.5v9a.5.5 0 01-.5.5H1a.5.5 0 01-.5-.5V2.5a.5.5 0 01.5-.5z M1 5h12"
  },
  {
    bg: "var(--ac-l)", stroke: "var(--ac)", title: "Annual timetable PDF — 2026",
    sub: "312 students · Jan blast", time: "Jan 8 2026 · 10:00 AM", channel: "PDF", cost: "LKR 936",
    iconPath: "M2 12l2.5-3.5 2.5 2.5 3-5L12 9 M1 1h12v11rx1.5"
  },
  {
    bg: "var(--rb-l)", stroke: "var(--rb)", title: "Absent digest — Apr 17",
    sub: "23 students absent · 6:00 PM", time: "Apr 17 2026 · 6:00 PM", channel: "WA", cost: "LKR 46",
    iconPath: "M7.5 4.5v4M7.5 10.5h.01 M7.5 1.5a6 6 0 100 12 6 6 0 000-12z"
  },
];

const toggles = [
  { key: "fee_reminder", label: "Fee reminder — 1st of month", sub: "All parents at 9:00 AM", disabled: false },
  { key: "fee_paid", label: "Fee paid confirmation", sub: "Immediate · always on", disabled: true },
  { key: "timetable", label: "Timetable change alert", sub: "Admin decides per change", disabled: false },
  { key: "absent_digest", label: "Daily absent digest at 6 PM", sub: "One message per parent per day", disabled: false },
];

export default function NotificationsPage() {
  const [states, setStates] = useState<Record<string, boolean>>({
    fee_reminder: true, fee_paid: true, timetable: true, absent_digest: true,
  });
  const [blastSent, setBlastSent] = useState(false);

  return (
    <PageShell>
      <Topbar title="Notifications" subtitle="Premium · WhatsApp delivery settings" />
      <div className="pb fi">
        <div className="g2">
          <div>
            <div className="sec-hdr"><span className="sec-title">Notification toggles</span></div>
            <div className="card" style={{ marginBottom: 14 }}>
              {toggles.map((t) => (
                <div key={t.key} className="tog-row">
                  <div>
                    <div className="tog-lbl">{t.label}</div>
                    <div className="tog-sub">{t.sub}</div>
                  </div>
                  <button
                    className={`toggle ${states[t.key] ? "on" : ""}`}
                    style={t.disabled ? { opacity: .5, cursor: "not-allowed" } : {}}
                    onClick={() => !t.disabled && setStates(prev => ({ ...prev, [t.key]: !prev[t.key] }))}
                  />
                </div>
              ))}
            </div>

            <div className="sec-hdr"><span className="sec-title">Annual timetable PDF</span></div>
            <div className="card">
              <div style={{ fontSize: 12.5, color: "var(--ink2)", marginBottom: 12 }}>
                Send personalised timetable PDF to all 312 parents via WhatsApp. Est. cost:{" "}
                <strong style={{ color: "var(--ink)" }}>LKR 936</strong> total.
              </div>
              {blastSent ? (
                <div style={{ background: "var(--tc-l)", borderRadius: "var(--r)", padding: "8px 12px", fontSize: 12, color: "var(--tc-d)" }}>
                  ✓ Blast queued — 312 personalised PDFs being sent (10s apart)
                </div>
              ) : (
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-ac" onClick={() => setBlastSent(true)}>Send annual timetable PDF</button>
                  <button className="btn btn-s btn-sm">Preview PDF</button>
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="sec-hdr"><span className="sec-title">Notification history</span></div>
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              {notifHistory.map((n, i) => (
                <div key={i} className="notif-r">
                  <div className="notif-ic" style={{ background: n.bg }}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke={n.stroke} strokeWidth="1.75">
                      <path d={n.iconPath}/>
                    </svg>
                  </div>
                  <div>
                    <div className="notif-tl">{n.title}</div>
                    <div className="notif-sb">{n.sub}</div>
                    <div className="notif-time">{n.time}</div>
                  </div>
                  <div className="notif-cost">
                    <span className={`bdg ${n.channel === "WA" ? "b-wa" : "b-pdf"}`}>{n.channel}</span>
                    <div>{n.cost}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
