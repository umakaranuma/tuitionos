"use client";
import { useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Topbar } from "@/components/layout/Topbar";
import { PageShell } from "@/components/layout/PageShell";
import { Modal } from "@/components/ui/Modal";
import {
  TEACHERS, BATCHES, ALL_STUDENTS, INIT_TEACHER_PAYMENTS, INIT_TEACHER_ADVANCES,
  Teacher, TeacherPayment, TeacherAdvance, PaymentEdit,
} from "@/lib/batchData";

const PAYMENT_METHODS = ["Bank transfer", "Cash", "Cheque", "Online (card)", "UPI / Mobile pay"];
const ADVANCE_REASONS = ["Medical emergency", "Family function", "Education expenses", "Housing / rent", "Personal need", "Other"];

export default function TeacherSingleView() {
  const router = useRouter();
  const { id } = useParams();
  const teacherId = parseInt(id as string);
  const teacher = TEACHERS.find(t => t.id === teacherId);

  const [tab, setTab] = useState<"overview" | "batches" | "salary">("overview");
  const [payments, setPayments] = useState<TeacherPayment[]>(INIT_TEACHER_PAYMENTS);
  const [advances, setAdvances] = useState<TeacherAdvance[]>(INIT_TEACHER_ADVANCES);
  const [nextAdvId, setNextAdvId] = useState(INIT_TEACHER_ADVANCES.length + 1);

  // Record payment modal
  const [payModal, setPayModal] = useState<string | null>(null); // month string
  const [payForm, setPayForm] = useState({
    method: "Bank transfer", date: new Date().toISOString().slice(0, 10),
    referenceNo: "", notes: "", amount: "",
    payslipFile: null as File | null, payslipFileName: "",
    advanceDeduction: "0", deductionMode: "none" as "full" | "partial" | "none",
  });
  const payslipRef = useRef<HTMLInputElement>(null);

  // Edit payment modal
  const [editTarget, setEditTarget] = useState<TeacherPayment | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    amount: "", method: "", date: "", referenceNo: "", notes: "", advanceDeduction: "",
  });

  // Advance modals
  const [advanceModal, setAdvanceModal] = useState(false);
  const [advanceForm, setAdvanceForm] = useState({
    amount: "", reason: "Medical emergency", customReason: "",
    requestDate: new Date().toISOString().slice(0, 10),
    method: "Bank transfer", deductionPerMonth: "5000",
  });

  if (!teacher) {
    return (
      <PageShell>
        <Topbar />
        <div style={{ padding: 60, textAlign: "center", color: "var(--ink3)" }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>😕</div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>Teacher not found</div>
          <button className="btn btn-p btn-sm" style={{ marginTop: 16 }} onClick={() => router.push("/teachers")}>
            ← Back to teachers
          </button>
        </div>
      </PageShell>
    );
  }

  // ── Computed ──
  const teacherPayments = payments
    .filter(p => p.teacherId === teacher.id && p.type === "salary")
    .sort((a, b) => {
      const ma = new Date(a.month.split(" ").reverse().join(" "));
      const mb = new Date(b.month.split(" ").reverse().join(" "));
      return mb.getTime() - ma.getTime();
    });
  const teacherAdvances = advances.filter(a => a.teacherId === teacher.id);
  const activeAdvance = advances.find(a => a.teacherId === teacher.id && (a.status === "active" || a.status === "partial"));
  const assignedBatches = BATCHES.filter(b => teacher.batchIds.includes(b.id));
  const totalStudents = teacher.batchIds.reduce((acc, bid) => acc + ALL_STUDENTS.filter(s => s.batch === bid).length, 0);
  const pendingPayments = teacherPayments.filter(p => p.status !== "paid");

  // ── Record payment ──
  const openRecordPay = (month: string) => {
    const advRemaining = activeAdvance ? activeAdvance.amount - activeAdvance.repaidAmount : 0;
    setPayForm({
      method: "Bank transfer",
      date: new Date().toISOString().slice(0, 10),
      referenceNo: `SAL-${teacher.id}${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(new Date().getFullYear()).slice(2)}`,
      notes: "", amount: String(teacher.monthlySalary),
      payslipFile: null, payslipFileName: "",
      advanceDeduction: activeAdvance ? String(advRemaining) : "0",
      deductionMode: activeAdvance ? "full" : "none",
    });
    setPayModal(month);
  };

  const confirmPayment = () => {
    if (!payModal) return;
    const amt = parseInt(payForm.amount) || teacher.monthlySalary;
    const deduction = parseInt(payForm.advanceDeduction) || 0;

    setPayments(prev => prev.map(p =>
      p.teacherId === teacher.id && p.month === payModal && p.type === "salary"
        ? {
          ...p, status: "paid" as const, amount: amt, paidDate: payForm.date,
          method: payForm.method, referenceNo: payForm.referenceNo,
          payslipFile: payForm.payslipFileName || null,
          notes: payForm.notes || null,
          advanceDeduction: deduction, editHistory: [],
        }
        : p
    ));

    if (deduction > 0) {
      setAdvances(prev => prev.map(a => {
        if (a.teacherId === teacher.id && (a.status === "active" || a.status === "partial")) {
          const newRepaid = a.repaidAmount + deduction;
          return { ...a, repaidAmount: newRepaid, status: newRepaid >= a.amount ? "repaid" as const : "partial" as const };
        }
        return a;
      }));
    }
    setPayModal(null);
  };

  // ── Edit payment ──
  const openEdit = (pay: TeacherPayment) => {
    setEditTarget(pay);
    setEditForm({
      amount: String(pay.amount), method: pay.method || "Bank transfer",
      date: pay.paidDate || new Date().toISOString().slice(0, 10),
      referenceNo: pay.referenceNo || "", notes: pay.notes || "",
      advanceDeduction: String(pay.advanceDeduction),
    });
    setIsEditing(true);
  };

  const saveEdit = () => {
    if (!editTarget) return;
    const today = new Date().toISOString().slice(0, 10);
    const newAmt = parseInt(editForm.amount) || editTarget.amount;
    const newDed = parseInt(editForm.advanceDeduction) || 0;

    const edits: PaymentEdit[] = [];
    if (newAmt !== editTarget.amount) edits.push({ editDate: today, field: "Amount", oldValue: `LKR ${editTarget.amount.toLocaleString()}`, newValue: `LKR ${newAmt.toLocaleString()}` });
    if (editForm.method !== editTarget.method) edits.push({ editDate: today, field: "Method", oldValue: editTarget.method || "—", newValue: editForm.method });
    if (editForm.date !== editTarget.paidDate) edits.push({ editDate: today, field: "Paid Date", oldValue: editTarget.paidDate || "—", newValue: editForm.date });
    if (editForm.referenceNo !== (editTarget.referenceNo || "")) edits.push({ editDate: today, field: "Reference", oldValue: editTarget.referenceNo || "—", newValue: editForm.referenceNo || "—" });
    if (newDed !== editTarget.advanceDeduction) edits.push({ editDate: today, field: "Adv. Deduction", oldValue: `LKR ${editTarget.advanceDeduction.toLocaleString()}`, newValue: `LKR ${newDed.toLocaleString()}` });
    if (editForm.notes !== (editTarget.notes || "")) edits.push({ editDate: today, field: "Notes", oldValue: editTarget.notes || "—", newValue: editForm.notes || "—" });

    if (edits.length === 0) { setEditTarget(null); setIsEditing(false); return; }

    setPayments(prev => prev.map(p => {
      if (p.teacherId === teacher.id && p.month === editTarget.month && p.type === "salary") {
        return { ...p, amount: newAmt, method: editForm.method, paidDate: editForm.date, referenceNo: editForm.referenceNo || null, notes: editForm.notes || null, advanceDeduction: newDed, editHistory: [...p.editHistory, ...edits] };
      }
      return p;
    }));
    setEditTarget(null); setIsEditing(false);
  };

  // ── Issue advance ──
  const confirmAdvance = () => {
    const amt = parseInt(advanceForm.amount);
    if (!amt) return;
    setAdvances(prev => [...prev, {
      id: nextAdvId, teacherId: teacher.id, amount: amt,
      requestDate: advanceForm.requestDate,
      reason: advanceForm.reason === "Other" ? advanceForm.customReason || "Other" : advanceForm.reason,
      status: "active" as const, disbursedDate: advanceForm.requestDate,
      method: advanceForm.method, repaidAmount: 0,
    }]);
    setNextAdvId(n => n + 1);
    setAdvanceModal(false);
  };

  const repayAdvance = (adv: TeacherAdvance, amount: number) => {
    setAdvances(prev => prev.map(a => {
      if (a.id === adv.id) {
        const newRepaid = a.repaidAmount + amount;
        return { ...a, repaidAmount: newRepaid, status: newRepaid >= a.amount ? "repaid" as const : "partial" as const };
      }
      return a;
    }));
  };

  const TAB_OPTS = [
    { id: "overview" as const, label: "Overview", icon: "👤" },
    { id: "batches" as const, label: "Batches", icon: "📚", count: assignedBatches.length },
    { id: "salary" as const, label: "Salary & Advances", icon: "💰", count: pendingPayments.length > 0 ? pendingPayments.length : undefined },
  ];

  return (
    <PageShell>
      <Topbar title={teacher.name} subtitle={`${teacher.subject} teacher`}
        cta={<button className="btn btn-s btn-sm" onClick={() => router.push("/teachers")}>← All teachers</button>}
      />

      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        {/* ── Teacher Header ── */}
        <div style={{
          display: "flex", alignItems: "center", gap: 16,
          background: "#fff", border: "1.5px solid var(--ln)", borderRadius: 14,
          padding: "18px 22px", marginBottom: 18,
          boxShadow: "0 1px 4px rgba(28,25,23,.06)",
        }}>
          <div className="ava" style={{ background: teacher.bg, color: teacher.fg, width: 60, height: 60, fontSize: 22 }}>
            {teacher.initials}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: "var(--ink)", marginBottom: 2 }}>{teacher.name}</div>
            <div style={{ fontSize: 12.5, color: "var(--ink3)" }}>
              {teacher.subject} · Since {teacher.joinDate} · 📞 {teacher.mobile}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
            <span style={{ fontSize: 11, fontWeight: 700, background: "var(--sp-l)", color: "var(--sp)", padding: "3px 10px", borderRadius: 99 }}>
              {assignedBatches.length} Batch{assignedBatches.length !== 1 ? "es" : ""} · {totalStudents} Students
            </span>
            <span style={{ fontSize: 15, fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--ink)" }}>
              LKR {teacher.monthlySalary.toLocaleString()}/mo
            </span>
          </div>
        </div>

        {/* ── Tab Navigation ── */}
        <div style={{ display: "flex", gap: 0, borderBottom: "2px solid var(--ln)", marginBottom: 20 }}>
          {TAB_OPTS.map(t => {
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                padding: "12px 20px", background: "transparent", border: "none",
                fontSize: 13, fontWeight: active ? 700 : 600,
                color: active ? "var(--tc-d)" : "var(--ink3)",
                borderBottom: `3px solid ${active ? "var(--tc)" : "transparent"}`,
                cursor: "pointer", transition: "all 140ms",
                transform: "translateY(2px)", display: "flex", alignItems: "center", gap: 6,
              }}>
                <span style={{ fontSize: 14 }}>{t.icon}</span>
                {t.label}
                {t.count !== undefined && (
                  <span style={{
                    fontSize: 9.5, fontWeight: 700, padding: "1px 6px", borderRadius: 99,
                    background: active ? "var(--tc-l)" : "var(--cr-d)",
                    color: active ? "var(--tc-d)" : "var(--ink3)",
                  }}>{t.count}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* ═══════════════════════════════════════════════ */}
        {/* ── OVERVIEW TAB ── */}
        {/* ═══════════════════════════════════════════════ */}
        {tab === "overview" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[
              { label: "Full Name", val: teacher.name },
              { label: "Subject", val: teacher.subject },
              { label: "Mobile", val: teacher.mobile, mono: true },
              { label: "Email", val: teacher.email || "—" },
              { label: "Monthly Salary", val: `LKR ${teacher.monthlySalary.toLocaleString()}`, mono: true },
              { label: "Joined Date", val: teacher.joinDate },
              { label: "Assigned Batches", val: `${assignedBatches.length} batches` },
              { label: "Total Students", val: `${totalStudents} students` },
            ].map(row => (
              <div key={row.label} style={{
                padding: "14px 16px", background: "#fff", border: "1px solid var(--ln)",
                borderRadius: 10, boxShadow: "0 1px 2px rgba(28,25,23,.04)",
              }}>
                <div style={{ fontSize: 10.5, color: "var(--ink3)", fontWeight: 600, letterSpacing: ".04em", textTransform: "uppercase", marginBottom: 4 }}>{row.label}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)", fontFamily: row.mono ? "var(--font-mono)" : undefined }}>{row.val}</div>
              </div>
            ))}
          </div>
        )}

        {/* ═══════════════════════════════════════════════ */}
        {/* ── BATCHES TAB ── */}
        {/* ═══════════════════════════════════════════════ */}
        {tab === "batches" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {assignedBatches.length === 0 && (
              <div style={{ textAlign: "center", color: "var(--ink3)", fontSize: 13, padding: 40 }}>No batches assigned</div>
            )}
            {assignedBatches.map(batch => {
              const studentCount = ALL_STUDENTS.filter(s => s.batch === batch.id).length;
              return (
                <div key={batch.id} style={{
                  display: "flex", alignItems: "center", gap: 14,
                  padding: "14px 16px", background: "#fff",
                  border: "1px solid var(--ln)", borderRadius: 12,
                  borderLeft: `4px solid ${batch.color}`,
                  boxShadow: "0 1px 3px rgba(28,25,23,.05)",
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: batch.colorL, color: batch.color,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, fontWeight: 700, flexShrink: 0,
                  }}>
                    {batch.label.replace("Grade ", "G")}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>{batch.name}</div>
                    <div style={{ fontSize: 11, color: "var(--ink3)", marginTop: 1 }}>
                      {studentCount} student{studentCount !== 1 ? "s" : ""} · {batch.subjects.length} subjects
                    </div>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, maxWidth: 200, justifyContent: "flex-end" }}>
                    {batch.subjects.map(subj => (
                      <span key={subj} style={{
                        fontSize: 10, fontWeight: 600, padding: "2px 7px",
                        background: subj === teacher.subject ? batch.colorL : "var(--cr-d)",
                        color: subj === teacher.subject ? batch.color : "var(--ink3)",
                        borderRadius: 6,
                      }}>{subj}</span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ═══════════════════════════════════════════════ */}
        {/* ── SALARY & ADVANCES TAB ── */}
        {/* ═══════════════════════════════════════════════ */}
        {tab === "salary" && (
          <div>
            {/* Quick KPIs — compact */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 18 }}>
              <div style={{ padding: "12px 14px", background: "#fff", border: "1px solid var(--ln)", borderRadius: 10, borderTop: "3px solid var(--sp)" }}>
                <div style={{ fontSize: 10, color: "var(--ink3)", fontWeight: 600, textTransform: "uppercase", marginBottom: 3 }}>Monthly Salary</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: "var(--ink)", fontFamily: "var(--font-mono)" }}>
                  LKR {teacher.monthlySalary.toLocaleString()}
                </div>
              </div>
              <div style={{ padding: "12px 14px", background: "#fff", border: "1px solid var(--ln)", borderRadius: 10, borderTop: `3px solid ${pendingPayments.length > 0 ? "var(--sf)" : "var(--tc)"}` }}>
                <div style={{ fontSize: 10, color: "var(--ink3)", fontWeight: 600, textTransform: "uppercase", marginBottom: 3 }}>Pending</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: pendingPayments.length > 0 ? "var(--sf)" : "var(--tc-d)", fontFamily: "var(--font-mono)" }}>
                  {pendingPayments.length > 0 ? `${pendingPayments.length} month(s)` : "All clear ✓"}
                </div>
              </div>
              <div style={{ padding: "12px 14px", background: "#fff", border: "1px solid var(--ln)", borderRadius: 10, borderTop: `3px solid ${activeAdvance ? "#b83030" : "var(--ln)"}` }}>
                <div style={{ fontSize: 10, color: "var(--ink3)", fontWeight: 600, textTransform: "uppercase", marginBottom: 3 }}>Active Advance</div>
                {activeAdvance ? (
                  <div style={{ fontSize: 17, fontWeight: 700, color: "#b83030", fontFamily: "var(--font-mono)" }}>
                    LKR {(activeAdvance.amount - activeAdvance.repaidAmount).toLocaleString()}
                  </div>
                ) : (
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink3)" }}>None</div>
                )}
              </div>
            </div>

            {/* ── Payments Table ── */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>Payment Records</div>
              </div>
              <div className="tw">
                <table>
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th>Gross (LKR)</th>
                      <th>Adv. Ded.</th>
                      <th>Net Paid</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th>Method</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teacherPayments.map(pay => {
                      const net = pay.amount - pay.advanceDeduction;
                      return (
                        <tr key={pay.month} style={{
                          background: pay.status === "overdue" ? "#fffbeb" : pay.status === "pending" ? "#fefcf3" : "#fff",
                        }}>
                          <td style={{ fontWeight: 600 }}>{pay.month}</td>
                          <td className="mono" style={{ fontWeight: 600 }}>{pay.amount.toLocaleString()}</td>
                          <td className="mono" style={{ fontSize: 11, color: pay.advanceDeduction ? "#b83030" : "var(--ink3)" }}>
                            {pay.advanceDeduction ? `−${pay.advanceDeduction.toLocaleString()}` : "—"}
                          </td>
                          <td className="mono" style={{ fontWeight: 700, color: pay.status === "paid" ? "var(--tc-d)" : "var(--ink3)" }}>
                            {pay.status === "paid" ? net.toLocaleString() : "—"}
                          </td>
                          <td>
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
                          <td className="mono" style={{ fontSize: 11, color: "var(--ink2)" }}>{pay.paidDate || "—"}</td>
                          <td>
                            {pay.method ? (
                              <span style={{
                                fontSize: 10, padding: "2px 6px", borderRadius: 5, fontWeight: 600,
                                background: pay.method === "Bank transfer" ? "#d8e6fa" : pay.method === "Cash" ? "#d4ede3" : "#fef3d7",
                                color: pay.method === "Bank transfer" ? "#2a5fa8" : pay.method === "Cash" ? "#1a5040" : "#c07b1a",
                              }}>{pay.method}</span>
                            ) : <span style={{ color: "var(--ink3)", fontSize: 11 }}>—</span>}
                          </td>
                          <td>
                            <div style={{ display: "flex", gap: 4 }}>
                              {pay.status !== "paid" ? (
                                <button className="btn btn-xs btn-ok" onClick={() => openRecordPay(pay.month)}>
                                  Settle
                                </button>
                              ) : (
                                <button className="btn btn-xs btn-p" onClick={() => openEdit(pay)}>Edit</button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Advances Section ── */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>Advances</div>
                <button className="btn btn-xs btn-ok" onClick={() => {
                  setAdvanceForm({ amount: "", reason: "Medical emergency", customReason: "", requestDate: new Date().toISOString().slice(0, 10), method: "Bank transfer", deductionPerMonth: "5000" });
                  setAdvanceModal(true);
                }}>+ Issue advance</button>
              </div>

              {teacherAdvances.length === 0 ? (
                <div style={{
                  textAlign: "center", color: "var(--ink3)", fontSize: 12, padding: 30,
                  background: "#fff", border: "1px solid var(--ln)", borderRadius: 10,
                }}>No advance records for this teacher</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {teacherAdvances.map(adv => {
                    const remaining = adv.amount - adv.repaidAmount;
                    const pct = Math.round(adv.repaidAmount / adv.amount * 100);
                    return (
                      <div key={adv.id} style={{
                        background: "#fff", border: "1px solid var(--ln)", borderRadius: 12,
                        borderLeft: `4px solid ${adv.status === "repaid" ? "#2d7a5a" : "#b83030"}`,
                        padding: "14px 16px",
                        boxShadow: "0 1px 3px rgba(28,25,23,.05)",
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                          <div>
                            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>{adv.reason}</span>
                            <span style={{ fontSize: 11, color: "var(--ink3)", marginLeft: 8 }}>#{adv.id} · {adv.requestDate}</span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: 15, fontWeight: 700, fontFamily: "var(--font-mono)", color: adv.status === "repaid" ? "#2d7a5a" : "#b83030" }}>
                              LKR {adv.amount.toLocaleString()}
                            </span>
                            <span className={`bdg ${adv.status === "repaid" ? "b-paid" : "b-due"}`} style={{ fontSize: 9 }}>
                              {adv.status === "repaid" ? "Fully repaid" : adv.status === "partial" ? "Partial" : "Active"}
                            </span>
                          </div>
                        </div>
                        {/* Progress */}
                        <div style={{ marginBottom: 8 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, marginBottom: 3, color: "var(--ink3)" }}>
                            <span>Repayment</span>
                            <span className="mono">{pct}% · LKR {adv.repaidAmount.toLocaleString()} / {adv.amount.toLocaleString()}</span>
                          </div>
                          <div style={{ height: 5, background: "var(--ln)", borderRadius: 99, overflow: "hidden" }}>
                            <div style={{
                              height: "100%", width: `${pct}%`,
                              background: pct >= 100 ? "#2d7a5a" : "linear-gradient(to right, #b83030, #e05050)",
                              borderRadius: 99, transition: "width 400ms",
                            }} />
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 8, fontSize: 10.5, color: "var(--ink3)", alignItems: "center" }}>
                          <span>💳 {adv.method}</span>
                          {remaining > 0 && (
                            <button className="btn btn-xs btn-ok" style={{ marginLeft: "auto" }}
                              onClick={() => repayAdvance(adv, Math.min(5000, remaining))}>
                              Repay LKR {Math.min(5000, remaining).toLocaleString()}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════ */}
      {/* ── RECORD PAYMENT MODAL ── */}
      {/* ═══════════════════════════════════════════════ */}
      <Modal open={!!payModal} onClose={() => setPayModal(null)} title={`Settle salary — ${payModal}`}
        footer={<><button className="btn btn-s btn-sm" onClick={() => setPayModal(null)}>Cancel</button><button className="btn btn-ok btn-sm" onClick={confirmPayment}>Confirm payment</button></>}>
        {payModal && (() => {
          const adv = activeAdvance;
          const deduction = parseInt(payForm.advanceDeduction) || 0;
          const netPay = (parseInt(payForm.amount) || teacher.monthlySalary) - deduction;
          const advRemaining = adv ? adv.amount - adv.repaidAmount : 0;
          return (
            <div className="form-gap">
              <div>
                <label className="flbl freq">Gross salary (LKR)</label>
                <input type="number" value={payForm.amount} onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))} />
              </div>

              {/* Advance deduction */}
              {adv && (
                <div style={{ background: "#fff8f0", border: "1.5px solid #eacdac", borderRadius: 12, padding: "12px 14px" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)", marginBottom: 6 }}>
                    Advance deduction · Outstanding: LKR {advRemaining.toLocaleString()}
                  </div>
                  <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                    {([
                      { mode: "full" as const, label: `Full (${advRemaining.toLocaleString()})` },
                      { mode: "partial" as const, label: "Partial" },
                      { mode: "none" as const, label: "Skip" },
                    ]).map(opt => {
                      const isActive = payForm.deductionMode === opt.mode;
                      return (
                        <button key={opt.mode} onClick={() => {
                          if (opt.mode === "full") setPayForm(f => ({ ...f, deductionMode: "full", advanceDeduction: String(advRemaining) }));
                          else if (opt.mode === "partial") setPayForm(f => ({ ...f, deductionMode: "partial", advanceDeduction: String(Math.min(5000, advRemaining)) }));
                          else setPayForm(f => ({ ...f, deductionMode: "none", advanceDeduction: "0" }));
                        }} style={{
                          flex: 1, padding: "7px 4px", borderRadius: 7, fontSize: 11, fontWeight: isActive ? 700 : 600,
                          border: `2px solid ${isActive ? "var(--tc)" : "var(--ln)"}`,
                          background: isActive ? "var(--tc-l)" : "#fff",
                          color: isActive ? "var(--tc-d)" : "var(--ink3)", cursor: "pointer",
                        }}>{opt.label}</button>
                      );
                    })}
                  </div>
                  {payForm.deductionMode === "partial" && (
                    <input type="number" value={payForm.advanceDeduction} onChange={e => {
                      const val = Math.min(parseInt(e.target.value) || 0, advRemaining);
                      setPayForm(f => ({ ...f, advanceDeduction: String(val) }));
                    }} placeholder="Deduction amount" max={advRemaining} style={{ marginBottom: 6 }} />
                  )}
                  <div style={{
                    display: "flex", justifyContent: "space-between",
                    background: deduction > 0 ? "#fceaea" : "var(--cr-d)",
                    borderRadius: 7, padding: "7px 10px",
                  }}>
                    <span style={{ fontSize: 11, color: deduction > 0 ? "#b83030" : "var(--ink3)", fontWeight: 600 }}>
                      Deduction: {deduction > 0 ? `−LKR ${deduction.toLocaleString()}` : "LKR 0"}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--tc-d)", fontFamily: "var(--font-mono)" }}>
                      Net: LKR {netPay.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              <div className="field-row">
                <div>
                  <label className="flbl freq">Method</label>
                  <select value={payForm.method} onChange={e => setPayForm(f => ({ ...f, method: e.target.value }))}>
                    {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="flbl freq">Date</label>
                  <input type="date" value={payForm.date} onChange={e => setPayForm(f => ({ ...f, date: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="flbl">Reference #</label>
                <input value={payForm.referenceNo} onChange={e => setPayForm(f => ({ ...f, referenceNo: e.target.value }))} placeholder="e.g. SAL-104-26" />
              </div>
              {/* Payslip upload */}
              <div>
                <label className="flbl">Upload payslip</label>
                {!payForm.payslipFileName ? (
                  <div onClick={() => payslipRef.current?.click()} style={{
                    border: "2px dashed var(--ln)", borderRadius: 8, padding: "12px", textAlign: "center",
                    cursor: "pointer", background: "var(--cr)", fontSize: 12, color: "var(--ink3)",
                  }}>📄 Click to upload (PDF, PNG, JPG)</div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "var(--tc-l)", borderRadius: 8, border: "1px solid var(--tc)" }}>
                    <span>📎 {payForm.payslipFileName}</span>
                    <button className="btn btn-xs btn-s" onClick={() => { setPayForm(f => ({ ...f, payslipFile: null, payslipFileName: "" })); if (payslipRef.current) payslipRef.current.value = ""; }}>Remove</button>
                  </div>
                )}
                <input ref={payslipRef} type="file" accept=".pdf,.png,.jpg,.jpeg" style={{ display: "none" }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) setPayForm(pf => ({ ...pf, payslipFile: f, payslipFileName: f.name })); }} />
              </div>
              <div>
                <label className="flbl">Notes</label>
                <textarea rows={2} value={payForm.notes} onChange={e => setPayForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes..." style={{ resize: "vertical" }} />
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* ═══════════════════════════════════════════════ */}
      {/* ── EDIT PAYMENT MODAL ── */}
      {/* ═══════════════════════════════════════════════ */}
      <Modal open={isEditing && !!editTarget} onClose={() => { setEditTarget(null); setIsEditing(false); }} title={`Edit payment — ${editTarget?.month || ""}`}
        footer={<><button className="btn btn-s btn-sm" onClick={() => { setEditTarget(null); setIsEditing(false); }}>Cancel</button><button className="btn btn-ok btn-sm" onClick={saveEdit}>Save changes</button></>}>
        {editTarget && (() => {
          const editAmt = parseInt(editForm.amount) || editTarget.amount;
          const editDed = parseInt(editForm.advanceDeduction) || 0;
          const editNet = editAmt - editDed;
          return (
            <div className="form-gap">
              <div className="field-row">
                <div>
                  <label className="flbl freq">Gross amount (LKR)</label>
                  <input type="number" value={editForm.amount} onChange={e => setEditForm(f => ({ ...f, amount: e.target.value }))} />
                  {editAmt !== editTarget.amount && (
                    <div className="fhint" style={{ color: "#6b3ea8" }}>Was: LKR {editTarget.amount.toLocaleString()} → Now: LKR {editAmt.toLocaleString()}</div>
                  )}
                </div>
                <div>
                  <label className="flbl">Adv. deduction</label>
                  <input type="number" value={editForm.advanceDeduction} onChange={e => setEditForm(f => ({ ...f, advanceDeduction: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", background: "var(--tc-l)", borderRadius: 8, padding: "8px 12px" }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: "var(--ink2)" }}>Net after edit:</span>
                <span style={{ fontSize: 15, fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--tc-d)" }}>LKR {editNet.toLocaleString()}</span>
              </div>
              <div className="field-row">
                <div>
                  <label className="flbl freq">Method</label>
                  <select value={editForm.method} onChange={e => setEditForm(f => ({ ...f, method: e.target.value }))}>
                    {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="flbl freq">Date</label>
                  <input type="date" value={editForm.date} onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="flbl">Reference #</label>
                <input value={editForm.referenceNo} onChange={e => setEditForm(f => ({ ...f, referenceNo: e.target.value }))} />
              </div>
              <div>
                <label className="flbl">Notes</label>
                <textarea rows={2} value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} style={{ resize: "vertical" }} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#fef8e6", border: "1px solid #e8d5a0", borderRadius: 8, padding: "8px 12px", fontSize: 11, color: "#8a6a20" }}>
                <span>ℹ️</span>
                <span style={{ fontWeight: 600 }}>All changes are tracked in edit history for audit</span>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* ═══════════════════════════════════════════════ */}
      {/* ── ISSUE ADVANCE MODAL ── */}
      {/* ═══════════════════════════════════════════════ */}
      <Modal open={advanceModal} onClose={() => setAdvanceModal(false)} title={`Issue advance — ${teacher.name}`}
        footer={<><button className="btn btn-s btn-sm" onClick={() => setAdvanceModal(false)}>Cancel</button><button className="btn btn-ok btn-sm" onClick={confirmAdvance} disabled={!advanceForm.amount}>Issue advance</button></>}>
        <div className="form-gap">
          {activeAdvance && (
            <div style={{ background: "#fceaea", border: "1px solid #f5c5c5", borderRadius: 10, padding: "10px 13px", fontSize: 11.5, color: "#b83030" }}>
              ⚠ Already has an active advance of LKR {(activeAdvance.amount - activeAdvance.repaidAmount).toLocaleString()} outstanding
            </div>
          )}
          <div className="field-row">
            <div>
              <label className="flbl freq">Amount (LKR)</label>
              <input type="number" value={advanceForm.amount} onChange={e => setAdvanceForm(f => ({ ...f, amount: e.target.value }))} placeholder="e.g. 10000" />
            </div>
            <div>
              <label className="flbl freq">Reason</label>
              <select value={advanceForm.reason} onChange={e => setAdvanceForm(f => ({ ...f, reason: e.target.value }))}>
                {ADVANCE_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
          <div className="field-row">
            <div>
              <label className="flbl freq">Date</label>
              <input type="date" value={advanceForm.requestDate} onChange={e => setAdvanceForm(f => ({ ...f, requestDate: e.target.value }))} />
            </div>
            <div>
              <label className="flbl freq">Disbursed via</label>
              <select value={advanceForm.method} onChange={e => setAdvanceForm(f => ({ ...f, method: e.target.value }))}>
                {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
          {advanceForm.amount && (
            <div style={{ background: "var(--tc-l)", borderRadius: 10, padding: "10px 14px" }}>
              <div style={{ fontSize: 11, color: "var(--ink3)", marginBottom: 2 }}>Amount to disburse</div>
              <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--tc-d)" }}>
                LKR {(parseInt(advanceForm.amount) || 0).toLocaleString()}
              </div>
              <div style={{ fontSize: 10, color: "var(--ink3)", marginTop: 2 }}>
                Will be deducted from future salary payments
              </div>
            </div>
          )}
        </div>
      </Modal>
    </PageShell>
  );
}
