"use client";
import { useState, useRef } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { PageShell } from "@/components/layout/PageShell";
import { Modal } from "@/components/ui/Modal";
import { TEACHERS, INIT_TEACHER_PAYMENTS, INIT_TEACHER_ADVANCES, Teacher, TeacherPayment, TeacherAdvance, PaymentEdit } from "@/lib/batchData";

const PAYMENT_METHODS = ["Bank transfer", "Cash", "Cheque", "Online (card)", "UPI / Mobile pay"];
const ADVANCE_REASONS = ["Medical emergency", "Family function", "Education expenses", "Housing / rent", "Personal need", "Other"];

const MONTHS = [
  "April 2026", "March 2026", "February 2026",
  "January 2026", "December 2025", "November 2025",
];

type PageTab = "salary" | "advances";

export default function TeacherSalaryPage() {
  const [pageTab, setPageTab] = useState<PageTab>("salary");
  const [payments, setPayments] = useState<TeacherPayment[]>(INIT_TEACHER_PAYMENTS);
  const [advances, setAdvances] = useState<TeacherAdvance[]>(INIT_TEACHER_ADVANCES);
  const [selectedMonth, setSelectedMonth] = useState("April 2026");
  const [nextAdvId, setNextAdvId] = useState(INIT_TEACHER_ADVANCES.length + 1);

  // Record payment modal
  const [payTarget, setPayTarget] = useState<{ teacher: Teacher; month: string } | null>(null);
  const [payForm, setPayForm] = useState({
    method: "Bank transfer",
    date: new Date().toISOString().slice(0, 10),
    referenceNo: "",
    notes: "",
    amount: "",
    payslipFile: null as File | null,
    payslipFileName: "",
    advanceDeduction: "0",
    deductionMode: "partial" as "full" | "partial" | "none",
  });
  const payslipRef = useRef<HTMLInputElement>(null);

  // View / Edit payment modal (single view for settled payments)
  const [viewTarget, setViewTarget] = useState<{ teacher: Teacher; payment: TeacherPayment } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    amount: "", method: "", date: "", referenceNo: "", notes: "", advanceDeduction: "",
    payslipFile: "",
  });

  // Payment history modal
  const [historyTeacher, setHistoryTeacher] = useState<Teacher | null>(null);

  // Advance modal
  const [advanceModal, setAdvanceModal] = useState<"request" | "disburse" | null>(null);
  const [advanceTarget, setAdvanceTarget] = useState<Teacher | null>(null);
  const [advanceForm, setAdvanceForm] = useState({
    amount: "", reason: "Medical emergency", customReason: "",
    requestDate: new Date().toISOString().slice(0, 10),
    method: "Bank transfer", deductionPerMonth: "",
  });

  // View advance detail
  const [viewAdvance, setViewAdvance] = useState<{ advance: TeacherAdvance; teacher: Teacher } | null>(null);

  // ── Computed values ──
  const monthPayments = payments.filter(p => p.month === selectedMonth && p.type === "salary");
  const totalPayroll = TEACHERS.reduce((s, t) => s + t.monthlySalary, 0);
  const settled = monthPayments.filter(p => p.status === "paid");
  const pending = monthPayments.filter(p => p.status !== "paid");
  const settledAmount = settled.reduce((s, p) => s + p.amount, 0);
  const pendingAmount = pending.reduce((s, p) => s + p.amount, 0);

  // Advances computed
  const activeAdvances = advances.filter(a => a.status === "active" || a.status === "partial");
  const totalAdvanceOut = activeAdvances.reduce((s, a) => s + (a.amount - a.repaidAmount), 0);

  // Group by method
  const byMethod: Record<string, { count: number; total: number }> = {};
  settled.forEach(p => {
    const m = p.method || "Unknown";
    if (!byMethod[m]) byMethod[m] = { count: 0, total: 0 };
    byMethod[m].count++;
    byMethod[m].total += p.amount;
  });

  const getPayment = (teacherId: number) => monthPayments.find(p => p.teacherId === teacherId);
  const getTeacherAdvances = (teacherId: number) => advances.filter(a => a.teacherId === teacherId);
  const getActiveAdvance = (teacherId: number) => advances.find(a => a.teacherId === teacherId && (a.status === "active" || a.status === "partial"));

  // ── Open record payment (only for unsettled) ──
  const openRecordPay = (teacher: Teacher) => {
    // Block if already paid
    const existing = getPayment(teacher.id);
    if (existing?.status === "paid") return;

    const adv = getActiveAdvance(teacher.id);
    const advRemaining = adv ? adv.amount - adv.repaidAmount : 0;
    setPayForm({
      method: "Bank transfer",
      date: new Date().toISOString().slice(0, 10),
      referenceNo: `SAL-${teacher.id}${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(new Date().getFullYear()).slice(2)}`,
      notes: "",
      amount: String(teacher.monthlySalary),
      payslipFile: null,
      payslipFileName: "",
      // Auto-apply full advance deduction by default
      advanceDeduction: adv ? String(advRemaining) : "0",
      deductionMode: adv ? "full" : "none",
    });
    setPayTarget({ teacher, month: selectedMonth });
  };

  const handlePayslipUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPayForm(f => ({ ...f, payslipFile: file, payslipFileName: file.name }));
    }
  };

  const removePayslip = () => {
    setPayForm(f => ({ ...f, payslipFile: null, payslipFileName: "" }));
    if (payslipRef.current) payslipRef.current.value = "";
  };

  const confirmPayment = () => {
    if (!payTarget) return;
    const amt = parseInt(payForm.amount) || payTarget.teacher.monthlySalary;
    const deduction = parseInt(payForm.advanceDeduction) || 0;

    setPayments(prev => prev.map(p =>
      p.teacherId === payTarget.teacher.id && p.month === payTarget.month && p.type === "salary"
        ? {
          ...p, status: "paid" as const, amount: amt, paidDate: payForm.date,
          method: payForm.method, referenceNo: payForm.referenceNo,
          payslipFile: payForm.payslipFileName || null,
          notes: payForm.notes || null,
          advanceDeduction: deduction,
          editHistory: [],
        }
        : p
    ));

    // Update advance repayment if applicable
    if (deduction > 0) {
      setAdvances(prev => prev.map(a => {
        if (a.teacherId === payTarget.teacher.id && (a.status === "active" || a.status === "partial")) {
          const newRepaid = a.repaidAmount + deduction;
          return {
            ...a,
            repaidAmount: newRepaid,
            status: newRepaid >= a.amount ? "repaid" as const : "partial" as const,
          };
        }
        return a;
      }));
    }

    setPayTarget(null);
  };

  // ── Settle all (auto-applies advance deductions) ──
  const settleAll = () => {
    const today = new Date().toISOString().slice(0, 10);
    const deductions: { teacherId: number; amount: number }[] = [];

    setPayments(prev => prev.map(p => {
      if (p.month === selectedMonth && p.status !== "paid" && p.type === "salary") {
        const adv = getActiveAdvance(p.teacherId);
        const deduction = adv ? adv.amount - adv.repaidAmount : 0;
        if (deduction > 0) deductions.push({ teacherId: p.teacherId, amount: deduction });
        return {
          ...p, status: "paid" as const, paidDate: today,
          method: "Bank transfer", referenceNo: `SAL-${p.teacherId}-BULK`,
          payslipFile: null, notes: "Bulk settlement" + (deduction > 0 ? ` (advance deducted: LKR ${deduction.toLocaleString()})` : ""),
          advanceDeduction: deduction,
        };
      }
      return p;
    }));

    // Update advance repayments
    if (deductions.length > 0) {
      setAdvances(prev => prev.map(a => {
        const ded = deductions.find(d => d.teacherId === a.teacherId);
        if (ded && (a.status === "active" || a.status === "partial")) {
          const newRepaid = a.repaidAmount + ded.amount;
          return { ...a, repaidAmount: newRepaid, status: newRepaid >= a.amount ? "repaid" as const : "partial" as const };
        }
        return a;
      }));
    }
  };

  // ── View / Edit payment ──
  const openPaymentView = (teacher: Teacher) => {
    const payment = getPayment(teacher.id);
    if (payment && payment.status === "paid") {
      setViewTarget({ teacher, payment });
      setIsEditing(false);
    }
  };

  const startEditing = () => {
    if (!viewTarget) return;
    const { payment } = viewTarget;
    setEditForm({
      amount: String(payment.amount),
      method: payment.method || "Bank transfer",
      date: payment.paidDate || new Date().toISOString().slice(0, 10),
      referenceNo: payment.referenceNo || "",
      notes: payment.notes || "",
      advanceDeduction: String(payment.advanceDeduction),
      payslipFile: payment.payslipFile || "",
    });
    setIsEditing(true);
  };

  const saveEdit = () => {
    if (!viewTarget) return;
    const { teacher, payment } = viewTarget;
    const today = new Date().toISOString().slice(0, 10);
    const newAmt = parseInt(editForm.amount) || payment.amount;
    const newDed = parseInt(editForm.advanceDeduction) || 0;

    // Build edit history entries
    const edits: PaymentEdit[] = [];
    if (newAmt !== payment.amount) {
      edits.push({ editDate: today, field: "Amount", oldValue: `LKR ${payment.amount.toLocaleString()}`, newValue: `LKR ${newAmt.toLocaleString()}` });
    }
    if (editForm.method !== payment.method) {
      edits.push({ editDate: today, field: "Method", oldValue: payment.method || "—", newValue: editForm.method });
    }
    if (editForm.date !== payment.paidDate) {
      edits.push({ editDate: today, field: "Paid Date", oldValue: payment.paidDate || "—", newValue: editForm.date });
    }
    if (editForm.referenceNo !== (payment.referenceNo || "")) {
      edits.push({ editDate: today, field: "Reference", oldValue: payment.referenceNo || "—", newValue: editForm.referenceNo || "—" });
    }
    if (newDed !== payment.advanceDeduction) {
      edits.push({ editDate: today, field: "Adv. Deduction", oldValue: `LKR ${payment.advanceDeduction.toLocaleString()}`, newValue: `LKR ${newDed.toLocaleString()}` });
    }

    if (edits.length === 0 && editForm.notes === (payment.notes || "") && editForm.payslipFile === (payment.payslipFile || "")) {
      setIsEditing(false);
      return; // No changes
    }

    // If no field-level edits but notes/payslip changed, still track
    if (editForm.notes !== (payment.notes || "")) {
      edits.push({ editDate: today, field: "Notes", oldValue: payment.notes || "—", newValue: editForm.notes || "—" });
    }

    setPayments(prev => prev.map(p => {
      if (p.teacherId === teacher.id && p.month === payment.month && p.type === "salary") {
        return {
          ...p,
          amount: newAmt,
          method: editForm.method,
          paidDate: editForm.date,
          referenceNo: editForm.referenceNo || null,
          notes: editForm.notes || null,
          advanceDeduction: newDed,
          payslipFile: editForm.payslipFile || null,
          editHistory: [...p.editHistory, ...edits],
        };
      }
      return p;
    }));

    // Update viewTarget with new values
    const updated: TeacherPayment = {
      ...payment,
      amount: newAmt, method: editForm.method, paidDate: editForm.date,
      referenceNo: editForm.referenceNo || null, notes: editForm.notes || null,
      advanceDeduction: newDed, payslipFile: editForm.payslipFile || null,
      editHistory: [...payment.editHistory, ...edits],
    };
    setViewTarget({ teacher, payment: updated });
    setIsEditing(false);
  };

  // ── History ──
  const getTeacherHistory = (teacher: Teacher) =>
    payments.filter(p => p.teacherId === teacher.id).sort((a, b) => {
      const dateA = new Date(a.month.split(" ").reverse().join(" "));
      const dateB = new Date(b.month.split(" ").reverse().join(" "));
      return dateB.getTime() - dateA.getTime();
    });

  // ── Advance request ──
  const openAdvanceRequest = (teacher: Teacher) => {
    setAdvanceForm({
      amount: "", reason: "Medical emergency", customReason: "",
      requestDate: new Date().toISOString().slice(0, 10),
      method: "Bank transfer",
      deductionPerMonth: "5000",
    });
    setAdvanceTarget(teacher);
    setAdvanceModal("request");
  };

  const confirmAdvance = () => {
    if (!advanceTarget || !advanceForm.amount) return;
    const amt = parseInt(advanceForm.amount) || 0;
    const reason = advanceForm.reason === "Other" ? advanceForm.customReason : advanceForm.reason;

    setAdvances(prev => [...prev, {
      id: nextAdvId,
      teacherId: advanceTarget.id,
      amount: amt,
      requestDate: advanceForm.requestDate,
      reason,
      status: "active" as const,
      disbursedDate: advanceForm.requestDate,
      method: advanceForm.method,
      repaidAmount: 0,
    }]);
    setNextAdvId(n => n + 1);
    setAdvanceModal(null);
    setAdvanceTarget(null);
  };

  // ── Repay advance manually ──
  const repayAdvance = (advance: TeacherAdvance, amount: number) => {
    setAdvances(prev => prev.map(a => {
      if (a.id === advance.id) {
        const newRepaid = a.repaidAmount + amount;
        return { ...a, repaidAmount: newRepaid, status: newRepaid >= a.amount ? "repaid" as const : "partial" as const };
      }
      return a;
    }));
  };

  return (
    <PageShell>
      <Topbar
        title="Teacher salary"
        subtitle="Payroll settlement, advances & history"
        right={
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-s btn-sm">Export payslips</button>
            {pageTab === "salary" && pending.length > 0 && (
              <button className="btn btn-p btn-sm" onClick={settleAll}>
                Settle all ({pending.length})
              </button>
            )}
          </div>
        }
      />
      <div className="pb fi">
        {/* ── Page tabs: Salary | Advances ── */}
        <div style={{
          display: "flex", gap: 0, borderBottom: "2px solid var(--ln)", marginBottom: 18,
        }}>
          {[
            { id: "salary" as PageTab, label: "Monthly Salary", count: pending.length },
            { id: "advances" as PageTab, label: "Advance Payments", count: activeAdvances.length },
          ].map(tab => {
            const active = pageTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setPageTab(tab.id)}
                style={{
                  padding: "12px 22px", background: "transparent", border: "none",
                  fontSize: 13.5, fontWeight: active ? 700 : 600,
                  color: active ? "var(--tc-d)" : "var(--ink3)",
                  borderBottom: `3px solid ${active ? "var(--tc)" : "transparent"}`,
                  cursor: "pointer", transition: "all 140ms",
                  transform: "translateY(2px)",
                  display: "flex", alignItems: "center", gap: 8,
                }}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 99,
                    background: tab.id === "salary" ? "var(--sf-l)" : "var(--rb-l)",
                    color: tab.id === "salary" ? "var(--sf)" : "var(--rb)",
                  }}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ═══════════════════════════════════════════════ */}
        {/* ── SALARY TAB ── */}
        {/* ═══════════════════════════════════════════════ */}
        {pageTab === "salary" && (
          <>
            {/* Month selector */}
            <div style={{
              display: "flex", gap: 6, flexWrap: "wrap", padding: "10px 14px",
              background: "#fff", border: "1px solid var(--ln)",
              borderRadius: 12, marginBottom: 18, boxShadow: "0 1px 3px rgba(28,25,23,.05)",
            }}>
              <span style={{
                fontSize: 10.5, fontWeight: 700, color: "var(--ink3)",
                letterSpacing: ".07em", textTransform: "uppercase",
                alignSelf: "center", marginRight: 6,
              }}>Month</span>
              {MONTHS.map(m => {
                const isActive = selectedMonth === m;
                const mp = payments.filter(p => p.month === m && p.type === "salary");
                const pd = mp.filter(p => p.status !== "paid").length;
                return (
                  <button key={m} onClick={() => setSelectedMonth(m)} style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "6px 13px", borderRadius: 8, border: "1.5px solid",
                    borderColor: isActive ? "#2d7a5a" : "var(--ln)",
                    background: isActive ? "#d4ede3" : "transparent",
                    color: isActive ? "#1a5040" : "var(--ink3)",
                    fontSize: 12.5, fontWeight: isActive ? 700 : 500,
                    cursor: "pointer", transition: "all 140ms",
                  }}>
                    {m.split(" ")[0].slice(0, 3)} {m.split(" ")[1]?.slice(2)}
                    {pd > 0 && (
                      <span style={{
                        fontSize: 9.5, fontWeight: 700,
                        background: isActive ? "#c07b1a" : "var(--sf-l)",
                        color: isActive ? "#fff" : "var(--sf)",
                        borderRadius: 99, padding: "1px 5px",
                      }}>{pd}</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* KPI Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10, marginBottom: 18 }}>
              {[
                { label: "Total Payroll", val: `LKR ${(totalPayroll / 1000).toFixed(0)}K`, sub: `${TEACHERS.length} teachers`, color: "#6b3ea8" },
                { label: "Settled", val: settled.length, sub: `LKR ${settledAmount.toLocaleString()}`, color: "#1a5040" },
                { label: "Pending", val: pending.length, sub: pending.length > 0 ? `LKR ${pendingAmount.toLocaleString()}` : "All clear ✓", color: pending.length > 0 ? "#c07b1a" : "#1a5040" },
                { label: "By Bank Transfer", val: byMethod["Bank transfer"]?.count || 0, sub: `LKR ${(byMethod["Bank transfer"]?.total || 0).toLocaleString()}`, color: "#2a5fa8" },
                { label: "Advances Out", val: activeAdvances.length, sub: `LKR ${totalAdvanceOut.toLocaleString()}`, color: activeAdvances.length > 0 ? "#b83030" : "#1a5040" },
              ].map(kpi => (
                <div key={kpi.label} style={{
                  background: "#fff", border: `1.5px solid ${kpi.color}22`,
                  borderTop: `4px solid ${kpi.color}`,
                  borderRadius: 12, padding: "12px 14px",
                  boxShadow: "0 1px 3px rgba(28,25,23,.06)",
                }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4 }}>{kpi.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: kpi.color, fontFamily: "var(--font-mono)", lineHeight: 1 }}>{kpi.val}</div>
                  <div style={{ fontSize: 10.5, color: "var(--ink3)", marginTop: 4 }}>{kpi.sub}</div>
                </div>
              ))}
            </div>

            {/* Progress bar */}
            <div style={{ background: "#fff", border: "1.5px solid var(--ln)", borderRadius: 12, padding: "14px 16px", marginBottom: 18, boxShadow: "0 1px 3px rgba(28,25,23,.05)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 8 }}>
                <span style={{ fontWeight: 700, color: "var(--ink)" }}>Settlement progress — {selectedMonth}</span>
                <span style={{ fontFamily: "var(--font-mono)", color: "var(--ink3)" }}>{settled.length}/{TEACHERS.length} teachers</span>
              </div>
              <div style={{ height: 8, background: "var(--ln)", borderRadius: 99, overflow: "hidden" }}>
                <div style={{
                  height: "100%", width: `${Math.round(settled.length / Math.max(TEACHERS.length, 1) * 100)}%`,
                  background: "linear-gradient(to right,#2d7a5a,#478f6e)",
                  borderRadius: 99, transition: "width 400ms cubic-bezier(.16,1,.3,1)",
                }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: "var(--ink3)", marginTop: 5 }}>
                <span style={{ color: "#1a5040", fontWeight: 600 }}>LKR {settledAmount.toLocaleString()} settled</span>
                <span style={{ color: pendingAmount > 0 ? "#c07b1a" : "#1a5040", fontWeight: 600 }}>
                  {pendingAmount > 0 ? `LKR ${pendingAmount.toLocaleString()} pending` : "All settled ✓"}
                </span>
              </div>
            </div>

            {/* Method breakdown */}
            {Object.keys(byMethod).length > 0 && (
              <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
                {Object.entries(byMethod).map(([method, data]) => (
                  <div key={method} style={{
                    flex: "1 1 140px", background: "#fff", border: "1px solid var(--ln)",
                    borderRadius: 10, padding: "10px 14px", boxShadow: "0 1px 2px rgba(28,25,23,.04)",
                    display: "flex", alignItems: "center", gap: 10,
                  }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8,
                      background: method === "Bank transfer" ? "#d8e6fa" : method === "Cash" ? "#d4ede3" : method === "Cheque" ? "#fef3d7" : "#ede8fc",
                      color: method === "Bank transfer" ? "#2a5fa8" : method === "Cash" ? "#1a5040" : method === "Cheque" ? "#c07b1a" : "#6b3ea8",
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0,
                    }}>
                      {method === "Bank transfer" ? "🏦" : method === "Cash" ? "💵" : method === "Cheque" ? "📝" : "💳"}
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink)" }}>{method}</div>
                      <div style={{ fontSize: 10.5, color: "var(--ink3)" }}>
                        {data.count} payment{data.count !== 1 ? "s" : ""} · LKR {data.total.toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Salary table */}
            <div className="tw">
              <table>
                <thead>
                  <tr>
                    <th>Teacher</th>
                    <th>Subject</th>
                    <th>Salary (LKR)</th>
                    <th>Status</th>
                    <th>Paid Date</th>
                    <th>Method</th>
                    <th>Payslip</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {TEACHERS.map(teacher => {
                    const payment = getPayment(teacher.id);
                    const status = payment?.status ?? "pending";
                    const hasAdvance = !!getActiveAdvance(teacher.id);
                    return (
                      <tr key={teacher.id} style={{
                        background: status === "overdue" ? "#fffbeb" : status === "pending" ? "#fefcf3" : "#fff",
                      }}>
                        <td>
                          <div className="td-nm">
                            <div className="ava" style={{ background: teacher.bg, color: teacher.fg }}>{teacher.initials}</div>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 12.5 }}>{teacher.name}</div>
                              <div style={{ fontSize: 10.5, color: "var(--ink3)", display: "flex", gap: 4, alignItems: "center" }}>
                                Since {teacher.joinDate}
                                {hasAdvance && (
                                  <span style={{ fontSize: 9, fontWeight: 700, background: "#fceaea", color: "#b83030", padding: "0 4px", borderRadius: 4 }}>
                                    ADV
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>{teacher.subject}</td>
                        <td>
                          <div>
                            <div className="mono" style={{ fontWeight: 700 }}>{(payment?.amount ?? teacher.monthlySalary).toLocaleString()}</div>
                            {payment?.advanceDeduction ? (
                              <>
                                <div style={{ fontSize: 9.5, color: "#b83030", fontWeight: 600 }}>−{payment.advanceDeduction.toLocaleString()} adv.</div>
                                <div style={{ fontSize: 9.5, color: "var(--tc-d)", fontWeight: 700 }}>Net: {((payment?.amount ?? teacher.monthlySalary) - payment.advanceDeduction).toLocaleString()}</div>
                              </>
                            ) : null}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
                            {status === "paid" && <span className="bdg b-paid">Settled</span>}
                            {status === "paid" && payment && payment.editHistory.length > 0 && (
                              <span style={{ fontSize: 9, fontWeight: 700, background: "#ede8fc", color: "#6b3ea8", padding: "1px 5px", borderRadius: 4 }}>
                                Edited ({payment.editHistory.length})
                              </span>
                            )}
                          </div>
                          {status === "pending" && <span className="bdg b-due">Pending</span>}
                          {status === "overdue" && (
                            <span style={{ background: "#fceaea", color: "#b83030", fontSize: 10.5, fontWeight: 600, padding: "2px 8px", borderRadius: 99, display: "inline-flex" }}>Overdue</span>
                          )}
                        </td>
                        <td>
                          <span className="mono" style={{ fontSize: 11.5, color: payment?.paidDate ? "var(--ink2)" : "var(--ink3)" }}>
                            {payment?.paidDate || "—"}
                          </span>
                        </td>
                        <td>
                          {payment?.method ? (
                            <span style={{
                              fontSize: 11, padding: "2px 7px", borderRadius: 6, fontWeight: 600,
                              background: payment.method === "Bank transfer" ? "#d8e6fa" : payment.method === "Cash" ? "#d4ede3" : "#fef3d7",
                              color: payment.method === "Bank transfer" ? "#2a5fa8" : payment.method === "Cash" ? "#1a5040" : "#c07b1a",
                            }}>{payment.method}</span>
                          ) : <span style={{ color: "var(--ink3)", fontSize: 11.5 }}>—</span>}
                        </td>
                        <td>
                          {payment?.payslipFile ? (
                            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              <span style={{ fontSize: 12 }}>📎</span>
                              <span style={{ fontSize: 10.5, color: "var(--sp)", fontWeight: 600, cursor: "pointer" }}
                                title={payment.payslipFile}>
                                {payment.payslipFile.length > 16 ? payment.payslipFile.slice(0, 14) + "…" : payment.payslipFile}
                              </span>
                            </div>
                          ) : <span style={{ color: "var(--ink3)", fontSize: 11 }}>—</span>}
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                            {status !== "paid" ? (
                              <button className="btn btn-xs btn-ok" onClick={() => openRecordPay(teacher)}>
                                {hasAdvance ? "Pay (with deduction)" : "Record payment"}
                              </button>
                            ) : (
                              <button className="btn btn-xs btn-p" onClick={() => openPaymentView(teacher)}>View / Edit</button>
                            )}
                            <button className="btn btn-xs btn-g" onClick={() => setHistoryTeacher(teacher)}>History</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ═══════════════════════════════════════════════ */}
        {/* ── ADVANCES TAB ── */}
        {/* ═══════════════════════════════════════════════ */}
        {pageTab === "advances" && (
          <>
            {/* Advance KPIs */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 18 }}>
              {[
                { label: "Active Advances", val: activeAdvances.length, sub: `${advances.filter(a => a.status === "repaid").length} fully repaid`, color: "#b83030" },
                { label: "Total Disbursed", val: `LKR ${advances.reduce((s, a) => s + a.amount, 0).toLocaleString()}`, sub: `${advances.length} total advances`, color: "#6b3ea8" },
                { label: "Outstanding", val: `LKR ${totalAdvanceOut.toLocaleString()}`, sub: activeAdvances.length > 0 ? "To be recovered" : "All clear ✓", color: totalAdvanceOut > 0 ? "#c07b1a" : "#1a5040" },
                { label: "Repaid", val: `LKR ${advances.reduce((s, a) => s + a.repaidAmount, 0).toLocaleString()}`, sub: `${Math.round(advances.reduce((s, a) => s + a.repaidAmount, 0) / Math.max(advances.reduce((s, a) => s + a.amount, 0), 1) * 100)}% recovered`, color: "#1a5040" },
              ].map(kpi => (
                <div key={kpi.label} style={{
                  background: "#fff", border: `1.5px solid ${kpi.color}22`,
                  borderTop: `4px solid ${kpi.color}`,
                  borderRadius: 12, padding: "12px 14px",
                  boxShadow: "0 1px 3px rgba(28,25,23,.06)",
                }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4 }}>{kpi.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: kpi.color, fontFamily: "var(--font-mono)", lineHeight: 1 }}>{kpi.val}</div>
                  <div style={{ fontSize: 10.5, color: "var(--ink3)", marginTop: 4 }}>{kpi.sub}</div>
                </div>
              ))}
            </div>

            {/* Quick action */}
            <div style={{
              display: "flex", alignItems: "center", gap: 12,
              background: "#fff", border: "1px solid var(--ln)", borderRadius: 12,
              padding: "14px 16px", marginBottom: 18, boxShadow: "0 1px 3px rgba(28,25,23,.05)",
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>Issue a new advance</div>
                <div style={{ fontSize: 11.5, color: "var(--ink3)", marginTop: 2 }}>
                  Record an advance salary payment to a teacher. Amount will be tracked for deduction from future monthly salaries.
                </div>
              </div>
              <select
                style={{ width: 200, fontSize: 12 }}
                value=""
                onChange={e => {
                  const t = TEACHERS.find(t => t.id === parseInt(e.target.value));
                  if (t) openAdvanceRequest(t);
                }}
              >
                <option value="">Select teacher…</option>
                {TEACHERS.map(t => (
                  <option key={t.id} value={t.id}>{t.name} — {t.subject}</option>
                ))}
              </select>
            </div>

            {/* Active advances */}
            {activeAdvances.length > 0 && (
              <div style={{ marginBottom: 18 }}>
                <div className="sec-hdr">
                  <span className="sec-title" style={{ color: "var(--rb)" }}>⚠ Active advances requiring repayment</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {activeAdvances.map(adv => {
                    const teacher = TEACHERS.find(t => t.id === adv.teacherId)!;
                    const remaining = adv.amount - adv.repaidAmount;
                    const pct = Math.round(adv.repaidAmount / adv.amount * 100);
                    return (
                      <div key={adv.id} style={{
                        background: "#fff", border: "1px solid var(--ln)", borderRadius: 12,
                        borderLeft: "4px solid #b83030", padding: "14px 16px",
                        boxShadow: "0 1px 3px rgba(28,25,23,.05)",
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                          <div className="ava" style={{ background: teacher.bg, color: teacher.fg }}>{teacher.initials}</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>{teacher.name}</div>
                            <div style={{ fontSize: 11, color: "var(--ink3)" }}>{adv.reason}</div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--rb)" }}>
                              LKR {remaining.toLocaleString()}
                            </div>
                            <div style={{ fontSize: 10, color: "var(--ink3)" }}>remaining of LKR {adv.amount.toLocaleString()}</div>
                          </div>
                        </div>
                        {/* Repayment progress */}
                        <div style={{ marginBottom: 10 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, marginBottom: 4 }}>
                            <span style={{ fontWeight: 600, color: "var(--ink2)" }}>Repayment progress</span>
                            <span style={{ fontFamily: "var(--font-mono)", color: "var(--ink3)" }}>{pct}% · LKR {adv.repaidAmount.toLocaleString()} of {adv.amount.toLocaleString()}</span>
                          </div>
                          <div style={{ height: 6, background: "var(--ln)", borderRadius: 99, overflow: "hidden" }}>
                            <div style={{
                              height: "100%", width: `${pct}%`,
                              background: pct >= 100 ? "#2d7a5a" : "linear-gradient(to right, #b83030, #e05050)",
                              borderRadius: 99, transition: "width 400ms",
                            }} />
                          </div>
                        </div>
                        {/* Details row */}
                        <div style={{ display: "flex", gap: 14, fontSize: 11, color: "var(--ink3)", flexWrap: "wrap", alignItems: "center" }}>
                          <span>📅 Requested: {adv.requestDate}</span>
                          <span>💳 Via: {adv.method}</span>
                          <span>📊 Status: <strong style={{ color: adv.status === "partial" ? "var(--sf)" : "var(--rb)" }}>{adv.status === "partial" ? "Partially repaid" : "Active"}</strong></span>
                          <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                            <button className="btn btn-xs btn-s" onClick={() => setViewAdvance({ advance: adv, teacher })}>
                              View details
                            </button>
                            {remaining > 0 && (
                              <button className="btn btn-xs btn-ok" onClick={() => repayAdvance(adv, Math.min(5000, remaining))}>
                                Repay LKR {Math.min(5000, remaining).toLocaleString()}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* All advances table */}
            <div className="tw">
              <table>
                <thead>
                  <tr>
                    <th>Teacher</th>
                    <th>Amount</th>
                    <th>Reason</th>
                    <th>Request Date</th>
                    <th>Disbursed Via</th>
                    <th>Repaid</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {advances.length === 0 && (
                    <tr><td colSpan={8} style={{ textAlign: "center", color: "var(--ink3)", padding: 30 }}>No advance records yet</td></tr>
                  )}
                  {advances.map(adv => {
                    const teacher = TEACHERS.find(t => t.id === adv.teacherId)!;
                    const remaining = adv.amount - adv.repaidAmount;
                    return (
                      <tr key={adv.id} style={{
                        background: adv.status === "repaid" ? "#fff" : "#fefcf3",
                      }}>
                        <td>
                          <div className="td-nm">
                            <div className="ava" style={{ background: teacher.bg, color: teacher.fg }}>{teacher.initials}</div>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 12.5 }}>{teacher.name}</div>
                              <div style={{ fontSize: 10.5, color: "var(--ink3)" }}>{teacher.subject}</div>
                            </div>
                          </div>
                        </td>
                        <td className="mono" style={{ fontWeight: 700 }}>{adv.amount.toLocaleString()}</td>
                        <td style={{ fontSize: 12, maxWidth: 160 }}>
                          <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{adv.reason}</div>
                        </td>
                        <td className="mono" style={{ fontSize: 11.5 }}>{adv.requestDate}</td>
                        <td>
                          {adv.method ? (
                            <span style={{
                              fontSize: 11, padding: "2px 7px", borderRadius: 6, fontWeight: 600,
                              background: adv.method === "Bank transfer" ? "#d8e6fa" : "#d4ede3",
                              color: adv.method === "Bank transfer" ? "#2a5fa8" : "#1a5040",
                            }}>{adv.method}</span>
                          ) : "—"}
                        </td>
                        <td>
                          <div>
                            <span className="mono" style={{ fontWeight: 600, color: adv.repaidAmount > 0 ? "var(--tc-d)" : "var(--ink3)" }}>
                              {adv.repaidAmount.toLocaleString()}
                            </span>
                            <span style={{ fontSize: 10, color: "var(--ink3)" }}> / {adv.amount.toLocaleString()}</span>
                          </div>
                        </td>
                        <td>
                          {adv.status === "repaid" && <span className="bdg b-paid">Fully repaid</span>}
                          {adv.status === "partial" && <span className="bdg b-due">Partial</span>}
                          {adv.status === "active" && (
                            <span style={{ background: "#fceaea", color: "#b83030", fontSize: 10.5, fontWeight: 600, padding: "2px 8px", borderRadius: 99, display: "inline-flex" }}>Active</span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: 4 }}>
                            <button className="btn btn-xs btn-s" onClick={() => setViewAdvance({ advance: adv, teacher })}>Details</button>
                            {remaining > 0 && (
                              <button className="btn btn-xs btn-ok" onClick={() => repayAdvance(adv, Math.min(5000, remaining))}>Repay</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* ═══════════════════════════════════════════════ */}
      {/* ── RECORD PAYMENT MODAL ── */}
      {/* ═══════════════════════════════════════════════ */}
      <Modal
        open={!!payTarget}
        onClose={() => setPayTarget(null)}
        title="Record salary payment"
        footer={
          <>
            <button className="btn btn-s btn-sm" onClick={() => setPayTarget(null)}>Cancel</button>
            <button className="btn btn-ok btn-sm" onClick={confirmPayment}>Confirm payment</button>
          </>
        }
      >
        {payTarget && (() => {
          const adv = getActiveAdvance(payTarget.teacher.id);
          const deduction = parseInt(payForm.advanceDeduction) || 0;
          const netPay = (parseInt(payForm.amount) || payTarget.teacher.monthlySalary) - deduction;
          return (
            <div className="form-gap">
              {/* Teacher info strip */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--cr)", borderRadius: 10, padding: "12px 14px" }}>
                <div className="ava" style={{ background: payTarget.teacher.bg, color: payTarget.teacher.fg, width: 40, height: 40, fontSize: 14 }}>
                  {payTarget.teacher.initials}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>{payTarget.teacher.name}</div>
                  <div style={{ fontSize: 11, color: "var(--ink3)" }}>{payTarget.teacher.subject}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 11, color: "var(--ink3)" }}>{payTarget.month}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)", fontFamily: "var(--font-mono)" }}>
                    LKR {payTarget.teacher.monthlySalary.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Active advance warning */}
              {adv && (
                <div style={{
                  background: "#fceaea", border: "1px solid #f5c5c5", borderRadius: 10,
                  padding: "10px 13px", fontSize: 11.5, color: "#b83030",
                }}>
                  <div style={{ fontWeight: 700, marginBottom: 2 }}>⚠ Outstanding advance: LKR {(adv.amount - adv.repaidAmount).toLocaleString()}</div>
                  <div>Reason: {adv.reason} · Disbursed on {adv.disbursedDate}</div>
                </div>
              )}

              {/* Amount */}
              <div>
                <label className="flbl freq">Gross salary (LKR)</label>
                <input type="number" value={payForm.amount}
                  onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder="Salary amount" />
                {parseInt(payForm.amount) !== payTarget.teacher.monthlySalary && payForm.amount && (
                  <div className="fhint" style={{ color: "var(--sf)" }}>
                    ⚠ Different from regular salary (LKR {payTarget.teacher.monthlySalary.toLocaleString()})
                  </div>
                )}
              </div>

              {/* Advance deduction — Full / Partial / None */}
              {adv && (() => {
                const advRemaining = adv.amount - adv.repaidAmount;
                return (
                  <div style={{
                    background: "#fff8f0", border: "1.5px solid #eacdac", borderRadius: 12, padding: "14px 16px",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)" }}>Advance deduction</div>
                        <div style={{ fontSize: 10.5, color: "var(--ink3)" }}>
                          Outstanding: LKR {advRemaining.toLocaleString()} · {adv.reason}
                        </div>
                      </div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#b83030", background: "#fceaea", padding: "2px 8px", borderRadius: 6 }}>
                        ADV #{adv.id}
                      </div>
                    </div>

                    {/* Mode toggle buttons */}
                    <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                      {([
                        { mode: "full" as const, label: `Full (LKR ${advRemaining.toLocaleString()})`, desc: "Entire remaining balance" },
                        { mode: "partial" as const, label: "Partial", desc: "Custom amount" },
                        { mode: "none" as const, label: "No deduction", desc: "Skip this month" },
                      ]).map(opt => {
                        const isActive = payForm.deductionMode === opt.mode;
                        return (
                          <button
                            key={opt.mode}
                            onClick={() => {
                              if (opt.mode === "full") {
                                setPayForm(f => ({ ...f, deductionMode: "full", advanceDeduction: String(advRemaining) }));
                              } else if (opt.mode === "partial") {
                                setPayForm(f => ({ ...f, deductionMode: "partial", advanceDeduction: String(Math.min(5000, advRemaining)) }));
                              } else {
                                setPayForm(f => ({ ...f, deductionMode: "none", advanceDeduction: "0" }));
                              }
                            }}
                            style={{
                              flex: 1, padding: "8px 6px", borderRadius: 8,
                              border: `2px solid ${isActive ? (opt.mode === "none" ? "var(--ink3)" : "var(--tc)") : "var(--ln)"}`,
                              background: isActive ? (opt.mode === "none" ? "var(--cr-d)" : "var(--tc-l)") : "#fff",
                              cursor: "pointer", transition: "all 140ms", textAlign: "center",
                            }}
                          >
                            <div style={{ fontSize: 11.5, fontWeight: isActive ? 700 : 600, color: isActive ? (opt.mode === "none" ? "var(--ink)" : "var(--tc-d)") : "var(--ink3)" }}>
                              {opt.label}
                            </div>
                            <div style={{ fontSize: 9.5, color: "var(--ink3)", marginTop: 1 }}>{opt.desc}</div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Custom amount input for partial */}
                    {payForm.deductionMode === "partial" && (
                      <div>
                        <input type="number" value={payForm.advanceDeduction}
                          onChange={e => {
                            const val = Math.min(parseInt(e.target.value) || 0, advRemaining);
                            setPayForm(f => ({ ...f, advanceDeduction: String(val) }));
                          }}
                          placeholder="Enter deduction amount"
                          max={advRemaining}
                          style={{ marginBottom: 4 }}
                        />
                        <div className="fhint">
                          Max: LKR {advRemaining.toLocaleString()} · Remaining after deduction: LKR {(advRemaining - (parseInt(payForm.advanceDeduction) || 0)).toLocaleString()}
                        </div>
                      </div>
                    )}

                    {/* Deduction summary */}
                    <div style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      background: deduction > 0 ? "#fceaea" : "var(--cr-d)",
                      borderRadius: 8, padding: "8px 12px", marginTop: 6,
                    }}>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 600, color: "var(--ink3)", textTransform: "uppercase" }}>Advance deduction</div>
                        <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "var(--font-mono)", color: deduction > 0 ? "#b83030" : "var(--ink3)" }}>
                          {deduction > 0 ? `−LKR ${deduction.toLocaleString()}` : "LKR 0"}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 10, fontWeight: 600, color: "var(--ink3)", textTransform: "uppercase" }}>Net salary payment</div>
                        <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--tc-d)" }}>
                          LKR {netPay.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Method + Date */}
              <div className="field-row">
                <div>
                  <label className="flbl freq">Payment method</label>
                  <select value={payForm.method} onChange={e => setPayForm(f => ({ ...f, method: e.target.value }))}>
                    {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="flbl freq">Date paid</label>
                  <input type="date" value={payForm.date} onChange={e => setPayForm(f => ({ ...f, date: e.target.value }))} />
                </div>
              </div>

              {/* Reference */}
              <div>
                <label className="flbl freq">Reference / transaction #</label>
                <input placeholder="e.g. SAL-104-26 or bank ref" value={payForm.referenceNo}
                  onChange={e => setPayForm(f => ({ ...f, referenceNo: e.target.value }))} />
              </div>

              {/* Payslip upload */}
              <div>
                <label className="flbl">Upload payslip (PDF / image)</label>
                {!payForm.payslipFileName ? (
                  <div
                    onClick={() => payslipRef.current?.click()}
                    style={{
                      border: "2px dashed var(--ln)", borderRadius: 10,
                      padding: "16px 14px", textAlign: "center", cursor: "pointer",
                      transition: "all 140ms", background: "var(--cr)",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--tc)"; e.currentTarget.style.background = "var(--tc-l)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--ln)"; e.currentTarget.style.background = "var(--cr)"; }}
                  >
                    <div style={{ fontSize: 22, marginBottom: 4 }}>📄</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink2)" }}>Click to upload payslip</div>
                    <div style={{ fontSize: 10.5, color: "var(--ink3)", marginTop: 2 }}>PDF, PNG, JPG · Max 5 MB</div>
                  </div>
                ) : (
                  <div style={{
                    display: "flex", alignItems: "center", gap: 10,
                    border: "1.5px solid var(--tc)", borderRadius: 10,
                    padding: "10px 14px", background: "var(--tc-l)",
                  }}>
                    <span style={{ fontSize: 18 }}>📎</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--tc-d)" }}>{payForm.payslipFileName}</div>
                      <div style={{ fontSize: 10, color: "var(--tc-d)" }}>
                        {payForm.payslipFile ? `${(payForm.payslipFile.size / 1024).toFixed(1)} KB` : ""}
                      </div>
                    </div>
                    <button className="btn btn-xs btn-d" onClick={removePayslip} style={{ flexShrink: 0 }}>Remove</button>
                  </div>
                )}
                <input
                  ref={payslipRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  style={{ display: "none" }}
                  onChange={handlePayslipUpload}
                />
              </div>

              {/* Notes */}
              <div>
                <label className="flbl">Notes (optional)</label>
                <textarea rows={2} placeholder="Any notes about this payment..."
                  value={payForm.notes} onChange={e => setPayForm(f => ({ ...f, notes: e.target.value }))}
                  style={{ resize: "vertical" }} />
              </div>

              {/* Confirmation summary */}
              <div style={{ background: "var(--tc-l)", border: "1px solid #b8ddd0", borderRadius: 10, padding: "11px 13px", fontSize: 11.5, color: "var(--tc-d)" }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>Payment summary</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3px 14px", fontSize: 11 }}>
                  <span>Gross salary:</span><span style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>LKR {(parseInt(payForm.amount) || payTarget.teacher.monthlySalary).toLocaleString()}</span>
                  {deduction > 0 && <><span>Advance deduction:</span><span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: "#b83030" }}>−LKR {deduction.toLocaleString()}</span></>}
                  <span style={{ fontWeight: 700 }}>Net payment:</span><span style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}>LKR {netPay.toLocaleString()}</span>
                  <span>Method:</span><span>{payForm.method}</span>
                  <span>Date:</span><span>{payForm.date}</span>
                  <span>Reference:</span><span style={{ fontFamily: "var(--font-mono)" }}>{payForm.referenceNo || "—"}</span>
                  {payForm.payslipFileName && <><span>Payslip:</span><span>📎 {payForm.payslipFileName}</span></>}
                </div>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* ═══════════════════════════════════════════════ */}
      {/* ── VIEW / EDIT PAYMENT MODAL ── */}
      {/* ═══════════════════════════════════════════════ */}
      <Modal
        open={!!viewTarget}
        onClose={() => { setViewTarget(null); setIsEditing(false); }}
        title={isEditing ? "Edit payment" : "Payment details"}
        footer={
          isEditing ? (
            <>
              <button className="btn btn-s btn-sm" onClick={() => setIsEditing(false)}>Cancel edit</button>
              <button className="btn btn-ok btn-sm" onClick={saveEdit}>Save changes</button>
            </>
          ) : (
            <>
              <button className="btn btn-s btn-sm" onClick={() => { setViewTarget(null); setIsEditing(false); }}>Close</button>
              <button className="btn btn-p btn-sm" onClick={startEditing}>✏️ Edit payment</button>
            </>
          )
        }
      >
        {viewTarget && !isEditing && (() => {
          const { teacher, payment } = viewTarget;
          const netPaid = payment.amount - payment.advanceDeduction;
          return (
            <div>
              {/* Teacher strip */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--cr)", borderRadius: 10, padding: "12px 14px", marginBottom: 14 }}>
                <div className="ava" style={{ background: teacher.bg, color: teacher.fg, width: 42, height: 42, fontSize: 14 }}>
                  {teacher.initials}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>{teacher.name}</div>
                  <div style={{ fontSize: 11, color: "var(--ink3)" }}>{teacher.subject} · {payment.month}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--tc-d)" }}>
                    LKR {netPaid.toLocaleString()}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--ink3)" }}>net paid</div>
                </div>
              </div>

              {/* Detail grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                {[
                  { label: "Gross Amount", val: `LKR ${payment.amount.toLocaleString()}` },
                  { label: "Advance Deduction", val: payment.advanceDeduction ? `−LKR ${payment.advanceDeduction.toLocaleString()}` : "None" },
                  { label: "Net Paid", val: `LKR ${netPaid.toLocaleString()}` },
                  { label: "Paid Date", val: payment.paidDate || "—" },
                  { label: "Payment Method", val: payment.method || "—" },
                  { label: "Reference #", val: payment.referenceNo || "—" },
                ].map(row => (
                  <div key={row.label} style={{ padding: "9px 11px", background: "var(--cr-d)", borderRadius: 9 }}>
                    <div style={{ fontSize: 10, color: "var(--ink3)", fontWeight: 600, letterSpacing: ".04em", textTransform: "uppercase", marginBottom: 2 }}>{row.label}</div>
                    <div style={{
                      fontSize: 13, fontWeight: 700,
                      color: row.label === "Advance Deduction" && payment.advanceDeduction ? "#b83030" : row.label === "Net Paid" ? "var(--tc-d)" : "var(--ink)",
                      fontFamily: ["Gross Amount", "Net Paid", "Reference #", "Paid Date", "Advance Deduction"].includes(row.label) ? "var(--font-mono)" : undefined,
                    }}>{row.val}</div>
                  </div>
                ))}
              </div>

              {/* Payslip */}
              {payment.payslipFile && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 10, marginBottom: 10,
                  background: "var(--sp-l)", border: "1px solid #c5d9f5", borderRadius: 10, padding: "10px 14px",
                }}>
                  <span style={{ fontSize: 18 }}>📎</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--sp)" }}>Payslip attached</div>
                    <div style={{ fontSize: 10.5, color: "var(--sp)" }}>{payment.payslipFile}</div>
                  </div>
                  <button className="btn btn-xs btn-s">Download</button>
                </div>
              )}

              {/* Notes */}
              {payment.notes && (
                <div style={{ padding: "9px 11px", background: "var(--cr-d)", borderRadius: 9, marginBottom: 10 }}>
                  <div style={{ fontSize: 10, color: "var(--ink3)", fontWeight: 600, textTransform: "uppercase", marginBottom: 2 }}>Notes</div>
                  <div style={{ fontSize: 12.5, color: "var(--ink)" }}>{payment.notes}</div>
                </div>
              )}

              {/* Edit history */}
              {payment.editHistory.length > 0 && (
                <div style={{ borderTop: "1px solid var(--ln)", paddingTop: 10, marginTop: 6 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink2)", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 13 }}>📝</span> Edit history ({payment.editHistory.length} change{payment.editHistory.length > 1 ? "s" : ""})
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {payment.editHistory.map((edit, i) => (
                      <div key={i} style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "8px 10px", background: "#faf7ff", border: "1px solid #e2d8f5",
                        borderRadius: 8, fontSize: 11,
                      }}>
                        <div style={{
                          width: 6, height: 6, borderRadius: 99, background: "#6b3ea8", flexShrink: 0,
                        }} />
                        <div style={{ flex: 1 }}>
                          <span style={{ fontWeight: 700, color: "#6b3ea8" }}>{edit.field}</span>
                          <span style={{ color: "var(--ink3)" }}> changed from </span>
                          <span style={{ fontWeight: 600, textDecoration: "line-through", color: "var(--ink3)" }}>{edit.oldValue}</span>
                          <span style={{ color: "var(--ink3)" }}> → </span>
                          <span style={{ fontWeight: 700, color: "var(--ink)" }}>{edit.newValue}</span>
                        </div>
                        <span style={{ fontSize: 10, color: "var(--ink3)", fontFamily: "var(--font-mono)", flexShrink: 0 }}>{edit.editDate}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* ── Edit mode ── */}
        {viewTarget && isEditing && (() => {
          const { teacher, payment } = viewTarget;
          const editAmt = parseInt(editForm.amount) || payment.amount;
          const editDed = parseInt(editForm.advanceDeduction) || 0;
          const editNet = editAmt - editDed;
          return (
            <div className="form-gap">
              {/* Teacher info */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--cr)", borderRadius: 10, padding: "12px 14px" }}>
                <div className="ava" style={{ background: teacher.bg, color: teacher.fg, width: 40, height: 40, fontSize: 14 }}>
                  {teacher.initials}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>{teacher.name}</div>
                  <div style={{ fontSize: 11, color: "var(--ink3)" }}>{teacher.subject} · {payment.month}</div>
                </div>
                <div style={{
                  fontSize: 10, fontWeight: 700, background: "#ede8fc", color: "#6b3ea8",
                  padding: "3px 10px", borderRadius: 6,
                }}>✏️ EDITING</div>
              </div>

              {/* Editable fields */}
              <div className="field-row">
                <div>
                  <label className="flbl freq">Gross amount (LKR)</label>
                  <input type="number" value={editForm.amount}
                    onChange={e => setEditForm(f => ({ ...f, amount: e.target.value }))} />
                  {editAmt !== payment.amount && (
                    <div className="fhint" style={{ color: "#6b3ea8" }}>
                      Was: LKR {payment.amount.toLocaleString()} → Now: LKR {editAmt.toLocaleString()}
                    </div>
                  )}
                </div>
                <div>
                  <label className="flbl">Advance deduction (LKR)</label>
                  <input type="number" value={editForm.advanceDeduction}
                    onChange={e => setEditForm(f => ({ ...f, advanceDeduction: e.target.value }))} />
                </div>
              </div>

              {/* Net pay indicator */}
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                background: "var(--tc-l)", borderRadius: 8, padding: "8px 12px",
              }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: "var(--ink2)" }}>Net payment after edit:</span>
                <span style={{ fontSize: 16, fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--tc-d)" }}>LKR {editNet.toLocaleString()}</span>
              </div>

              <div className="field-row">
                <div>
                  <label className="flbl freq">Payment method</label>
                  <select value={editForm.method} onChange={e => setEditForm(f => ({ ...f, method: e.target.value }))}>
                    {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="flbl freq">Paid date</label>
                  <input type="date" value={editForm.date}
                    onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))} />
                </div>
              </div>

              <div>
                <label className="flbl">Reference / transaction #</label>
                <input value={editForm.referenceNo}
                  onChange={e => setEditForm(f => ({ ...f, referenceNo: e.target.value }))}
                  placeholder="e.g. SAL-104-26" />
              </div>

              <div>
                <label className="flbl">Notes</label>
                <textarea rows={2} value={editForm.notes}
                  onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Any notes..." style={{ resize: "vertical" }} />
              </div>

              {/* Edit warning */}
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                background: "#fef8e6", border: "1px solid #e8d5a0", borderRadius: 10,
                padding: "9px 14px", fontSize: 11, color: "#8a6a20",
              }}>
                <span style={{ fontSize: 14 }}>ℹ️</span>
                <div>
                  <div style={{ fontWeight: 700 }}>Changes will be recorded in edit history</div>
                  <div style={{ fontSize: 10 }}>All modifications are tracked for audit purposes. Original values are preserved.</div>
                </div>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* ═══════════════════════════════════════════════ */}
      {/* ── PAYMENT HISTORY MODAL ── */}
      {/* ═══════════════════════════════════════════════ */}
      <Modal
        open={!!historyTeacher}
        onClose={() => setHistoryTeacher(null)}
        title={historyTeacher ? `Payment history — ${historyTeacher.name}` : "Payment history"}
        wide
        footer={<button className="btn btn-s btn-sm" onClick={() => setHistoryTeacher(null)}>Close</button>}
      >
        {historyTeacher && (() => {
          const history = getTeacherHistory(historyTeacher);
          const totalPaid = history.filter(p => p.status === "paid").reduce((s, p) => s + p.amount, 0);
          const totalPending = history.filter(p => p.status !== "paid").reduce((s, p) => s + p.amount, 0);
          const paidMonths = history.filter(p => p.status === "paid").length;
          const teacherAdvs = getTeacherAdvances(historyTeacher.id);

          return (
            <div className="form-gap">
              <div style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--cr)", borderRadius: 10, padding: "12px 14px" }}>
                <div className="ava" style={{ background: historyTeacher.bg, color: historyTeacher.fg, width: 44, height: 44, fontSize: 15 }}>
                  {historyTeacher.initials}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>{historyTeacher.name}</div>
                  <div style={{ fontSize: 11.5, color: "var(--ink3)" }}>{historyTeacher.subject} · LKR {historyTeacher.monthlySalary.toLocaleString()}/month</div>
                </div>
              </div>

              {/* Summary KPIs */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                <div style={{ padding: "10px 12px", background: "var(--tc-l)", borderRadius: 9, borderTop: "3px solid var(--tc)" }}>
                  <div style={{ fontSize: 10, color: "var(--ink3)", fontWeight: 600, textTransform: "uppercase", marginBottom: 2 }}>Total Paid</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--tc-d)", fontFamily: "var(--font-mono)" }}>LKR {totalPaid.toLocaleString()}</div>
                  <div style={{ fontSize: 10, color: "var(--tc-d)" }}>{paidMonths} months</div>
                </div>
                <div style={{ padding: "10px 12px", background: totalPending > 0 ? "var(--sf-l)" : "var(--cr-d)", borderRadius: 9, borderTop: `3px solid ${totalPending > 0 ? "var(--sf)" : "var(--ln)"}` }}>
                  <div style={{ fontSize: 10, color: "var(--ink3)", fontWeight: 600, textTransform: "uppercase", marginBottom: 2 }}>Pending</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: totalPending > 0 ? "var(--sf)" : "var(--ink3)", fontFamily: "var(--font-mono)" }}>LKR {totalPending.toLocaleString()}</div>
                </div>
                <div style={{ padding: "10px 12px", background: "var(--sp-l)", borderRadius: 9, borderTop: "3px solid var(--sp)" }}>
                  <div style={{ fontSize: 10, color: "var(--ink3)", fontWeight: 600, textTransform: "uppercase", marginBottom: 2 }}>Settlement</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--sp)", fontFamily: "var(--font-mono)" }}>{Math.round(paidMonths / Math.max(history.length, 1) * 100)}%</div>
                </div>
              </div>

              {/* Advance info in history */}
              {teacherAdvs.length > 0 && (
                <div style={{ background: "#fceaea", border: "1px solid #f5c5c5", borderRadius: 10, padding: "10px 13px" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#b83030", marginBottom: 4 }}>Advance history ({teacherAdvs.length})</div>
                  {teacherAdvs.map(a => (
                    <div key={a.id} style={{ fontSize: 11, color: "#b83030", display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
                      <span>{a.reason} — LKR {a.amount.toLocaleString()}</span>
                      <span style={{ fontFamily: "var(--font-mono)" }}>Repaid: {a.repaidAmount.toLocaleString()} / {a.amount.toLocaleString()} ({a.status})</span>
                    </div>
                  ))}
                </div>
              )}

              {/* History table */}
              <div style={{ border: "1px solid var(--ln)", borderRadius: 10, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: "var(--cr)", borderBottom: "1px solid var(--ln)" }}>
                      <th style={{ textAlign: "left", padding: "10px 14px", color: "var(--ink3)", fontWeight: 600 }}>Month</th>
                      <th style={{ textAlign: "left", padding: "10px", color: "var(--ink3)", fontWeight: 600 }}>Gross</th>
                      <th style={{ textAlign: "left", padding: "10px", color: "var(--ink3)", fontWeight: 600 }}>Adv. Ded.</th>
                      <th style={{ textAlign: "left", padding: "10px", color: "var(--ink3)", fontWeight: 600 }}>Status</th>
                      <th style={{ textAlign: "left", padding: "10px", color: "var(--ink3)", fontWeight: 600 }}>Method</th>
                      <th style={{ textAlign: "left", padding: "10px", color: "var(--ink3)", fontWeight: 600 }}>Payslip</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((pay, i) => (
                      <tr key={pay.month + pay.type} style={{
                        borderBottom: i < history.length - 1 ? "1px solid var(--ln)" : "none",
                        background: pay.status === "overdue" ? "#fffbeb" : pay.status === "pending" ? "#fefcf3" : "#fff",
                      }}>
                        <td style={{ padding: "10px 14px", fontWeight: 600, color: "var(--ink)" }}>{pay.month}</td>
                        <td style={{ padding: "10px", fontFamily: "var(--font-mono)", fontWeight: 500 }}>LKR {pay.amount.toLocaleString()}</td>
                        <td style={{ padding: "10px", fontFamily: "var(--font-mono)", fontSize: 11, color: pay.advanceDeduction ? "#b83030" : "var(--ink3)" }}>
                          {pay.advanceDeduction ? `−${pay.advanceDeduction.toLocaleString()}` : "—"}
                        </td>
                        <td style={{ padding: "10px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 3, flexWrap: "wrap" }}>
                            {pay.status === "paid" && <span className="bdg b-paid" style={{ fontSize: 9.5 }}>Settled</span>}
                            {pay.status === "pending" && <span className="bdg b-due" style={{ fontSize: 9.5 }}>Pending</span>}
                            {pay.status === "overdue" && <span style={{ background: "#fceaea", color: "#b83030", fontSize: 9.5, fontWeight: 600, padding: "2px 6px", borderRadius: 99 }}>Overdue</span>}
                            {pay.editHistory.length > 0 && (
                              <span style={{ fontSize: 8.5, fontWeight: 700, background: "#ede8fc", color: "#6b3ea8", padding: "1px 4px", borderRadius: 3 }}>
                                Edited ({pay.editHistory.length})
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: "10px" }}>
                          {pay.method ? (
                            <span style={{
                              fontSize: 10.5, padding: "2px 6px", borderRadius: 5, fontWeight: 600,
                              background: pay.method === "Bank transfer" ? "#d8e6fa" : pay.method === "Cash" ? "#d4ede3" : "#fef3d7",
                              color: pay.method === "Bank transfer" ? "#2a5fa8" : pay.method === "Cash" ? "#1a5040" : "#c07b1a",
                            }}>{pay.method}</span>
                          ) : "—"}
                        </td>
                        <td style={{ padding: "10px" }}>
                          {pay.payslipFile ? (
                            <span style={{ fontSize: 10.5, color: "var(--sp)", fontWeight: 600 }}>📎 {pay.payslipFile.length > 12 ? pay.payslipFile.slice(0, 10) + "…" : pay.payslipFile}</span>
                          ) : <span style={{ color: "var(--ink3)", fontSize: 11 }}>—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* ═══════════════════════════════════════════════ */}
      {/* ── REQUEST ADVANCE MODAL ── */}
      {/* ═══════════════════════════════════════════════ */}
      <Modal
        open={advanceModal === "request" && !!advanceTarget}
        onClose={() => { setAdvanceModal(null); setAdvanceTarget(null); }}
        title={`Issue advance — ${advanceTarget?.name || ""}`}
        footer={
          <>
            <button className="btn btn-s btn-sm" onClick={() => { setAdvanceModal(null); setAdvanceTarget(null); }}>Cancel</button>
            <button className="btn btn-ok btn-sm" onClick={confirmAdvance} disabled={!advanceForm.amount}>Issue advance</button>
          </>
        }
      >
        {advanceTarget && (
          <div className="form-gap">
            {/* Teacher strip */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--cr)", borderRadius: 10, padding: "12px 14px" }}>
              <div className="ava" style={{ background: advanceTarget.bg, color: advanceTarget.fg, width: 40, height: 40, fontSize: 14 }}>
                {advanceTarget.initials}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>{advanceTarget.name}</div>
                <div style={{ fontSize: 11, color: "var(--ink3)" }}>{advanceTarget.subject} · LKR {advanceTarget.monthlySalary.toLocaleString()}/month</div>
              </div>
            </div>

            {/* Existing advance warning */}
            {getActiveAdvance(advanceTarget.id) && (
              <div style={{
                background: "#fceaea", border: "1px solid #f5c5c5", borderRadius: 10,
                padding: "10px 13px", fontSize: 11.5, color: "#b83030",
              }}>
                <div style={{ fontWeight: 700 }}>⚠ Teacher already has an active advance</div>
                <div>Outstanding: LKR {(getActiveAdvance(advanceTarget.id)!.amount - getActiveAdvance(advanceTarget.id)!.repaidAmount).toLocaleString()}</div>
              </div>
            )}

            {/* Amount */}
            <div>
              <label className="flbl freq">Advance amount (LKR)</label>
              <input type="number" value={advanceForm.amount}
                onChange={e => setAdvanceForm(f => ({ ...f, amount: e.target.value }))}
                placeholder="e.g. 20000" />
              {advanceForm.amount && parseInt(advanceForm.amount) > advanceTarget.monthlySalary && (
                <div className="fhint" style={{ color: "var(--sf)" }}>
                  ⚠ Exceeds monthly salary (LKR {advanceTarget.monthlySalary.toLocaleString()})
                </div>
              )}
            </div>

            {/* Reason */}
            <div>
              <label className="flbl freq">Reason for advance</label>
              <select value={advanceForm.reason} onChange={e => setAdvanceForm(f => ({ ...f, reason: e.target.value }))}>
                {ADVANCE_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              {advanceForm.reason === "Other" && (
                <input style={{ marginTop: 8 }} placeholder="Specify reason…"
                  value={advanceForm.customReason}
                  onChange={e => setAdvanceForm(f => ({ ...f, customReason: e.target.value }))} />
              )}
            </div>

            {/* Date + Method */}
            <div className="field-row">
              <div>
                <label className="flbl freq">Request date</label>
                <input type="date" value={advanceForm.requestDate}
                  onChange={e => setAdvanceForm(f => ({ ...f, requestDate: e.target.value }))} />
              </div>
              <div>
                <label className="flbl freq">Disbursement method</label>
                <select value={advanceForm.method} onChange={e => setAdvanceForm(f => ({ ...f, method: e.target.value }))}>
                  {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>

            {/* Monthly deduction */}
            <div>
              <label className="flbl">Suggested deduction per month (LKR)</label>
              <input type="number" value={advanceForm.deductionPerMonth}
                onChange={e => setAdvanceForm(f => ({ ...f, deductionPerMonth: e.target.value }))}
                placeholder="e.g. 5000" />
              {advanceForm.amount && advanceForm.deductionPerMonth && (
                <div className="fhint">
                  Estimated repayment: {Math.ceil(parseInt(advanceForm.amount) / parseInt(advanceForm.deductionPerMonth))} months (LKR {advanceForm.deductionPerMonth}/month)
                </div>
              )}
            </div>

            {/* Summary */}
            <div style={{ background: "var(--sf-l)", border: "1px solid #e0c0a8", borderRadius: 10, padding: "11px 13px", fontSize: 11.5, color: "var(--sf)" }}>
              <div style={{ fontWeight: 700, marginBottom: 3 }}>Advance summary</div>
              <div>Amount: LKR {(parseInt(advanceForm.amount) || 0).toLocaleString()}</div>
              <div>Reason: {advanceForm.reason === "Other" ? advanceForm.customReason || "—" : advanceForm.reason}</div>
              <div>Disbursed via: {advanceForm.method} on {advanceForm.requestDate}</div>
              {advanceForm.deductionPerMonth && advanceForm.amount && (
                <div>Recovery: LKR {advanceForm.deductionPerMonth}/month for ~{Math.ceil(parseInt(advanceForm.amount) / parseInt(advanceForm.deductionPerMonth))} months</div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* ═══════════════════════════════════════════════ */}
      {/* ── VIEW ADVANCE DETAIL MODAL ── */}
      {/* ═══════════════════════════════════════════════ */}
      <Modal
        open={!!viewAdvance}
        onClose={() => setViewAdvance(null)}
        title="Advance details"
        footer={
          <>
            <button className="btn btn-s btn-sm" onClick={() => setViewAdvance(null)}>Close</button>
            {viewAdvance && viewAdvance.advance.amount - viewAdvance.advance.repaidAmount > 0 && (
              <button className="btn btn-ok btn-sm" onClick={() => {
                repayAdvance(viewAdvance.advance, Math.min(5000, viewAdvance.advance.amount - viewAdvance.advance.repaidAmount));
                setViewAdvance(null);
              }}>
                Record repayment
              </button>
            )}
          </>
        }
      >
        {viewAdvance && (() => {
          const { advance, teacher } = viewAdvance;
          const remaining = advance.amount - advance.repaidAmount;
          const pct = Math.round(advance.repaidAmount / advance.amount * 100);
          return (
            <div className="form-gap">
              {/* Teacher strip */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--cr)", borderRadius: 10, padding: "12px 14px" }}>
                <div className="ava" style={{ background: teacher.bg, color: teacher.fg, width: 44, height: 44, fontSize: 15 }}>
                  {teacher.initials}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>{teacher.name}</div>
                  <div style={{ fontSize: 11.5, color: "var(--ink3)" }}>{teacher.subject}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "var(--font-mono)", color: remaining > 0 ? "var(--rb)" : "var(--tc-d)" }}>
                    LKR {remaining.toLocaleString()}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--ink3)" }}>outstanding</div>
                </div>
              </div>

              {/* Progress */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
                  <span style={{ fontWeight: 600 }}>Repayment: {pct}%</span>
                  <span className="mono" style={{ fontSize: 10.5 }}>LKR {advance.repaidAmount.toLocaleString()} / {advance.amount.toLocaleString()}</span>
                </div>
                <div style={{ height: 8, background: "var(--ln)", borderRadius: 99, overflow: "hidden" }}>
                  <div style={{
                    height: "100%", width: `${pct}%`,
                    background: pct >= 100 ? "#2d7a5a" : "linear-gradient(to right, #b83030, #e05050)",
                    borderRadius: 99,
                  }} />
                </div>
              </div>

              {/* Detail grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {[
                  { label: "Advance Amount", val: `LKR ${advance.amount.toLocaleString()}` },
                  { label: "Reason", val: advance.reason },
                  { label: "Request Date", val: advance.requestDate },
                  { label: "Disbursed Date", val: advance.disbursedDate || "—" },
                  { label: "Disbursement Method", val: advance.method || "—" },
                  { label: "Repaid So Far", val: `LKR ${advance.repaidAmount.toLocaleString()}` },
                  { label: "Remaining", val: `LKR ${remaining.toLocaleString()}` },
                  { label: "Status", val: advance.status === "repaid" ? "✓ Fully repaid" : advance.status === "partial" ? "⏳ Partially repaid" : "🔴 Active" },
                ].map(row => (
                  <div key={row.label} style={{ padding: "9px 11px", background: "var(--cr-d)", borderRadius: 9 }}>
                    <div style={{ fontSize: 10, color: "var(--ink3)", fontWeight: 600, letterSpacing: ".04em", textTransform: "uppercase", marginBottom: 2 }}>{row.label}</div>
                    <div style={{
                      fontSize: 13, fontWeight: 700,
                      color: row.label === "Status" ? (advance.status === "repaid" ? "var(--tc-d)" : "var(--sf)") : row.label === "Remaining" && remaining > 0 ? "#b83030" : "var(--ink)",
                      fontFamily: ["Advance Amount", "Repaid So Far", "Remaining"].includes(row.label) ? "var(--font-mono)" : undefined,
                    }}>{row.val}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </Modal>
    </PageShell>
  );
}
