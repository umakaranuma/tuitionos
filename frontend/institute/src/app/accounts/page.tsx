"use client";
import { useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { PageShell } from "@/components/layout/PageShell";
import { Modal } from "@/components/ui/Modal";
import { 
  ALL_STUDENTS, INIT_FEE_STATE, INIT_FEE_HISTORY, 
  INIT_TEACHER_PAYMENTS, INIT_TEACHER_ADVANCES,
  INIT_TRANSACTIONS, InstituteTransaction 
} from "@/lib/batchData";

const MONTH_OPTS = ["All Time", "April 2026", "March 2026", "February 2026", "January 2026"];
const TX_CATEGORIES = {
  expense: ["Utility Bill", "Staff Salary", "Rent", "Maintenance", "Other"],
  income: ["Sponsorship", "Other Income"]
};

export default function AccountsPage() {
  const [selMonth, setSelMonth] = useState("April 2026");
  const [transactions, setTransactions] = useState<InstituteTransaction[]>(INIT_TRANSACTIONS);
  const [modal, setModal] = useState(false);
  
  const [form, setForm] = useState({
    type: "expense" as InstituteTransaction["type"],
    category: "Utility Bill" as InstituteTransaction["category"],
    label: "",
    amount: "",
    date: new Date().toISOString().slice(0, 10),
  });

  // Calculate Student Income
  const calculateStudentIncome = () => {
    let total = 0;
    ALL_STUDENTS.forEach(s => {
      if (selMonth === "All Time" || selMonth === "April 2026") {
        const rec = INIT_FEE_STATE[s.id];
        if (rec) total += (rec.paidAmount || 0);
      }
      if (selMonth === "All Time" || selMonth !== "April 2026") {
        const hist = INIT_FEE_HISTORY[s.id] || [];
        hist.forEach(h => {
          if (selMonth === "All Time" || h.month === selMonth) {
            total += h.amount || 0;
          }
        });
      }
    });
    return total;
  };

  // Calculate Teacher Outflow
  const calculateTeacherOutflow = () => {
    let total = 0;
    // Monthly Salaries & Advances processed via Teacher Payments
    INIT_TEACHER_PAYMENTS.forEach(p => {
      if (p.status === "paid" && (selMonth === "All Time" || p.month === selMonth)) {
        total += p.amount;
      }
    });
    // Direct advance disbursements not rolled into monthly pay
    if (selMonth === "All Time" || selMonth === "January 2026") {
      const advJan = INIT_TEACHER_ADVANCES.find(a => a.id === 1);
      if (advJan) total += advJan.amount; // 20k given in Jan 2026
    }
    if (selMonth === "All Time" || selMonth === "March 2026") {
      const advMar = INIT_TEACHER_ADVANCES.find(a => a.id === 2);
      if (advMar) total += advMar.amount; // 10k given in Mar 2026
    }
    return total;
  };

  // Calculate Other Expenses Outflow
  const calculateOtherExpenses = () => {
    return transactions
      .filter(e => e.type === "expense" && (selMonth === "All Time" || e.month === selMonth))
      .reduce((sum, e) => sum + e.amount, 0);
  };

  const calculateAdditionalIncome = () => {
    return transactions
      .filter(e => e.type === "income" && (selMonth === "All Time" || e.month === selMonth))
      .reduce((sum, e) => sum + e.amount, 0);
  };

  const baseStudentIncome = calculateStudentIncome();
  const additionalIncome = calculateAdditionalIncome();
  const totalIncome = baseStudentIncome + additionalIncome;

  const teacherOutflow = calculateTeacherOutflow();
  const otherOutflow = calculateOtherExpenses();
  const totalOutflow = teacherOutflow + otherOutflow;
  const netBalance = totalIncome - totalOutflow;

  const currentTransactions = transactions.filter(e => selMonth === "All Time" || e.month === selMonth);

  const saveTransaction = () => {
    if (!form.label.trim() || !parseFloat(form.amount)) return;
    setTransactions(prev => [{
      id: prev.length + 1,
      month: selMonth === "All Time" ? "April 2026" : selMonth,
      type: form.type,
      category: form.category,
      label: form.label,
      amount: parseFloat(form.amount),
      date: form.date
    }, ...prev]);
    setModal(false);
    setForm({ ...form, label: "", amount: "" });
  };

  return (
    <PageShell>
      <Topbar
        title="Accounts & General Ledger"
        subtitle="Institute Financial Overview"
        right={
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: ".06em" }}>Filter:</span>
            <select 
              value={selMonth} 
              onChange={e => setSelMonth(e.target.value)}
              style={{
                padding: "8px 12px", borderRadius: 8, border: "1.5px solid var(--ln)", outline: "none",
                fontSize: 12.5, fontWeight: 600, color: "var(--ink)", background: "#fff", cursor: "pointer",
                boxShadow: "0 1px 2px rgba(0,0,0,.04)"
              }}
            >
              {MONTH_OPTS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        }
      />
      <div className="pb fi form-gap">
        
        {/* BIG KPI CARDS */}
        <div className="g4" style={{ marginBottom: 18 }}>
          {/* INCOME */}
          <div className="kpi" style={{ "--kc": "var(--tc)" } as any}>
            <div className="kpi-lbl">Total Institute Income</div>
            <div className="kpi-val" style={{ fontSize: 24 }}>LKR {totalIncome.toLocaleString()}</div>
            <div className="kpi-tr" style={{ color: "var(--ink3)" }}>
              Fees: {baseStudentIncome.toLocaleString()} {additionalIncome > 0 && `· Other: ${additionalIncome.toLocaleString()}`}
            </div>
          </div>

          {/* OUTFLOW */}
          <div className="kpi" style={{ "--kc": "var(--rb)" } as any}>
            <div className="kpi-lbl">Total Institute Outflow</div>
            <div className="kpi-val" style={{ fontSize: 24 }}>LKR {totalOutflow.toLocaleString()}</div>
            <div className="kpi-tr" style={{ color: "var(--ink3)" }}>
              Teachers: {teacherOutflow.toLocaleString()} · Other: {otherOutflow.toLocaleString()}
            </div>
          </div>

          {/* NET BALANCE */}
          <div className="kpi" style={{ "--kc": "var(--sp)" } as any}>
            <div className="kpi-lbl">Net Available Balance</div>
            <div className="kpi-val" style={{ fontSize: 24 }}>
              {netBalance < 0 ? "-" : ""}LKR {Math.abs(netBalance).toLocaleString()}
            </div>
            <div className="kpi-tr" style={{ color: "var(--ink3)" }}>Gross income minus expenses</div>
          </div>
        </div>

        {/* Visual Bar */}
        <div style={{ background: "#fff", border: "1px solid var(--ln)", borderRadius: 12, padding: "20px", display: "flex", flexDirection: "column", gap: 12, boxShadow: "var(--sh)" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>Cash Flow Breakdown</div>
          <div style={{ position: "relative", height: 24, background: "#f5f5f3", borderRadius: 99, overflow: "hidden", display: "flex" }}>
            {totalIncome > 0 && (
              <div style={{ 
                width: `${Math.max(15, (totalIncome / (totalIncome + totalOutflow)) * 100)}%`, 
                background: "#2d7a5a", height: "100%", display: "flex", alignItems: "center", padding: "0 12px", color: "#fff", fontSize: 11, fontWeight: 700 
              }}>
                Income
              </div>
            )}
            {totalOutflow > 0 && (
              <div style={{ 
                width: `${Math.max(15, (totalOutflow / (totalIncome + totalOutflow)) * 100)}%`, 
                background: "#b83030", height: "100%", display: "flex", alignItems: "center", justifyContent: "flex-end", padding: "0 12px", color: "#fff", fontSize: 11, fontWeight: 700 
              }}>
                Outflow
              </div>
            )}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "var(--ink3)" }}>
            <span>Total Value Generated: LKR {(totalIncome + totalOutflow).toLocaleString()}</span>
            <span>Retained: {totalIncome > 0 ? Math.round((netBalance / totalIncome) * 100) : 0}%</span>
          </div>
        </div>

        {/* Other Expenses Ledger */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 10 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)", marginBottom: 4 }}>Institute Transactions Ledger</div>
            <div style={{ fontSize: 13, color: "var(--ink3)" }}>Track extraneous operational costs, manual salaries, and external incomes.</div>
          </div>
          <button className="btn btn-p btn-sm" onClick={() => {
            setForm({ ...form, type: "expense", category: "Utility Bill", amount: "", label: "" });
            setModal(true);
          }}>+ Add Transaction</button>
        </div>

        <div className="tw">
          <table>
            <thead>
              <tr>
                <th style={{ width: 120 }}>Date</th>
                <th>Type</th>
                <th>Category</th>
                <th>Description / Label</th>
                <th style={{ width: 150 }}>Month Cycle</th>
                <th style={{ textAlign: "right", width: 150 }}>Amount (LKR)</th>
              </tr>
            </thead>
            <tbody>
              {currentTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: 40, color: "var(--ink3)" }}>
                    No extraneous transactions recorded for {selMonth}.
                  </td>
                </tr>
              ) : currentTransactions.map(e => (
                <tr key={e.id}>
                  <td className="mono">{e.date}</td>
                  <td>
                    <span style={{
                      fontSize: 10.5, fontWeight: 700,
                      color: e.type === "income" ? "#1a5040" : "#b83030"
                    }}>
                      {e.type === "income" ? "INCOME" : "EXPENSE"}
                    </span>
                  </td>
                  <td>
                    <span style={{ 
                      fontSize: 10.5, fontWeight: 600, padding: "3px 8px", borderRadius: 6,
                      background: e.category === "Sponsorship" || e.category === "Other Income" ? "#d4ede3" : e.category === "Staff Salary" ? "#ede8fc" : e.category === "Utility Bill" ? "#fef3d7" : e.category === "Rent" ? "#fceaea" : "#f5f5f3",
                      color: e.category === "Sponsorship" || e.category === "Other Income" ? "#1a5040" : e.category === "Staff Salary" ? "#6b3ea8" : e.category === "Utility Bill" ? "#c07b1a" : e.category === "Rent" ? "#b83030" : "var(--ink)"
                    }}>
                      {e.category}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600, color: "var(--ink)" }}>{e.label}</td>
                  <td>{e.month}</td>
                  <td className="mono" style={{ textAlign: "right", fontWeight: 700, color: e.type === "income" ? "#1a5040" : "#b83030" }}>
                    {e.type === "income" ? "+" : "-"}{e.amount.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Expense Modal */}
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title="Record Institute Transaction"
        footer={
          <>
            <button className="btn btn-s btn-sm" onClick={() => setModal(false)}>Cancel</button>
            <button className="btn btn-ok btn-sm" onClick={saveTransaction} disabled={!form.label.trim() || !form.amount}>Save Transaction</button>
          </>
        }
      >
        <div className="form-gap">
          <div style={{ display: "flex", gap: 10, background: "#f5f5f3", padding: 4, borderRadius: 8 }}>
            <button 
              className="btn btn-sm" 
              style={{ flex: 1, background: form.type === "expense" ? "#fff" : "transparent", color: form.type === "expense" ? "var(--ink)" : "var(--ink3)", boxShadow: form.type === "expense" ? "var(--sh)" : "none" }}
              onClick={() => setForm(f => ({ ...f, type: "expense", category: "Utility Bill" }))}
            >
              Log Expense
            </button>
            <button 
              className="btn btn-sm" 
              style={{ flex: 1, background: form.type === "income" ? "#fff" : "transparent", color: form.type === "income" ? "var(--ink)" : "var(--ink3)", boxShadow: form.type === "income" ? "var(--sh)" : "none" }}
              onClick={() => setForm(f => ({ ...f, type: "income", category: "Other Income" }))}
            >
              Record Income
            </button>
          </div>

          <div className="field-row">
            <div>
              <label className="flbl req">Category</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as InstituteTransaction["category"] }))}>
                {TX_CATEGORIES[form.type].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="flbl req">Date</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="flbl req">Description / {form.type === "expense" ? "Supplier" : "Source"}</label>
            <input placeholder={form.type === "expense" ? "e.g. Electricity Board AC-5001" : "e.g. CSR Sponsor Grant"} value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} autoFocus />
          </div>
          <div>
            <label className="flbl req">Amount (LKR)</label>
            <input type="number" placeholder="Enter amount..." value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
            <div className="fhint">This amount will be {form.type === "expense" ? "deducted" : "added"} directly {form.type === "expense" ? "from" : "to"} the Net Available Balance for the {selMonth === "All Time" ? "April 2026" : selMonth} cycle.</div>
          </div>
        </div>
      </Modal>
    </PageShell>
  );
}
