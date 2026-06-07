"use client";
import { useState, useEffect } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { PageShell } from "@/components/layout/PageShell";
import { api } from "@/lib/api";

type Invoice = { id: number; institute: number; institute_name: string; amount: string; month: string; status: string; paid_at: string | null };

export default function IncomePage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState<string>("all");
  const [month, setMonth] = useState<string>("all");
  const [stats, setStats] = useState({ total_mrr: 0, collected: 0, outstanding: 0 });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [meta, setMeta] = useState({ total_count: 0, total_pages: 1 });

  const load = () => {
    setLoading(true);
    let url = `/api/admin/billing/invoices?page=${page}&limit=${limit}&year=${year}&month=${month}`;
    
    api.get(url).then(r => {
      const d = r.data;
      if (d.total_count !== undefined) setMeta({ total_count: d.total_count, total_pages: d.total_pages });
      setInvoices(Array.isArray(d) ? d : d.results || []);
      if (d.stats) setStats(d.stats);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(load, [page, limit, year, month]);

  const { total_mrr, collected, outstanding } = stats;

  return (
    <PageShell>
      <Topbar 
        title="Income" 
        subtitle={`${meta.total_count || invoices.length} total invoices`} 
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
            <button className="btn btn-s btn-sm">Export CSV</button>
          </div>
        } 
      />
      <div className="pb fi">
        {loading ? <div style={{ textAlign: "center", padding: 40, color: "var(--ink3)" }}>Loading...</div> : (
          <>
            <div className="g4" style={{ marginBottom: 18 }}>
              <div className="kpi" style={{ "--kc": "var(--tc)" } as any}>
                <div className="kpi-lbl">Total MRR</div>
                <div className="kpi-val">LKR {total_mrr.toLocaleString()}</div>
                <div className="kpi-tr nt">overall expected</div>
              </div>
              <div className="kpi" style={{ "--kc": "var(--jd)" } as any}>
                <div className="kpi-lbl">Collected</div>
                <div className="kpi-val">LKR {collected.toLocaleString()}</div>
                <div className="kpi-tr up">revenue</div>
              </div>
              <div className="kpi" style={{ "--kc": "var(--rb)" } as any}>
                <div className="kpi-lbl">Outstanding</div>
                <div className="kpi-val">LKR {outstanding.toLocaleString()}</div>
                <div className="kpi-tr dn">pending collection</div>
              </div>
            </div>

            <div className="tw">
              <table>
                <thead><tr><th>Invoice #</th><th>Institute</th><th>Month</th><th>Amount (LKR)</th><th>Status</th></tr></thead>
                <tbody>
                  {invoices.map(i => (
                    <tr key={i.id}>
                      <td className="mono">#{String(i.id).padStart(4, "0")}</td>
                      <td style={{ fontWeight: 600 }}>{i.institute_name}</td>
                      <td className="mono">{new Date(i.month).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</td>
                      <td className="mono">{Number(i.amount).toLocaleString()}</td>
                      <td>{i.status === "paid" ? <span className="bdg b-paid">Paid</span> : <span className="bdg b-due">{i.status}</span>}</td>
                    </tr>
                  ))}
                  {invoices.length === 0 && <tr><td colSpan={5} style={{ textAlign: "center", color: "var(--ink3)", padding: 24 }}>No invoices found</td></tr>}
                </tbody>
              </table>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderTop: "1px solid var(--ln)", background: "#fff", borderBottomLeftRadius: 12, borderBottomRightRadius: 12 }}>
                <div style={{ fontSize: 12, color: "var(--ink3)" }}>
                  Showing {invoices.length} of {meta.total_count} invoices
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button className="btn btn-s btn-xs" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</button>
                  <button className="btn btn-s btn-xs" disabled={page === meta.total_pages || meta.total_pages === 0} onClick={() => setPage(p => p + 1)}>Next</button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </PageShell>
  );
}
