"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useNotifications, AlertIcon } from "@/lib/notifications";

export function TopNav() {
  const router = useRouter();
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const { alerts, unreadCount, markRead, markAllRead, relative } = useNotifications();

  // Close notification popup on outside click / Escape
  useEffect(() => {
    if (!notifOpen) return;
    const onClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setNotifOpen(false); };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [notifOpen]);

  return (
    <div className="top-nav">
      {/* Action icons */}
      <div className="tnav-acts">
        {/* Notifications */}
        <div className="tnav-notif" ref={notifRef}>
          <button
            className="tnav-btn"
            title="Notifications"
            onClick={() => setNotifOpen(o => !o)}
            style={notifOpen ? { background: "var(--cr)", color: "var(--ink)" } : undefined}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 16 16">
              <path d="M8 2a4 4 0 014 4v3l1.5 2.5h-11L4 9V6a4 4 0 014-4z"/>
              <path d="M6.5 12.5a1.5 1.5 0 003 0"/>
            </svg>
            {unreadCount > 0 && <span className="tnav-notif-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>}
          </button>

          {notifOpen && (
            <div className="notif-pop">
              <div className="notif-pop-hdr">
                <div>
                  <div className="notif-pop-title">Notifications</div>
                  <div className="notif-pop-sub">
                    {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
                  </div>
                </div>
                <button
                  className="notif-pop-all"
                  onClick={markAllRead}
                  disabled={unreadCount === 0}
                  style={unreadCount === 0 ? { opacity: .5, cursor: "default" } : undefined}
                >
                  Mark all read
                </button>
              </div>

              <div className="notif-pop-list">
                {alerts.length === 0 ? (
                  <div className="notif-pop-empty">
                    <div style={{ fontSize: 22, marginBottom: 6 }}>✓</div>
                    All clear — no notifications
                  </div>
                ) : (
                  // Show only the top 6 in the bell; full history lives on /alerts.
                  alerts.slice(0, 6).map(a => (
                    <div
                      key={a.id}
                      className={`notif-row ${a.read ? "is-read" : ""}`}
                      onClick={() => { markRead(a.id); setNotifOpen(false); router.push("/alerts"); }}
                      role="button"
                      tabIndex={0}
                    >
                      <span className="notif-row-ic" style={{ background: a.bg }}>
                        <AlertIcon type={a.type} stroke={a.stroke} size={14} />
                      </span>
                      <span className="notif-row-body">
                        <span className="notif-row-title">
                          {!a.read && <span className="notif-row-dot" aria-hidden />}
                          {a.title}
                        </span>
                        <span className="notif-row-sub">{a.sub}</span>
                      </span>
                      <div className="notif-row-side">
                        <span className="notif-row-time">{relative(a.createdAt)}</span>
                        {!a.read && (
                          <button
                            className="notif-row-read"
                            title="Mark as read"
                            onClick={e => { e.stopPropagation(); markRead(a.id); }}
                          >
                            Mark read
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <button
                className="notif-pop-foot"
                onClick={() => { setNotifOpen(false); router.push("/alerts"); }}
              >
                Open Alerts center →
              </button>
            </div>
          )}
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 20, background: "var(--ln)", margin: "0 4px" }} />

        {/* User avatar → profile */}
        <div
          className="tnav-user-ava"
          title="Your profile"
          onClick={() => router.push("/profile")}
          role="button"
          tabIndex={0}
          onKeyDown={e => { if (e.key === "Enter") router.push("/profile"); }}
        >
          SD
        </div>
      </div>
    </div>
  );
}
