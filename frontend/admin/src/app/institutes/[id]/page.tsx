"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { Topbar } from "@/components/layout/Topbar";
import { Modal } from "@/components/ui/Modal";

// Mock data — simulates fetching by ID
const MOCK_INSTITUTES: Record<string, any> = {
  "1": {
    name: "St. Patrick's Academy", subdomain: "stpatricks", district: "Jaffna",
    email: "admin@stpatricks.lk", mobile: "+94 77 234 5678", adminName: "Sundar Kumar",
    plan: "premium", status: "active", students: 312, batches: 5, teachers: 6,
    storageUsed: 2.4, storageQuota: 10,
    notifSent: 847, notifCost: 1694, createdAt: "2025-06-15", trialEndsAt: null,
    invoices: [
      { month: "April 2026", amount: 6000, status: "paid", paidAt: "2026-04-03" },
      { month: "March 2026", amount: 6000, status: "paid", paidAt: "2026-03-02" },
      { month: "February 2026", amount: 6000, status: "paid", paidAt: "2026-02-05" },
      { month: "January 2026", amount: 6000, status: "paid", paidAt: "2026-01-04" },
    ],
  },
  "2": {
    name: "Alpha Lanka Institute", subdomain: "alphalanka", district: "Colombo",
    email: "admin@alphalanka.lk", mobile: "+94 77 345 6789", adminName: "Raj Perera",
    plan: "basic", status: "trial", students: 87, batches: 3, teachers: 4,
    storageUsed: 0.6, storageQuota: 5,
    notifSent: 0, notifCost: 0, createdAt: "2026-04-10", trialEndsAt: "2026-04-24",
    invoices: [],
  },
};

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  active:    { bg: "#d4ede3", color: "#1a5040", label: "Active" },
  trial:     { bg: "#ede8fc", color: "#6b3ea8", label: "Trial" },
  due:       { bg: "#fef3d7", color: "#c07b1a", label: "Payment Due" },
  overdue:   { bg: "#fceaea", color: "#b83030", label: "Overdue" },
  suspended: { bg: "#fceaea", color: "#b83030", label: "Suspended" },
  cancelled: { bg: "#e5e5e5", color: "#78716c", label: "Cancelled" },
};

export default function InstituteDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const inst = MOCK_INSTITUTES[params.id] || MOCK_INSTITUTES["1"];
  const [status, setStatus] = useState(inst.status);
  const [showSuspend, setShowSuspend] = useState(false);
  const [showPlan, setShowPlan] = useState(false);
  const [plan, setPlan] = useState(inst.plan);

  const st = STATUS_STYLES[status] || STATUS_STYLES.active;

  return (
    <PageShell>
      <Topbar
        title={inst.name}
        subtitle={`${inst.subdomain}.tuitionos.lk · ${inst.district}`}
        right={
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-g btn-sm" onClick={() => router.back()}>← Back</button>
            <button className="btn btn-s btn-sm" onClick={() => setShowPlan(true)}>Change plan</button>
            {status !== "suspended" && status !== "cancelled" ? (
              <button className="btn btn-d btn-sm" onClick={() => setShowSuspend(true)}>Suspend</button>
            ) : (
              <button className="btn btn-ok btn-sm" onClick={() => setStatus("active")}>Reactivate</button>
            )}
          </div>
        }
      />
      <div className="pb fi">
        {/* Status banner */}
        {(status === "suspended" || status === "overdue") && (
          <div style={{
            background: status === "suspended" ? "#fceaea" : "#fef3d7",
            border: `1px solid ${status === "suspended" ? "#f5c5c5" : "#fde68a"}`,
            borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: 12,
            color: status === "suspended" ? "#b83030" : "#92400e",
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.75">
              <circle cx="7" cy="7" r="6"/><path d="M7 4.5v3M7 9.5h.01"/>
            </svg>
            {status === "suspended"
              ? "This institute is suspended. Login is blocked, but all data is preserved."
              : "Payment is overdue. Auto-suspension in 21 days if not resolved."}
          </div>
        )}

        {/* Profile + Status row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
          {/* Profile card */}
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)", marginBottom: 2 }}>{inst.name}</div>
                <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--ink3)" }}>
                  {inst.subdomain}.tuitionos.lk
                </div>
              </div>
              <span style={{ fontSize: 10.5, fontWeight: 600, padding: "3px 10px", borderRadius: 99, background: st.bg, color: st.color }}>
                {st.label}
              </span>
            </div>
            <hr className="dv" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[
                { label: "Admin", val: inst.adminName },
                { label: "District", val: inst.district },
                { label: "Email", val: inst.email },
                { label: "WhatsApp", val: inst.mobile },
                { label: "Plan", val: plan === "premium" ? "Premium (LKR 6,000/mo)" : "Basic (LKR 3,000/mo)" },
                { label: "Created", val: inst.createdAt },
              ].map(row => (
                <div key={row.label} style={{ padding: "8px 10px", background: "var(--cr)", borderRadius: 8 }}>
                  <div style={{ fontSize: 9.5, color: "var(--ink3)", fontWeight: 600, letterSpacing: ".05em", textTransform: "uppercase", marginBottom: 1 }}>{row.label}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>{row.val}</div>
                </div>
              ))}
            </div>
          </div>

          {/* KPI card */}
          <div className="card">
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink3)", letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 12 }}>
              Usage metrics
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                { label: "Students", val: inst.students, color: "var(--tc)" },
                { label: "Batches", val: inst.batches, color: "var(--sp)" },
                { label: "Teachers", val: inst.teachers, color: "var(--pr)" },
                { label: "Notifs this month", val: inst.notifSent, color: "var(--sf)" },
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

            {/* Storage bar */}
            <div style={{ marginTop: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
                <span style={{ fontWeight: 600, color: "var(--ink2)" }}>Storage used</span>
                <span style={{ fontFamily: "var(--font-mono)", color: "var(--ink3)" }}>{inst.storageUsed} / {inst.storageQuota} GB</span>
              </div>
              <div style={{ height: 6, background: "var(--cr-d)", borderRadius: 99, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(inst.storageUsed / inst.storageQuota) * 100}%`, background: "var(--sp)", borderRadius: 99, transition: "width 300ms" }} />
              </div>
            </div>

            {inst.notifCost > 0 && (
              <div style={{ marginTop: 10, fontSize: 11.5, color: "var(--ink3)" }}>
                Notification cost: <strong style={{ color: "var(--ink)" }}>LKR {inst.notifCost.toLocaleString()}</strong> this month
              </div>
            )}
          </div>
        </div>

        {/* Invoice history */}
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink3)", letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 10 }}>
          Invoice history
        </div>
        {inst.invoices.length > 0 ? (
          <div className="tw">
            <table>
              <thead>
                <tr><th>Month</th><th>Amount (LKR)</th><th>Status</th><th>Paid date</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {inst.invoices.map((inv: any, i: number) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{inv.month}</td>
                    <td className="mono">{inv.amount.toLocaleString()}</td>
                    <td>
                      <span style={{
                        fontSize: 10.5, fontWeight: 600, padding: "2px 8px", borderRadius: 99,
                        background: inv.status === "paid" ? "#d4ede3" : inv.status === "overdue" ? "#fceaea" : "#fef3d7",
                        color: inv.status === "paid" ? "#1a5040" : inv.status === "overdue" ? "#b83030" : "#c07b1a",
                      }}>
                        {inv.status === "paid" ? "Paid" : inv.status === "overdue" ? "Overdue" : "Due"}
                      </span>
                    </td>
                    <td className="mono" style={{ color: "var(--ink3)" }}>{inv.paidAt || "—"}</td>
                    <td>
                      <div style={{ display: "flex", gap: 4 }}>
                        {inv.status !== "paid" && <button className="btn btn-xs btn-ok">Mark paid</button>}
                        <button className="btn btn-xs btn-s">PDF</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="card" style={{ textAlign: "center", color: "var(--ink3)", padding: "24px" }}>
            No invoices yet — institute is on {status === "trial" ? "a 14-day trial" : "a free plan"}.
            {inst.trialEndsAt && <div style={{ marginTop: 6, fontSize: 12, fontWeight: 600, color: "var(--pr)" }}>Trial expires: {inst.trialEndsAt}</div>}
          </div>
        )}
      </div>

      {/* Suspend confirmation modal */}
      <Modal
        open={showSuspend}
        onClose={() => setShowSuspend(false)}
        title="Suspend institute"
        footer={
          <>
            <button className="btn btn-s btn-sm" onClick={() => setShowSuspend(false)}>Cancel</button>
            <button className="btn btn-d btn-sm" onClick={() => { setStatus("suspended"); setShowSuspend(false); }}>
              Confirm suspend
            </button>
          </>
        }
      >
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

      {/* Change plan modal */}
      <Modal
        open={showPlan}
        onClose={() => setShowPlan(false)}
        title="Change subscription plan"
        footer={
          <>
            <button className="btn btn-s btn-sm" onClick={() => setShowPlan(false)}>Cancel</button>
            <button className="btn btn-p btn-sm" onClick={() => setShowPlan(false)}>Save changes</button>
          </>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {([
            { key: "basic", label: "Basic", price: "LKR 3,000/mo", desc: "Max 200 students · 10 batches · Attendance + fees", color: "#2a5fa8" },
            { key: "premium", label: "Premium", price: "LKR 6,000/mo", desc: "Unlimited · Notifications · Timetable · Promotion", color: "#9b5e35" },
          ] as const).map(p => (
            <div
              key={p.key}
              onClick={() => setPlan(p.key)}
              style={{
                border: `2px solid ${plan === p.key ? p.color : "var(--ln)"}`,
                background: plan === p.key ? `${p.color}08` : "#fff",
                borderRadius: 12, padding: "14px 16px", cursor: "pointer", transition: "all 150ms",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>{p.label}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: p.color, fontFamily: "var(--font-mono)" }}>{p.price}</span>
              </div>
              <div style={{ fontSize: 11.5, color: "var(--ink3)" }}>{p.desc}</div>
            </div>
          ))}
          <div style={{ fontSize: 11, color: "var(--ink3)", marginTop: 4 }}>
            Plan change takes effect on the next billing cycle.
          </div>
        </div>
      </Modal>
    </PageShell>
  );
}
