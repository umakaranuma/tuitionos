"use client";
import { useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { PageShell } from "@/components/layout/PageShell";
import {
  useNotifications, AlertIcon,
  groupRecentByBucket, groupOlderByDate, AlertItem,
} from "@/lib/notifications";

const toggleData = [
  { label: "WhatsApp reminder — day 3 overdue", sub: "Auto-message overdue institutes", key: "wa_remind" },
  { label: "Auto-suspend — day 21 overdue", sub: "Locks institute login", key: "auto_suspend" },
  { label: "Trial expiry email — 3 days before", sub: "Includes upgrade link", key: "trial_email" },
  { label: "Monthly income summary to developer", sub: "Sent on 1st of each month", key: "monthly_summary" },
];

function AlertCard({
  a, onMarkRead, onDismiss, absolute,
}: {
  a: AlertItem;
  onMarkRead: (id: number) => void;
  onDismiss: (id: number) => void;
  absolute: (iso: string) => string;
}) {
  return (
    <div className={`alert-c ${a.read ? "is-read" : ""}`} style={{ borderLeft: `3px solid ${a.color}` }}>
      <div className="alert-ic" style={{ background: a.bg }}>
        <AlertIcon type={a.type} stroke={a.stroke} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <div className="alert-tl">
            {!a.read && <span className="notif-row-dot" aria-hidden style={{ marginRight: 6 }} />}
            {a.title}
          </div>
          <span style={{ fontSize: 11, color: "var(--ink3)", fontWeight: 500, flexShrink: 0, fontFamily: "var(--font-mono)" }}>
            {absolute(a.createdAt)}
          </span>
        </div>
        <div className="alert-sb">{a.sub}</div>
        <div className="alert-ac">
          {!a.read && (
            <button className="btn btn-xs btn-g" onClick={() => onMarkRead(a.id)}>Mark as read</button>
          )}
          <button className="btn btn-xs btn-s" onClick={() => onDismiss(a.id)}>Dismiss</button>
        </div>
      </div>
    </div>
  );
}

export default function AlertsPage() {
  const {
    alerts, olderAlerts, unreadCount, hasMoreOlder, olderTotal,
    loading, loadingOlder, loadOlder,
    markRead, markAllRead, dismiss, absolute,
  } = useNotifications();
  const [toggles, setToggles] = useState<Record<string, boolean>>({
    wa_remind: true, auto_suspend: true, trial_email: true, monthly_summary: true,
  });
  const [showOlder, setShowOlder] = useState(false);

  const recentGroups = groupRecentByBucket(alerts);
  const olderGroups = groupOlderByDate(olderAlerts);

  const expandOlder = async () => {
    if (!showOlder) setShowOlder(true);
    await loadOlder();
  };

  return (
    <PageShell>
      <Topbar
        title="Alerts"
        subtitle={
          loading
            ? "Loading…"
            : `${alerts.length} recent · ${unreadCount} unread${olderTotal > 0 ? ` · ${olderTotal} older` : ""}`
        }
        right={
          <button
            className="btn btn-s btn-sm"
            onClick={markAllRead}
            disabled={unreadCount === 0}
            style={unreadCount === 0 ? { opacity: .5, cursor: "default" } : undefined}
          >
            Mark all read
          </button>
        }
      />
      <div className="pb fi">
        <div className="g2">
          <div>
            <div className="sec-hdr">
              <span className="sec-title">Requiring action now</span>
              <span style={{ fontSize: 11, color: "var(--ink3)", fontWeight: 500 }}>
                Last 7 days
              </span>
            </div>

            {loading ? (
              <div className="card" style={{ textAlign: "center", color: "var(--ink3)", padding: 32 }}>
                Loading notifications…
              </div>
            ) : alerts.length === 0 && olderAlerts.length === 0 ? (
              <div className="card" style={{ textAlign: "center", color: "var(--ink3)", padding: "32px 0" }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>✓</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>All clear</div>
                <div style={{ fontSize: 11, marginTop: 4 }}>No alerts requiring action</div>
              </div>
            ) : (
              <>
                {recentGroups.length === 0 && (
                  <div style={{ fontSize: 12, color: "var(--ink3)", padding: "10px 4px 16px" }}>
                    Nothing in the last 7 days. Older history is available below.
                  </div>
                )}
                {recentGroups.map(g => {
                  const groupUnread = g.items.filter(a => !a.read).length;
                  return (
                    <div key={g.label} style={{ marginBottom: 20 }}>
                      <div className="alert-day">
                        <span className="alert-day-lbl">{g.label}</span>
                        <span className="alert-day-meta">
                          {g.items.length} item{g.items.length !== 1 ? "s" : ""}
                          {groupUnread > 0 && <span className="alert-day-unread">· {groupUnread} unread</span>}
                        </span>
                      </div>
                      {g.items.map(a => (
                        <AlertCard key={a.id} a={a} onMarkRead={markRead} onDismiss={dismiss} absolute={absolute} />
                      ))}
                    </div>
                  );
                })}

                {/* Older notifications — collapsed by default, paginated 20 at a time. */}
                {(olderTotal > 0 || olderAlerts.length > 0) && (
                  <div style={{ marginTop: 16 }}>
                    {!showOlder ? (
                      <button
                        className="btn btn-s btn-sm"
                        onClick={expandOlder}
                        disabled={loadingOlder}
                        style={{ width: "100%", justifyContent: "center" }}
                      >
                        {loadingOlder ? "Loading older…" : `Show older notifications (${olderTotal})`}
                      </button>
                    ) : (
                      <>
                        <div className="sec-hdr" style={{ marginTop: 8 }}>
                          <span className="sec-title">Older history</span>
                          <span style={{ fontSize: 11, color: "var(--ink3)", fontWeight: 500 }}>
                            {olderAlerts.length} of {olderTotal} loaded
                          </span>
                        </div>
                        {olderGroups.map(g => (
                          <div key={g.label} style={{ marginBottom: 20 }}>
                            <div className="alert-day">
                              <span className="alert-day-lbl">{g.label}</span>
                              <span className="alert-day-meta">{g.items.length} item{g.items.length !== 1 ? "s" : ""}</span>
                            </div>
                            {g.items.map(a => (
                              <AlertCard key={a.id} a={a} onMarkRead={markRead} onDismiss={dismiss} absolute={absolute} />
                            ))}
                          </div>
                        ))}
                        {hasMoreOlder && (
                          <button
                            className="btn btn-s btn-sm"
                            onClick={loadOlder}
                            disabled={loadingOlder}
                            style={{ width: "100%", justifyContent: "center" }}
                          >
                            {loadingOlder ? "Loading…" : "Load 20 more"}
                          </button>
                        )}
                        {!hasMoreOlder && olderAlerts.length > 0 && (
                          <div style={{ textAlign: "center", fontSize: 11, color: "var(--ink3)", padding: 10 }}>
                            That's the end of the history.
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          <div>
            <div className="sec-hdr"><span className="sec-title">Auto-action settings</span></div>
            <div className="card">
              {toggleData.map(t => (
                <div key={t.key} className="tog-row">
                  <div>
                    <div className="tog-lbl">{t.label}</div>
                    <div className="tog-sub">{t.sub}</div>
                  </div>
                  <button
                    className={`toggle ${toggles[t.key] ? "on" : ""}`}
                    onClick={() => setToggles(prev => ({ ...prev, [t.key]: !prev[t.key] }))}
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
