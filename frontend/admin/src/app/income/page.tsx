"use client";
import { useState, useEffect } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { PageShell } from "@/components/layout/PageShell";
import { api } from "@/lib/api";

type Invoice = { id: number; institute: number; institute_name: string; amount: string; month: string; status: string; paid_at: string | null };

export default function IncomePage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/api/admin/billing/invoices").then(r => {
      const d = r.data;
      setInvoices(Array.isArray(d) ? d : d.results || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const totalMRR = invoices.reduce((acc, inv) => acc + Number(inv.amount), 0);
  const collected = invoices.filter(i => i.status === "paid").reduce((acc, inv) => acc + Number(inv.amount), 0);
  const outstanding = totalMRR - collected;

  // Group by month
  const monthlyData = invoices.reduce((acc, inv) => {
    const month = inv.month;
    if (!acc[month]) acc[month] = { month, total: 0, collected: 0 };
    acc[month].total += Number(inv.amount);
    if (inv.status === "paid") acc[month].collected += Number(inv.amount);
    return acc;
  }, {} as Record<string, { month: string; total: number; collected: number }>);
  
  const monthlyList = Object.values(monthlyData).sort((a, b) => b.month.localeCompare(a.month));

  return (
    <PageShell>
      <Topbar title="Income" subtitle={`${invoices.length} total invoices`} right={<button className="btn btn-s btn-sm">Export CSV</button>} />
      <div className="pb fi">
        {loading ? <div style={{ textAlign: "center", padding: 40, color: "var(--ink3)" }}>Loading...</div> : (
          <>
            <div className="g4" style={{ marginBottom: 18 }}>
              <div className="kpi" style={{ "--kc": "var(--tc)" } as any}>
                <div className="kpi-lbl">Total MRR</div>
                <div className="kpi-val">{Math.round(totalMRR / 1000)}K</div>
                <div className="kpi-tr nt mono">LKR</div>
              </div>
              <div className="kpi" style={{ "--kc": "var(--jd)" } as any}>
                <div className="kpi-lbl">Collected</div>
                <div className="kpi-val">{Math.round(collected / 1000)}K</div>
                <div className="kpi-tr up">{invoices.filter(i => i.status === "paid").length} invoices</div>
              </div>
              <div className="kpi" style={{ "--kc": "var(--rb)" } as any}>
                <div className="kpi-lbl">Outstanding</div>
                <div className="kpi-val">{Math.round(outstanding / 1000)}K</div>
                <div className="kpi-tr dn">{invoices.filter(i => i.status !== "paid").length} invoices</div>
              </div>
            </div>

            <div className="g2">
              <div>
                <div className="sec-hdr"><span className="sec-title">Monthly breakdown</span></div>
                <div className="tw">
                  <table>
                    <thead><tr><th>Month</th><th>Total LKR</th><th>Collected</th><th>Status</th></tr></thead>
                    <tbody>
                      {monthlyList.map((m) => (
                        <tr key={m.month}>
                          <td>{m.month}</td>
                          <td className="mono" style={{ fontWeight: 600 }}>{m.total.toLocaleString()}</td>
                          <td className="mono">{m.collected.toLocaleString()}</td>
                          <td>{m.total === m.collected ? <span className="bdg b-paid">Done</span> : <span className="bdg b-due">Collecting</span>}</td>
                        </tr>
                      ))}
                      {monthlyList.length === 0 && <tr><td colSpan={4} style={{ textAlign: "center", color: "var(--ink3)", padding: 24 }}>No data yet</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <div className="sec-hdr"><span className="sec-title">All Invoices</span></div>
                <div className="tw">
                  <table>
                    <thead><tr><th>Institute</th><th>Month</th><th>Amount</th><th>Status</th></tr></thead>
                    <tbody>
                      {invoices.map(i => (
                        <tr key={i.id}>
                          <td>{i.institute_name}</td>
                          <td>{i.month}</td>
                          <td className="mono">{Number(i.amount).toLocaleString()}</td>
                          <td>{i.status === "paid" ? <span className="bdg b-paid">Paid</span> : <span className="bdg b-due">{i.status}</span>}</td>
                        </tr>
                      ))}
                      {invoices.length === 0 && <tr><td colSpan={4} style={{ textAlign: "center", color: "var(--ink3)", padding: 24 }}>No invoices</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </PageShell>
  );
}
