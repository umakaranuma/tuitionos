"use client";
import { useState } from "react";
import { Modal } from "./Modal";
import { Teacher, TeacherPayment, BATCHES, ALL_STUDENTS } from "@/lib/batchData";

interface TeacherProfileModalProps {
  teacher: Teacher | null;
  payments: TeacherPayment[];
  onClose: () => void;
  onRecordPayment: (teacherId: number, month: string) => void;
}

const TAB_OPTS = [
  { id: "overview", label: "Overview" },
  { id: "batches", label: "Batches" },
  { id: "salary", label: "Salary Payments" },
] as const;

export function TeacherProfileModal({ teacher, payments, onClose, onRecordPayment }: TeacherProfileModalProps) {
  const [tab, setTab] = useState<"overview" | "batches" | "salary">("overview");

  if (!teacher) return null;

  const teacherPayments = payments
    .filter(p => p.teacherId === teacher.id)
    .sort((a, b) => {
      // Sort by month descending (most recent first)
      const ma = new Date(a.month.split(" ").reverse().join(" "));
      const mb = new Date(b.month.split(" ").reverse().join(" "));
      return mb.getTime() - ma.getTime();
    });

  const totalPaid = teacherPayments.filter(p => p.status === "paid").reduce((s, p) => s + p.amount, 0);
  const totalPending = teacherPayments.filter(p => p.status !== "paid").reduce((s, p) => s + p.amount, 0);
  const paidCount = teacherPayments.filter(p => p.status === "paid").length;

  const assignedBatches = BATCHES.filter(b => teacher.batchIds.includes(b.id));

  return (
    <Modal open={!!teacher} onClose={onClose} title="Teacher profile" wide footer={<button className="btn btn-s btn-sm" onClick={onClose}>Close</button>}>
      <div className="form-gap">
        {/* Header Strip */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, background: "var(--cr)", borderRadius: 12, padding: "14px 16px" }}>
          <div className="ava" style={{ background: teacher.bg, color: teacher.fg, width: 52, height: 52, fontSize: 18 }}>
            {teacher.initials}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: "var(--ink)", marginBottom: 2 }}>{teacher.name}</div>
            <div style={{ fontSize: 12, color: "var(--ink3)" }}>{teacher.subject} · Since {teacher.joinDate}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
            <span style={{ fontSize: 11, fontWeight: 700, background: "var(--sp-l)", color: "var(--sp)", padding: "2px 8px", borderRadius: 99 }}>
              {teacher.batchIds.length} Batch{teacher.batchIds.length !== 1 ? "es" : ""}
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--ink2)" }}>
              LKR {teacher.monthlySalary.toLocaleString()}/mo
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: "flex", gap: 0, borderBottom: "1.5px solid var(--ln)", marginBottom: 4 }}>
          {TAB_OPTS.map(t => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  padding: "10px 16px", background: "transparent", border: "none",
                  fontSize: 12.5, fontWeight: active ? 700 : 600,
                  color: active ? "var(--tc-d)" : "var(--ink3)",
                  borderBottom: `2.5px solid ${active ? "var(--tc)" : "transparent"}`,
                  cursor: "pointer", transition: "all 140ms",
                  transform: "translateY(1.5px)",
                }}
              >
                {t.label}
                {t.id === "salary" && totalPending > 0 && (
                  <span style={{
                    marginLeft: 6, background: "var(--sf-l)", color: "var(--sf)",
                    fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 99,
                  }}>
                    {teacherPayments.filter(p => p.status !== "paid").length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div style={{ minHeight: 220 }}>
          {/* ── OVERVIEW TAB ── */}
          {tab === "overview" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
              {[
                { label: "Full Name", val: teacher.name },
                { label: "Subject", val: teacher.subject },
                { label: "Mobile", val: teacher.mobile, mono: true },
                { label: "Email", val: teacher.email || "—" },
                { label: "Monthly Salary", val: `LKR ${teacher.monthlySalary.toLocaleString()}`, mono: true },
                { label: "Joined Date", val: teacher.joinDate },
                { label: "Assigned Batches", val: `${teacher.batchIds.length} batches` },
                { label: "Total Students", val: `${teacher.batchIds.reduce((acc, bid) => acc + ALL_STUDENTS.filter(s => s.batch === bid).length, 0)} students` },
              ].map(row => (
                <div key={row.label} style={{ padding: "10px 12px", background: "var(--cr-d)", borderRadius: 9 }}>
                  <div style={{ fontSize: 10.5, color: "var(--ink3)", fontWeight: 600, letterSpacing: ".04em", textTransform: "uppercase", marginBottom: 3 }}>{row.label}</div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink)", fontFamily: row.mono ? "var(--font-mono)" : undefined }}>{row.val}</div>
                </div>
              ))}
            </div>
          )}

          {/* ── BATCHES TAB ── */}
          {tab === "batches" && (
            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
              {assignedBatches.length === 0 && (
                <div style={{ textAlign: "center", color: "var(--ink3)", fontSize: 13, padding: 30 }}>No batches assigned</div>
              )}
              {assignedBatches.map(batch => {
                const studentCount = ALL_STUDENTS.filter(s => s.batch === batch.id).length;
                return (
                  <div key={batch.id} style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "12px 14px", background: "#fff",
                    border: "1px solid var(--ln)", borderRadius: 10,
                    borderLeft: `4px solid ${batch.color}`,
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 8,
                      background: batch.colorL, color: batch.color,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 11, fontWeight: 700, flexShrink: 0,
                    }}>
                      {batch.label.replace("Grade ", "G")}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{batch.name}</div>
                      <div style={{ fontSize: 11, color: "var(--ink3)", marginTop: 1 }}>
                        {studentCount} student{studentCount !== 1 ? "s" : ""} · {batch.subjects.length} subjects
                      </div>
                    </div>
                    <div style={{
                      display: "flex", flexWrap: "wrap", gap: 4, maxWidth: 180, justifyContent: "flex-end",
                    }}>
                      {batch.subjects.map(subj => (
                        <span key={subj} style={{
                          fontSize: 9.5, fontWeight: 600, padding: "2px 6px",
                          background: subj === teacher.subject ? batch.colorL : "var(--cr-d)",
                          color: subj === teacher.subject ? batch.color : "var(--ink3)",
                          borderRadius: 6,
                        }}>
                          {subj}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── SALARY PAYMENTS TAB ── */}
          {tab === "salary" && (
            <div style={{ marginTop: 10 }}>
              {/* Salary KPI Strip */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
                <div style={{ padding: "10px 12px", background: "var(--cr-d)", borderRadius: 9, borderTop: "3px solid var(--sp)" }}>
                  <div style={{ fontSize: 10, color: "var(--ink3)", fontWeight: 600, letterSpacing: ".04em", textTransform: "uppercase", marginBottom: 3 }}>Monthly Salary</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)", fontFamily: "var(--font-mono)" }}>LKR {teacher.monthlySalary.toLocaleString()}</div>
                </div>
                <div style={{ padding: "10px 12px", background: "var(--tc-l)", borderRadius: 9, borderTop: "3px solid var(--tc)" }}>
                  <div style={{ fontSize: 10, color: "var(--ink3)", fontWeight: 600, letterSpacing: ".04em", textTransform: "uppercase", marginBottom: 3 }}>Paid (6 months)</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "var(--tc-d)", fontFamily: "var(--font-mono)" }}>LKR {totalPaid.toLocaleString()}</div>
                  <div style={{ fontSize: 10, color: "var(--tc-d)", marginTop: 1 }}>{paidCount}/{teacherPayments.length} months</div>
                </div>
                <div style={{ padding: "10px 12px", background: totalPending > 0 ? "var(--sf-l)" : "var(--cr-d)", borderRadius: 9, borderTop: `3px solid ${totalPending > 0 ? "var(--sf)" : "var(--ln)"}` }}>
                  <div style={{ fontSize: 10, color: "var(--ink3)", fontWeight: 600, letterSpacing: ".04em", textTransform: "uppercase", marginBottom: 3 }}>Pending</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: totalPending > 0 ? "var(--sf)" : "var(--ink3)", fontFamily: "var(--font-mono)" }}>LKR {totalPending.toLocaleString()}</div>
                  {totalPending > 0 && <div style={{ fontSize: 10, color: "var(--sf)", marginTop: 1 }}>{teacherPayments.filter(p => p.status !== "paid").length} month(s) unsettled</div>}
                </div>
              </div>

              {/* Payment Ledger Table */}
              <div style={{ border: "1px solid var(--ln)", borderRadius: 10, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: "var(--cr)", borderBottom: "1px solid var(--ln)" }}>
                      <th style={{ textAlign: "left", padding: "10px 14px", color: "var(--ink3)", fontWeight: 600 }}>Month</th>
                      <th style={{ textAlign: "left", padding: "10px", color: "var(--ink3)", fontWeight: 600 }}>Amount</th>
                      <th style={{ textAlign: "left", padding: "10px", color: "var(--ink3)", fontWeight: 600 }}>Status</th>
                      <th style={{ textAlign: "left", padding: "10px", color: "var(--ink3)", fontWeight: 600 }}>Paid Date</th>
                      <th style={{ textAlign: "left", padding: "10px", color: "var(--ink3)", fontWeight: 600 }}>Method</th>
                      <th style={{ textAlign: "left", padding: "10px 14px", color: "var(--ink3)", fontWeight: 600 }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teacherPayments.map((pay, i) => (
                      <tr key={pay.month} style={{
                        borderBottom: i < teacherPayments.length - 1 ? "1px solid var(--ln)" : "none",
                        background: pay.status === "overdue" ? "#fffbeb" : pay.status === "pending" ? "#fefcf3" : "#fff",
                      }}>
                        <td style={{ padding: "10px 14px", fontWeight: 600, color: "var(--ink)" }}>{pay.month}</td>
                        <td style={{ padding: "10px", fontFamily: "var(--font-mono)", fontWeight: 500 }}>LKR {pay.amount.toLocaleString()}</td>
                        <td style={{ padding: "10px" }}>
                          {pay.status === "paid" && <span className="bdg b-paid" style={{ fontSize: 9.5 }}>Settled</span>}
                          {pay.status === "pending" && <span className="bdg b-due" style={{ fontSize: 9.5 }}>Pending</span>}
                          {pay.status === "overdue" && <span style={{ background: "#fceaea", color: "#b83030", fontSize: 9.5, fontWeight: 600, padding: "2px 6px", borderRadius: 99, display: "inline-flex" }}>Overdue</span>}
                        </td>
                        <td style={{ padding: "10px", color: "var(--ink2)", fontFamily: "var(--font-mono)", fontSize: 11.5 }}>
                          {pay.paidDate || "—"}
                        </td>
                        <td style={{ padding: "10px", color: "var(--ink2)", fontSize: 11.5 }}>
                          {pay.method || "—"}
                        </td>
                        <td style={{ padding: "10px 14px" }}>
                          {pay.status !== "paid" ? (
                            <button
                              className="btn btn-xs btn-ok"
                              onClick={() => onRecordPayment(teacher.id, pay.month)}
                            >
                              Record payment
                            </button>
                          ) : (
                            <span style={{ fontSize: 10, color: "var(--tc-d)", fontWeight: 600 }}>✓ {pay.referenceNo}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
