"use client";
import { useState, useEffect } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { PageShell } from "@/components/layout/PageShell";
import { Modal } from "@/components/ui/Modal";
import { api } from "@/lib/api";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { Pagination } from "@/components/ui/Pagination";
import { useToast } from "@/components/ui/ToastProvider";

type Payment = { id: number; teacher: number; teacher_name: string; month: string; amount: string; status: string; paid_date: string | null; method: string; payment_type: string; reference_no?: string; notes?: string };
type Advance = { id: number; teacher: number; teacher_name: string; amount: string; request_date: string; reason: string; status: string; repaid_amount: string; method?: string };
type Teacher = { id: number; name: string; monthly_salary: string; is_active: boolean };

const PAYMENT_METHODS = ["Cash", "Bank transfer", "Online", "Cheque", "Other"];
const PAYMENT_TYPES = [
  { value: "salary", label: "Salary" },
  { value: "bonus", label: "Bonus" },
  { value: "advance", label: "Advance deduction" },
];

const statusBadge = (s: string) => {
  const map: Record<string, JSX.Element> = { paid: <span className="bdg b-paid">Paid</span>, pending: <span className="bdg b-due">Pending</span>, overdue: <span className="bdg b-over">Overdue</span> };
  return map[s] || <span className="bdg b-due">{s}</span>;
};

const todayIso = () => new Date().toISOString().slice(0, 10);

export default function TeacherSalaryPage() {
  const toast = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState("April 2026");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [meta, setMeta] = useState({ total_count: 0, total_pages: 1 });

  // Add-payment modal.
  const [payOpen, setPayOpen] = useState(false);
  const [payForm, setPayForm] = useState({
    teacher: "", month, amount: "", payment_type: "salary", status: "pending",
    method: PAYMENT_METHODS[0], reference_no: "", notes: "",
  });
  const [paySaving, setPaySaving] = useState(false);

  // Add-advance modal.
  const [advOpen, setAdvOpen] = useState(false);
  const [advForm, setAdvForm] = useState({ teacher: "", amount: "", request_date: todayIso(), reason: "", method: PAYMENT_METHODS[0] });
  const [advSaving, setAdvSaving] = useState(false);

  // Mark-paid modal — captures the real method/reference instead of a hardcoded default.
  const [markPayModal, setMarkPayModal] = useState<Payment | null>(null);
  const [markForm, setMarkForm] = useState({ method: PAYMENT_METHODS[0], reference_no: "" });
  const [markSaving, setMarkSaving] = useState(false);

  const load = () => {
    setLoading(true);
    const params: Record<string, string | number> = { month, page, limit };
    Promise.all([
      api.get("/api/academics/teacher-payments", { params }).then(r => {
        const d = r.data;
        if (d.total_count !== undefined) setMeta({ total_count: d.total_count, total_pages: d.total_pages });
        return Array.isArray(d) ? d : d.results || [];
      }),
      api.get("/api/academics/teacher-advances").then(r => { const d = r.data; return Array.isArray(d) ? d : d.results || []; }),
      api.get("/api/academics/teachers", { params: { limit: 500 } }).then(r => { const d = r.data; return Array.isArray(d) ? d : d.results || []; }).catch(() => []),
    ]).then(([p, a, t]) => { setPayments(p); setAdvances(a); setTeachers(t); setLoading(false); });
  };
  useEffect(load, [month, page, limit]);

  const openMarkPaid = (p: Payment) => {
    setMarkForm({ method: p.method || PAYMENT_METHODS[0], reference_no: p.reference_no || "" });
    setMarkPayModal(p);
  };

  const confirmMarkPaid = async () => {
    if (!markPayModal) return;
    setMarkSaving(true);
    try {
      await api.post(`/api/academics/teacher-payments/${markPayModal.id}/mark_paid`, {
        method: markForm.method, reference_no: markForm.reference_no,
      });
      toast.success(`${markPayModal.teacher_name} marked paid.`);
      setMarkPayModal(null);
      load();
    } catch {
      toast.error("Couldn't mark this payment as paid.");
    } finally {
      setMarkSaving(false);
    }
  };

  const openAddPayment = () => {
    setPayForm({ teacher: "", month, amount: "", payment_type: "salary", status: "pending", method: PAYMENT_METHODS[0], reference_no: "", notes: "" });
    setPayOpen(true);
  };

  const pickPayTeacher = (id: string) => {
    const t = teachers.find(t => String(t.id) === id);
    setPayForm(f => ({ ...f, teacher: id, amount: f.amount || (t ? t.monthly_salary : f.amount) }));
  };

  const submitPayment = async () => {
    if (!payForm.teacher || !payForm.month || !payForm.amount) {
      toast.error("Teacher, month, and amount are required.");
      return;
    }
    setPaySaving(true);
    try {
      await api.post("/api/academics/teacher-payments", {
        teacher: Number(payForm.teacher),
        month: payForm.month,
        amount: payForm.amount,
        payment_type: payForm.payment_type,
        status: payForm.status,
        paid_date: payForm.status === "paid" ? todayIso() : null,
        method: payForm.status === "paid" ? payForm.method : "",
        reference_no: payForm.reference_no,
        notes: payForm.notes,
      });
      toast.success("Payment record added.");
      setPayOpen(false);
      load();
    } catch {
      toast.error("Couldn't add payment record.");
    } finally {
      setPaySaving(false);
    }
  };

  const openAddAdvance = () => {
    setAdvForm({ teacher: "", amount: "", request_date: todayIso(), reason: "", method: PAYMENT_METHODS[0] });
    setAdvOpen(true);
  };

  const submitAdvance = async () => {
    if (!advForm.teacher || !advForm.amount) {
      toast.error("Teacher and amount are required.");
      return;
    }
    setAdvSaving(true);
    try {
      await api.post("/api/academics/teacher-advances", {
        teacher: Number(advForm.teacher),
        amount: advForm.amount,
        request_date: advForm.request_date,
        reason: advForm.reason,
        method: advForm.method,
        disbursed_date: todayIso(),
        status: "active",
      });
      toast.success("Advance recorded.");
      setAdvOpen(false);
      load();
    } catch {
      toast.error("Couldn't record advance.");
    } finally {
      setAdvSaving(false);
    }
  };

  const paidCount = payments.filter(p => p.status === "paid").length;
  const totalPaid = payments.filter(p => p.status === "paid").reduce((s, p) => s + Number(p.amount), 0);
  const totalPending = payments.filter(p => p.status !== "paid").reduce((s, p) => s + Number(p.amount), 0);
  const teacherOptions = teachers.filter(t => t.is_active).map(t => ({ value: t.id, label: t.name }));

  return (
    <PageShell>
      <Topbar title="Teacher Salary" subtitle={month}
        right={
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ minWidth: 180 }}>
              <SearchableSelect
                value={month}
                onChange={val => { setMonth(String(val)); setPage(1); }}
                options={["April 2026", "March 2026", "February 2026", "January 2026"].map(m => ({ value: m, label: m }))}
              />
            </div>
            <button className="btn btn-s btn-sm" onClick={openAddAdvance}>+ Add advance</button>
            <button className="btn btn-p btn-sm" onClick={openAddPayment}>+ Add payment</button>
          </div>
        } />
      <div className="pb fi">
        <div className="g4" style={{ marginBottom: 18 }}>
          <div className="kpi" style={{ "--kc": "var(--tc)" } as any}><div className="kpi-lbl">Total Paid</div><div className="kpi-val">{Math.round(totalPaid / 1000)}K</div><div className="kpi-tr up">{paidCount} teachers</div></div>
          <div className="kpi" style={{ "--kc": "var(--rb)" } as any}><div className="kpi-lbl">Pending</div><div className="kpi-val">{Math.round(totalPending / 1000)}K</div><div className="kpi-tr dn">{payments.length - paidCount} teachers</div></div>
        </div>

        {loading ? <div style={{ textAlign: "center", padding: 40, color: "var(--ink3)" }}>Loading...</div> : (
          <>
            <div className="sec-hdr"><span className="sec-title">Salary Payments — {month}</span></div>
            <div className="tw" style={{ marginBottom: 18 }}>
              <table>
                <thead><tr><th>Teacher</th><th>Type</th><th>Amount (LKR)</th><th>Status</th><th>Method</th><th>Paid date</th><th>Actions</th></tr></thead>
                <tbody>
                  {payments.map(p => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 600 }}>{p.teacher_name}</td>
                      <td style={{ color: "var(--ink3)", textTransform: "capitalize" }}>{p.payment_type}</td>
                      <td className="mono">{Number(p.amount).toLocaleString()}</td>
                      <td>{statusBadge(p.status)}</td>
                      <td style={{ color: "var(--ink3)" }}>{p.method || "—"}</td>
                      <td className="mono" style={{ color: "var(--ink3)" }}>{p.paid_date || "—"}</td>
                      <td>{p.status !== "paid" && <button className="btn btn-xs btn-ok" onClick={() => openMarkPaid(p)}>Mark paid</button>}</td>
                    </tr>
                  ))}
                  {payments.length === 0 && (
                    <tr><td colSpan={7} style={{ textAlign: "center", color: "var(--ink3)", padding: 24 }}>
                      No salary records for {month}. Click <strong>+ Add payment</strong> to create one.
                    </td></tr>
                  )}
                </tbody>
              </table>
              <Pagination
                page={page}
                limit={limit}
                totalCount={meta.total_count}
                totalPages={meta.total_pages}
                onPageChange={setPage}
                onLimitChange={l => { setLimit(l); setPage(1); }}
                itemName="salary records"
              />
            </div>

            <div className="sec-hdr" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="sec-title">Active Advances</span>
            </div>
            <div className="tw">
              <table>
                <thead><tr><th>Teacher</th><th>Amount</th><th>Reason</th><th>Status</th><th>Repaid</th></tr></thead>
                <tbody>
                  {advances.map(a => (
                    <tr key={a.id}>
                      <td style={{ fontWeight: 600 }}>{a.teacher_name}</td>
                      <td className="mono">{Number(a.amount).toLocaleString()}</td>
                      <td style={{ color: "var(--ink3)" }}>{a.reason || "—"}</td>
                      <td><span className="bdg b-trial">{a.status}</span></td>
                      <td className="mono">{Number(a.repaid_amount).toLocaleString()}</td>
                    </tr>
                  ))}
                  {advances.length === 0 && (
                    <tr><td colSpan={5} style={{ textAlign: "center", color: "var(--ink3)", padding: 24 }}>
                      No advances recorded. Click <strong>+ Add advance</strong> above to record one.
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Add payment modal */}
      <Modal
        open={payOpen}
        onClose={() => setPayOpen(false)}
        title="Add salary payment"
        footer={<>
          <button className="btn btn-s btn-sm" onClick={() => setPayOpen(false)} disabled={paySaving}>Cancel</button>
          <button className="btn btn-p btn-sm" onClick={submitPayment} disabled={paySaving}>{paySaving ? "Saving…" : "Add payment"}</button>
        </>}
      >
        <div className="form-gap">
          <div>
            <label className="flbl">Teacher</label>
            <SearchableSelect
              value={payForm.teacher}
              onChange={v => pickPayTeacher(String(v))}
              options={teacherOptions}
              placeholder="Pick a teacher…"
            />
          </div>
          <div className="field-row">
            <div className="fg">
              <label className="flbl">Month</label>
              <input type="text" value={payForm.month} onChange={e => setPayForm(f => ({ ...f, month: e.target.value }))} placeholder="e.g. April 2026" />
            </div>
            <div className="fg">
              <label className="flbl">Amount (LKR)</label>
              <input type="number" value={payForm.amount} onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))} placeholder="Defaults to monthly salary" />
            </div>
          </div>
          <div>
            <label className="flbl">Type</label>
            <div style={{ display: "flex", gap: 6 }}>
              {PAYMENT_TYPES.map(t => (
                <button type="button" key={t.value} className={`btn btn-sm ${payForm.payment_type === t.value ? "btn-p" : "btn-s"}`} style={{ flex: 1 }}
                  onClick={() => setPayForm(f => ({ ...f, payment_type: t.value }))}>{t.label}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="flbl">Status</label>
            <div style={{ display: "flex", gap: 6 }}>
              {["pending", "paid"].map(s => (
                <button type="button" key={s} className={`btn btn-sm ${payForm.status === s ? (s === "paid" ? "btn-ok" : "btn-p") : "btn-s"}`} style={{ flex: 1 }}
                  onClick={() => setPayForm(f => ({ ...f, status: s }))}>{s === "paid" ? "Paid" : "Pending"}</button>
              ))}
            </div>
          </div>
          {payForm.status === "paid" && (
            <div className="fg">
              <label className="flbl">Payment method</label>
              <select value={payForm.method} onChange={e => setPayForm(f => ({ ...f, method: e.target.value }))}>
                {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="flbl">Reference no. (optional)</label>
            <input type="text" value={payForm.reference_no} onChange={e => setPayForm(f => ({ ...f, reference_no: e.target.value }))} placeholder="Transaction ID" />
          </div>
          <div>
            <label className="flbl">Notes (optional)</label>
            <input type="text" value={payForm.notes} onChange={e => setPayForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
        </div>
      </Modal>

      {/* Add advance modal */}
      <Modal
        open={advOpen}
        onClose={() => setAdvOpen(false)}
        title="Add advance"
        footer={<>
          <button className="btn btn-s btn-sm" onClick={() => setAdvOpen(false)} disabled={advSaving}>Cancel</button>
          <button className="btn btn-p btn-sm" onClick={submitAdvance} disabled={advSaving}>{advSaving ? "Saving…" : "Add advance"}</button>
        </>}
      >
        <div className="form-gap">
          <div>
            <label className="flbl">Teacher</label>
            <SearchableSelect
              value={advForm.teacher}
              onChange={v => setAdvForm(f => ({ ...f, teacher: String(v) }))}
              options={teacherOptions}
              placeholder="Pick a teacher…"
            />
          </div>
          <div className="field-row">
            <div className="fg">
              <label className="flbl">Amount (LKR)</label>
              <input type="number" value={advForm.amount} onChange={e => setAdvForm(f => ({ ...f, amount: e.target.value }))} />
            </div>
            <div className="fg">
              <label className="flbl">Request date</label>
              <input type="date" value={advForm.request_date} onChange={e => setAdvForm(f => ({ ...f, request_date: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="flbl">Payment method</label>
            <select value={advForm.method} onChange={e => setAdvForm(f => ({ ...f, method: e.target.value }))}>
              {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="flbl">Reason (optional)</label>
            <input type="text" value={advForm.reason} onChange={e => setAdvForm(f => ({ ...f, reason: e.target.value }))} />
          </div>
        </div>
      </Modal>

      {/* Mark paid modal */}
      <Modal
        open={!!markPayModal}
        onClose={() => setMarkPayModal(null)}
        title={`Mark paid — ${markPayModal?.teacher_name || ""}`}
        footer={<>
          <button className="btn btn-s btn-sm" onClick={() => setMarkPayModal(null)} disabled={markSaving}>Cancel</button>
          <button className="btn btn-p btn-sm" onClick={confirmMarkPaid} disabled={markSaving}>{markSaving ? "Saving…" : "Confirm"}</button>
        </>}
      >
        {markPayModal && (
          <div className="form-gap">
            <div style={{ fontSize: 12.5, color: "var(--ink3)" }}>
              LKR {Number(markPayModal.amount).toLocaleString()} · {markPayModal.month}
            </div>
            <div className="fg">
              <label className="flbl">Payment method</label>
              <select value={markForm.method} onChange={e => setMarkForm(f => ({ ...f, method: e.target.value }))}>
                {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="flbl">Reference no. (optional)</label>
              <input type="text" value={markForm.reference_no} onChange={e => setMarkForm(f => ({ ...f, reference_no: e.target.value }))} placeholder="Transaction ID" />
            </div>
          </div>
        )}
      </Modal>
    </PageShell>
  );
}
