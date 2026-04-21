"use client";
import { useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { PageShell } from "@/components/layout/PageShell";
import { Modal } from "@/components/ui/Modal";
import { TEACHERS, INIT_TEACHER_PAYMENTS, BATCHES, Teacher, TeacherPayment } from "@/lib/batchData";

const PAYMENT_METHODS = ["Bank transfer", "Cash", "Cheque", "Online (card)", "UPI / Mobile pay"];

const MONTHS = [
  "April 2026", "March 2026", "February 2026",
  "January 2026", "December 2025", "November 2025",
];

export default function TeacherSalaryPage() {
  const [payments, setPayments] = useState<TeacherPayment[]>(INIT_TEACHER_PAYMENTS);
  const [selectedMonth, setSelectedMonth] = useState("April 2026");

  // Record payment modal
  const [payTarget, setPayTarget] = useState<{ teacher: Teacher; month: string } | null>(null);
  const [payForm, setPayForm] = useState({
    method: "Bank transfer",
    date: new Date().toISOString().slice(0, 10),
    referenceNo: "",
    notes: "",
    amount: "",
  });

  // View receipt / details modal
  const [viewDetail, setViewDetail] = useState<{ teacher: Teacher; payment: TeacherPayment } | null>(null);

  // All payment history modal
  const [historyTeacher, setHistoryTeacher] = useState<Teacher | null>(null);

  // ── Computed values for selected month ──
  const monthPayments = payments.filter(p => p.month === selectedMonth);
  const totalPayroll = TEACHERS.reduce((s, t) => s + t.monthlySalary, 0);
  const settled = monthPayments.filter(p => p.status === "paid");
  const pending = monthPayments.filter(p => p.status !== "paid");
  const settledAmount = settled.reduce((s, p) => s + p.amount, 0);
  const pendingAmount = pending.reduce((s, p) => s + p.amount, 0);

  // Group by method for settled payments
  const byMethod: Record<string, { count: number; total: number }> = {};
  settled.forEach(p => {
    const m = p.method || "Unknown";
    if (!byMethod[m]) byMethod[m] = { count: 0, total: 0 };
    byMethod[m].count++;
    byMethod[m].total += p.amount;
  });

  const getPayment = (teacherId: number) => monthPayments.find(p => p.teacherId === teacherId);

  // ── Open record payment ──
  const openRecordPay = (teacher: Teacher) => {
    setPayForm({
      method: "Bank transfer",
      date: new Date().toISOString().slice(0, 10),
      referenceNo: `SAL-${teacher.id}${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(new Date().getFullYear()).slice(2)}`,
      notes: "",
      amount: String(teacher.monthlySalary),
    });
    setPayTarget({ teacher, month: selectedMonth });
  };

  const confirmPayment = () => {
    if (!payTarget) return;
    const amt = parseInt(payForm.amount) || payTarget.teacher.monthlySalary;
    setPayments(prev => prev.map(p =>
      p.teacherId === payTarget.teacher.id && p.month === payTarget.month
        ? { ...p, status: "paid" as const, amount: amt, paidDate: payForm.date, method: payForm.method, referenceNo: payForm.referenceNo }
        : p
    ));
    setPayTarget(null);
  };

  // ── Settle all pending ──
  const settleAll = () => {
    const today = new Date().toISOString().slice(0, 10);
    setPayments(prev => prev.map(p =>
      p.month === selectedMonth && p.status !== "paid"
        ? { ...p, status: "paid" as const, paidDate: today, method: "Bank transfer", referenceNo: `SAL-${p.teacherId}-BULK` }
        : p
    ));
  };

  // ── View payment detail ──
  const openDetail = (teacher: Teacher) => {
    const payment = getPayment(teacher.id);
    if (payment && payment.status === "paid") {
      setViewDetail({ teacher, payment });
    }
  };

  // ── History for a teacher ──
  const getTeacherHistory = (teacher: Teacher) =>
    payments.filter(p => p.teacherId === teacher.id).sort((a, b) => {
      const dateA = new Date(a.month.split(" ").reverse().join(" "));
      const dateB = new Date(b.month.split(" ").reverse().join(" "));
      return dateB.getTime() - dateA.getTime();
    });

  return (
    <PageShell>
      <Topbar
        title="Teacher salary"
        subtitle="Payroll settlement & history"
        right={
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-s btn-sm">Export payslips</button>
            {pending.length > 0 && (
              <button className="btn btn-p btn-sm" onClick={settleAll}>
                Settle all ({pending.length})
              </button>
            )}
          </div>
        }
      />
      <div className="pb fi">
        {/* Month selector tabs */}
        <div style={{
          display: "flex", gap: 6, flexWrap: "wrap",
          padding: "10px 14px",
          background: "#fff", border: "1px solid var(--ln)",
          borderRadius: 12, marginBottom: 18,
          boxShadow: "0 1px 3px rgba(28,25,23,.05)",
        }}>
          <span style={{
            fontSize: 10.5, fontWeight: 700, color: "var(--ink3)",
            letterSpacing: ".07em", textTransform: "uppercase",
            alignSelf: "center", marginRight: 6, whiteSpace: "nowrap",
          }}>
            Month
          </span>
          {MONTHS.map(m => {
            const isActive = selectedMonth === m;
            const mp = payments.filter(p => p.month === m);
            const pd = mp.filter(p => p.status !== "paid").length;
            return (
              <button
                key={m}
                onClick={() => setSelectedMonth(m)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "6px 13px", borderRadius: 8, border: "1.5px solid",
                  borderColor: isActive ? "#2d7a5a" : "var(--ln)",
                  background: isActive ? "#d4ede3" : "transparent",
                  color: isActive ? "#1a5040" : "var(--ink3)",
                  fontSize: 12.5, fontWeight: isActive ? 700 : 500,
                  cursor: "pointer", transition: "all 140ms",
                }}
              >
                {m.split(" ")[0].slice(0, 3)} {m.split(" ")[1]?.slice(2)}
                {pd > 0 && (
                  <span style={{
                    fontSize: 9.5, fontWeight: 700,
                    background: isActive ? "#c07b1a" : "var(--sf-l)",
                    color: isActive ? "#fff" : "var(--sf)",
                    borderRadius: 99, padding: "1px 5px",
                  }}>
                    {pd}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* KPI Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 18 }}>
          {[
            { label: "Total Payroll", val: `LKR ${(totalPayroll / 1000).toFixed(0)}K`, sub: `${TEACHERS.length} teachers`, color: "#6b3ea8" },
            { label: "Settled", val: settled.length, sub: `LKR ${settledAmount.toLocaleString()}`, color: "#1a5040" },
            { label: "Pending", val: pending.length, sub: pending.length > 0 ? `LKR ${pendingAmount.toLocaleString()}` : "All clear ✓", color: pending.length > 0 ? "#c07b1a" : "#1a5040" },
            { label: "By Bank Transfer", val: byMethod["Bank transfer"]?.count || 0, sub: `LKR ${(byMethod["Bank transfer"]?.total || 0).toLocaleString()}`, color: "#2a5fa8" },
          ].map(kpi => (
            <div key={kpi.label} style={{
              background: "#fff",
              border: `1.5px solid ${kpi.color}22`,
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

        {/* Settlement progress */}
        <div style={{ background: "#fff", border: "1.5px solid var(--ln)", borderRadius: 12, padding: "14px 16px", marginBottom: 18, boxShadow: "0 1px 3px rgba(28,25,23,.05)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 8 }}>
            <span style={{ fontWeight: 700, color: "var(--ink)" }}>Settlement progress — {selectedMonth}</span>
            <span style={{ fontFamily: "var(--font-mono)", color: "var(--ink3)" }}>{settled.length}/{TEACHERS.length} teachers</span>
          </div>
          <div style={{ height: 8, background: "var(--ln)", borderRadius: 99, overflow: "hidden" }}>
            <div style={{
              height: "100%",
              width: `${Math.round(settled.length / Math.max(TEACHERS.length, 1) * 100)}%`,
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

        {/* Payment breakdown by method */}
        {Object.keys(byMethod).length > 0 && (
          <div style={{
            display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap",
          }}>
            {Object.entries(byMethod).map(([method, data]) => (
              <div key={method} style={{
                flex: "1 1 140px", background: "#fff", border: "1px solid var(--ln)",
                borderRadius: 10, padding: "10px 14px",
                boxShadow: "0 1px 2px rgba(28,25,23,.04)",
                display: "flex", alignItems: "center", gap: 10,
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: method === "Bank transfer" ? "#d8e6fa" : method === "Cash" ? "#d4ede3" : method === "Cheque" ? "#fef3d7" : "#ede8fc",
                  color: method === "Bank transfer" ? "#2a5fa8" : method === "Cash" ? "#1a5040" : method === "Cheque" ? "#c07b1a" : "#6b3ea8",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 14, flexShrink: 0,
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
                <th>Reference</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {TEACHERS.map(teacher => {
                const payment = getPayment(teacher.id);
                const status = payment?.status ?? "pending";
                return (
                  <tr key={teacher.id} style={{
                    background: status === "overdue" ? "#fffbeb" : status === "pending" ? "#fefcf3" : "#fff",
                  }}>
                    <td>
                      <div className="td-nm">
                        <div className="ava" style={{ background: teacher.bg, color: teacher.fg }}>{teacher.initials}</div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 12.5 }}>{teacher.name}</div>
                          <div style={{ fontSize: 10.5, color: "var(--ink3)" }}>Since {teacher.joinDate}</div>
                        </div>
                      </div>
                    </td>
                    <td>{teacher.subject}</td>
                    <td className="mono" style={{ fontWeight: 700 }}>
                      {(payment?.amount ?? teacher.monthlySalary).toLocaleString()}
                    </td>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        {status === "paid" && <span className="bdg b-paid">Settled</span>}
                        {status === "pending" && <span className="bdg b-due">Pending</span>}
                        {status === "overdue" && (
                          <span style={{ background: "#fceaea", color: "#b83030", fontSize: 10.5, fontWeight: 600, padding: "2px 8px", borderRadius: 99, display: "inline-flex" }}>Overdue</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: payment?.paidDate ? "var(--ink2)" : "var(--ink3)" }}>
                        {payment?.paidDate || "—"}
                      </span>
                    </td>
                    <td>
                      {payment?.method ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          <span style={{
                            fontSize: 11,
                            padding: "2px 7px", borderRadius: 6,
                            background: payment.method === "Bank transfer" ? "#d8e6fa" : payment.method === "Cash" ? "#d4ede3" : "#fef3d7",
                            color: payment.method === "Bank transfer" ? "#2a5fa8" : payment.method === "Cash" ? "#1a5040" : "#c07b1a",
                            fontWeight: 600,
                          }}>
                            {payment.method}
                          </span>
                        </div>
                      ) : (
                        <span style={{ color: "var(--ink3)", fontSize: 11.5 }}>—</span>
                      )}
                    </td>
                    <td>
                      <span style={{
                        fontFamily: payment?.referenceNo ? "var(--font-mono)" : undefined,
                        fontSize: 11, color: payment?.referenceNo ? "var(--ink2)" : "var(--ink3)",
                      }}>
                        {payment?.referenceNo || "—"}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 4 }}>
                        {status !== "paid" ? (
                          <button className="btn btn-xs btn-ok" onClick={() => openRecordPay(teacher)}>
                            Record payment
                          </button>
                        ) : (
                          <button className="btn btn-xs btn-s" onClick={() => openDetail(teacher)}>
                            View details
                          </button>
                        )}
                        <button className="btn btn-xs btn-g" onClick={() => setHistoryTeacher(teacher)}>
                          History
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Record Payment Modal ── */}
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
        {payTarget && (
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

            {/* Amount */}
            <div>
              <label className="flbl freq">Amount (LKR)</label>
              <input
                type="number"
                value={payForm.amount}
                onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))}
                placeholder="Salary amount"
              />
              {parseInt(payForm.amount) !== payTarget.teacher.monthlySalary && payForm.amount && (
                <div className="fhint" style={{ color: "var(--sf)" }}>
                  ⚠ Different from regular salary (LKR {payTarget.teacher.monthlySalary.toLocaleString()})
                </div>
              )}
            </div>

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

            {/* Reference + Notes */}
            <div>
              <label className="flbl freq">Reference / transaction #</label>
              <input
                placeholder="e.g. SAL-104-26 or bank ref"
                value={payForm.referenceNo}
                onChange={e => setPayForm(f => ({ ...f, referenceNo: e.target.value }))}
              />
            </div>
            <div>
              <label className="flbl">Notes (optional)</label>
              <textarea
                rows={2}
                placeholder="Any notes about this payment..."
                value={payForm.notes}
                onChange={e => setPayForm(f => ({ ...f, notes: e.target.value }))}
                style={{ resize: "vertical" }}
              />
            </div>

            {/* Confirmation strip */}
            <div style={{ background: "var(--tc-l)", border: "1px solid #b8ddd0", borderRadius: 10, padding: "10px 13px", fontSize: 11.5, color: "var(--tc-d)" }}>
              <div style={{ fontWeight: 700, marginBottom: 2 }}>Payment summary</div>
              <div>LKR {(parseInt(payForm.amount) || payTarget.teacher.monthlySalary).toLocaleString()} via {payForm.method} on {payForm.date}</div>
              <div>Reference: {payForm.referenceNo || "—"}</div>
            </div>
          </div>
        )}
      </Modal>

      {/* ── View Payment Detail Modal ── */}
      <Modal
        open={!!viewDetail}
        onClose={() => setViewDetail(null)}
        title="Payment details"
        footer={
          <>
            <button className="btn btn-s btn-sm" onClick={() => setViewDetail(null)}>Close</button>
            <button className="btn btn-p btn-sm">Download payslip</button>
          </>
        }
      >
        {viewDetail && (
          <div>
            {/* Receipt-style header */}
            <div style={{
              border: "2px dashed var(--tc)", borderRadius: 14, padding: "20px 22px",
              background: "var(--tc-l)", textAlign: "center", marginBottom: 16,
            }}>
              <div style={{ fontSize: 11, color: "var(--tc-d)", letterSpacing: ".08em", textTransform: "uppercase", fontWeight: 700, marginBottom: 4 }}>SALARY PAYMENT</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "var(--ink)", fontFamily: "var(--font-mono)" }}>
                {viewDetail.payment.referenceNo || "—"}
              </div>
            </div>
            {/* Detail grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                { label: "Teacher", val: viewDetail.teacher.name },
                { label: "Subject", val: viewDetail.teacher.subject },
                { label: "Month", val: viewDetail.payment.month },
                { label: "Amount (LKR)", val: viewDetail.payment.amount.toLocaleString() },
                { label: "Paid Date", val: viewDetail.payment.paidDate || "—" },
                { label: "Payment Method", val: viewDetail.payment.method || "—" },
                { label: "Reference #", val: viewDetail.payment.referenceNo || "—" },
                { label: "Status", val: "✓ Settled" },
              ].map(row => (
                <div key={row.label} style={{ padding: "9px 11px", background: "var(--cr-d)", borderRadius: 9 }}>
                  <div style={{ fontSize: 10, color: "var(--ink3)", fontWeight: 600, letterSpacing: ".04em", textTransform: "uppercase", marginBottom: 2 }}>{row.label}</div>
                  <div style={{
                    fontSize: 13, fontWeight: 700,
                    color: row.label === "Status" ? "var(--tc-d)" : "var(--ink)",
                    fontFamily: ["Amount (LKR)", "Reference #", "Paid Date"].includes(row.label) ? "var(--font-mono)" : undefined,
                  }}>
                    {row.val}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>

      {/* ── Teacher Payment History Modal ── */}
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

          return (
            <div className="form-gap">
              {/* Teacher strip */}
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
                  <div style={{ fontSize: 10, color: "var(--ink3)", fontWeight: 600, letterSpacing: ".04em", textTransform: "uppercase", marginBottom: 2 }}>Total Paid</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--tc-d)", fontFamily: "var(--font-mono)" }}>LKR {totalPaid.toLocaleString()}</div>
                  <div style={{ fontSize: 10, color: "var(--tc-d)" }}>{paidMonths} months</div>
                </div>
                <div style={{ padding: "10px 12px", background: totalPending > 0 ? "var(--sf-l)" : "var(--cr-d)", borderRadius: 9, borderTop: `3px solid ${totalPending > 0 ? "var(--sf)" : "var(--ln)"}` }}>
                  <div style={{ fontSize: 10, color: "var(--ink3)", fontWeight: 600, letterSpacing: ".04em", textTransform: "uppercase", marginBottom: 2 }}>Pending</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: totalPending > 0 ? "var(--sf)" : "var(--ink3)", fontFamily: "var(--font-mono)" }}>LKR {totalPending.toLocaleString()}</div>
                </div>
                <div style={{ padding: "10px 12px", background: "var(--sp-l)", borderRadius: 9, borderTop: "3px solid var(--sp)" }}>
                  <div style={{ fontSize: 10, color: "var(--ink3)", fontWeight: 600, letterSpacing: ".04em", textTransform: "uppercase", marginBottom: 2 }}>Settlement Rate</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--sp)", fontFamily: "var(--font-mono)" }}>{Math.round(paidMonths / Math.max(history.length, 1) * 100)}%</div>
                </div>
              </div>

              {/* History table */}
              <div style={{ border: "1px solid var(--ln)", borderRadius: 10, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: "var(--cr)", borderBottom: "1px solid var(--ln)" }}>
                      <th style={{ textAlign: "left", padding: "10px 14px", color: "var(--ink3)", fontWeight: 600 }}>Month</th>
                      <th style={{ textAlign: "left", padding: "10px", color: "var(--ink3)", fontWeight: 600 }}>Amount</th>
                      <th style={{ textAlign: "left", padding: "10px", color: "var(--ink3)", fontWeight: 600 }}>Status</th>
                      <th style={{ textAlign: "left", padding: "10px", color: "var(--ink3)", fontWeight: 600 }}>Paid Date</th>
                      <th style={{ textAlign: "left", padding: "10px", color: "var(--ink3)", fontWeight: 600 }}>Method</th>
                      <th style={{ textAlign: "left", padding: "10px 14px", color: "var(--ink3)", fontWeight: 600 }}>Reference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((pay, i) => (
                      <tr key={pay.month} style={{
                        borderBottom: i < history.length - 1 ? "1px solid var(--ln)" : "none",
                        background: pay.status === "overdue" ? "#fffbeb" : pay.status === "pending" ? "#fefcf3" : "#fff",
                      }}>
                        <td style={{ padding: "10px 14px", fontWeight: 600, color: "var(--ink)" }}>{pay.month}</td>
                        <td style={{ padding: "10px", fontFamily: "var(--font-mono)", fontWeight: 500 }}>LKR {pay.amount.toLocaleString()}</td>
                        <td style={{ padding: "10px" }}>
                          {pay.status === "paid" && <span className="bdg b-paid" style={{ fontSize: 9.5 }}>Settled</span>}
                          {pay.status === "pending" && <span className="bdg b-due" style={{ fontSize: 9.5 }}>Pending</span>}
                          {pay.status === "overdue" && <span style={{ background: "#fceaea", color: "#b83030", fontSize: 9.5, fontWeight: 600, padding: "2px 6px", borderRadius: 99 }}>Overdue</span>}
                        </td>
                        <td style={{ padding: "10px", color: "var(--ink2)", fontFamily: "var(--font-mono)", fontSize: 11 }}>{pay.paidDate || "—"}</td>
                        <td style={{ padding: "10px" }}>
                          {pay.method ? (
                            <span style={{
                              fontSize: 10.5, padding: "2px 6px", borderRadius: 5, fontWeight: 600,
                              background: pay.method === "Bank transfer" ? "#d8e6fa" : pay.method === "Cash" ? "#d4ede3" : "#fef3d7",
                              color: pay.method === "Bank transfer" ? "#2a5fa8" : pay.method === "Cash" ? "#1a5040" : "#c07b1a",
                            }}>
                              {pay.method}
                            </span>
                          ) : "—"}
                        </td>
                        <td style={{ padding: "10px 14px", fontFamily: pay.referenceNo ? "var(--font-mono)" : undefined, fontSize: 11, color: "var(--ink2)" }}>
                          {pay.referenceNo || "—"}
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
    </PageShell>
  );
}
