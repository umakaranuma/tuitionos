"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { Topbar } from "@/components/layout/Topbar";
import { PageShell } from "@/components/layout/PageShell";
import { Modal } from "@/components/ui/Modal";
import { QRCard } from "@/components/ui/QRCard";
import { useToast } from "@/components/ui/ToastProvider";
import { getStoredUser } from "@/lib/auth";
import { api } from "@/lib/api";

type Teacher = { id: number; name: string; mobile: string; email: string; subject: string; monthly_salary: string; is_active: boolean; qr_token: string };
type Payment = { id: number; month: string; amount: string; status: string; paid_date: string | null; method: string; payment_type: string; advance_deduction?: string; reference_no?: string };
type Advance = { id: number; amount: string; request_date: string; status: string; reason: string; disbursed_date: string | null; repaid_amount: string; method?: string };
type BatchSlot = { id: number; batch: number; batch_name: string; subject_name: string; day_of_week: string; start_time: string; end_time: string; room: string };
type BatchHandle = { id: number; name: string; display_name?: string; grade?: string; section?: string };

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const fmt = (n: number | string) => `LKR ${Number(n).toLocaleString()}`;
const fmtTime = (t: string) => {
  if (!t) return "—";
  const [h, m] = t.split(":");
  let hi = parseInt(h, 10);
  const ampm = hi >= 12 ? "PM" : "AM";
  hi = hi % 12 || 12;
  return `${hi}:${m} ${ampm}`;
};

type Tab = "overview" | "salary" | "advances" | "batches" | "timetable";

export default function TeacherDetailPage() {
  const router = useRouter();
  const params = useParams();
  const toast = useToast();
  const id = params.id as string;

  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [slots, setSlots] = useState<BatchSlot[]>([]);
  const [batches, setBatches] = useState<BatchHandle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showQR, setShowQR] = useState(false);
  const [tab, setTab] = useState<Tab>("overview");

  const [payModal, setPayModal] = useState<Payment | null>(null);
  const [payForm, setPayForm] = useState({ method: "Bank transfer", reference_no: "" });
  const [advModal, setAdvModal] = useState(false);
  const [advForm, setAdvForm] = useState({ amount: "", request_date: new Date().toISOString().slice(0, 10), reason: "", method: "Cash" });
  const [salaryModal, setSalaryModal] = useState(false);
  const [salaryForm, setSalaryForm] = useState({ month: new Date().toLocaleString("en-US", { month: "long", year: "numeric" }), amount: "", payment_type: "salary", advance_deduction: "0" });
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get(`/api/academics/teachers/${id}`).then(r => r.data).catch(() => null),
      api.get(`/api/academics/teacher-payments`, { params: { teacher: id } }).then(r => Array.isArray(r.data) ? r.data : r.data.results || []).catch(() => []),
      api.get(`/api/academics/teacher-advances`).then(r => (Array.isArray(r.data) ? r.data : r.data.results || []).filter((a: Advance & { teacher?: number }) => String(a.teacher) === id)).catch(() => []),
      api.get(`/api/timetable/`, { params: { teacher: id } }).then(r => Array.isArray(r.data) ? r.data : r.data.results || []).catch(() => []),
      api.get(`/api/academics/batches`).then(r => Array.isArray(r.data) ? r.data : r.data.results || []).catch(() => []),
    ]).then(([t, p, a, s, b]) => {
      setTeacher(t); setPayments(p); setAdvances(a); setSlots(s); setBatches(b); setLoading(false);
    });
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // ── Derived stats ──────────────────────────────────────────────────────────
  const year = new Date().getFullYear();
  const paymentsThisYear = payments.filter(p => p.month.includes(String(year)));
  const paidYTD = paymentsThisYear.filter(p => p.status === "paid").reduce((s, p) => s + Number(p.amount || 0), 0);
  const pendingTotal = paymentsThisYear.filter(p => p.status !== "paid").reduce((s, p) => s + Number(p.amount || 0), 0);
  const advanceOutstanding = advances.filter(a => a.status !== "repaid").reduce((s, a) => s + (Number(a.amount || 0) - Number(a.repaid_amount || 0)), 0);

  // Batches the teacher takes (deduped from slots).
  const teachingBatchIds = Array.from(new Set(slots.map(s => s.batch)));
  const teachingBatches = teachingBatchIds.map(bid => batches.find(b => b.id === bid)).filter(Boolean) as BatchHandle[];

  // Slots grouped by day for the timetable section.
  const slotsByDay: Record<string, BatchSlot[]> = {};
  DAYS.forEach((_, i) => { slotsByDay[String(i)] = []; });
  slots.forEach(s => { (slotsByDay[s.day_of_week] = slotsByDay[s.day_of_week] || []).push(s); });

  // ── Actions ────────────────────────────────────────────────────────────────
  const openPay = (p: Payment) => {
    setPayModal(p);
    setPayForm({ method: p.method || "Bank transfer", reference_no: p.reference_no || "" });
  };

  const confirmPay = async () => {
    if (!payModal) return;
    setBusy(true);
    try {
      await api.post(`/api/academics/teacher-payments/${payModal.id}/mark_paid`, payForm);
      toast.success(`Marked ${payModal.month} salary as paid.`);
      setPayModal(null); load();
    } catch { toast.error("Couldn't mark this payment as paid."); }
    finally { setBusy(false); }
  };

  const submitAdvance = async () => {
    if (!advForm.amount || Number(advForm.amount) <= 0) { toast.error("Enter a positive amount."); return; }
    setBusy(true);
    try {
      await api.post(`/api/academics/teacher-advances`, { teacher: Number(id), ...advForm, amount: Number(advForm.amount) });
      toast.success("Advance recorded.");
      setAdvModal(false); setAdvForm({ amount: "", request_date: new Date().toISOString().slice(0, 10), reason: "", method: "Cash" });
      load();
    } catch { toast.error("Couldn't save the advance."); }
    finally { setBusy(false); }
  };

  const addSalary = async () => {
    if (!salaryForm.amount || Number(salaryForm.amount) <= 0) { toast.error("Enter a positive amount."); return; }
    setBusy(true);
    try {
      await api.post(`/api/academics/teacher-payments`, { teacher: Number(id), ...salaryForm, amount: Number(salaryForm.amount), advance_deduction: Number(salaryForm.advance_deduction || 0) });
      toast.success(`${salaryForm.month} salary entry added.`);
      setSalaryModal(false); load();
    } catch { toast.error("Couldn't save the salary record."); }
    finally { setBusy(false); }
  };

  if (loading) return <PageShell><div style={{ padding: 60, textAlign: "center", color: "var(--ink3)" }}>Loading…</div></PageShell>;
  if (!teacher) return <PageShell><div style={{ padding: 60, textAlign: "center", color: "var(--ink3)" }}>Teacher not found</div></PageShell>;

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "overview", label: "Overview" },
    { key: "salary", label: "Salary", count: payments.length },
    { key: "advances", label: "Advances", count: advances.length },
    { key: "batches", label: "Batches", count: teachingBatches.length },
    { key: "timetable", label: "Timetable", count: slots.length },
  ];

  return (
    <PageShell>
      <Topbar
        title={teacher.name}
        subtitle={teacher.subject || "Teacher"}
        onBack={() => router.back()}
        backLabel="Back"
        right={
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-s btn-sm" onClick={() => setAdvModal(true)}>+ Advance</button>
            <button className="btn btn-p btn-sm" onClick={() => setSalaryModal(true)}>+ Salary entry</button>
            <button className="btn btn-s btn-sm" onClick={() => setShowQR(true)}>QR / ID</button>
          </div>
        }
      />

      <div className="pb fi">
        {/* KPI strip */}
        <div className="g4" style={{ marginBottom: 16 }}>
          <div className="kpi" style={{ "--kc": "var(--tc)" } as React.CSSProperties}>
            <div className="kpi-lbl">Monthly Salary</div>
            <div className="kpi-val">{fmt(teacher.monthly_salary)}</div>
            <div className="kpi-tr nt">Configured rate</div>
          </div>
          <div className="kpi" style={{ "--kc": "var(--jd)" } as React.CSSProperties}>
            <div className="kpi-lbl">Paid YTD ({year})</div>
            <div className="kpi-val">{fmt(paidYTD)}</div>
            <div className="kpi-tr up">{paymentsThisYear.filter(p => p.status === "paid").length} payments</div>
          </div>
          <div className="kpi" style={{ "--kc": "var(--sf)" } as React.CSSProperties}>
            <div className="kpi-lbl">Pending</div>
            <div className="kpi-val">{fmt(pendingTotal)}</div>
            <div className="kpi-tr dn">{paymentsThisYear.filter(p => p.status !== "paid").length} unpaid months</div>
          </div>
          <div className="kpi" style={{ "--kc": "var(--rb)" } as React.CSSProperties}>
            <div className="kpi-lbl">Advance Outstanding</div>
            <div className="kpi-val">{fmt(advanceOutstanding)}</div>
            <div className="kpi-tr nt">{advances.filter(a => a.status !== "repaid").length} active</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="filter-tabs" style={{ marginBottom: 16 }}>
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`filter-tab ${tab === t.key ? "on" : ""}`}
            >
              {t.label}
              {t.count !== undefined && <span className="filter-tab-ct">{t.count}</span>}
            </button>
          ))}
        </div>

        {/* OVERVIEW */}
        {tab === "overview" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div className="card">
              <div className="sec-title" style={{ marginBottom: 12 }}>Profile</div>
              <div className="detail-row"><span className="detail-k">Subject</span><span className="detail-v">{teacher.subject || "—"}</span></div>
              <div className="detail-row"><span className="detail-k">Mobile</span><span className="detail-v" style={{ fontFamily: "var(--font-mono)" }}>{teacher.mobile}</span></div>
              <div className="detail-row"><span className="detail-k">Email</span><span className="detail-v">{teacher.email || "—"}</span></div>
              <div className="detail-row"><span className="detail-k">Monthly Salary</span><span className="detail-v">{fmt(teacher.monthly_salary)}</span></div>
              <div className="detail-row"><span className="detail-k">Status</span>
                <span className="detail-v">{teacher.is_active ? <span className="dot-st dot-active">Active</span> : <span className="dot-st dot-paused">Inactive</span>}</span>
              </div>
            </div>
            <div className="card">
              <div className="sec-title" style={{ marginBottom: 12 }}>This year at a glance</div>
              <div className="detail-row"><span className="detail-k">Batches teaching</span><span className="detail-v">{teachingBatches.length}</span></div>
              <div className="detail-row"><span className="detail-k">Weekly slots</span><span className="detail-v">{slots.length}</span></div>
              <div className="detail-row"><span className="detail-k">Salary paid</span><span className="detail-v">{fmt(paidYTD)}</span></div>
              <div className="detail-row"><span className="detail-k">Pending salary</span><span className="detail-v" style={{ color: pendingTotal > 0 ? "var(--sf)" : "var(--ink)" }}>{fmt(pendingTotal)}</span></div>
              <div className="detail-row"><span className="detail-k">Advance outstanding</span><span className="detail-v" style={{ color: advanceOutstanding > 0 ? "var(--rb)" : "var(--ink)" }}>{fmt(advanceOutstanding)}</span></div>
            </div>
          </div>
        )}

        {/* SALARY */}
        {tab === "salary" && (
          <div className="tw">
            <table>
              <thead><tr><th>Month</th><th>Type</th><th>Amount</th><th>Advance Deduction</th><th>Net</th><th>Status</th><th>Paid date</th><th></th></tr></thead>
              <tbody>
                {payments.length === 0 && <tr><td colSpan={8} style={{ textAlign: "center", color: "var(--ink3)", padding: 28 }}>No salary entries yet. Click <strong>+ Salary entry</strong> to add one.</td></tr>}
                {payments.map(p => {
                  const deduction = Number(p.advance_deduction || 0);
                  const net = Number(p.amount) - deduction;
                  return (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 600 }}>{p.month}</td>
                      <td><span className="bdg b-trial">{p.payment_type || "salary"}</span></td>
                      <td className="mono">{fmt(p.amount)}</td>
                      <td className="mono" style={{ color: deduction > 0 ? "var(--rb)" : "var(--ink3)" }}>{deduction > 0 ? `− ${fmt(deduction)}` : "—"}</td>
                      <td className="mono" style={{ fontWeight: 700 }}>{fmt(net)}</td>
                      <td>{p.status === "paid" ? <span className="bdg b-paid">Paid</span> : <span className="bdg b-due">{p.status}</span>}</td>
                      <td className="mono" style={{ color: "var(--ink3)", fontSize: 11 }}>{p.paid_date || "—"}</td>
                      <td>
                        {p.status !== "paid" && (
                          <button className="btn btn-xs btn-ok" onClick={() => openPay(p)}>Mark paid</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ADVANCES */}
        {tab === "advances" && (
          <div className="tw">
            <table>
              <thead><tr><th>Requested</th><th>Amount</th><th>Repaid</th><th>Remaining</th><th>Status</th><th>Reason</th></tr></thead>
              <tbody>
                {advances.length === 0 && <tr><td colSpan={6} style={{ textAlign: "center", color: "var(--ink3)", padding: 28 }}>No advance records.</td></tr>}
                {advances.map(a => {
                  const remaining = Math.max(Number(a.amount) - Number(a.repaid_amount || 0), 0);
                  return (
                    <tr key={a.id}>
                      <td className="mono" style={{ color: "var(--ink3)" }}>{a.request_date}</td>
                      <td className="mono" style={{ fontWeight: 700 }}>{fmt(a.amount)}</td>
                      <td className="mono">{fmt(a.repaid_amount || 0)}</td>
                      <td className="mono" style={{ color: remaining > 0 ? "var(--rb)" : "var(--ink3)" }}>{fmt(remaining)}</td>
                      <td>
                        {a.status === "repaid" ? <span className="bdg b-paid">Repaid</span> :
                         a.status === "partial" ? <span className="bdg b-due">Partial</span> :
                         <span className="bdg b-over">Active</span>}
                      </td>
                      <td style={{ color: "var(--ink2)", fontSize: 12 }}>{a.reason || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* BATCHES teaching */}
        {tab === "batches" && (
          teachingBatches.length === 0 ? (
            <div className="card" style={{ textAlign: "center", color: "var(--ink3)", padding: 28 }}>
              No batches assigned yet. Add this teacher to a batch from the <Link href="/batches" style={{ color: "var(--tc)" }}>Batches</Link> page.
            </div>
          ) : (
            <div className="g3">
              {teachingBatches.map(b => {
                const bSlots = slots.filter(s => s.batch === b.id);
                const subjects = Array.from(new Set(bSlots.map(s => s.subject_name).filter(Boolean)));
                return (
                  <div key={b.id} className="card">
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, color: "var(--ink)", marginBottom: 4 }}>
                      {b.display_name || b.name}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--ink3)", marginBottom: 10 }}>
                      {bSlots.length} weekly slot{bSlots.length !== 1 ? "s" : ""}
                    </div>
                    {subjects.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {subjects.map(s => <span key={s} className="bdg b-basic">{s}</span>)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* TIMETABLE */}
        {tab === "timetable" && (
          slots.length === 0 ? (
            <div className="card" style={{ textAlign: "center", color: "var(--ink3)", padding: 28 }}>
              No timetable slots assigned. Slot this teacher in from the <Link href="/timetable" style={{ color: "var(--tc)" }}>Timetable</Link> page.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {DAYS.map((d, di) => {
                const dayKey = String(di);
                const list = (slotsByDay[dayKey] || []).slice().sort((a, b) => a.start_time.localeCompare(b.start_time));
                if (list.length === 0) return null;
                return (
                  <div key={dayKey} className="card" style={{ padding: 16 }}>
                    <div className="sec-title" style={{ marginBottom: 10 }}>{d} · {list.length} slot{list.length !== 1 ? "s" : ""}</div>
                    <div style={{ display: "grid", gap: 6 }}>
                      {list.map(s => (
                        <div key={s.id} className="exam-subj-row">
                          <span className="exam-subj-name">{s.subject_name || "—"}</span>
                          <span className="exam-subj-date">{s.batch_name}</span>
                          <span className="exam-subj-time">{fmtTime(s.start_time)} – {fmtTime(s.end_time)}</span>
                          <span style={{ fontSize: 11, color: "var(--ink3)" }}>{s.room || ""}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>

      {/* ── QR modal ── */}
      <Modal open={showQR} onClose={() => setShowQR(false)} title="Staff ID card">
        <div style={{ padding: "8px 0 14px", display: "flex", justifyContent: "center" }}>
          {teacher.qr_token ? (
            <QRCard kind="teacher" token={teacher.qr_token} name={teacher.name} subtitle={teacher.subject || "Teacher"} code={`STF-${String(teacher.id).padStart(5, "0")}`} institute={getStoredUser()?.institute?.name} instituteLogoUrl={getStoredUser()?.institute?.logo} />
          ) : <div style={{ color: "var(--ink3)", padding: 24, fontSize: 13 }}>QR token not generated. Save the teacher and reopen.</div>}
        </div>
      </Modal>

      {/* ── Mark-paid modal ── */}
      <Modal open={!!payModal} onClose={() => setPayModal(null)} title={payModal ? `Mark ${payModal.month} paid` : "Mark paid"}
        footer={<>
          <button className="btn btn-s btn-sm" onClick={() => setPayModal(null)} disabled={busy}>Cancel</button>
          <button className="btn btn-ok btn-sm" onClick={confirmPay} disabled={busy}>{busy ? "Saving…" : "Confirm payment"}</button>
        </>}>
        <div className="form-gap">
          {payModal && (
            <div style={{ fontSize: 13, color: "var(--ink2)" }}>
              Amount: <strong>{fmt(payModal.amount)}</strong>
              {Number(payModal.advance_deduction || 0) > 0 && <> · Advance deduction: <strong>{fmt(payModal.advance_deduction!)}</strong></>}
            </div>
          )}
          <div className="field-row">
            <div className="fg">
              <label className="flbl">Method</label>
              <input value={payForm.method} onChange={e => setPayForm(f => ({ ...f, method: e.target.value }))} placeholder="Bank transfer / Cash" />
            </div>
            <div className="fg">
              <label className="flbl">Reference no</label>
              <input value={payForm.reference_no} onChange={e => setPayForm(f => ({ ...f, reference_no: e.target.value }))} placeholder="Optional" />
            </div>
          </div>
        </div>
      </Modal>

      {/* ── Add Salary entry modal ── */}
      <Modal open={salaryModal} onClose={() => setSalaryModal(false)} title="Add salary entry"
        footer={<>
          <button className="btn btn-s btn-sm" onClick={() => setSalaryModal(false)} disabled={busy}>Cancel</button>
          <button className="btn btn-p btn-sm" onClick={addSalary} disabled={busy}>{busy ? "Saving…" : "Add"}</button>
        </>}>
        <div className="form-gap">
          <div>
            <label className="flbl">Month</label>
            <input value={salaryForm.month} onChange={e => setSalaryForm(f => ({ ...f, month: e.target.value }))} placeholder="e.g. October 2026" />
          </div>
          <div className="field-row">
            <div className="fg">
              <label className="flbl">Amount (LKR)</label>
              <input type="number" value={salaryForm.amount} onChange={e => setSalaryForm(f => ({ ...f, amount: e.target.value }))} placeholder={String(teacher.monthly_salary)} />
            </div>
            <div className="fg">
              <label className="flbl">Type</label>
              <select value={salaryForm.payment_type} onChange={e => setSalaryForm(f => ({ ...f, payment_type: e.target.value }))}>
                <option value="salary">Salary</option>
                <option value="bonus">Bonus</option>
                <option value="advance">Advance payout</option>
              </select>
            </div>
          </div>
          <div>
            <label className="flbl">Advance deduction (optional)</label>
            <input type="number" value={salaryForm.advance_deduction} onChange={e => setSalaryForm(f => ({ ...f, advance_deduction: e.target.value }))} placeholder="0" />
            <div className="hint">Outstanding advance: {fmt(advanceOutstanding)}. Deduction reduces the net paid this month.</div>
          </div>
        </div>
      </Modal>

      {/* ── Add Advance modal ── */}
      <Modal open={advModal} onClose={() => setAdvModal(false)} title="Record salary advance"
        footer={<>
          <button className="btn btn-s btn-sm" onClick={() => setAdvModal(false)} disabled={busy}>Cancel</button>
          <button className="btn btn-p btn-sm" onClick={submitAdvance} disabled={busy}>{busy ? "Saving…" : "Save advance"}</button>
        </>}>
        <div className="form-gap">
          <div className="field-row">
            <div className="fg">
              <label className="flbl">Amount (LKR)</label>
              <input type="number" value={advForm.amount} onChange={e => setAdvForm(f => ({ ...f, amount: e.target.value }))} placeholder="e.g. 15000" />
            </div>
            <div className="fg">
              <label className="flbl">Request date</label>
              <input type="date" value={advForm.request_date} onChange={e => setAdvForm(f => ({ ...f, request_date: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="flbl">Method</label>
            <input value={advForm.method} onChange={e => setAdvForm(f => ({ ...f, method: e.target.value }))} />
          </div>
          <div>
            <label className="flbl">Reason</label>
            <input value={advForm.reason} onChange={e => setAdvForm(f => ({ ...f, reason: e.target.value }))} placeholder="Optional" />
          </div>
          <div style={{ fontSize: 12, color: "var(--ink3)", lineHeight: 1.5 }}>
            Advances stay outstanding until you record a salary entry with an <strong>Advance deduction</strong>.
            That deduction lowers the teacher's net payout and reduces the outstanding amount automatically.
          </div>
        </div>
      </Modal>
    </PageShell>
  );
}
