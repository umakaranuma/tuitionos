"use client";
import { useState, useEffect } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { PageShell } from "@/components/layout/PageShell";
import { Modal } from "@/components/ui/Modal";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { Pagination } from "@/components/ui/Pagination";
import { api } from "@/lib/api";

type Tx = { id: number; month: string; transaction_type: string; category: string; label: string; amount: string; date: string };

const catLabels: Record<string, string> = { staff_salary: "Staff Salary", utility_bill: "Utility Bill", rent: "Rent", supplies: "Supplies", sponsorship: "Sponsorship", platform_fee: "Platform Fee", other: "Other" };

export default function AccountsPage() {
  const [txns, setTxns] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [year, setYear] = useState<string>("all");
  const [month, setMonth] = useState<string>("all");
  const [stats, setStats] = useState({ income: 0, expense: 0 });
  const [meta, setMeta] = useState({ total_count: 0, total_pages: 1 });
  const [form, setForm] = useState({ month: "May 2026", transaction_type: "expense", category: "utility_bill", label: "", amount: "", date: new Date().toISOString().split("T")[0] });

  const load = () => {
    setLoading(true);
    api.get(`/api/billing/transactions?page=${page}&limit=${limit}&year=${year}&month=${month}`).then(r => {
      const d = r.data; 
      if (d.total_count !== undefined) setMeta({ total_count: d.total_count, total_pages: d.total_pages });
      setTxns(Array.isArray(d) ? d : d.results || []); 
      if (d.stats) setStats({ income: d.stats.total_income, expense: d.stats.total_expense });
      setLoading(false);
    }).catch(() => setLoading(false));
  };
  useEffect(load, [page, limit, year, month]);

  const save = async () => {
    if (!form.label.trim() || !form.amount) return;
    await api.post("/api/billing/transactions", form);
    setModal(false); load();
  };

  const income = stats.income;
  const expense = stats.expense;

  return (
    <PageShell>
      <Topbar title="Accounts" subtitle={`${meta.total_count || txns.length} transactions`}
        right={
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <select 
              value={year} 
              onChange={e => { setYear(e.target.value); setPage(1); }}
              style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid var(--ln)", outline: "none", fontSize: 13 }}
            >
              <option value="all">All Years</option>
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
            </select>
            <select 
              value={month} 
              onChange={e => { setMonth(e.target.value); setPage(1); }}
              style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid var(--ln)", outline: "none", fontSize: 13 }}
              disabled={year === "all"}
            >
              <option value="all">All Months</option>
              <option value="1">January</option>
              <option value="2">February</option>
              <option value="3">March</option>
              <option value="4">April</option>
              <option value="5">May</option>
              <option value="6">June</option>
              <option value="7">July</option>
              <option value="8">August</option>
              <option value="9">September</option>
              <option value="10">October</option>
              <option value="11">November</option>
              <option value="12">December</option>
            </select>
            <button className="btn btn-p btn-sm" onClick={() => setModal(true)}>+ Add transaction</button>
          </div>
        } 
      />
      <div className="pb fi">
        <div className="g4" style={{ marginBottom: 18 }}>
          <div className="kpi" style={{ "--kc": "var(--tc)" } as any}><div className="kpi-lbl">Income</div><div className="kpi-val">LKR {income.toLocaleString()}</div><div className="kpi-tr up">total</div></div>
          <div className="kpi" style={{ "--kc": "var(--rb)" } as any}><div className="kpi-lbl">Expenses</div><div className="kpi-val">LKR {expense.toLocaleString()}</div><div className="kpi-tr dn">total</div></div>
          <div className="kpi" style={{ "--kc": "var(--jd)" } as any}><div className="kpi-lbl">Net</div><div className="kpi-val">LKR {(income - expense).toLocaleString()}</div><div className="kpi-tr nt">{income >= expense ? "Positive" : "Negative"}</div></div>
        </div>

        {loading ? <div style={{ textAlign: "center", padding: 40, color: "var(--ink3)" }}>Loading...</div> : (
          <div className="tw">
            <table>
              <thead><tr><th>Label</th><th>Type</th><th>Category</th><th>Amount (LKR)</th><th>Date</th></tr></thead>
              <tbody>
                {txns.map(t => (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 600 }}>{t.label}</td>
                    <td>{t.transaction_type === "income" ? <span className="bdg b-paid">Income</span> : <span className="bdg b-over">Expense</span>}</td>
                    <td style={{ color: "var(--ink3)" }}>{catLabels[t.category] || t.category}</td>
                    <td className="mono">{Number(t.amount).toLocaleString()}</td>
                    <td className="mono" style={{ color: "var(--ink3)" }}>{t.date}</td>
                  </tr>
                ))}
                {txns.length === 0 && <tr><td colSpan={5} style={{ textAlign: "center", color: "var(--ink3)", padding: 24 }}>No transactions found</td></tr>}
              </tbody>
            </table>
            <Pagination 
              page={page} 
              limit={limit} 
              totalCount={meta.total_count} 
              totalPages={meta.total_pages} 
              onPageChange={setPage} 
              onLimitChange={l => { setLimit(l); setPage(1); }} 
              itemName="transactions" 
            />
          </div>
        )}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Add transaction"
        footer={<><button className="btn btn-s btn-sm" onClick={() => setModal(false)}>Cancel</button><button className="btn btn-p btn-sm" onClick={save}>Save</button></>}>
        <div className="form-gap">
          <div><label className="flbl freq">Label</label><input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} autoFocus /></div>
          <div className="field-row">
            <div className="fg"><label className="flbl">Type</label>
              <SearchableSelect 
                value={form.transaction_type} 
                onChange={val => setForm(f => ({ ...f, transaction_type: String(val) }))}
                options={[{ value: "expense", label: "Expense" }, { value: "income", label: "Income" }]}
              />
            </div>
            <div className="fg"><label className="flbl">Category</label>
              <SearchableSelect 
                value={form.category} 
                onChange={val => setForm(f => ({ ...f, category: String(val) }))}
                options={[
                  { value: "utility_bill", label: "Utility Bill" }, { value: "staff_salary", label: "Staff Salary" },
                  { value: "rent", label: "Rent" }, { value: "supplies", label: "Supplies" },
                  { value: "sponsorship", label: "Sponsorship" }, { value: "other", label: "Other" }
                ]}
              />
            </div>
          </div>
          <div className="field-row">
            <div className="fg"><label className="flbl">Amount (LKR)</label><input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} /></div>
            <div className="fg"><label className="flbl">Date</label><input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
          </div>
        </div>
      </Modal>
    </PageShell>
  );
}
