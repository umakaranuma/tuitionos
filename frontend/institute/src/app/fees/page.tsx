"use client";
import { useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { PageShell } from "@/components/layout/PageShell";
import { Modal } from "@/components/ui/Modal";
import { BatchTabs } from "@/components/ui/BatchTabs";
import { BATCHES, ALL_STUDENTS, Student, BatchId, INIT_FEE_STATE, GlobalFeeState } from "@/lib/batchData";
import { useRouter } from "next/navigation";

const PAYMENT_METHODS = ["Cash", "Bank transfer", "Online (card)", "Cheque"];
const CURRENT_MONTH = new Date().toLocaleString("default", { month: "long", year: "numeric" });

export default function FeesPage() {
  const [selBatch, setSelBatch]         = useState<BatchId>("g10");
  const [feeState, setFeeState]         = useState<GlobalFeeState>(INIT_FEE_STATE);
  const [markTarget, setMarkTarget]     = useState<Student | null>(null);
  const [receiptTarget, setReceiptTarget] = useState<Student | null>(null);
  const router = useRouter();
  
  const [payForm, setPayForm] = useState({ 
    method: "Cash", receiptNo: "", 
    paidDate: new Date().toISOString().slice(0, 10),
    amount: "", isWaived: false 
  });
  
  const [reminderSent, setReminderSent] = useState<Set<number>>(new Set());

  const batch    = BATCHES.find(b => b.id === selBatch)!;
  const students = ALL_STUDENTS.filter(s => s.batch === selBatch);

  const getRecord = (s: Student) => feeState[s.id] || { status: "due", paidAmount: 0, credits: 0 };
  const getStatus = (s: Student) => feeState[s.id]?.status ?? s.fee;

  const fullyPaid = students.filter(s => getStatus(s) === "paid").length;
  const waived = students.filter(s => getStatus(s) === "waived").length;
  const partial = students.filter(s => getStatus(s) === "partial").length;
  
  // Outstanding is (Due amount - Paid amount) for anyone who is not completely paid or waived
  const outstanding = students.reduce((sum, s) => {
    const rec = getRecord(s);
    if (rec.status === "waived" || rec.status === "paid") return sum;
    return sum + Math.max(0, s.feeAmount - rec.paidAmount);
  }, 0);
  
  // Total Revenue physically collected
  const revenue = students.reduce((sum, s) => sum + getRecord(s).paidAmount, 0);

  const changeBatch = (id: BatchId) => setSelBatch(id);

  const openCollect = (s: Student, isEdit: boolean = false) => {
    const rec = getRecord(s);
    setPayForm({ 
      method: rec.method || "Cash", 
      receiptNo: rec.receiptNo || `RCP-${String(ALL_STUDENTS.indexOf(s) + 50).padStart(4, "0")}`, 
      paidDate: rec.paidDate || new Date().toISOString().slice(0, 10),
      amount: String(rec.paidAmount || s.feeAmount),
      isWaived: rec.status === "waived"
    });
    setMarkTarget(s);
  };
  const openReceipt = (s: Student) => setReceiptTarget(s);
  const closeAll    = () => { setMarkTarget(null); setReceiptTarget(null); };

  const confirmPaid = () => {
    if (!markTarget) return;
    
    // Waive path
    if (payForm.isWaived) {
      setFeeState(prev => ({
        ...prev,
        [markTarget.id]: { status: "waived", paidAmount: 0, credits: 0, method: undefined, receiptNo: undefined, paidDate: undefined }
      }));
      closeAll();
      return;
    }
    
    // Normal / Partial / Advance path
    const amt = parseFloat(payForm.amount) || 0;
    let newStatus: "paid" | "partial" | "due" | "overdue" = "due";
    let credits = 0;
    
    if (amt >= markTarget.feeAmount) {
      newStatus = "paid";
      credits = amt - markTarget.feeAmount;
    } else if (amt > 0) {
      newStatus = "partial";
    }

    setFeeState(prev => ({
      ...prev,
      [markTarget.id]: { 
        status: newStatus, 
        paidAmount: amt, 
        credits,
        receiptNo: payForm.receiptNo, 
        paidDate: payForm.paidDate,
        method: payForm.method
      },
    }));
    closeAll();
  };

  const sendReminder = (s: Student) => setReminderSent(prev => new Set([...prev, s.id]));
  const sendAllReminders = () => {
    const dueIds = students.filter(s => { const st = getStatus(s); return st !== "paid" && st !== "waived"; }).map(s => s.id);
    setReminderSent(prev => new Set([...prev, ...dueIds]));
  };

  const statusBadge = (s: Student) => {
    const st = getStatus(s);
    if (st === "paid")    return <span className="bdg b-paid">Paid in full</span>;
    if (st === "waived")  return <span style={{ background:"#ede8fc",color:"#6b3ea8",fontSize:10.5,fontWeight:600,padding:"2px 8px",borderRadius:99,display:"inline-flex" }}>Waived (Scholarship)</span>;
    if (st === "partial") return <span style={{ background:"#fef3d7",color:"#c07b1a",fontSize:10.5,fontWeight:600,padding:"2px 8px",borderRadius:99,display:"inline-flex" }}>Partial</span>;
    if (st === "overdue") return <span style={{ background:"#fceaea",color:"#b83030",fontSize:10.5,fontWeight:600,padding:"2px 8px",borderRadius:99,display:"inline-flex" }}>Overdue</span>;
    return <span className="bdg b-due">Due</span>;
  };

  return (
    <PageShell>
      <Topbar
        title="Fee tracking"
        subtitle={`${batch.name} · ${CURRENT_MONTH}`}
        right={
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-s btn-sm">Export Excel</button>
            <button className="btn btn-p btn-sm" onClick={sendAllReminders}>
              Send all reminders
            </button>
          </div>
        }
      />
      <div className="pb fi">
        <BatchTabs active={selBatch} onChange={changeBatch} />

        {/* Batch KPI bar */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 18 }}>
          {[
            { label:"Students",       val: students.length,        sub: batch.label,         color: batch.color,    colorL: batch.colorL },
            { label:"Fully Paid",     val: fullyPaid,              sub: `${waived} waived`, color:"#1a5040", colorL:"#d4ede3" },
            { label:"Outstanding",    val: `${students.length - fullyPaid - waived}`, sub: `LKR ${outstanding.toLocaleString()} left`, color:"#c07b1a", colorL:"#fef3d7" },
            { label:"Revenue",        val: `${(revenue/1000).toFixed(0)}k`, sub: `LKR ${revenue.toLocaleString()} collected`, color:"var(--tc)", colorL:"var(--tc-l)" },
          ].map(kpi => (
            <div key={kpi.label} style={{
              background:"#fff",
              border:`1.5px solid ${kpi.color}22`,
              borderTop:`4px solid ${kpi.color}`,
              borderRadius:12, padding:"12px 14px",
              boxShadow:"0 1px 3px rgba(28,25,23,.06)",
            }}>
              <div style={{ fontSize:10.5,fontWeight:700,color:"var(--ink3)",textTransform:"uppercase",letterSpacing:".06em",marginBottom:4 }}>{kpi.label}</div>
              <div style={{ fontSize:22,fontWeight:700,color:kpi.color,fontFamily:"var(--font-mono)",lineHeight:1 }}>{kpi.val}</div>
              <div style={{ fontSize:10.5,color:"var(--ink3)",marginTop:4 }}>{kpi.sub}</div>
            </div>
          ))}
        </div>

        {/* Collection progress bar */}
        <div style={{ background:"#fff",border:"1.5px solid var(--ln)",borderRadius:12,padding:"14px 16px",marginBottom:18,boxShadow:"0 1px 3px rgba(28,25,23,.05)" }}>
          <div style={{ display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:8 }}>
            <span style={{ fontWeight:700,color:"var(--ink)" }}>Collection progress — {CURRENT_MONTH}</span>
          </div>
          <div style={{ height:8,background:"var(--ln)",borderRadius:99,overflow:"hidden" }}>
            <div style={{
              height:"100%",
              width:`${Math.round((revenue / Math.max(revenue + outstanding, 1)) * 100)}%`,
              background:"linear-gradient(to right,#2d7a5a,#478f6e)",
              borderRadius:99,transition:"width 400ms cubic-bezier(.16,1,.3,1)",
            }} />
          </div>
          <div style={{ display:"flex",justifyContent:"space-between",fontSize:10.5,color:"var(--ink3)",marginTop:5 }}>
            <span style={{ color:"#1a5040",fontWeight:600 }}>LKR {revenue.toLocaleString()} collected</span>
            <span style={{ color:"#c07b1a",fontWeight:600 }}>LKR {outstanding.toLocaleString()} expected</span>
          </div>
        </div>

        {/* Fee table */}
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>Guardian & mobile</th>
                <th>Fee (LKR)</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map(s => {
                const rec = getRecord(s);
                const st = rec.status;
                const sent = reminderSent.has(s.id);
                return (
                  <tr key={s.id} style={{ background: st === "overdue" ? "#fffbeb" : "#fff" }}>
                    <td style={{ cursor: "pointer" }} onClick={() => router.push(`/students/${s.id}`)}>
                      <div className="td-nm" style={{ transition: "all 150ms" }}>
                        <div className="ava" style={{ background: s.bg, color: s.fg }}>{s.initials}</div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 12.5, textDecoration: "underline transparent" }}
                            onMouseEnter={e => e.currentTarget.style.textDecoration = "underline"}
                            onMouseLeave={e => e.currentTarget.style.textDecoration = "underline transparent"}>
                            {s.name}
                          </div>
                          <div style={{ fontSize: 10.5, color: "var(--ink3)" }}>Joined {s.joinDate}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: 12.5, color: "var(--ink2)" }}>{s.guardian}</div>
                      <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--ink3)" }}>{s.mobile}</div>
                    </td>
                    <td className="mono" style={{ fontWeight: 700 }}>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span>{s.feeAmount.toLocaleString()}</span>
                        {st === "partial" && (
                          <div style={{ fontSize: 9.5, color: "#c07b1a", fontWeight: 600, marginTop: 2 }}>
                            Remaining: {(s.feeAmount - rec.paidAmount).toLocaleString()}
                          </div>
                        )}
                        {rec.credits > 0 && (
                          <div style={{ fontSize: 9.5, color: "var(--tc-d)", fontWeight: 600, marginTop: 2 }}>
                            +{(rec.credits).toLocaleString()} advance
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        {statusBadge(s)}
                        {rec.paidDate && st !== "waived" && (
                          <div style={{ fontSize: 10, color: "var(--ink3)" }}>Paid {rec.paidDate}</div>
                        )}
                        {st !== "paid" && st !== "waived" && sent && (
                          <div style={{ fontSize: 10, color: "var(--sp)" }}>✓ Reminder sent</div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                        {st === "due" || st === "overdue" ? (
                          <>
                            <button className="btn btn-xs btn-ok" onClick={() => openCollect(s)}>Collect</button>
                            {!sent
                              ? <button className="btn btn-xs btn-s" onClick={() => sendReminder(s)}>Remind</button>
                              : <button className="btn btn-xs btn-s" style={{ opacity:.5 }} disabled>Sent</button>
                            }
                          </>
                        ) : st === "partial" ? (
                          <>
                            <button className="btn btn-xs btn-ok" onClick={() => openCollect(s, true)}>Collect more</button>
                            <button className="btn btn-xs btn-s" onClick={() => openCollect(s, true)}>Edit</button>
                          </>
                        ) : (
                          <>
                            <button className="btn btn-xs btn-s" onClick={() => openCollect(s, true)}>Edit</button>
                            {st === "paid" && <button className="btn btn-xs btn-s" onClick={() => openReceipt(s)}>Receipt</button>}
                          </>
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

      {/* Collect / Edit Fee modal */}
      <Modal
        open={!!markTarget}
        onClose={closeAll}
        title={markTarget && feeState[markTarget.id]?.status !== "due" && feeState[markTarget.id]?.status !== "overdue" ? "Edit Fee Record" : "Collect Fee"}
        footer={
          <>
            <button className="btn btn-s btn-sm" onClick={closeAll}>Cancel</button>
            <button className="btn btn-ok btn-sm" onClick={confirmPaid}>Save Payment</button>
          </>
        }
      >
        {markTarget && (
          <div className="form-gap">
            <div style={{ display:"flex",alignItems:"center",gap:12,background:"var(--cr)",borderRadius:10,padding:"10px 13px" }}>
              <div className="ava" style={{ background:markTarget.bg,color:markTarget.fg }}>{markTarget.initials}</div>
              <div>
                <div style={{ fontSize:13,fontWeight:700,color:"var(--ink)" }}>{markTarget.name}</div>
                <div style={{ fontSize:11,color:"var(--ink3)" }}>{batch.name}</div>
              </div>
              <div style={{ marginLeft:"auto",textAlign:"right" }}>
                <div style={{ fontSize:11,color:"var(--ink3)" }}>{CURRENT_MONTH} Total Due</div>
                <div style={{ fontSize:16,fontWeight:700,color:"var(--ink)",fontFamily:"var(--font-mono)" }}>
                  LKR {markTarget.feeAmount.toLocaleString()}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0 4px", borderBottom: "1px solid var(--ln)" }}>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink)" }}>Grant scholarship / Waive fee</div>
                <div style={{ fontSize: 10.5, color: "var(--ink3)", marginTop: 2 }}>Waive the fee completely for this student</div>
              </div>
              <button 
                className={`toggle ${payForm.isWaived ? "on" : ""}`}
                onClick={() => setPayForm(f => ({ ...f, isWaived: !f.isWaived }))}
              />
            </div>

            {!payForm.isWaived && (
              <>
                <div className="field-row">
                  <div>
                    <label className="flbl freq">Amount Collected (LKR)</label>
                    <input 
                      type="number" 
                      value={payForm.amount} 
                      onChange={e => setPayForm(f=>({...f, amount:e.target.value}))} 
                    />
                    <div style={{ fontSize: 10, color: "var(--ink3)", marginTop: 6 }}>
                      {(parseFloat(payForm.amount) || 0) < markTarget.feeAmount ? "Pays partial amount. Status will remain Due." : 
                       (parseFloat(payForm.amount) || 0) > markTarget.feeAmount ? `Pays full amount + LKR ${((parseFloat(payForm.amount) || 0) - markTarget.feeAmount).toLocaleString()} in credits.` :
                       "Pays full amount exactly."}
                    </div>
                  </div>
                  <div>
                    <label className="flbl">Payment method</label>
                    <select value={payForm.method} onChange={e => setPayForm(f=>({...f,method:e.target.value}))}>
                      {PAYMENT_METHODS.map(m=><option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>

                <div className="field-row">
                  <div>
                    <label className="flbl">Date received</label>
                    <input type="date" value={payForm.paidDate} onChange={e=>setPayForm(f=>({...f,paidDate:e.target.value}))}/>
                  </div>
                  <div>
                    <label className="flbl">Receipt / reference #</label>
                    <input placeholder="e.g. RCP-0045" value={payForm.receiptNo} onChange={e=>setPayForm(f=>({...f,receiptNo:e.target.value}))}/>
                  </div>
                </div>
              </>
            )}

            <div style={{ background:"var(--tc-l)",border:"1px solid #b8ddd0",borderRadius:10,padding:"9px 12px",fontSize:11.5,color:"var(--tc-d)", marginTop: 8 }}>
              {payForm.isWaived 
                ? "Waive status will be reflected in their account immediately." 
                : `Fee-paid confirmation sent to ${markTarget.guardian} (${markTarget.mobile}) immediately.`}
            </div>
          </div>
        )}
      </Modal>

      {/* Receipt modal */}
      <Modal
        open={!!receiptTarget}
        onClose={closeAll}
        title="Payment receipt"
        footer={
          <>
            <button className="btn btn-s btn-sm" onClick={closeAll}>Close</button>
            <button className="btn btn-p btn-sm">Share via WhatsApp</button>
          </>
        }
      >
        {receiptTarget && (
          <div>
            <div style={{
              border:"2px dashed var(--tc)",borderRadius:14,padding:"20px 22px",
              background:"var(--tc-l)",textAlign:"center",marginBottom:16,
            }}>
              <div style={{ fontSize:11,color:"var(--tc-d)",letterSpacing:".08em",textTransform:"uppercase",fontWeight:700,marginBottom:4 }}>RECEIPT</div>
              <div style={{ fontSize:22,fontWeight:700,color:"var(--ink)",fontFamily:"var(--font-mono)" }}>
                {getReceiptNo(receiptTarget) || "—"}
              </div>
            </div>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
              {[
                { label:"Student",      val: receiptTarget.name },
                { label:"Batch",        val: batch.name },
                { label:"Month",        val: CURRENT_MONTH },
                { label:"Amount (LKR)", val: getRecord(receiptTarget).paidAmount.toLocaleString() },
                { label:"Paid date",    val: getRecord(receiptTarget).paidDate || "—" },
                { label:"Credits",      val: getRecord(receiptTarget).credits > 0 ? `LKR ${getRecord(receiptTarget).credits.toLocaleString()}` : "None" },
              ].map(row=>(
                <div key={row.label} style={{ padding:"9px 11px",background:"var(--cr-d)",borderRadius:9 }}>
                  <div style={{ fontSize:10,color:"var(--ink3)",fontWeight:600,letterSpacing:".04em",textTransform:"uppercase",marginBottom:2 }}>{row.label}</div>
                  <div style={{ fontSize:13,fontWeight:700,color:row.label==="Status"?"var(--tc-d)":"var(--ink)" }}>{row.val}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </PageShell>
  );
}
