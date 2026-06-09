"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { Topbar } from "@/components/layout/Topbar";
import { Modal } from "@/components/ui/Modal";
import { InstituteBillingSection } from "@/components/institutes/InstituteBillingSection";
import { useToast } from "@/components/ui/ToastProvider";
import { api } from "@/lib/api";

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  active:    { bg: "#d4ede3", color: "#1a5040", label: "Active" },
  trial:     { bg: "#ede8fc", color: "#6b3ea8", label: "Trial" },
  pending:   { bg: "#fef3d7", color: "#c07b1a", label: "Pending Payment" },
  due:       { bg: "#fef3d7", color: "#c07b1a", label: "Payment Due" },
  overdue:   { bg: "#fceaea", color: "#b83030", label: "Overdue" },
  paused:    { bg: "#fef3c7", color: "#b45309", label: "Paused" },
  suspended: { bg: "#fceaea", color: "#b83030", label: "Suspended" },
  deactivated:{ bg: "#f1f5f9", color: "#475569", label: "Deactivated" },
  cancelled: { bg: "#e5e5e5", color: "#78716c", label: "Cancelled" },
};

export default function InstituteDetailPage() {
  const router = useRouter();
  const params = useParams();
  const toast = useToast();
  const id = params.id as string;

  const [inst, setInst] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showPlan, setShowPlan] = useState(false);
  const [plan, setPlan] = useState("");
  const [status, setStatus] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [settings, setSettings] = useState<any>(null);
  useEffect(() => {
    Promise.all([
      api.get(`/api/admin/institutes/${id}`),
      api.get(`/api/institutes/settings`)
    ]).then(([rInst, rSet]) => {
      setInst(rInst.data);
      setPlan(rInst.data.plan);
      setStatus(rInst.data.status);
      const data = Array.isArray(rSet.data) ? rSet.data : rSet.data.results;
      if (data && data.length > 0) setSettings(data[0]);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  const handleStatusChange = async () => {
    try {
      if (selectedStatus === "active" && status === "pending") {
        await api.post(`/api/admin/institutes/${id}/activate`);
        toast.success("Institute activated. A welcome email has been sent.");
      } else {
        const is_active = selectedStatus === "active" || selectedStatus === "trial";
        await api.patch(`/api/admin/institutes/${id}`, { status: selectedStatus, is_active });
        toast.success(`Account status updated to ${selectedStatus}.`);
      }
      setStatus(selectedStatus);
      setShowStatusModal(false);
    } catch {
      toast.error("Couldn't update the account status. Please try again.");
    }
  };

  const handlePlanChange = async () => {
    try {
      await api.patch(`/api/admin/institutes/${id}`, { plan });
      setShowPlan(false);
      toast.success("Subscription plan updated.");
    } catch {
      toast.error("Couldn't update the subscription plan.");
    }
  };

  const refreshInstitute = async () => {
    const res = await api.get(`/api/admin/institutes/${id}`);
    setInst(res.data);
  };

  if (loading) return <PageShell><div style={{ padding: 60, textAlign: "center", color: "var(--ink3)" }}>Loading...</div></PageShell>;
  if (!inst) return <PageShell><div style={{ padding: 60, textAlign: "center", color: "var(--ink3)" }}>Institute not found</div></PageShell>;

  const getPlanPrice = (p: string) => {
    if (!settings) return "N/A";
    if (p === "solo") return `LKR ${Number(settings.monthly_fee_solo).toLocaleString()}/mo`;
    if (p === "institute") return `LKR ${Number(settings.monthly_fee_institute).toLocaleString()}/mo`;
    if (p === "institute_pro") return `LKR ${Number(settings.monthly_fee_institute_pro).toLocaleString()}/mo`;
    return "N/A";
  };


  const st = STATUS_STYLES[status] || STATUS_STYLES.active;

  return (
    <PageShell>
      <Topbar
        title={inst.name}
        subtitle={`${inst.subdomain}.tuitionos.lk`}
        crumbs={[
          { label: "Institutes", onClick: () => router.push("/institutes") },
          { label: inst.name },
        ]}
        right={
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-s btn-sm" onClick={() => setShowPlan(true)}>Change plan</button>
            {status === "pending" ? (
              <button className="btn btn-ok btn-sm" onClick={() => { setSelectedStatus("active"); setShowStatusModal(true); }}>Activate</button>
            ) : (
              <button className="btn btn-s btn-sm" onClick={() => { setSelectedStatus(status); setShowStatusModal(true); }}>Change Status</button>
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
        {status === "pending" && (
          <div style={{
            background: "#fef3d7", border: "1px solid #fde68a", borderRadius: 10,
            padding: "10px 14px", marginBottom: 14, fontSize: 12, color: "#92400e",
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.75"><circle cx="7" cy="7" r="6"/><path d="M7 7v2.5M7 4.5h.01"/></svg>
            Awaiting initial payment. Click Activate once payment is confirmed.
          </div>
        )}

        {/* Current Month Billing Status Alert */}
        {status !== "pending" && status !== "trial" && (
          <div style={{
            background: inst.current_month_billing_status === 'paid' ? '#d4ede3' : (inst.current_month_billing_status === 'overdue' ? '#fceaea' : '#fef3d7'),
            border: `1px solid ${inst.current_month_billing_status === 'paid' ? '#bce0d0' : (inst.current_month_billing_status === 'overdue' ? '#f5c5c5' : '#fde68a')}`,
            borderRadius: 10,
            padding: "12px 16px", marginBottom: 14, fontSize: 13,
            color: inst.current_month_billing_status === 'paid' ? '#1a5040' : (inst.current_month_billing_status === 'overdue' ? '#b83030' : '#92400e'),
            display: "flex", alignItems: "center", justifyContent: "space-between"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 500 }}>
              {inst.current_month_billing_status === 'paid' && <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13.3 4L6 11.3 2.7 8"/></svg>}
              {inst.current_month_billing_status === 'overdue' && <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="8" cy="8" r="7"/><path d="M8 5v4M8 11h.01"/></svg>}
              {inst.current_month_billing_status === 'pending' && <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="8" cy="8" r="7"/><path d="M8 4v4l3 3"/></svg>}
              {inst.current_month_billing_status === 'not_generated' && <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3v10M3 8h10"/></svg>}
              
              <span>
                {inst.current_month_billing_status === 'paid' && "Current month payment has been successfully recorded."}
                {inst.current_month_billing_status === 'overdue' && "Current month payment is OVERDUE! Consider suspending access."}
                {inst.current_month_billing_status === 'pending' && "Current month payment is pending. Monitor for manual slip."}
                {inst.current_month_billing_status === 'not_generated' && "No invoice generated for the current month yet."}
              </span>
            </div>
            {(inst.current_month_billing_status === 'overdue' || inst.current_month_billing_status === 'pending') && status === 'active' && (
              <button 
                className="btn btn-xs" 
                style={{ background: "#fff", border: "1px solid currentColor", color: "inherit", fontWeight: 600 }}
                onClick={() => { setSelectedStatus("suspended"); setShowStatusModal(true); }}
              >
                Suspend Access
              </button>
            )}
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
                { label: "Plan", val: plan === "institute_pro" ? `Institute Pro (${getPlanPrice("institute_pro")})` : (plan === "solo" ? `Solo (${getPlanPrice("solo")})` : `Institute (${getPlanPrice("institute")})`) },
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

        <InstituteBillingSection instituteId={id} onBillingChange={refreshInstitute} />
      </div>

      <Modal open={showStatusModal} onClose={() => setShowStatusModal(false)} title="Change account status" footer={
        <>
          <button className="btn btn-s btn-sm" onClick={() => setShowStatusModal(false)}>Cancel</button>
          <button className="btn btn-p btn-sm" onClick={handleStatusChange}>Update status</button>
        </>
      }>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {([
            { key: "active", label: "Active", desc: "Institute is fully active and accessible" },
            { key: "paused", label: "Paused", desc: "Temporarily paused, billing stops, no login" },
            { key: "suspended", label: "Suspended", desc: "Blocked due to non-payment or violations" },
            { key: "deactivated", label: "Deactivated", desc: "Permanently deactivated but data retained" },
          ] as const).map(s => (
            <div key={s.key} onClick={() => setSelectedStatus(s.key)} style={{
              border: `2px solid ${selectedStatus === s.key ? "var(--tc)" : "var(--ln)"}`,
              background: selectedStatus === s.key ? "var(--cr)" : "#fff",
              borderRadius: 12, padding: "12px 14px", cursor: "pointer"
            }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)", marginBottom: 2 }}>{s.label}</div>
              <div style={{ fontSize: 12, color: "var(--ink3)" }}>{s.desc}</div>
            </div>
          ))}
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
            { key: "solo", label: "Solo", price: getPlanPrice("solo"), desc: "Max 75 students · 3 batches · Basic fee tracking", color: "#475569" },
            { key: "institute", label: "Institute", price: getPlanPrice("institute"), desc: "Max 200 students · 10 batches · Attendance + fees", color: "#2a5fa8" },
            { key: "institute_pro", label: "Institute Pro", price: getPlanPrice("institute_pro"), desc: "Unlimited · Notifications · Timetable · Promotion", color: "#9b5e35" },
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
