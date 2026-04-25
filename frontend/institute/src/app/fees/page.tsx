"use client";
import { useState, useMemo } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { PageShell } from "@/components/layout/PageShell";
import { Modal } from "@/components/ui/Modal";
import { DataTable, Column } from "@/components/ui/DataTable";
import { BatchTabs } from "@/components/ui/BatchTabs";
import { BATCHES, ALL_STUDENTS, Student, BatchId, INIT_FEE_STATE, GlobalFeeState, INIT_FEE_HISTORY } from "@/lib/batchData";
import { useRouter } from "next/navigation";

const PAYMENT_METHODS = ["Cash", "Bank transfer", "Online (card)", "Cheque"];
const MONTH_OPTS = ["April 2026", "March 2026", "February 2026", "January 2026"];
const CURRENT_MONTH = MONTH_OPTS[0];

export default function FeesPage() {
  const [selMonth, setSelMonth]         = useState(CURRENT_MONTH);
  const [selBatch, setSelBatch]         = useState<BatchId>("g10");
  const [feeState, setFeeState]         = useState<GlobalFeeState>(INIT_FEE_STATE);
  const [historyState, setHistoryState] = useState(INIT_FEE_HISTORY);
  const [markTarget, setMarkTarget]     = useState<Student | null>(null);
  const [receiptTarget, setReceiptTarget] = useState<Student | null>(null);
  const [search, setSearch]             = useState("");
  const router = useRouter();
  
  const [payForm, setPayForm] = useState({ 
    method: "Cash", receiptNo: "", 
    paidDate: new Date().toISOString().slice(0, 10),
    amount: "", isWaived: false 
  });
  
  const [reminderSent, setReminderSent] = useState<Set<number>>(new Set());

  const batch    = BATCHES.find(b => b.id === selBatch)!;
  const students = ALL_STUDENTS.filter(s => s.batch === selBatch);

  const isCurrent = selMonth === CURRENT_MONTH;

  type FeeRecord = { status: string; paidAmount: number; credits: number; method?: string; paidDate?: string; receiptNo?: string; date?: string };
  const getRecord = (s: Student): FeeRecord => {
    if (s.isFree) return { status: "waived", paidAmount: 0, credits: 0 };
    if (!isCurrent) {
      const hist = historyState[s.id]?.find(r => r.month === selMonth);
      if (hist) return { status: hist.status, paidAmount: hist.amount, credits: 0, paidDate: hist.date, receiptNo: hist.receipt };
      return { status: "due", paidAmount: 0, credits: 0 };
    }
    return feeState[s.id] || { status: "due", paidAmount: 0, credits: 0 };
  };
  const getStatus = (s: Student) => {
    if (s.isFree) return "waived";
    if (!isCurrent) {
      const hist = historyState[s.id]?.find(r => r.month === selMonth);
      return hist ? hist.status : "due";
    }
    return feeState[s.id]?.status ?? s.fee;
  };

  // Filtered by search
  const filteredStudents = useMemo(() => students.filter(s =>
    !search ||
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.mobile.includes(search) || s.guardian.toLowerCase().includes(search.toLowerCase())
  ), [students, search]);

  const fullyPaid = students.filter(s => getStatus(s) === "paid").length;
  const waived = students.filter(s => getStatus(s) === "waived").length;
  
  const outstanding = students.reduce((sum, s) => {
    const rec = getRecord(s);
    if (rec.status === "waived" || rec.status === "paid") return sum;
    return sum + Math.max(0, s.feeAmount - rec.paidAmount);
  }, 0);
  
  const revenue = students.reduce((sum, s) => sum + getRecord(s).paidAmount, 0);

  const changeBatch = (id: BatchId) => { setSelBatch(id); setSearch(""); };

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
    
    if (payForm.isWaived) {
      setFeeState(prev => ({
        ...prev,
        [markTarget.id]: { status: "waived", paidAmount: 0, credits: 0, method: undefined, receiptNo: undefined, paidDate: undefined }
      }));
      closeAll();
      return;
    }
    
    const amt = parseFloat(payForm.amount) || 0;
    let newStatus: "paid" | "partial" | "due" | "overdue" = "due";
    let credits = 0;
    
    if (amt >= markTarget.feeAmount) {
      newStatus = "paid";
      credits = amt - markTarget.feeAmount;
    } else if (amt > 0) {
      newStatus = "partial";
    }

    if (!isCurrent) {
      setHistoryState(prev => {
        const copy = { ...prev };
        const studentHist = [...(copy[markTarget.id] || [])];
        const idx = studentHist.findIndex(r => r.month === selMonth);
        const newRecord = { 
          month: selMonth, amount: payForm.isWaived ? 0 : amt, 
          status: payForm.isWaived ? "waived" as const : newStatus,
          date: payForm.isWaived ? undefined : payForm.paidDate,
          receipt: payForm.isWaived ? undefined : payForm.receiptNo
        };
        if (idx !== -1) studentHist[idx] = newRecord;
        else studentHist.push(newRecord);
        copy[markTarget.id] = studentHist;
        return copy;
      });
      closeAll();
      return;
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

  const sendReminder = (s: Student) => setReminderSent(prev => new Set(Array.from(prev).concat(s.id)));
  const sendAllReminders = () => {
    const dueIds = students.filter(s => { const st = getStatus(s); return st !== "paid" && st !== "waived"; }).map(s => s.id);
    setReminderSent(prev => new Set(Array.from(prev).concat(dueIds)));
  };

  const statusBadge = (s: Student) => {
    const st = getStatus(s);
    if (s.isFree) return <span style={{ background:"#ede8fc",color:"#6b3ea8",fontSize:10.5,fontWeight:600,padding:"2px 8px",borderRadius:99,display:"inline-flex" }}>Free student</span>;
    if (st === "paid")    return <span className="bdg b-paid">Paid ✓</span>;
    if (st === "waived")  return <span style={{ background:"#ede8fc",color:"#6b3ea8",fontSize:10.5,fontWeight:600,padding:"2px 8px",borderRadius:99,display:"inline-flex" }}>Waived</span>;
    if (st === "partial") return <span style={{ background:"#fef3d7",color:"#c07b1a",fontSize:10.5,fontWeight:600,padding:"2px 8px",borderRadius:99,display:"inline-flex" }}>Part paid</span>;
    if (st === "overdue") return <span style={{ background:"#fceaea",color:"#b83030",fontSize:10.5,fontWeight:600,padding:"2px 8px",borderRadius:99,display:"inline-flex" }}>Late</span>;
    return <span className="bdg b-due">Not paid</span>;
  };

  /* ── Column definitions ── */
  const columns: Column<Student>[] = [
    {
      key: "student",
      header: "Name",
      width: 200,
      render: (s) => (
        <div className="td-nm" style={{ transition: "all 150ms" }}>
          <div className="ava" style={{ background: s.bg, color: s.fg }}>{s.initials}</div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 12.5 }}>
              {s.name}
            </div>
            <div style={{ fontSize: 10.5, color: "var(--ink3)" }}>Joined {s.joinDate}</div>
          </div>
        </div>
      ),
    },
    {
      key: "guardian",
      header: "Parent & phone",
      render: (s) => (
        <div>
          <div style={{ fontSize: 12.5, color: "var(--ink2)" }}>{s.guardian}</div>
          <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--ink3)" }}>{s.mobile}</div>
        </div>
      ),
    },
    {
      key: "fee",
      header: "Amount (LKR)",
      render: (s) => {
        const rec = getRecord(s);
        const st = rec.status;
        return (
          <div className="mono" style={{ fontWeight: 700 }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {s.isFree ? (
                <span style={{ fontSize: 11, color: "var(--ink3)" }}>—</span>
              ) : (
                <>
                  <span>{s.feeAmount.toLocaleString()}</span>
                  {st === "partial" && (
                    <div style={{ fontSize: 9.5, color: "#c07b1a", fontWeight: 600, marginTop: 2 }}>
                      Left: LKR {(s.feeAmount - rec.paidAmount).toLocaleString()}
                    </div>
                  )}
                  {(rec.credits ?? 0) > 0 && (
                    <div style={{ fontSize: 9.5, color: "var(--tc-d)", fontWeight: 600, marginTop: 2 }}>
                      +LKR {(rec.credits ?? 0).toLocaleString()} extra paid
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      render: (s) => {
        const rec = getRecord(s);
        const st = rec.status;
        const sent = reminderSent.has(s.id);
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {statusBadge(s)}
            {rec.paidDate && st !== "waived" && (
              <div style={{ fontSize: 10, color: "var(--ink3)" }}>Paid {rec.paidDate}</div>
            )}
            {st !== "paid" && st !== "waived" && sent && (
              <div style={{ fontSize: 10, color: "var(--sp)" }}>✓ Reminder sent</div>
            )}
          </div>
        );
      },
    },
    {
      key: "actions",
      header: "Actions",
      width: 160,
      render: (s) => {
        const st = getStatus(s);
        const sent = reminderSent.has(s.id);
        return (
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }} onClick={e => e.stopPropagation()}>
            {!s.isFree && (
              st === "due" || st === "overdue" ? (
                <>
                  <button className="btn btn-xs btn-ok" onClick={() => openCollect(s)}>Collect fee</button>
                  {!sent
                    ? <button className="btn btn-xs btn-s" onClick={() => sendReminder(s)}>Send reminder</button>
                    : <button className="btn btn-xs btn-s" style={{ opacity:.5 }} disabled>Sent</button>
                  }
                </>
              ) : st === "partial" ? (
                <>
                  <button className="btn btn-xs btn-ok" onClick={() => openCollect(s, true)}>Add payment</button>
                  <button className="btn btn-xs btn-s" onClick={() => openCollect(s, true)}>Edit</button>
                </>
              ) : (
                <>
                  <button className="btn btn-xs btn-s" onClick={() => openCollect(s, true)}>Edit</button>
                  {st === "paid" && <button className="btn btn-xs btn-s" onClick={() => openReceipt(s)}>View receipt</button>}
                </>
              )
            )}
          </div>
        );
      },
    },
  ];

  return (
    <PageShell>
      <Topbar
        title="Fees"
        subtitle={`${batch.name} · ${selMonth}`}
        right={
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ position: "relative" }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="var(--ink3)" strokeWidth="1.5"
                style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }}>
                <circle cx="6" cy="6" r="4.5"/><path d="M9.5 9.5L13 13"/>
              </svg>
              <input
                placeholder="Search student…"
                style={{ width: 180, paddingLeft: 30 }}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <button className="btn btn-s btn-sm">Download</button>
            <button className="btn btn-p btn-sm" onClick={sendAllReminders}>
              Remind all
            </button>
          </div>
        }
      />
      <div className="pb fi">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <BatchTabs active={selBatch} onChange={changeBatch} />
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: ".06em" }}>Month:</span>
            <select 
              value={selMonth} 
              onChange={e => setSelMonth(e.target.value)}
              style={{
                padding: "8px 12px", borderRadius: 8, border: "1.5px solid var(--ln)", outline: "none",
                fontSize: 12.5, fontWeight: 600, color: "var(--ink)", background: "#fff", cursor: "pointer",
                boxShadow: "0 1px 2px rgba(0,0,0,.04)"
              }}
            >
              {MONTH_OPTS.map(m => <option key={m} value={m}>{m} {m === CURRENT_MONTH ? "(Current)" : ""}</option>)}
            </select>
          </div>
        </div>

        {/* Batch KPI bar */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 18 }}>
          {[
            { label:"Students",       val: students.length,        sub: batch.label,         color: batch.color,    colorL: batch.colorL },
            { label:"Paid",           val: fullyPaid,              sub: `${waived} free / waived`, color:"#1a5040", colorL:"#d4ede3" },
            { label:"Not paid",       val: `${students.length - fullyPaid - waived}`, sub: `LKR ${outstanding.toLocaleString()} remaining`, color:"#c07b1a", colorL:"#fef3d7" },
            { label:"Collected",      val: `${(revenue/1000).toFixed(0)}k`, sub: `LKR ${revenue.toLocaleString()} received`, color:"var(--tc)", colorL:"var(--tc-l)" },
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
            <span style={{ fontWeight:700,color:"var(--ink)" }}>Fee collection — {CURRENT_MONTH}</span>
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
            <span style={{ color:"#1a5040",fontWeight:600 }}>LKR {revenue.toLocaleString()} received</span>
            <span style={{ color:"#c07b1a",fontWeight:600 }}>LKR {outstanding.toLocaleString()} remaining</span>
          </div>
        </div>

        {/* Bulk reminder banner */}
        {(() => {
          const unpaid = students.filter(s => {
            const st = getStatus(s);
            return st !== "paid" && st !== "waived" && !s.isFree;
          });
          const notYetReminded = unpaid.filter(s => !reminderSent.has(s.id));
          const allReminded = unpaid.length > 0 && notYetReminded.length === 0;

          if (unpaid.length === 0) return null;

          return (
            <div style={{
              background: allReminded ? "var(--tc-l)" : "#fff",
              border: `1.5px solid ${allReminded ? "#b8ddd0" : "#e8c36a"}`,
              borderRadius: 12, padding: "14px 18px", marginBottom: 18,
              display: "flex", alignItems: "center", justifyContent: "space-between",
              gap: 16,
              boxShadow: "0 1px 3px rgba(28,25,23,.05)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 10,
                  background: allReminded ? "#d4ede3" : "#fef3d7",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 18, flexShrink: 0,
                }}>
                  {allReminded ? "✓" : "📢"}
                </div>
                <div>
                  {allReminded ? (
                    <>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--tc-d)" }}>
                        Reminders sent to all {unpaid.length} unpaid students
                      </div>
                      <div style={{ fontSize: 11, color: "var(--ink3)", marginTop: 2 }}>
                        WhatsApp messages queued for {batch.name}
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>
                        {notYetReminded.length} student{notYetReminded.length !== 1 ? "s" : ""} haven't paid yet
                      </div>
                      <div style={{ fontSize: 11, color: "var(--ink3)", marginTop: 2 }}>
                        {notYetReminded.slice(0, 3).map(s => s.name).join(", ")}
                        {notYetReminded.length > 3 ? ` and ${notYetReminded.length - 3} more` : ""}
                        {" · "}{batch.name}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {!allReminded && (
                <button
                  className="btn btn-sm"
                  onClick={sendAllReminders}
                  style={{
                    background: "#c07b1a", color: "#fff",
                    border: "none", borderRadius: 8,
                    padding: "8px 18px", fontSize: 12.5, fontWeight: 700,
                    cursor: "pointer", whiteSpace: "nowrap",
                    display: "flex", alignItems: "center", gap: 6,
                    boxShadow: "0 2px 6px rgba(192,123,26,.25)",
                    transition: "all 150ms",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "#a86a14"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "#c07b1a"; }}
                >
                  📲 Send {notYetReminded.length} reminder{notYetReminded.length !== 1 ? "s" : ""}
                </button>
              )}
            </div>
          );
        })()}

        {/* Fee table with pagination */}
        <DataTable<Student>
          columns={columns}
          data={filteredStudents}
          rowKey={s => s.id}
          defaultPerPage={10}
          onRowClick={s => router.push(`/students/${s.id}`)}
          rowBg={s => getStatus(s) === "overdue" ? "#fffbeb" : undefined}
          emptyMessage={search ? `No students match "${search}"` : "No students in this batch"}
          title={`All students (${filteredStudents.length})`}
        />
      </div>

      {/* Collect / Edit Fee modal */}
      <Modal
        open={!!markTarget}
        onClose={closeAll}
        title={markTarget && feeState[markTarget.id]?.status !== "due" && feeState[markTarget.id]?.status !== "overdue" ? "Edit payment" : "Collect fee"}
        footer={
          <>
            <button className="btn btn-s btn-sm" onClick={closeAll}>Cancel</button>
            <button className="btn btn-ok btn-sm" onClick={confirmPaid}>Save</button>
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
                <div style={{ fontSize:11,color:"var(--ink3)" }}>{selMonth} fee</div>
                <div style={{ fontSize:16,fontWeight:700,color:"var(--ink)",fontFamily:"var(--font-mono)" }}>
                  LKR {markTarget.feeAmount.toLocaleString()}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0 4px", borderBottom: "1px solid var(--ln)" }}>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink)" }}>Skip fee for {isCurrent ? "this month" : selMonth}</div>
                <div style={{ fontSize: 10.5, color: "var(--ink3)", marginTop: 2 }}>Student won't be charged for {isCurrent ? "this" : "that"} month.</div>
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
                    <label className="flbl freq">Amount received (LKR)</label>
                    <input 
                      type="number" 
                      value={payForm.amount} 
                      onChange={e => setPayForm(f=>({...f, amount:e.target.value}))} 
                    />
                    <div style={{ fontSize: 10, color: "var(--ink3)", marginTop: 6 }}>
                      {(parseFloat(payForm.amount) || 0) < markTarget.feeAmount ? "This is less than the full fee — will show as partly paid." : 
                       (parseFloat(payForm.amount) || 0) > markTarget.feeAmount ? `Full fee paid + LKR ${((parseFloat(payForm.amount) || 0) - markTarget.feeAmount).toLocaleString()} extra.` :
                       "Exact fee amount — will be marked as fully paid."}
                    </div>
                  </div>
                  <div>
                    <label className="flbl">Paid by</label>
                    <select value={payForm.method} onChange={e => setPayForm(f=>({...f,method:e.target.value}))}>
                      {PAYMENT_METHODS.map(m=><option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>

                <div className="field-row">
                  <div>
                    <label className="flbl">Date paid</label>
                    <input type="date" value={payForm.paidDate} onChange={e=>setPayForm(f=>({...f,paidDate:e.target.value}))}/>
                  </div>
                  <div>
                    <label className="flbl">Receipt number</label>
                    <input placeholder="e.g. RCP-0045" value={payForm.receiptNo} onChange={e=>setPayForm(f=>({...f,receiptNo:e.target.value}))}/>
                  </div>
                </div>
              </>
            )}

            <div style={{ background:"var(--tc-l)",border:"1px solid #b8ddd0",borderRadius:10,padding:"9px 12px",fontSize:11.5,color:"var(--tc-d)", marginTop: 8 }}>
              {payForm.isWaived 
                ? "This student's fee will be skipped for this month." 
                : `A payment confirmation will be sent to ${markTarget.guardian}.`}
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
                {getRecord(receiptTarget).receiptNo || "—"}
              </div>
            </div>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
              {[
                { label:"Student",      val: receiptTarget.name },
                { label:"Batch",        val: batch.name },
                { label:"Month",        val: CURRENT_MONTH },
                { label:"Amount (LKR)", val: getRecord(receiptTarget).paidAmount.toLocaleString() },
                { label:"Paid date",    val: getRecord(receiptTarget).paidDate || "—" },
                { label:"Credits",      val: (getRecord(receiptTarget).credits ?? 0) > 0 ? `LKR ${(getRecord(receiptTarget).credits ?? 0).toLocaleString()}` : "None" },
              ].map(row=>(
                <div key={row.label} style={{ padding:"9px 11px",background:"var(--cr-d)",borderRadius:9 }}>
                  <div style={{ fontSize:10,color:"var(--ink3)",fontWeight:600,letterSpacing:".04em",textTransform:"uppercase",marginBottom:2 }}>{row.label}</div>
                  <div style={{ fontSize:13,fontWeight:700,color:"var(--ink)" }}>{row.val}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </PageShell>
  );
}
