"use client";
import { useState, useEffect } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { PageShell } from "@/components/layout/PageShell";
import { api } from "@/lib/api";
import { getStoredUser } from "@/lib/auth";
import { Modal } from "@/components/ui/Modal";
import { Toast } from "@/components/ui/Toast";

type NLog = { id: number; student: number; student_name: string; channel: string; notification_type: string; recipient_mobile: string; message_preview: string; is_delivered: boolean; sent_at: string; error_message: string };
type Broadcast = { id: number; title: string; message: string; channel: string; target_audience: string; status: string; scheduled_at: string | null; created_at: string; };

export default function NotificationsPage() {
  const [logs, setLogs] = useState<NLog[]>([]);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [activeTab, setActiveTab] = useState<"logs" | "broadcasts" | "settings">("broadcasts");
  const [broadcastModal, setBroadcastModal] = useState(false);
  const [alertModal, setAlertModal] = useState<{ open: boolean; message: string; type: "success" | "error" } | null>(null);
  
  const [bForm, setBForm] = useState({ id: null as number | null, title: "", target_audience: "All Students", channel: "whatsapp", message: "", is_scheduled: false, scheduled_at: "" });
  const [savingB, setSavingB] = useState(false);
  
  // Settings state
  const [settings, setSettings] = useState({
    attendance_sms: true,
    fee_reminder_whatsapp: true,
    exam_results_email: false,
    promotional_broadcasts: true,
  });

  useEffect(() => {
    const user = getStoredUser();
    if (user?.institute?.plan !== "institute_pro") {
      setIsLocked(true);
      return;
    }
    Promise.all([
      api.get("/api/notifications/logs"),
      api.get("/api/notifications/broadcasts")
    ]).then(([rLogs, rBcasts]) => {
      setLogs(Array.isArray(rLogs.data) ? rLogs.data : rLogs.data.results || []);
      setBroadcasts(Array.isArray(rBcasts.data) ? rBcasts.data : rBcasts.data.results || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const openBroadcastModal = (b?: Broadcast) => {
    if (b) {
      const isSched = !!b.scheduled_at;
      setBForm({
        id: b.id, title: b.title, target_audience: b.target_audience, channel: b.channel, message: b.message,
        is_scheduled: isSched, scheduled_at: isSched ? new Date(b.scheduled_at!).toISOString().slice(0, 16) : ""
      });
    } else {
      setBForm({ id: null, title: "", target_audience: "All Students", channel: "whatsapp", message: "", is_scheduled: false, scheduled_at: "" });
    }
    setBroadcastModal(true);
  };

  const saveBroadcast = async () => {
    if (!bForm.message) return setAlertModal({ open: true, message: "Message is required", type: "error" });
    setSavingB(true);
    const payload = {
      title: bForm.title, message: bForm.message, channel: bForm.channel, target_audience: bForm.target_audience,
      status: bForm.is_scheduled ? "scheduled" : "completed",
      scheduled_at: bForm.is_scheduled ? new Date(bForm.scheduled_at).toISOString() : null
    };
    try {
      if (bForm.id) {
        await api.put(`/api/notifications/broadcasts/${bForm.id}`, payload);
      } else {
        await api.post("/api/notifications/broadcasts", payload);
      }
      const r = await api.get("/api/notifications/broadcasts");
      setBroadcasts(Array.isArray(r.data) ? r.data : r.data.results || []);
      setBroadcastModal(false);
      setAlertModal({ open: true, message: bForm.is_scheduled ? "Broadcast scheduled." : "Broadcast sent.", type: "success" });
    } catch (err) {
      setAlertModal({ open: true, message: "Failed to save broadcast.", type: "error" });
    } finally {
      setSavingB(false);
    }
  };

  const deleteBroadcast = async (id: number) => {
    try {
      await api.delete(`/api/notifications/broadcasts/${id}`);
      setBroadcasts(broadcasts.filter(b => b.id !== id));
      setAlertModal({ open: true, message: "Broadcast deleted.", type: "success" });
    } catch (err) {
      setAlertModal({ open: true, message: "Failed to delete broadcast.", type: "error" });
    }
  };

  const sendBroadcastNow = async (b: Broadcast) => {
    try {
      await api.put(`/api/notifications/broadcasts/${b.id}`, { ...b, status: "completed", scheduled_at: null });
      setBroadcasts(broadcasts.map(x => x.id === b.id ? { ...x, status: "completed", scheduled_at: null } : x));
      setAlertModal({ open: true, message: "Broadcast sent successfully.", type: "success" });
    } catch (err) {
      setAlertModal({ open: true, message: "Failed to send broadcast.", type: "error" });
    }
  };

  if (isLocked) {
    return (
      <PageShell>
        <Topbar title="Notifications" />
        <div className="pb fi" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", paddingTop: 80 }}>
          <div style={{ background: "var(--tc)", color: "white", padding: "4px 12px", borderRadius: 12, fontSize: 12, fontWeight: 700, marginBottom: 16 }}>PRO FEATURE</div>
          <h2 style={{ fontSize: 24, color: "var(--ink)", fontWeight: 700, marginBottom: 12 }}>Notifications Locked</h2>
          <p style={{ color: "var(--ink2)", textAlign: "center", maxWidth: 400, lineHeight: 1.5 }}>
            Automated WhatsApp notifications are an Institute Pro feature. Please upgrade your package in Settings to access this capability.
          </p>
        </div>
      </PageShell>
    );
  }

  const delivered = logs.filter(l => l.is_delivered).length;
  const failed = logs.filter(l => !l.is_delivered).length;

  return (
    <PageShell>
      <Topbar 
        title="Notifications" 
        subtitle="Manage automated alerts and broadcasts"
        right={
          <button className="btn btn-p btn-sm" onClick={() => openBroadcastModal()}>
            + New Broadcast
          </button>
        }
      />
      <div className="pb fi">
        {/* Tabs */}
        <div style={{ display: "flex", gap: 24, borderBottom: "1px solid var(--ln)", marginBottom: 24 }}>
          {(["broadcasts", "logs", "settings"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                background: "none", border: "none", borderBottom: `2px solid ${activeTab === tab ? "var(--tc)" : "transparent"}`,
                padding: "0 4px 12px", fontSize: 13, fontWeight: activeTab === tab ? 600 : 500,
                color: activeTab === tab ? "var(--tc-d)" : "var(--ink3)", cursor: "pointer", transition: "all 120ms",
                textTransform: "capitalize"
              }}
            >
              {tab === "logs" ? "Activity Log" : tab === "broadcasts" ? "Broadcasts" : "Automation Settings"}
            </button>
          ))}
        </div>

        {loading ? <div style={{ textAlign: "center", padding: 40, color: "var(--ink3)" }}>Loading...</div> : (
          activeTab === "logs" ? (
            <>
              {/* Quick Stats */}
              <div className="g3" style={{ marginBottom: 20 }}>
                <div className="card" style={{ padding: "12px 16px" }}>
                  <div style={{ fontSize: 11, color: "var(--ink3)", fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>Total Sent</div>
                  <div style={{ fontFamily: "var(--font-serif)", fontSize: 24, color: "var(--ink)" }}>{logs.length}</div>
                </div>
                <div className="card" style={{ padding: "12px 16px" }}>
                  <div style={{ fontSize: 11, color: "var(--ink3)", fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>Delivered</div>
                  <div style={{ fontFamily: "var(--font-serif)", fontSize: 24, color: "var(--tc)" }}>{delivered}</div>
                </div>
                <div className="card" style={{ padding: "12px 16px" }}>
                  <div style={{ fontSize: 11, color: "var(--ink3)", fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>Failed</div>
                  <div style={{ fontFamily: "var(--font-serif)", fontSize: 24, color: "var(--rb)" }}>{failed}</div>
                </div>
              </div>

              {logs.length > 0 ? (
                <div className="tw">
                  <table>
                    <thead><tr><th>Student</th><th>Channel</th><th>Type</th><th>To</th><th>Status</th><th>Sent</th></tr></thead>
                    <tbody>
                      {logs.map(l => (
                        <tr key={l.id}>
                          <td style={{ fontWeight: 600 }}>{l.student_name}</td>
                          <td><span className="bdg b-pdf">{l.channel || "WhatsApp"}</span></td>
                          <td style={{ color: "var(--ink3)" }}>{l.notification_type || "Alert"}</td>
                          <td className="mono">{l.recipient_mobile || "—"}</td>
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
              )}
            </>
          ) : activeTab === "broadcasts" ? (
            <div className="tw">
              {broadcasts.length > 0 ? (
                <table>
                  <thead><tr><th>Title</th><th>Audience</th><th>Channel</th><th>Status</th><th>Time</th><th style={{ textAlign: "right" }}>Actions</th></tr></thead>
                  <tbody>
                    {broadcasts.map(b => (
                      <tr key={b.id}>
                        <td style={{ fontWeight: 600 }}>{b.title || "Untitled"}</td>
                        <td style={{ color: "var(--ink2)" }}>{b.target_audience}</td>
                        <td><span className="bdg b-pdf" style={{ textTransform: "capitalize" }}>{b.channel}</span></td>
                        <td>
                          {b.status === "scheduled" ? <span className="bdg b-trial">Scheduled</span> : 
                           b.status === "completed" ? <span className="bdg b-paid">Sent</span> : 
                           <span className="bdg">{b.status}</span>}
                        </td>
                        <td className="mono" style={{ color: "var(--ink3)", fontSize: 12 }}>
                          {b.scheduled_at ? new Date(b.scheduled_at).toLocaleString() : new Date(b.created_at).toLocaleString()}
                        </td>
                        <td style={{ textAlign: "right", display: "flex", justifyContent: "flex-end", gap: 8 }}>
                          {b.status === "scheduled" && (
                            <button onClick={() => sendBroadcastNow(b)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--tc)", fontSize: 12, fontWeight: 600 }}>Send Now</button>
                          )}
                          <button onClick={() => openBroadcastModal(b)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink)", fontSize: 12, fontWeight: 600 }}>Edit</button>
                          <button onClick={() => deleteBroadcast(b.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--rb)", fontSize: 12, fontWeight: 600 }}>Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="card" style={{ textAlign: "center", color: "var(--ink3)", padding: 40 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>No broadcasts yet</div>
                  <div style={{ fontSize: 12 }}>Create your first broadcast to send an announcement to students or parents.</div>
                  <button className="btn btn-p mt-4" onClick={() => openBroadcastModal()}>Create Broadcast</button>
                </div>
              )}
            </div>
          ) : (
            <div className="card" style={{ maxWidth: 600 }}>
              <div style={{ fontSize: 16, fontFamily: "var(--font-serif)", marginBottom: 4 }}>Automated Triggers</div>
              <div style={{ fontSize: 12, color: "var(--ink3)", marginBottom: 20 }}>Configure which events automatically trigger messages to students or parents.</div>
              
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div className="tog-row">
                  <div>
                    <div className="tog-lbl">Attendance Alerts</div>
                    <div className="tog-sub">Send SMS to parents when a student is marked absent</div>
                  </div>
                  <button
                    className={`toggle ${settings.attendance_sms ? "on" : ""}`}
                    onClick={() => setSettings(s => ({ ...s, attendance_sms: !s.attendance_sms }))}
                  />
                </div>
                
                <div className="tog-row">
                  <div>
                    <div className="tog-lbl">Fee Reminders</div>
                    <div className="tog-sub">Send WhatsApp reminders 3 days before fee due dates</div>
                  </div>
                  <button
                    className={`toggle ${settings.fee_reminder_whatsapp ? "on" : ""}`}
                    onClick={() => setSettings(s => ({ ...s, fee_reminder_whatsapp: !s.fee_reminder_whatsapp }))}
                  />
                </div>
                
                <div className="tog-row">
                  <div>
                    <div className="tog-lbl">Exam Results</div>
                    <div className="tog-sub">Automatically email report cards when marks are published</div>
                  </div>
                  <button
                    className={`toggle ${settings.exam_results_email ? "on" : ""}`}
                    onClick={() => setSettings(s => ({ ...s, exam_results_email: !s.exam_results_email }))}
                  />
                </div>
              </div>

              <div style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid var(--ln)", display: "flex", justifyContent: "flex-end" }}>
                <button className="btn btn-p" onClick={() => setAlertModal({ open: true, message: "Automation settings saved successfully.", type: "success" })}>Save Settings</button>
              </div>
            </div>
          )
        )}
      </div>

      {broadcastModal && (
        <div className="modal-backdrop" onClick={() => setBroadcastModal(false)} style={{ zIndex: 9999 }}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ width: 500 }}>
            <div className="modal-hdr">
              <span className="modal-title">{bForm.id ? "Edit Broadcast" : "New Broadcast"}</span>
              <button className="modal-close" onClick={() => setBroadcastModal(false)}>×</button>
            </div>
            <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="fg">
                <label>Title (Internal reference)</label>
                <input type="text" placeholder="e.g. Holiday Announcement" value={bForm.title} onChange={e => setBForm({ ...bForm, title: e.target.value })} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div className="fg">
                  <label>Target Audience</label>
                  <select value={bForm.target_audience} onChange={e => setBForm({ ...bForm, target_audience: e.target.value })}>
                    <option value="All Students">All Students</option>
                    <option value="Specific Batch">Specific Batch</option>
                    <option value="Unpaid Fees">Students with Due Fees</option>
                  </select>
                </div>
                <div className="fg">
                  <label>Channel</label>
                  <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 500, cursor: "pointer" }}>
                      <input type="radio" name="channel" checked={bForm.channel === "whatsapp"} onChange={() => setBForm({ ...bForm, channel: "whatsapp" })} /> WhatsApp
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 500, cursor: "pointer" }}>
                      <input type="radio" name="channel" checked={bForm.channel === "sms"} onChange={() => setBForm({ ...bForm, channel: "sms" })} /> SMS
                    </label>
                  </div>
                </div>
              </div>
              <div className="fg">
                <label>Message Content</label>
                <textarea rows={4} placeholder="Type your announcement here..." style={{ resize: "none" }} value={bForm.message} onChange={e => setBForm({ ...bForm, message: e.target.value })}></textarea>
                <div className="hint" style={{ marginTop: 4 }}>Variables available: [StudentName], [InstituteName]</div>
              </div>
              <div className="fg">
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontWeight: 600 }}>
                  <input type="checkbox" checked={bForm.is_scheduled} onChange={e => setBForm({ ...bForm, is_scheduled: e.target.checked })} />
                  Schedule for later
                </label>
              </div>
              {bForm.is_scheduled && (
                <div className="fg">
                  <label>Delivery Date & Time</label>
                  <input type="datetime-local" value={bForm.scheduled_at} onChange={e => setBForm({ ...bForm, scheduled_at: e.target.value })} />
                </div>
              )}
            </div>
            <div className="modal-ftr">
              <button className="btn btn-s" onClick={() => setBroadcastModal(false)} disabled={savingB}>Cancel</button>
              <button className="btn btn-p" onClick={saveBroadcast} disabled={savingB}>
                {savingB ? "Saving..." : bForm.is_scheduled ? "Schedule Broadcast" : "Send Now"}
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast 
        open={!!alertModal?.open} 
        message={alertModal?.message || ""} 
        type={alertModal?.type || "success"} 
        onClose={() => setAlertModal(null)} 
      />
    </PageShell>
  );
}
