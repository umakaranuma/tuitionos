"use client";
import { useState, useEffect } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { PageShell } from "@/components/layout/PageShell";
import { Modal } from "@/components/ui/Modal";
import { api } from "@/lib/api";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { SearchSelect } from "@/components/ui/SearchSelect";
import { Pagination } from "@/components/ui/Pagination";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmDialog";

type Payment = { id: number; teacher: number; teacher_name: string; month: string; amount: string; status: string; paid_date: string | null; method: string; payment_type: string; reference_no?: string; notes?: string; advance_deduction?: string };
type Advance = { id: number; teacher: number; teacher_name: string; amount: string; request_date: string; reason: string; status: string; repaid_amount: string; remaining: string; method?: string };
type Teacher = { id: number; name: string; monthly_salary: string; is_active: boolean };

const PAYMENT_METHODS = ["Cash", "Bank transfer", "Online", "Cheque", "Other"];
// "Advance deduction" used to be a third type here, but it never triggered
// any different behavior — the actual deduction always happens through the
// "Deduct from outstanding advance" field below, regardless of type. Keeping
// it around just made it look like picking that type was required (or would
// auto-calculate something) to apply a deduction, when it did nothing at all.
const PAYMENT_TYPES = [
  { value: "salary", label: "Salary" },
  { value: "bonus", label: "Bonus" },
];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MONTH_OPTS = MONTH_NAMES.map((m, i) => ({ value: String(i + 1), label: m }));

const statusBadge = (s: string) => {
  const map: Record<string, JSX.Element> = { paid: <span className="bdg b-paid">Paid</span>, pending: <span className="bdg b-due">Pending</span>, overdue: <span className="bdg b-over">Overdue</span> };
  return map[s] || <span className="bdg b-due">{s}</span>;
};

// Advances aren't repaid by the teacher in cash — they're automatically
// deducted from upcoming salary payments, so the labels say "deducted"
// rather than "repaid" to match how the money actually moves.
const advanceStatusBadge = (s: string) => {
  const map: Record<string, JSX.Element> = {
    active: <span className="bdg b-due">Outstanding</span>,
    partial: <span className="bdg b-over">Partially deducted</span>,
    repaid: <span className="bdg b-paid">Fully deducted</span>,
  };
  return map[s] || <span className="bdg b-due">{s}</span>;
};

const todayIso = () => new Date().toISOString().slice(0, 10);
const getAcademicYear = () => (typeof window !== "undefined" ? localStorage.getItem("academic_year") || String(new Date().getFullYear()) : String(new Date().getFullYear()));

export default function TeacherSalaryPage() {
  const toast = useToast();
  const confirmDialog = useConfirm();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  // The sidebar's Academic year switcher is the year control — this page
  // only picks the month within that year.
  const [monthNum, setMonthNum] = useState(String(new Date().getMonth() + 1));
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [meta, setMeta] = useState({ total_count: 0, total_pages: 1 });

  const academicYear = getAcademicYear();
  const month = `${MONTH_NAMES[Number(monthNum) - 1]} ${academicYear}`;
  // The month after whatever's currently selected — advances project onto
  // that teacher's *next* salary payment, so the label needs to roll over
  // into next year once the selected month is December.
  const nextMonthIdx = Number(monthNum) % 12;
  const nextMonthYear = Number(monthNum) === 12 ? Number(academicYear) + 1 : Number(academicYear);
  const nextMonthLabel = `${MONTH_NAMES[nextMonthIdx]} ${nextMonthYear}`;

  // Add/edit-payment modal — same modal serves both, keyed off payEditTarget.
  const [payOpen, setPayOpen] = useState(false);
  const [payEditTarget, setPayEditTarget] = useState<Payment | null>(null);
  const [payForm, setPayForm] = useState({
    teacher: "", monthNum, amount: "", payment_type: "salary", status: "pending",
    method: PAYMENT_METHODS[0], reference_no: "", notes: "", advance_deduction: "",
  });
  const [paySaving, setPaySaving] = useState(false);

  // Add/edit-advance modal — same modal serves both, keyed off advEditTarget.
  const [advOpen, setAdvOpen] = useState(false);
  const [advEditTarget, setAdvEditTarget] = useState<Advance | null>(null);
  const [advForm, setAdvForm] = useState({ teacher: "", amount: "", request_date: todayIso(), reason: "", method: PAYMENT_METHODS[0] });
  const [advSaving, setAdvSaving] = useState(false);

  // Mark-paid modal — captures the real method/reference instead of a hardcoded default.
  const [markPayModal, setMarkPayModal] = useState<Payment | null>(null);
  const [markForm, setMarkForm] = useState({ method: PAYMENT_METHODS[0], reference_no: "", advance_deduction: "" });
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

  // The teacher pickers in the modals below start from `teachers` (loaded
  // above) but refetch live into their own list on open/search — kept
  // separate from `teachers` itself so narrowing the picker's search doesn't
  // also shrink the page's "Active Teachers" KPI behind the modal. A teacher
  // added on another tab shows up here immediately, no full reload needed.
  const [pickerTeachers, setPickerTeachers] = useState<Teacher[] | null>(null);
  const fetchTeachers = (query: string = "") => {
    api.get("/api/academics/teachers", { params: { limit: 500, ...(query ? { search: query } : {}) } })
      .then(r => { const d = r.data; setPickerTeachers(Array.isArray(d) ? d : d.results || []); })
      .catch(() => {});
  };

  // Outstanding advance balance per teacher — sums every active/partial
  // advance's remaining amount, so the payment forms can offer a deduction.
  const outstandingByTeacher = advances
    .filter(a => a.status !== "repaid")
    .reduce<Record<number, number>>((acc, a) => { acc[a.teacher] = (acc[a.teacher] || 0) + Number(a.remaining); return acc; }, {});

  // Projected net pay for this teacher's *next* salary payment — their
  // monthly salary minus whatever's still outstanding on their advance(s),
  // capped so a large advance can't make the projection go negative (it just
  // takes more than one month to fully deduct). Purely a preview: nothing is
  // applied until an actual payment is recorded.
  const nextMonthProjection = (teacherId: number) => {
    const t = (pickerTeachers ?? teachers).find(x => x.id === teacherId) || teachers.find(x => x.id === teacherId);
    if (!t) return null;
    const salary = Number(t.monthly_salary);
    const outstanding = outstandingByTeacher[teacherId] || 0;
    const deduction = Math.min(outstanding, salary);
    return { salary, deduction, net: salary - deduction };
  };

  const openMarkPaid = (p: Payment) => {
    // Advances aren't something the admin opts into deducting each time —
    // they're owed against this teacher's very next salary, so default the
    // deduction to the full outstanding balance (capped to what's actually
    // being paid) rather than leaving it blank and easy to forget.
    const already = p.advance_deduction && Number(p.advance_deduction) > 0 ? Number(p.advance_deduction) : 0;
    const outstanding = outstandingByTeacher[p.teacher] || 0;
    const suggested = already || Math.min(outstanding, Number(p.amount));
    setMarkForm({ method: p.method || PAYMENT_METHODS[0], reference_no: p.reference_no || "", advance_deduction: suggested > 0 ? String(suggested) : "" });
    setMarkPayModal(p);
  };

  const confirmMarkPaid = async () => {
    if (!markPayModal) return;
    setMarkSaving(true);
    try {
      await api.post(`/api/academics/teacher-payments/${markPayModal.id}/mark_paid`, {
        method: markForm.method, reference_no: markForm.reference_no,
        advance_deduction: markForm.advance_deduction || 0,
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
    setPayEditTarget(null);
    setPayForm({ teacher: "", monthNum, amount: "", payment_type: "salary", status: "pending", method: PAYMENT_METHODS[0], reference_no: "", notes: "", advance_deduction: "" });
    setPayOpen(true);
  };

  const openEditPayment = (p: Payment) => {
    const monthIdx = MONTH_NAMES.indexOf(p.month.split(" ")[0]);
    setPayEditTarget(p);
    setPayForm({
      teacher: String(p.teacher),
      monthNum: monthIdx >= 0 ? String(monthIdx + 1) : monthNum,
      amount: p.amount,
      payment_type: p.payment_type,
      status: p.status === "paid" ? "paid" : "pending",
      method: p.method || PAYMENT_METHODS[0],
      reference_no: p.reference_no || "",
      notes: p.notes || "",
      advance_deduction: p.advance_deduction && Number(p.advance_deduction) > 0 ? p.advance_deduction : "",
    });
    setPayOpen(true);
  };

  const deletePayment = async (p: Payment) => {
    const ok = await confirmDialog({
      title: "Delete payment",
      message: `Delete the LKR ${Number(p.amount).toLocaleString()} ${p.payment_type} payment for ${p.teacher_name} (${p.month})? This can't be undone.`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/api/academics/teacher-payments/${p.id}`);
      toast.success("Payment deleted.");
      load();
    } catch (e) {
      toast.error(errMsg(e, "Couldn't delete payment."));
    }
  };

  const pickPayTeacher = (id: string) => {
    const t = (pickerTeachers ?? teachers).find(t => String(t.id) === id);
    const amount = payForm.amount || (t ? t.monthly_salary : payForm.amount);
    // Same default-to-full-outstanding logic as Mark paid — the deduction
    // isn't optional extra work, it's the whole point of recording an advance.
    const outstanding = outstandingByTeacher[Number(id)] || 0;
    const suggested = outstanding > 0 ? String(Math.min(outstanding, Number(amount || 0))) : "";
    setPayForm(f => ({ ...f, teacher: id, amount, advance_deduction: f.advance_deduction || suggested }));
  };

  // When editing a payment that's already paid, its own deduction has
  // already been subtracted out of the ledger — outstandingByTeacher no
  // longer includes it. Add it back so the field (and its cap) reflect the
  // teacher's true headroom, matching what the backend clamps against.
  const payEditAlreadyApplied = payEditTarget && payEditTarget.status === "paid" ? Number(payEditTarget.advance_deduction || 0) : 0;
  const payOutstanding = (payForm.teacher ? (outstandingByTeacher[Number(payForm.teacher)] || 0) : 0) + payEditAlreadyApplied;
  const payNet = Math.max(0, Number(payForm.amount || 0) - Number(payForm.advance_deduction || 0));
  const markOutstanding = markPayModal ? (outstandingByTeacher[markPayModal.teacher] || 0) : 0;
  const markNet = markPayModal ? Math.max(0, Number(markPayModal.amount) - Number(markForm.advance_deduction || 0)) : 0;

  const submitPayment = async () => {
    if (!payForm.teacher || !payForm.monthNum || !payForm.amount) {
      toast.error("Teacher, month, and amount are required.");
      return;
    }
    setPaySaving(true);
    try {
      const payload: Record<string, any> = {
        teacher: Number(payForm.teacher),
        month: `${MONTH_NAMES[Number(payForm.monthNum) - 1]} ${academicYear}`,
        amount: payForm.amount,
        payment_type: payForm.payment_type,
        status: payForm.status,
        method: payForm.status === "paid" ? payForm.method : "",
        reference_no: payForm.reference_no,
        notes: payForm.notes,
        advance_deduction: payForm.status === "paid" ? (payForm.advance_deduction || 0) : 0,
      };
      if (payEditTarget) {
        // Only stamp today's date if this edit is what's newly marking it
        // paid — otherwise keep the original paid_date so correcting, say,
        // the amount on an already-paid record doesn't rewrite history.
        payload.paid_date = payForm.status === "paid"
          ? (payEditTarget.status === "paid" ? payEditTarget.paid_date : todayIso())
          : null;
        await api.patch(`/api/academics/teacher-payments/${payEditTarget.id}`, payload);
        toast.success("Payment updated.");
      } else {
        payload.paid_date = payForm.status === "paid" ? todayIso() : null;
        await api.post("/api/academics/teacher-payments", payload);
        toast.success("Payment record added.");
      }
      setPayOpen(false);
      setPayEditTarget(null);
      load();
    } catch (e) {
      toast.error(errMsg(e, payEditTarget ? "Couldn't update payment." : "Couldn't add payment record."));
    } finally {
      setPaySaving(false);
    }
  };

  const openAddAdvance = () => {
    setAdvEditTarget(null);
    setAdvForm({ teacher: "", amount: "", request_date: todayIso(), reason: "", method: PAYMENT_METHODS[0] });
    setAdvOpen(true);
  };

  const openEditAdvance = (a: Advance) => {
    setAdvEditTarget(a);
    setAdvForm({ teacher: String(a.teacher), amount: a.amount, request_date: a.request_date, reason: a.reason || "", method: a.method || PAYMENT_METHODS[0] });
    setAdvOpen(true);
  };

  const errMsg = (e: any, fallback: string) => {
    const d = e?.response?.data;
    return (Array.isArray(d) ? d[0] : d?.detail || d?.error) || fallback;
  };

  const submitAdvance = async () => {
    if (!advForm.teacher || !advForm.amount) {
      toast.error("Teacher and amount are required.");
      return;
    }
    setAdvSaving(true);
    try {
      if (advEditTarget) {
        await api.patch(`/api/academics/teacher-advances/${advEditTarget.id}`, {
          teacher: Number(advForm.teacher),
          amount: advForm.amount,
          request_date: advForm.request_date,
          reason: advForm.reason,
          method: advForm.method,
        });
        toast.success("Advance updated.");
      } else {
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
      }
      setAdvOpen(false);
      setAdvEditTarget(null);
      load();
    } catch (e) {
      toast.error(errMsg(e, advEditTarget ? "Couldn't update advance." : "Couldn't record advance."));
    } finally {
      setAdvSaving(false);
    }
  };

  const deleteAdvance = async (a: Advance) => {
    const ok = await confirmDialog({
      title: "Delete advance",
      message: `Delete the LKR ${Number(a.amount).toLocaleString()} advance for ${a.teacher_name}? This can't be undone.`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/api/academics/teacher-advances/${a.id}`);
      toast.success("Advance deleted.");
      load();
    } catch (e) {
      toast.error(errMsg(e, "Couldn't delete advance."));
    }
  };

  const paidCount = payments.filter(p => p.status === "paid").length;
  const totalPaid = payments.filter(p => p.status === "paid").reduce((s, p) => s + Number(p.amount), 0);
  const totalPending = payments.filter(p => p.status !== "paid").reduce((s, p) => s + Number(p.amount), 0);
  const totalOutstandingAdvances = Object.values(outstandingByTeacher).reduce((s, v) => s + v, 0);
  const teacherOptions = (pickerTeachers ?? teachers).filter(t => t.is_active).map(t => ({ value: t.id, label: t.name }));

  return (
    <PageShell>
      <Topbar title="Teacher Salary" subtitle={month}
        right={
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ width: 150 }}>
              <SearchSelect value={monthNum} onChange={v => { setMonthNum(v); setPage(1); }} options={MONTH_OPTS} searchable={false} />
            </div>
            <button className="btn btn-s btn-sm" onClick={openAddAdvance}>+ Add advance</button>
            <button className="btn btn-p btn-sm" onClick={openAddPayment}>+ Add payment</button>
          </div>
        } />
      <div className="pb fi">
        <div className="g4" style={{ marginBottom: 18 }}>
          <div className="kpi" style={{ "--kc": "var(--tc)" } as any}>
            <div className="kpi-lbl">Total Paid</div>
            <div className="kpi-val">LKR {totalPaid.toLocaleString()}</div>
            <div className="kpi-tr up">{paidCount} teachers</div>
          </div>
          <div className="kpi" style={{ "--kc": "var(--rb)" } as any}>
            <div className="kpi-lbl">Pending</div>
            <div className="kpi-val">LKR {totalPending.toLocaleString()}</div>
            <div className="kpi-tr dn">{payments.length - paidCount} teachers</div>
          </div>
          <div className="kpi" style={{ "--kc": "var(--sf)" } as any}>
            <div className="kpi-lbl">Outstanding Advances</div>
            <div className="kpi-val">LKR {totalOutstandingAdvances.toLocaleString()}</div>
            <div className="kpi-tr nt">{advances.filter(a => a.status !== "repaid").length} active</div>
          </div>
          <div className="kpi" style={{ "--kc": "var(--jd)" } as React.CSSProperties}>
            <div className="kpi-lbl">Active Teachers</div>
            <div className="kpi-val">{teacherOptions.length}</div>
            <div className="kpi-tr nt">On payroll</div>
          </div>
        </div>

        {loading ? <div style={{ textAlign: "center", padding: 40, color: "var(--ink3)" }}>Loading...</div> : (
          <>
            <div className="sec-hdr"><span className="sec-title">Salary Payments — {month}</span></div>
            <div className="tw" style={{ marginBottom: 18 }}>
              <table>
                <thead><tr><th>Teacher</th><th>Type</th><th>Amount (LKR)</th><th>Advance deducted</th><th>Net paid</th><th>Status</th><th>Method</th><th>Paid date</th><th>Actions</th></tr></thead>
                <tbody>
                  {payments.map(p => {
                    const deduction = Number(p.advance_deduction || 0);
                    const net = Number(p.amount) - deduction;
                    return (
                      <tr key={p.id}>
                        <td style={{ fontWeight: 600 }}>{p.teacher_name}</td>
                        <td style={{ color: "var(--ink3)", textTransform: "capitalize" }}>{p.payment_type}</td>
                        <td className="mono">{Number(p.amount).toLocaleString()}</td>
                        <td className="mono" style={{ color: deduction > 0 ? "var(--sf)" : "var(--ink3)" }}>{deduction > 0 ? `− ${deduction.toLocaleString()}` : "—"}</td>
                        <td className="mono" style={{ fontWeight: 700 }}>{net.toLocaleString()}</td>
                        <td>{statusBadge(p.status)}</td>
                        <td style={{ color: "var(--ink3)" }}>{p.method || "—"}</td>
                        <td className="mono" style={{ color: "var(--ink3)" }}>{p.paid_date || "—"}</td>
                        <td>
                          <div style={{ display: "flex", gap: 4 }}>
                            {p.status !== "paid" && <button className="btn btn-xs btn-ok" onClick={() => openMarkPaid(p)}>Mark paid</button>}
                            <button className="btn btn-xs btn-s" onClick={() => openEditPayment(p)}>Edit</button>
                            <button className="btn btn-xs btn-d" onClick={() => deletePayment(p)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {payments.length === 0 && (
                    <tr><td colSpan={9} style={{ textAlign: "center", color: "var(--ink3)", padding: 24 }}>
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
              <span className="sec-title">Teacher Advances</span>
            </div>
            <div className="tw">
              <table>
                <thead><tr><th>Teacher</th><th>Advance Amount</th><th>Reason</th><th>Status</th><th>Deducted</th><th>Net Pay — {nextMonthLabel}</th><th>Actions</th></tr></thead>
                <tbody>
                  {advances.map(a => {
                    const proj = nextMonthProjection(a.teacher);
                    return (
                    <tr key={a.id}>
                      <td style={{ fontWeight: 600 }}>{a.teacher_name}</td>
                      <td className="mono">{Number(a.amount).toLocaleString()}</td>
                      <td style={{ color: "var(--ink3)" }}>{a.reason || "—"}</td>
                      <td>{advanceStatusBadge(a.status)}</td>
                      <td className="mono" style={{ color: "var(--ink3)" }}>{Number(a.repaid_amount).toLocaleString()}</td>
                      <td className="mono">
                        {proj ? (
                          <>
                            <span style={{ fontWeight: 700 }}>{proj.net.toLocaleString()}</span>
                            {proj.deduction > 0 && <span style={{ color: "var(--ink3)", fontSize: 11.5 }}> (salary {proj.salary.toLocaleString()} − {proj.deduction.toLocaleString()})</span>}
                          </>
                        ) : "—"}
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 4 }}>
                          <button className="btn btn-xs btn-s" onClick={() => openEditAdvance(a)}>Edit</button>
                          <button className="btn btn-xs btn-d" onClick={() => deleteAdvance(a)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  );})}
                  {advances.length === 0 && (
                    <tr><td colSpan={7} style={{ textAlign: "center", color: "var(--ink3)", padding: 24 }}>
                      No advances recorded. Click <strong>+ Add advance</strong> above to record one.
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Add/edit payment modal */}
      <Modal
        open={payOpen}
        onClose={() => { setPayOpen(false); setPayEditTarget(null); }}
        title={payEditTarget ? `Edit payment — ${payEditTarget.teacher_name}` : "Add salary payment"}
        footer={<>
          <button className="btn btn-s btn-sm" onClick={() => { setPayOpen(false); setPayEditTarget(null); }} disabled={paySaving}>Cancel</button>
          <button className="btn btn-p btn-sm" onClick={submitPayment} disabled={paySaving}>{paySaving ? "Saving…" : payEditTarget ? "Save changes" : "Add payment"}</button>
        </>}
      >
        <div className="form-gap">
          <div>
            <label className="flbl">Teacher</label>
            <SearchableSelect
              value={payForm.teacher}
              onChange={v => pickPayTeacher(String(v))}
              options={
                // Same reasoning as the advance edit modal — a teacher
                // deactivated after this payment was recorded still needs to
                // show up here, or editing looks like it silently blanked
                // out (or would reassign) the teacher.
                payEditTarget && !teacherOptions.some(o => String(o.value) === String(payEditTarget.teacher))
                  ? [{ value: payEditTarget.teacher, label: payEditTarget.teacher_name }, ...teacherOptions]
                  : teacherOptions
              }
              placeholder="Pick a teacher…"
              onOpen={() => fetchTeachers()}
              onSearch={q => fetchTeachers(q)}
            />
            {payForm.teacher && payOutstanding > 0 && (() => {
              const proj = nextMonthProjection(Number(payForm.teacher));
              if (!proj) return null;
              return (
                <div className="hint" style={{ marginTop: 6 }}>
                  {nextMonthLabel} net pay: <strong>LKR {proj.net.toLocaleString()}</strong>
                  {" "}(salary {proj.salary.toLocaleString()} − advance {proj.deduction.toLocaleString()})
                </div>
              );
            })()}
          </div>
          <div className="field-row">
            <div className="fg">
              <label className="flbl">Month ({academicYear})</label>
              <SearchSelect value={payForm.monthNum} onChange={v => setPayForm(f => ({ ...f, monthNum: v }))} options={MONTH_OPTS} searchable={false} />
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
          {payOutstanding > 0 && (
            payForm.status === "paid" ? (
              <div className="fg">
                <label className="flbl">Deduct from outstanding advance (LKR {payOutstanding.toLocaleString()} owed)</label>
                <input
                  type="number" value={payForm.advance_deduction}
                  onChange={e => setPayForm(f => ({ ...f, advance_deduction: e.target.value }))}
                  placeholder="0"
                  max={Math.min(payOutstanding, Number(payForm.amount || 0))}
                />
                <div className="hint">Net payable after deduction: <strong>LKR {payNet.toLocaleString()}</strong></div>
              </div>
            ) : (
              // Deduction only applies once the payment is actually paid — the
              // projection above the teacher field already shows the numbers,
              // this just points at how to actually apply it.
              <div className="hint" style={{ background: "var(--sf-l)", color: "var(--sf)", padding: "8px 10px", borderRadius: 8 }}>
                Set status to <strong>Paid</strong> to deduct this now, or it'll be offered again when you mark this payment paid later.
              </div>
            )
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

      {/* Add/edit advance modal */}
      <Modal
        open={advOpen}
        onClose={() => { setAdvOpen(false); setAdvEditTarget(null); }}
        title={advEditTarget ? `Edit advance — ${advEditTarget.teacher_name}` : "Add advance"}
        footer={<>
          <button className="btn btn-s btn-sm" onClick={() => { setAdvOpen(false); setAdvEditTarget(null); }} disabled={advSaving}>Cancel</button>
          <button className="btn btn-p btn-sm" onClick={submitAdvance} disabled={advSaving}>{advSaving ? "Saving…" : advEditTarget ? "Save changes" : "Add advance"}</button>
        </>}
      >
        <div className="form-gap">
          <div>
            <label className="flbl">Teacher</label>
            <SearchableSelect
              value={advForm.teacher}
              onChange={v => setAdvForm(f => ({ ...f, teacher: String(v) }))}
              options={
                // A teacher deactivated after this advance was recorded
                // wouldn't otherwise appear in the (active-only) picker —
                // keep them selectable so editing doesn't blank out or
                // silently reassign the teacher.
                advEditTarget && !teacherOptions.some(o => String(o.value) === String(advEditTarget.teacher))
                  ? [{ value: advEditTarget.teacher, label: advEditTarget.teacher_name }, ...teacherOptions]
                  : teacherOptions
              }
              placeholder="Pick a teacher…"
              onOpen={() => fetchTeachers()}
              onSearch={q => fetchTeachers(q)}
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
            {markOutstanding > 0 && (
              <div className="fg">
                <label className="flbl">Deduct from outstanding advance (LKR {markOutstanding.toLocaleString()} owed)</label>
                <input
                  type="number" value={markForm.advance_deduction}
                  onChange={e => setMarkForm(f => ({ ...f, advance_deduction: e.target.value }))}
                  placeholder="0"
                  max={Math.min(markOutstanding, Number(markPayModal.amount))}
                />
                <div className="hint">Net payable after deduction: <strong>LKR {markNet.toLocaleString()}</strong></div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </PageShell>
  );
}
