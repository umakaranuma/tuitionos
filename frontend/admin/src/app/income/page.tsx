"use client";
import { useState, useEffect } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { PageShell } from "@/components/layout/PageShell";
import { api } from "@/lib/api";

type Invoice = { id: number; institute: number; institute_name: string; amount: string; month: string; status: string; paid_at: string | null };

export default function IncomePage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthFilter, setMonthFilter] = useState("All Time");
  const [stats, setStats] = useState({ total_mrr: 0, collected: 0, outstanding: 0 });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [meta, setMeta] = useState({ total_count: 0, total_pages: 1 });

  const load = () => {
    setLoading(true);
    let url = `/api/admin/billing/invoices?page=${page}&limit=${limit}`;
    if (monthFilter !== "All Time") url += `&month=${monthFilter}-01`; // format as YYYY-MM-DD
    
    api.get(url).then(r => {
      const d = r.data;
      if (d.total_count !== undefined) setMeta({ total_count: d.total_count, total_pages: d.total_pages });
      setInvoices(Array.isArray(d) ? d : d.results || []);
      if (d.stats) setStats(d.stats);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(load, [page, limit, monthFilter]);

  const { total_mrr, collected, outstanding } = stats;

  return (
    <PageShell>
      <Topbar 
        title="Income" 
        subtitle={`${meta.total_count || invoices.length} total invoices`} 
        right={
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <select 
              value={monthFilter} 
              onChange={e => { setMonthFilter(e.target.value); setPage(1); }}
              style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid var(--ln)", outline: "none", fontSize: 13 }}
            >
              <option value="All Time">All Time</option>
              {["2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07", "2026-08"].map(m => (
                <option key={m} value={m}>{new Date(`${m}-01`).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</option>
              ))}
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
