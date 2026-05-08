"use client";
import { useState, useEffect } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { PageShell } from "@/components/layout/PageShell";
import { api } from "@/lib/api";

type NLog = { id: number; student: number; student_name: string; channel: string; notification_type: string; recipient_mobile: string; message_preview: string; is_delivered: boolean; sent_at: string; error_message: string };

export default function NotificationsPage() {
  const [logs, setLogs] = useState<NLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/api/notifications/").then(r => {
      const d = r.data; setLogs(Array.isArray(d) ? d : d.results || []); setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const delivered = logs.filter(l => l.is_delivered).length;
  const failed = logs.filter(l => !l.is_delivered).length;

  return (
    <PageShell>
      <Topbar title="Notifications" subtitle={`${logs.length} sent · ${delivered} delivered · ${failed} failed`} />
      <div className="pb fi">
        {loading ? <div style={{ textAlign: "center", padding: 40, color: "var(--ink3)" }}>Loading...</div> : (
          logs.length > 0 ? (
            <div className="tw">
              <table>
                <thead><tr><th>Student</th><th>Channel</th><th>Type</th><th>To</th><th>Status</th><th>Sent</th></tr></thead>
                <tbody>
                  {logs.map(l => (
                    <tr key={l.id}>
                      <td style={{ fontWeight: 600 }}>{l.student_name}</td>
                      <td><span className="bdg b-trial">{l.channel}</span></td>
                      <td style={{ color: "var(--ink3)" }}>{l.notification_type}</td>
                      <td className="mono">{l.recipient_mobile}</td>
                      <td>{l.is_delivered ? <span className="bdg b-paid">Delivered</span> : <span className="bdg b-over">Failed</span>}</td>
                      <td className="mono" style={{ color: "var(--ink3)" }}>{l.sent_at ? new Date(l.sent_at).toLocaleString() : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="card" style={{ textAlign: "center", color: "var(--ink3)", padding: 40 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>No notifications sent yet</div>
              <div style={{ fontSize: 12 }}>Notifications will appear here once you start sending fee reminders or attendance alerts.</div>
            </div>
          )
        )}
      </div>
    </PageShell>
  );
}
