"use client";
import { useState } from "react";
import { Modal } from "./Modal";
import { Student, BATCHES } from "@/lib/batchData";

interface StudentProfileModalProps {
  student: Student | null;
  onClose: () => void;
}

const TAB_OPTS = [
  { id: "overview", label: "Overview" },
  { id: "attendance", label: "Attendance History" },
  { id: "fees", label: "Fee History" }
] as const;

export function StudentProfileModal({ student, onClose }: StudentProfileModalProps) {
  const [tab, setTab] = useState<"overview" | "attendance" | "fees">("overview");

  if (!student) return null;

  const batch = BATCHES.find(b => b.id === student.batch);
  const batchName = batch?.name || student.batch;
  const subjects = batch?.subjects || [];

  // Mock fee history data
  const feeHistory = [
    { month: "April 2026", amount: student.feeAmount, status: student.fee, date: student.fee === "paid" ? "05-Apr-2026" : "—", receipt: student.fee === "paid" ? `RCP-${100 + student.id}` : "—" },
    { month: "March 2026", amount: student.feeAmount, status: "paid", date: "02-Mar-2026", receipt: `RCP-${80 + student.id}` },
    { month: "February 2026", amount: student.feeAmount, status: "paid", date: "04-Feb-2026", receipt: `RCP-${60 + student.id}` },
    { month: "January 2026", amount: student.feeAmount, status: "paid", date: "08-Jan-2026", receipt: `RCP-${40 + student.id}` },
  ];

  // Mock attendance data
  const recentDays = ["18 Apr", "15 Apr", "11 Apr", "08 Apr", "04 Apr"];

  const attBg = (pct: number) => pct >= 90 ? "#d4ede3" : pct >= 75 ? "#fef3d7" : "#fceaea";
  const attFg = (pct: number) => pct >= 90 ? "#1a5040" : pct >= 75 ? "#c07b1a" : "#b83030";

  return (
    <Modal open={!!student} onClose={onClose} title="Student profile" wide footer={<button className="btn btn-s btn-sm" onClick={onClose}>Close</button>}>
      <div className="form-gap">
        {/* Header Strip */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, background: "var(--cr)", borderRadius: 12, padding: "14px 16px" }}>
          <div className="ava" style={{ background: student.bg, color: student.fg, width: 52, height: 52, fontSize: 18 }}>
            {student.initials}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: "var(--ink)", marginBottom: 2 }}>{student.name}</div>
            <div style={{ fontSize: 12, color: "var(--ink3)" }}>{batchName} · Joined {student.joinDate}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
            <span style={{ fontSize: 11, fontWeight: 700, background: attBg(student.attPct), color: attFg(student.attPct), padding: "2px 8px", borderRadius: 99 }}>
              {student.attPct}% Attendance
            </span>
            {student.fee === "paid"
              ? <span className="bdg b-paid">Fee Paid</span>
              : student.fee === "overdue" ? <span style={{ background:"#fceaea",color:"#b83030",fontSize:10.5,fontWeight:600,padding:"2px 8px",borderRadius:99 }}>Fee Overdue</span> 
              : <span className="bdg b-due">Fee Due</span>}
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
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div style={{ minHeight: 200 }}>
          {tab === "overview" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
              {[
                { label: "Guardian", val: student.guardian },
                { label: "Mobile", val: student.mobile, mono: true },
                { label: "Overall Attendance", val: `${student.attPct}%` },
                { label: "Monthly Fee", val: `LKR ${student.feeAmount.toLocaleString()}` },
                { label: "Current Fee Status", val: student.fee.charAt(0).toUpperCase() + student.fee.slice(1) },
                { label: "Join Date", val: student.joinDate },
              ].map(row => (
                <div key={row.label} style={{ padding: "10px 12px", background: "var(--cr-d)", borderRadius: 9 }}>
                  <div style={{ fontSize: 10.5, color: "var(--ink3)", fontWeight: 600, letterSpacing: ".04em", textTransform: "uppercase", marginBottom: 3 }}>{row.label}</div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink)", fontFamily: row.mono ? "var(--font-mono)" : undefined }}>{row.val}</div>
                </div>
              ))}
            </div>
          )}

          {tab === "attendance" && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 11, color: "var(--ink3)", marginBottom: 8 }}>Recent attendance per subject</div>
              <div style={{ border: "1px solid var(--ln)", borderRadius: 10, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: "var(--cr)", borderBottom: "1px solid var(--ln)" }}>
                      <th style={{ textAlign: "left", padding: "10px 14px", color: "var(--ink3)", fontWeight: 600 }}>Subject</th>
                      {recentDays.map(d => <th key={d} style={{ padding: "10px", color: "var(--ink3)", fontWeight: 600 }}>{d}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {subjects.map((subj, i) => (
                      <tr key={subj} style={{ borderBottom: i < subjects.length - 1 ? "1px solid var(--ln)" : "none" }}>
                        <td style={{ padding: "10px 14px", fontWeight: 600, color: "var(--ink)" }}>{subj}</td>
                        {recentDays.map((_, di) => {
                          // Deterministic pseudo-random attendance
                          const isAbsent = (student.id + i + di * 3) % 11 === 0;
                          return (
                            <td key={di} style={{ textAlign: "center", padding: "8px" }}>
                              {isAbsent
                                ? <span style={{ color: "var(--rb)", fontWeight: 700 }}>✕</span>
                                : <span style={{ color: "var(--tc-d)", fontWeight: 700 }}>✓</span>}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === "fees" && (
            <div style={{ marginTop: 10 }}>
              <div style={{ border: "1px solid var(--ln)", borderRadius: 10, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: "var(--cr)", borderBottom: "1px solid var(--ln)" }}>
                      <th style={{ textAlign: "left", padding: "10px 14px", color: "var(--ink3)", fontWeight: 600 }}>Month</th>
                      <th style={{ textAlign: "left", padding: "10px", color: "var(--ink3)", fontWeight: 600 }}>Amount</th>
                      <th style={{ textAlign: "left", padding: "10px", color: "var(--ink3)", fontWeight: 600 }}>Status</th>
                      <th style={{ textAlign: "left", padding: "10px", color: "var(--ink3)", fontWeight: 600 }}>Paid Date</th>
                      <th style={{ textAlign: "left", padding: "10px 14px", color: "var(--ink3)", fontWeight: 600 }}>Receipt #</th>
                    </tr>
                  </thead>
                  <tbody>
                    {feeHistory.map((fee, i) => (
                      <tr key={fee.month} style={{ borderBottom: i < feeHistory.length - 1 ? "1px solid var(--ln)" : "none" }}>
                        <td style={{ padding: "10px 14px", fontWeight: 600, color: "var(--ink)" }}>{fee.month}</td>
                        <td style={{ padding: "10px", fontFamily: "var(--font-mono)" }}>LKR {fee.amount.toLocaleString()}</td>
                        <td style={{ padding: "10px" }}>
                          {fee.status === "paid" ? <span className="bdg b-paid" style={{ fontSize: 9.5 }}>Paid</span> : 
                           fee.status === "overdue" ? <span style={{ background:"#fceaea",color:"#b83030",fontSize:9.5,fontWeight:600,padding:"2px 6px",borderRadius:99 }}>Overdue</span> : 
                           <span className="bdg b-due" style={{ fontSize: 9.5 }}>Due</span>}
                        </td>
                        <td style={{ padding: "10px", color: "var(--ink2)", fontFamily: "var(--font-mono)" }}>{fee.date}</td>
                        <td style={{ padding: "10px 14px", color: "var(--ink2)", fontFamily: fee.receipt !== "—" ? "var(--font-mono)" : undefined }}>
                          {fee.receipt}
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
