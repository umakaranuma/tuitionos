"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { Topbar } from "@/components/layout/Topbar";
import { Modal } from "@/components/ui/Modal";
import { api } from "@/lib/api";

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  active:    { bg: "#d4ede3", color: "#1a5040", label: "Active" },
  trial:     { bg: "#ede8fc", color: "#6b3ea8", label: "Trial" },
  due:       { bg: "#fef3d7", color: "#c07b1a", label: "Payment Due" },
  overdue:   { bg: "#fceaea", color: "#b83030", label: "Overdue" },
  suspended: { bg: "#fceaea", color: "#b83030", label: "Suspended" },
  cancelled: { bg: "#e5e5e5", color: "#78716c", label: "Cancelled" },
};

export default function InstituteDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [inst, setInst] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showSuspend, setShowSuspend] = useState(false);
  const [showPlan, setShowPlan] = useState(false);
  const [plan, setPlan] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    api.get(`/api/admin/institutes/${id}`).then((r) => {
      setInst(r.data);
      setPlan(r.data.plan);
      setStatus(r.data.status);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  const handleSuspend = async () => {
    await api.patch(`/api/admin/institutes/${id}`, { status: "suspended", is_active: false });
    setStatus("suspended");
    setShowSuspend(false);
  };

  const handleReactivate = async () => {
    await api.patch(`/api/admin/institutes/${id}`, { status: "active", is_active: true });
    setStatus("active");
  };

  const handlePlanChange = async () => {
    await api.patch(`/api/admin/institutes/${id}`, { plan });
    setShowPlan(false);
  };

  if (loading) return <PageShell><div style={{ padding: 60, textAlign: "center", color: "var(--ink3)" }}>Loading...</div></PageShell>;
  if (!inst) return <PageShell><div style={{ padding: 60, textAlign: "center", color: "var(--ink3)" }}>Institute not found</div></PageShell>;

  const st = STATUS_STYLES[status] || STATUS_STYLES.active;

  return (
    <PageShell>
      <Topbar
        title={inst.name}
        subtitle={`${inst.subdomain}.tuitionos.lk`}
        right={
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-g btn-sm" onClick={() => router.back()}>← Back</button>
            <button className="btn btn-s btn-sm" onClick={() => setShowPlan(true)}>Change plan</button>
            {status !== "suspended" ? (
              <button className="btn btn-d btn-sm" onClick={() => setShowSuspend(true)}>Suspend</button>
            ) : (
              <button className="btn btn-ok btn-sm" onClick={handleReactivate}>Reactivate</button>
            )}
          </div>
        }
      />
      <div className="pb fi">
        {status === "suspended" && (
          <div style={{
            background: "#fceaea", border: "1px solid #f5c5c5", borderRadius: 10,
            padding: "10px 14px", marginBottom: 14, fontSize: 12, color: "#b83030",
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.75"><circle cx="7" cy="7" r="6"/><path d="M7 4.5v3M7 9.5h.01"/></svg>
            This institute is suspended. Login is blocked, but all data is preserved.
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)", marginBottom: 2 }}>{inst.name}</div>
                <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--ink3)" }}>{inst.subdomain}.tuitionos.lk</div>
              </div>
              <span style={{ fontSize: 10.5, fontWeight: 600, padding: "3px 10px", borderRadius: 99, background: st.bg, color: st.color }}>{st.label}</span>
            </div>
            <hr className="dv" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[
                { label: "Admin", val: inst.owner_name },
                { label: "Email", val: inst.owner_email },
                { label: "Mobile", val: inst.owner_mobile },
                { label: "Plan", val: plan === "premium" ? "Premium (LKR 6,000/mo)" : "Basic (LKR 3,000/mo)" },
                { label: "Created", val: new Date(inst.created_at).toLocaleDateString() },
                { label: "Trial ends", val: inst.trial_ends_at || "N/A" },
              ].map(row => (
                <div key={row.label} style={{ padding: "8px 10px", background: "var(--cr)", borderRadius: 8 }}>
                  <div style={{ fontSize: 9.5, color: "var(--ink3)", fontWeight: 600, letterSpacing: ".05em", textTransform: "uppercase", marginBottom: 1 }}>{row.label}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>{row.val}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink3)", letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 12 }}>Usage metrics</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                { label: "Students", val: inst.student_count, color: "var(--tc)" },
                { label: "Batches", val: inst.batch_count, color: "var(--sp)" },
              ].map(kpi => (
                <div key={kpi.label} style={{
                  padding: "10px 12px", background: "#fff", border: "1.5px solid var(--ln)",
                  borderTop: `3px solid ${kpi.color}`, borderRadius: 10,
                }}>
                  <div style={{ fontSize: 9.5, color: "var(--ink3)", fontWeight: 600, letterSpacing: ".05em", textTransform: "uppercase", marginBottom: 4 }}>{kpi.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: kpi.color, fontFamily: "var(--font-mono)", lineHeight: 1 }}>{kpi.val}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink3)", letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 10 }}>Invoice history</div>
        {inst.recent_invoices?.length > 0 ? (
          <div className="tw">
            <table>
              <thead><tr><th>Month</th><th>Amount (LKR)</th><th>Status</th><th>Due date</th></tr></thead>
              <tbody>
                {inst.recent_invoices.map((inv: any, i: number) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{new Date(inv.month).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</td>
                    <td className="mono">{inv.amount.toLocaleString()}</td>
                    <td>
                      <span style={{
                        fontSize: 10.5, fontWeight: 600, padding: "2px 8px", borderRadius: 99,
                        background: inv.status === "paid" ? "#d4ede3" : "#fef3d7",
                        color: inv.status === "paid" ? "#1a5040" : "#c07b1a",
                      }}>
                        {inv.status === "paid" ? "Paid" : "Pending"}
                      </span>
                    </td>
                    <td className="mono" style={{ color: "var(--ink3)" }}>{inv.due_date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="card" style={{ textAlign: "center", color: "var(--ink3)", padding: "24px" }}>No invoices yet</div>
        )}
      </div>

      <Modal open={showSuspend} onClose={() => setShowSuspend(false)} title="Suspend institute" footer={
        <>
          <button className="btn btn-s btn-sm" onClick={() => setShowSuspend(false)}>Cancel</button>
          <button className="btn btn-d btn-sm" onClick={handleSuspend}>Confirm suspend</button>
        </>
      }>
        <div style={{ fontSize: 13, color: "var(--ink2)", lineHeight: 1.6 }}>
          <p>Suspending <strong>{inst.name}</strong> will:</p>
          <ul style={{ margin: "10px 0", paddingLeft: 18 }}>
            <li>Block all admin and parent logins</li>
            <li>Stop all scheduled notifications</li>
            <li>Preserve all data (students, fees, attendance)</li>
          </ul>
          <p>The institute can be reactivated at any time.</p>
        </div>
      </Modal>

      <Modal open={showPlan} onClose={() => setShowPlan(false)} title="Change subscription plan" footer={
        <>
          <button className="btn btn-s btn-sm" onClick={() => setShowPlan(false)}>Cancel</button>
          <button className="btn btn-p btn-sm" onClick={handlePlanChange}>Save changes</button>
        </>
      }>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {([
            { key: "basic", label: "Basic", price: "LKR 3,000/mo", desc: "Max 200 students · 10 batches · Attendance + fees", color: "#2a5fa8" },
            { key: "premium", label: "Premium", price: "LKR 6,000/mo", desc: "Unlimited · Notifications · Timetable · Promotion", color: "#9b5e35" },
          ] as const).map(p => (
            <div key={p.key} onClick={() => setPlan(p.key)} style={{
              border: `2px solid ${plan === p.key ? p.color : "var(--ln)"}`,
              background: plan === p.key ? `${p.color}08` : "#fff",
              borderRadius: 12, padding: "14px 16px", cursor: "pointer", transition: "all 150ms",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>{p.label}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: p.color, fontFamily: "var(--font-mono)" }}>{p.price}</span>
              </div>
              <div style={{ fontSize: 11.5, color: "var(--ink3)" }}>{p.desc}</div>
            </div>
          ))}
        </div>
      </Modal>
    </PageShell>
  );
}
