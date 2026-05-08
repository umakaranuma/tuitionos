"use client";
import { useState, useEffect } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { PageShell } from "@/components/layout/PageShell";
import { api } from "@/lib/api";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { Pagination } from "@/components/ui/Pagination";

type Payment = { id: number; teacher: number; teacher_name: string; month: string; amount: string; status: string; paid_date: string | null; method: string; payment_type: string };
type Advance = { id: number; teacher: number; teacher_name: string; amount: string; request_date: string; reason: string; status: string; repaid_amount: string };

const statusBadge = (s: string) => {
  const map: Record<string, JSX.Element> = { paid: <span className="bdg b-paid">Paid</span>, pending: <span className="bdg b-due">Pending</span>, overdue: <span className="bdg b-over">Overdue</span> };
  return map[s] || <span className="bdg b-due">{s}</span>;
};

export default function TeacherSalaryPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState("April 2026");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [meta, setMeta] = useState({ total_count: 0, total_pages: 1 });

  const load = () => {
    setLoading(true);
    const params: Record<string, string | number> = { month, page, limit };
    Promise.all([
      api.get("/api/academics/teacher-payments", { params }).then(r => { 
        const d = r.data; 
        if (d.total_count !== undefined) setMeta({ total_count: d.total_count, total_pages: d.total_pages });
        return Array.isArray(d) ? d : d.results || []; 
      }),
      api.get("/api/academics/teacher-advances").then(r => { const d = r.data; return Array.isArray(d) ? d : d.results || []; }),
    ]).then(([p, a]) => { setPayments(p); setAdvances(a); setLoading(false); });
  };
  useEffect(load, [month, page, limit]);

  const markPaid = async (id: number) => {
    await api.post(`/api/academics/teacher-payments/${id}/mark_paid`, { method: "Bank transfer" });
    load();
  };

  const paidCount = payments.filter(p => p.status === "paid").length;
  const totalPaid = payments.filter(p => p.status === "paid").reduce((s, p) => s + Number(p.amount), 0);
  const totalPending = payments.filter(p => p.status !== "paid").reduce((s, p) => s + Number(p.amount), 0);

  return (
    <PageShell>
      <Topbar title="Teacher Salary" subtitle={month}
        right={
          <div style={{ minWidth: 180 }}>
            <SearchableSelect 
              value={month} 
              onChange={val => { setMonth(String(val)); setPage(1); }}
              options={["April 2026", "March 2026", "February 2026", "January 2026"].map(m => ({ value: m, label: m }))}
            />
          </div>
        } />
      <div className="pb fi">
        <div className="g4" style={{ marginBottom: 18 }}>
          <div className="kpi" style={{ "--kc": "var(--tc)" } as any}><div className="kpi-lbl">Total Paid</div><div className="kpi-val">{Math.round(totalPaid / 1000)}K</div><div className="kpi-tr up">{paidCount} teachers</div></div>
          <div className="kpi" style={{ "--kc": "var(--rb)" } as any}><div className="kpi-lbl">Pending</div><div className="kpi-val">{Math.round(totalPending / 1000)}K</div><div className="kpi-tr dn">{payments.length - paidCount} teachers</div></div>
        </div>

        {loading ? <div style={{ textAlign: "center", padding: 40, color: "var(--ink3)" }}>Loading...</div> : (
          <>
            <div className="sec-hdr"><span className="sec-title">Salary Payments — {month}</span></div>
            <div className="tw" style={{ marginBottom: 18 }}>
              <table>
                <thead><tr><th>Teacher</th><th>Amount (LKR)</th><th>Status</th><th>Method</th><th>Paid date</th><th>Actions</th></tr></thead>
                <tbody>
                  {payments.map(p => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 600 }}>{p.teacher_name}</td>
                      <td className="mono">{Number(p.amount).toLocaleString()}</td>
                      <td>{statusBadge(p.status)}</td>
                      <td style={{ color: "var(--ink3)" }}>{p.method || "—"}</td>
                      <td className="mono" style={{ color: "var(--ink3)" }}>{p.paid_date || "—"}</td>
                      <td>{p.status !== "paid" && <button className="btn btn-xs btn-ok" onClick={() => markPaid(p.id)}>Mark paid</button>}</td>
                    </tr>
                  ))}
                  {payments.length === 0 && <tr><td colSpan={6} style={{ textAlign: "center", color: "var(--ink3)", padding: 24 }}>No salary records for this month</td></tr>}
                </tbody>
              </table>
              <Pagination 
                page={page} 
                limit={limit} 
                totalCount={meta.total_count} 
                totalPages={meta.total_pages} 
                onPageChange={setPage} 
                onLimitChange={l => { setLimit(l); setPage(1); }} 
                itemName="salary records" 
              />
            </div>

            {advances.length > 0 && (
              <>
                <div className="sec-hdr"><span className="sec-title">Active Advances</span></div>
                <div className="tw">
                  <table>
                    <thead><tr><th>Teacher</th><th>Amount</th><th>Reason</th><th>Status</th><th>Repaid</th></tr></thead>
                    <tbody>
                      {advances.map(a => (
                        <tr key={a.id}>
                          <td style={{ fontWeight: 600 }}>{a.teacher_name}</td>
                          <td className="mono">{Number(a.amount).toLocaleString()}</td>
                          <td style={{ color: "var(--ink3)" }}>{a.reason || "—"}</td>
                          <td><span className="bdg b-trial">{a.status}</span></td>
                          <td className="mono">{Number(a.repaid_amount).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </PageShell>
  );
}
