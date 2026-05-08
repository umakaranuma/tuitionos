"use client";
import { useState, useEffect } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { PageShell } from "@/components/layout/PageShell";
import { api } from "@/lib/api";
import { SearchableSelect } from "@/components/ui/SearchableSelect";

type Fee = { id: number; student: number; student_name: string; batch: number; batch_name: string; month: string; amount: string; status: string; paid_at: string | null; collected_by: string };
type Batch = { id: number; name: string };

const statusBadge = (s: string) => {
  const map: Record<string, JSX.Element> = { paid: <span className="bdg b-paid">Paid</span>, pending: <span className="bdg b-due">Pending</span>, due: <span className="bdg b-due">Due</span>, overdue: <span className="bdg b-over">Overdue</span> };
  return map[s] || <span className="bdg b-due">{s}</span>;
};

export default function FeesPage() {
  const [fees, setFees] = useState<Fee[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBatch, setSelectedBatch] = useState("");

  const load = (batchId?: string) => {
    const params: Record<string, string> = {};
    if (batchId) params.batch = batchId;
    Promise.all([
      api.get("/api/fees/", { params }).then(r => { const d = r.data; return Array.isArray(d) ? d : d.results || []; }),
      api.get("/api/academics/batches").then(r => { const d = r.data; return Array.isArray(d) ? d : d.results || []; }),
    ]).then(([f, b]) => { setFees(f); setBatches(b); setLoading(false); });
  };
  useEffect(() => load(), []);

  const searchBatches = async (q: string) => {
    try {
      const r = await api.get(`/api/academics/batches?search=${encodeURIComponent(q)}`);
      setBatches(Array.isArray(r.data) ? r.data : r.data.results || []);
    } catch (e) {}
  };

  const handleBatchFilter = (bid: string) => { setSelectedBatch(bid); setLoading(true); load(bid); };

  const markPaid = async (id: number) => {
    await api.post(`/api/fees/${id}/mark_paid`);
    load(selectedBatch);
  };

  const paidCount = fees.filter(f => f.status === "paid").length;
  const pendingCount = fees.filter(f => f.status !== "paid").length;
  const totalCollected = fees.filter(f => f.status === "paid").reduce((s, f) => s + Number(f.amount), 0);
  const totalOutstanding = fees.filter(f => f.status !== "paid").reduce((s, f) => s + Number(f.amount), 0);

  return (
    <PageShell>
      <Topbar title="Fee Tracking" subtitle={`${paidCount} paid · ${pendingCount} pending`}
        right={
          <div style={{ minWidth: 180 }}>
            <SearchableSelect 
              value={selectedBatch} 
              onChange={val => handleBatchFilter(String(val))}
              placeholder="All batches"
              onSearch={searchBatches}
              options={[{ value: "", label: "All batches" }, ...batches.map(b => ({ value: b.id, label: b.name }))]}
            />
          </div>
        } />
      <div className="pb fi">
        {/* KPIs */}
        <div className="g4" style={{ marginBottom: 18 }}>
          <div className="kpi" style={{ "--kc": "var(--tc)" } as any}><div className="kpi-lbl">Collected</div><div className="kpi-val">{Math.round(totalCollected / 1000)}K</div><div className="kpi-tr up">{paidCount} students</div></div>
          <div className="kpi" style={{ "--kc": "var(--rb)" } as any}><div className="kpi-lbl">Outstanding</div><div className="kpi-val">{Math.round(totalOutstanding / 1000)}K</div><div className="kpi-tr dn">{pendingCount} students</div></div>
          <div className="kpi" style={{ "--kc": "var(--jd)" } as any}><div className="kpi-lbl">Collection Rate</div><div className="kpi-val">{fees.length > 0 ? Math.round((paidCount / fees.length) * 100) : 0}%</div><div className="kpi-tr nt">This month</div></div>
          <div className="kpi" style={{ "--kc": "var(--sf)" } as any}><div className="kpi-lbl">Total Records</div><div className="kpi-val">{fees.length}</div><div className="kpi-tr nt">All fees</div></div>
        </div>

        {loading ? <div style={{ textAlign: "center", padding: 40, color: "var(--ink3)" }}>Loading...</div> : (
          <div className="tw">
            <table>
              <thead><tr><th>Student</th><th>Batch</th><th>Month</th><th>Amount (LKR)</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {fees.map(f => (
                  <tr key={f.id}>
                    <td style={{ fontWeight: 600 }}>{f.student_name}</td>
                    <td style={{ color: "var(--ink3)" }}>{f.batch_name}</td>
                    <td className="mono">{f.month}</td>
                    <td className="mono">{Number(f.amount).toLocaleString()}</td>
                    <td>{statusBadge(f.status)}</td>
                    <td>
                      {f.status !== "paid" ? (
                        <button className="btn btn-xs btn-ok" onClick={() => markPaid(f.id)}>Mark paid</button>
                      ) : (
                        <span style={{ fontSize: 10.5, color: "var(--ink3)" }}>{f.collected_by}</span>
                      )}
                    </td>
                  </tr>
                ))}
                {fees.length === 0 && <tr><td colSpan={6} style={{ textAlign: "center", color: "var(--ink3)", padding: 24 }}>No fee records found</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PageShell>
  );
}
