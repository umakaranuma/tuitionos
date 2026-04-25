"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Topbar } from "@/components/layout/Topbar";
import { PageShell } from "@/components/layout/PageShell";
import { Modal } from "@/components/ui/Modal";
import { 
  ALL_STUDENTS, BATCHES, INIT_FEE_STATE, INIT_FEE_HISTORY, FeeHistoryRecord 
} from "@/lib/batchData";

const TAB_OPTS = [
  { id: "overview", label: "Overview" },
  { id: "attendance", label: "Attendance History" },
  { id: "fees", label: "Fee History" }
] as const;

export default function StudentSinglePage() {
  const params = useParams();
  const router = useRouter();
  const idStr = Array.isArray(params.id) ? params.id[0] : params.id;
  const id = parseInt(idStr, 10);
  const student = ALL_STUDENTS.find(s => s.id === id);
  
  const [tab, setTab] = useState<"overview" | "attendance" | "fees">("overview");
  const [isFree, setIsFree] = useState(student?.isFree || false);

  const toggleFree = () => {
    const val = !isFree;
    setIsFree(val);
    if (student) student.isFree = val;
  };

  // Fee state cloning for the page
  const [currentFee, setCurrentFee] = useState(INIT_FEE_STATE[id] || { status: "due", paidAmount: 0, credits: 0 });
  const [history, setHistory] = useState<FeeHistoryRecord[]>(INIT_FEE_HISTORY[id] || []);
  
  // Historical Edit Modal
  const [editHistory, setEditHistory] = useState<{ record: FeeHistoryRecord, index: number } | null>(null);
  const [editForm, setEditForm] = useState({ amount: "", date: "", receipt: "", isWaived: false });

  if (!student) {
    return (
      <PageShell>
        <Topbar title="Student Info" />
        <div style={{ padding: 40, textAlign: "center" }}>Student not found.</div>
      </PageShell>
    );
  }

  const batch = BATCHES.find(b => b.id === student.batch);
  const batchName = batch?.name || student.batch;
  const subjects = batch?.subjects || [];
  const currentMonthName = new Date().toLocaleString("default", { month: "long", year: "numeric" });

  const recentDays = ["18 Apr", "15 Apr", "11 Apr", "08 Apr", "04 Apr"];

  const attBg = (pct: number) => pct >= 90 ? "#d4ede3" : pct >= 75 ? "#fef3d7" : "#fceaea";
  const attFg = (pct: number) => pct >= 90 ? "#1a5040" : pct >= 75 ? "#c07b1a" : "#b83030";

  const deleteHistoryRecord = (index: number) => {
    if (confirm("Are you sure you want to delete this payment record and mark it Due?")) {
      setHistory(prev => {
        const copy = [...prev];
        copy[index] = { ...copy[index], status: "due", amount: 0, date: undefined, receipt: undefined };
        return copy;
      });
    }
  };

  const openHistoryEdit = (rec: FeeHistoryRecord, index: number) => {
    setEditForm({
      amount: String(rec.amount || student.feeAmount),
      date: rec.date || "",
      receipt: rec.receipt || "",
      isWaived: rec.status === "waived"
    });
    setEditHistory({ record: rec, index });
  };

  const saveHistoryEdit = () => {
    if (!editHistory) return;
    setHistory(prev => {
      const copy = [...prev];
      if (editForm.isWaived) {
        copy[editHistory.index] = { ...copy[editHistory.index], status: "waived", amount: 0, date: undefined, receipt: undefined };
      } else {
        const amt = parseFloat(editForm.amount) || 0;
        let newStatus: any = "due";
        if (amt >= student.feeAmount) newStatus = "paid";
        else if (amt > 0) newStatus = "partial";
        
        copy[editHistory.index] = { 
          ...copy[editHistory.index], 
          status: newStatus, 
          amount: amt, 
          date: editForm.date, 
          receipt: editForm.receipt 
        };
      }
      return copy;
    });
    setEditHistory(null);
  };

  return (
    <PageShell>
      <Topbar
        title="Student Profile"
        right={
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-p btn-sm">Export Profile PDF</button>
          </div>
        }
      />
      <div className="pb fi form-gap">
        {/* Back link */}
        <button
          onClick={() => router.push("/students")}
          style={{
            background: "none", border: "none", cursor: "pointer",
            fontSize: 13, fontWeight: 600, color: "var(--tc-d)",
            display: "flex", alignItems: "center", gap: 5,
            padding: 0, marginBottom: -4,
          }}
          onMouseEnter={e => e.currentTarget.style.textDecoration = "underline"}
          onMouseLeave={e => e.currentTarget.style.textDecoration = "none"}
        >
          ← Back to students
        </button>

        {/* Header Strip */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, background: "#fff", border: "1px solid var(--ln)", borderRadius: 12, padding: "18px 22px", boxShadow: "var(--sh)" }}>
          <div className="ava" style={{ background: student.bg, color: student.fg, width: 64, height: 64, fontSize: 22 }}>
            {student.initials}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: "var(--ink)", marginBottom: 4 }}>{student.name}</div>
            <div style={{ fontSize: 13, color: "var(--ink3)" }}>{batchName} · Joined {student.joinDate}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
            <span style={{ fontSize: 12, fontWeight: 700, background: attBg(student.attPct), color: attFg(student.attPct), padding: "4px 10px", borderRadius: 99 }}>
              {student.attPct}% Attendance
            </span>
            {isFree ? <span style={{ background:"#ede8fc",color:"#6b3ea8",fontSize:10.5,fontWeight:600,padding:"4px 10px",borderRadius:99 }}>Free Scholar (Permanent)</span> :
             currentFee.status === "paid" ? <span className="bdg b-paid">Current Fee Paid</span> : 
             currentFee.status === "waived" ? <span style={{ background:"#ede8fc",color:"#6b3ea8",fontSize:10.5,fontWeight:600,padding:"4px 10px",borderRadius:99 }}>Monthly Exemption (Free)</span> : 
             currentFee.status === "partial" ? <span style={{ background:"#fef3d7",color:"#c07b1a",fontSize:10.5,fontWeight:600,padding:"4px 10px",borderRadius:99 }}>Fee Partial</span> : 
             currentFee.status === "overdue" ? <span style={{ background:"#fceaea",color:"#b83030",fontSize:10.5,fontWeight:600,padding:"4px 10px",borderRadius:99 }}>Fee Overdue</span> : 
             <span className="bdg b-due">Fee Due</span>}
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: "flex", gap: 0, borderBottom: "1.5px solid var(--ln)", marginBottom: 10, marginTop: 10 }}>
          {TAB_OPTS.map(t => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  padding: "12px 20px", background: "transparent", border: "none",
                  fontSize: 13, fontWeight: active ? 700 : 600,
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
        <div>
          {tab === "overview" && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                {[
                  { label: "Guardian", val: student.guardian },
                  { label: "Mobile", val: student.mobile, mono: true },
                  { label: "Overall Attendance", val: `${student.attPct}%` },
                  { label: "Monthly Fee Standard", val: `LKR ${student.feeAmount.toLocaleString()}` },
                  { label: "Current Balance", val: currentFee.credits > 0 ? `LKR ${currentFee.credits.toLocaleString()} (Advance Credit)` : "No active credits" },
                  { label: "Join Date", val: student.joinDate },
                ].map(row => (
                  <div key={row.label} style={{ padding: "14px 16px", background: "#fff", border: "1px solid var(--ln)", borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,.04)" }}>
                    <div style={{ fontSize: 11, color: "var(--ink3)", fontWeight: 600, letterSpacing: ".04em", textTransform: "uppercase", marginBottom: 6 }}>{row.label}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)", fontFamily: row.mono ? "var(--font-mono)" : undefined }}>{row.val}</div>
                  </div>
                ))}
              </div>
              
              <div style={{ padding: "16px 20px", background: isFree ? "#f6f3fc" : "#fff", border: isFree ? "1px solid #d9ccf5" : "1px solid var(--ln)", borderRadius: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: isFree ? "#6b3ea8" : "var(--ink)" }}>Permanent Full Scholarship</div>
                  <div style={{ fontSize: 11, color: "var(--ink3)", marginTop: 4, maxWidth: 500, lineHeight: 1.4 }}>
                    Permanently exempt this student from all monthly fees. They will never be billed and will be automatically removed from pending revenue calculations forever.
                  </div>
                </div>
                <button className={`toggle ${isFree ? "on" : ""}`} onClick={toggleFree} />
              </div>
            </>
          )}

          {tab === "attendance" && (
            <div>
              <div style={{ fontSize: 12.5, color: "var(--ink3)", marginBottom: 12, fontWeight: 600 }}>Recent Attendance Logs (Per Subject)</div>
              <div className="tw">
                <table>
                  <thead>
                    <tr>
                      <th>Subject</th>
                      {recentDays.map(d => <th key={d}>{d}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {subjects.map((subj, i) => (
                      <tr key={subj}>
                        <td style={{ fontWeight: 600, color: "var(--ink)" }}>{subj}</td>
                        {recentDays.map((_, di) => {
                          const isAbsent = (student.id + i + di * 3) % 11 === 0;
                          return (
                            <td key={di} style={{ textAlign: "center" }}>
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
            <div>
              <div style={{ fontSize: 12.5, color: "var(--ink3)", marginBottom: 12, fontWeight: 600 }}>Accounting & Payment Ledgers</div>
              <div className="tw">
                <table>
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th>Amount (LKR)</th>
                      <th>Status</th>
                      <th>Paid Date</th>
                      <th>Receipt #</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Current Month static row representing active month */}
                    <tr style={{ background: "#fcfcfc" }}>
                      <td style={{ fontWeight: 600, color: "var(--ink)" }}>{currentMonthName} (Current)</td>
                      <td className="mono">
                        {currentFee.status === "waived" ? "—" : currentFee.paidAmount.toLocaleString()}
                        {currentFee.credits > 0 && <div style={{ fontSize: 10, color: "var(--tc-d)" }}>+{currentFee.credits.toLocaleString()}</div>}
                      </td>
                      <td>
                        {currentFee.status === "paid" ? <span className="bdg b-paid">Paid</span> : 
                         currentFee.status === "waived" ? <span style={{ background:"#ede8fc",color:"#6b3ea8",fontSize:10.5,fontWeight:600,padding:"2px 8px",borderRadius:99 }}>Waived</span> : 
                         currentFee.status === "partial" ? <span style={{ background:"#fef3d7",color:"#c07b1a",fontSize:10.5,fontWeight:600,padding:"2px 8px",borderRadius:99 }}>Partial</span> : 
                         currentFee.status === "overdue" ? <span style={{ background:"#fceaea",color:"#b83030",fontSize:10.5,fontWeight:600,padding:"2px 8px",borderRadius:99 }}>Overdue</span> : 
                         <span className="bdg b-due">Due</span>}
                      </td>
                      <td className="mono">{currentFee.paidDate || "—"}</td>
                      <td className="mono">{currentFee.receiptNo || "—"}</td>
                      <td>
                        <span style={{ fontSize: 11, color: "var(--ink3)", fontStyle: "italic" }}>
                          (Edit in Fee Tracking tab)
                        </span>
                      </td>
                    </tr>

                    {/* Historical months from history array */}
                    {history.map((record, i) => (
                      <tr key={record.month}>
                        <td style={{ fontWeight: 600, color: "var(--ink)" }}>{record.month}</td>
                        <td className="mono">
                          {record.status === "waived" ? "—" : record.status === "due" ? "0" : record.amount.toLocaleString()}
                        </td>
                        <td>
                          {record.status === "paid" ? <span className="bdg b-paid">Paid</span> : 
                           record.status === "waived" ? <span style={{ background:"#ede8fc",color:"#6b3ea8",fontSize:10.5,fontWeight:600,padding:"2px 8px",borderRadius:99 }}>Waived</span> : 
                           record.status === "partial" ? <span style={{ background:"#fef3d7",color:"#c07b1a",fontSize:10.5,fontWeight:600,padding:"2px 8px",borderRadius:99 }}>Partial</span> : 
                           <span className="bdg b-due">Due</span>}
                        </td>
                        <td className="mono">{record.date || "—"}</td>
                        <td className="mono">{record.receipt || "—"}</td>
                        <td>
                          {record.status !== "due" && (
                            <div style={{ display: "flex", gap: 6 }}>
                              <button className="btn btn-xs btn-s" onClick={() => openHistoryEdit(record, i)}>Edit</button>
                              <button className="btn btn-xs btn-s" style={{ color: "var(--rb)", borderColor: "var(--rb-l)" }} onClick={() => deleteHistoryRecord(i)}>Delete</button>
                            </div>
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

      <Modal
        open={!!editHistory}
        onClose={() => setEditHistory(null)}
        title={`Edit Historical Payment: ${editHistory?.record?.month}`}
        footer={
          <>
            <button className="btn btn-s btn-sm" onClick={() => setEditHistory(null)}>Cancel</button>
            <button className="btn btn-ok btn-sm" onClick={saveHistoryEdit}>Save Changes</button>
          </>
        }
      >
        {editHistory && (
          <div className="form-gap">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0 4px", borderBottom: "1px solid var(--ln)" }}>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink)" }}>Exempt fee for {editHistory.record.month} (100% Free)</div>
              </div>
              <button 
                className={`toggle ${editForm.isWaived ? "on" : ""}`}
                onClick={() => setEditForm(f => ({ ...f, isWaived: !f.isWaived }))}
              />
            </div>

            {!editForm.isWaived && (
              <>
                <div className="field-row">
                  <div>
                    <label className="flbl">Amount Paid (LKR)</label>
                    <input 
                      type="number" 
                      value={editForm.amount} 
                      onChange={e => setEditForm(f=>({...f, amount:e.target.value}))} 
                    />
                  </div>
                  <div>
                    <label className="flbl">Date paid</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 05-Mar-2026"
                      value={editForm.date} 
                      onChange={e=>setEditForm(f=>({...f, date:e.target.value}))}
                    />
                  </div>
                </div>
                <div>
                  <label className="flbl">Receipt #</label>
                  <input 
                    value={editForm.receipt} 
                    onChange={e=>setEditForm(f=>({...f, receipt:e.target.value}))}
                  />
                </div>
              </>
            )}
            <div style={{ background:"var(--tc-l)",border:"1px solid #b8ddd0",borderRadius:10,padding:"9px 12px",fontSize:11.5,color:"var(--tc-d)", marginTop: 8 }}>
              Historical ledgers will be retroactively adjusted based on these changes.
            </div>
          </div>
        )}
      </Modal>
    </PageShell>
  );
}
