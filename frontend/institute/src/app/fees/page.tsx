"use client";
import { useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { PageShell } from "@/components/layout/PageShell";
import { Modal } from "@/components/ui/Modal";

const PAYMENT_METHODS = ["Cash", "Bank transfer", "Online (card)", "Cheque"];

type FeeStatus = "paid" | "due" | "overdue";
type FeeRow = {
  id: number; initials: string; name: string; batch: string;
  amount: string; status: FeeStatus; due: string; month: string;
  bg: string; fg: string; receiptNo?: string; paidDate?: string;
};

const INIT_FEES: FeeRow[] = [
  { id:1, initials:"AK", name:"Aarav Kumar",  batch:"Grade 10 O/L", amount:"5,500", status:"paid",    due:"Apr 5",  month:"April 2026", bg:"var(--tc-l)", fg:"var(--tc-d)", receiptNo:"RCP-0041", paidDate:"2026-04-05" },
  { id:2, initials:"PS", name:"Priya Selvan", batch:"Grade 10 O/L", amount:"5,500", status:"due",     due:"Apr 10", month:"April 2026", bg:"var(--sp-l)", fg:"var(--sp)" },
  { id:3, initials:"ST", name:"Surya T.",     batch:"Grade 10 O/L", amount:"5,500", status:"due",     due:"Apr 10", month:"April 2026", bg:"var(--rb-l)", fg:"var(--rb)" },
  { id:4, initials:"KM", name:"Kavitha M.",   batch:"Grade 7 A",    amount:"3,000", status:"paid",    due:"Apr 4",  month:"April 2026", bg:"var(--sf-l)", fg:"var(--sf)", receiptNo:"RCP-0038", paidDate:"2026-04-04" },
  { id:5, initials:"DR", name:"Dinesh Raj",   batch:"Grade 11 A/L", amount:"7,000", status:"paid",    due:"Apr 3",  month:"April 2026", bg:"var(--pr-l)", fg:"var(--pr)", receiptNo:"RCP-0037", paidDate:"2026-04-03" },
  { id:6, initials:"NV", name:"Nithya V.",    batch:"Grade 7 A",    amount:"3,000", status:"paid",    due:"Apr 4",  month:"April 2026", bg:"var(--tc-l)", fg:"var(--tc-d)", receiptNo:"RCP-0039", paidDate:"2026-04-04" },
  { id:7, initials:"MJ", name:"Meena J.",     batch:"Grade 10 O/L", amount:"5,500", status:"overdue", due:"Mar 10", month:"March 2026", bg:"var(--sf-l)", fg:"var(--sf)" },
  { id:8, initials:"RP", name:"Rajan P.",     batch:"Grade 11 A/L", amount:"7,000", status:"paid",    due:"Apr 3",  month:"April 2026", bg:"var(--sp-l)", fg:"var(--sp)", receiptNo:"RCP-0040", paidDate:"2026-04-03" },
];

const statusBadge = (s: FeeStatus) => {
  if (s === "paid")    return <span className="bdg b-paid">Paid</span>;
  if (s === "due")     return <span className="bdg b-due">Due</span>;
  return <span style={{ background:"var(--rb-l)", color:"var(--rb)", fontSize:10.5, fontWeight:600, padding:"2px 8px", borderRadius:99, display:"inline-flex" }}>Overdue</span>;
};

export default function FeesPage() {
  const [fees, setFees]         = useState<FeeRow[]>(INIT_FEES);
  const [markTarget, setMarkTarget] = useState<FeeRow | null>(null);
  const [receiptTarget, setReceiptTarget] = useState<FeeRow | null>(null);
  const [payForm, setPayForm]   = useState({ method: "Cash", receiptNo: "", paidDate: new Date().toISOString().slice(0,10) });

  const openMarkPaid = (f: FeeRow) => {
    setPayForm({ method: "Cash", receiptNo: `RCP-${String(fees.length + 50).padStart(4,"0")}`, paidDate: new Date().toISOString().slice(0,10) });
    setMarkTarget(f);
  };
  const openReceipt  = (f: FeeRow) => setReceiptTarget(f);
  const closeAll     = () => { setMarkTarget(null); setReceiptTarget(null); };

  const confirmPaid = () => {
    if (!markTarget) return;
    setFees(prev => prev.map(f => f.id === markTarget.id
      ? { ...f, status: "paid", receiptNo: payForm.receiptNo, paidDate: payForm.paidDate }
      : f
    ));
    closeAll();
  };

  const paid    = fees.filter(f => f.status === "paid").length;
  const due     = fees.filter(f => f.status !== "paid").length;
  const revenue = fees.filter(f => f.status === "paid").reduce((s,f) => s + parseInt(f.amount.replace(",","")), 0);
  const outstanding = fees.filter(f => f.status !== "paid").reduce((s,f) => s + parseInt(f.amount.replace(",","")), 0);

  return (
    <PageShell>
      <Topbar
        title="Fee tracking"
        subtitle="April 2026"
        right={
          <>
            <button className="btn btn-s btn-sm">Export PDF</button>
            <button className="btn btn-p btn-sm">Send reminders</button>
          </>
        }
      />
      <div className="pb fi">
        <div className="g4" style={{ marginBottom:18 }}>
          <div className="kpi" style={{ "--kc":"var(--tc)" } as React.CSSProperties}>
            <div className="kpi-lbl">Collected</div>
            <div className="kpi-val">{paid}</div>
            <div className="kpi-tr up">{Math.round(paid/fees.length*100)}% students</div>
          </div>
          <div className="kpi" style={{ "--kc":"var(--sf)" } as React.CSSProperties}>
            <div className="kpi-lbl">Outstanding</div>
            <div className="kpi-val">{due}</div>
            <div className="kpi-tr nt">LKR {outstanding.toLocaleString()}</div>
          </div>
          <div className="kpi" style={{ "--kc":"var(--sp)" } as React.CSSProperties}>
            <div className="kpi-lbl">Revenue</div>
            <div className="kpi-val">{(revenue/1000).toFixed(0)}K</div>
            <div className="kpi-tr nt">LKR {revenue.toLocaleString()}</div>
          </div>
          <div className="kpi" style={{ "--kc":"var(--rb)" } as React.CSSProperties}>
            <div className="kpi-lbl">Overdue 10+ days</div>
            <div className="kpi-val">{fees.filter(f => f.status==="overdue").length}</div>
            <div className="kpi-tr dn">Need follow-up</div>
          </div>
        </div>

        <div className="tw">
          <table>
            <thead>
              <tr>
                <th>Student</th><th>Batch</th><th>Amount (LKR)</th>
                <th>Month</th><th>Status</th><th>Due date</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {fees.map(f => (
                <tr key={f.id}>
                  <td>
                    <div className="td-nm">
                      <div className="ava" style={{ background:f.bg, color:f.fg }}>{f.initials}</div>
                      {f.name}
                    </div>
                  </td>
                  <td style={{ color:"var(--ink3)" }}>{f.batch}</td>
                  <td className="mono">{f.amount}</td>
                  <td style={{ color:"var(--ink3)", fontSize:12 }}>{f.month}</td>
                  <td>{statusBadge(f.status)}</td>
                  <td className="mono">{f.due}</td>
                  <td>
                    <div style={{ display:"flex", gap:4 }}>
                      {f.status !== "paid" && (
                        <button className="btn btn-xs btn-ok" onClick={() => openMarkPaid(f)}>Mark paid</button>
                      )}
                      {f.status === "paid" && (
                        <button className="btn btn-xs btn-s" onClick={() => openReceipt(f)}>Receipt</button>
                      )}
                      {f.status !== "paid" && <button className="btn btn-xs btn-s">Remind</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Mark Paid modal ── */}
      <Modal
        open={!!markTarget}
        onClose={closeAll}
        title="Record payment"
        footer={
          <>
            <button className="btn btn-s btn-sm" onClick={closeAll}>Cancel</button>
            <button className="btn btn-ok btn-sm" onClick={confirmPaid}>Confirm payment</button>
          </>
        }
      >
        {markTarget && (
          <div className="form-gap">
            {/* Student info row */}
            <div style={{ display:"flex", alignItems:"center", gap:12, background:"var(--cr)", borderRadius:10, padding:"10px 13px" }}>
              <div className="ava" style={{ background:markTarget.bg, color:markTarget.fg }}>{markTarget.initials}</div>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:"var(--ink)" }}>{markTarget.name}</div>
                <div style={{ fontSize:11, color:"var(--ink3)" }}>{markTarget.batch}</div>
              </div>
              <div style={{ marginLeft:"auto", textAlign:"right" }}>
                <div style={{ fontSize:11, color:"var(--ink3)" }}>{markTarget.month}</div>
                <div style={{ fontSize:15, fontWeight:700, color:"var(--ink)", fontFamily:"var(--font-mono)" }}>
                  LKR {markTarget.amount}
                </div>
              </div>
            </div>

            <div className="field-row">
              <div>
                <label className="flbl">Payment method</label>
                <select value={payForm.method} onChange={e => setPayForm(f => ({ ...f, method: e.target.value }))}>
                  {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="flbl">Date received</label>
                <input type="date" value={payForm.paidDate} onChange={e => setPayForm(f => ({ ...f, paidDate: e.target.value }))} />
              </div>
            </div>

            <div>
              <label className="flbl">Receipt / reference #</label>
              <input placeholder="e.g. RCP-0045" value={payForm.receiptNo}
                onChange={e => setPayForm(f => ({ ...f, receiptNo: e.target.value }))} />
              <div className="fhint">Shown on the digital receipt sent to parent via WhatsApp</div>
            </div>

            <div style={{
              background:"var(--tc-l)", border:"1px solid #b8ddd0", borderRadius:10,
              padding:"9px 12px", fontSize:11.5, color:"var(--tc-d)"
            }}>
              A fee-paid confirmation will be sent to the guardian&apos;s WhatsApp immediately.
            </div>
          </div>
        )}
      </Modal>

      {/* ── Receipt modal ── */}
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
              border:"2px dashed var(--tc)", borderRadius:14, padding:"20px 22px",
              background:"var(--tc-l)", textAlign:"center", marginBottom:16
            }}>
              <div style={{ fontSize:11, color:"var(--tc-d)", letterSpacing:".08em", textTransform:"uppercase", fontWeight:700, marginBottom:4 }}>
                RECEIPT
              </div>
              <div style={{ fontSize:22, fontWeight:700, color:"var(--ink)", fontFamily:"var(--font-mono)" }}>
                {receiptTarget.receiptNo || "—"}
              </div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              {[
                { label:"Student",        val: receiptTarget.name },
                { label:"Batch",          val: receiptTarget.batch },
                { label:"Month",          val: receiptTarget.month },
                { label:"Amount (LKR)",   val: receiptTarget.amount },
                { label:"Paid date",      val: receiptTarget.paidDate || "—" },
                { label:"Status",         val: "✓ Paid" },
              ].map(row => (
                <div key={row.label} style={{ padding:"9px 11px", background:"var(--cr-d)", borderRadius:9 }}>
                  <div style={{ fontSize:10, color:"var(--ink3)", fontWeight:600, letterSpacing:".04em", textTransform:"uppercase", marginBottom:2 }}>{row.label}</div>
                  <div style={{ fontSize:13, fontWeight:700, color: row.label==="Status" ? "var(--tc-d)" : "var(--ink)" }}>
                    {row.val}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </PageShell>
  );
}
