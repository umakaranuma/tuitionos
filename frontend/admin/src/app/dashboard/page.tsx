import { PageShell } from "@/components/layout/PageShell";
import { Topbar } from "@/components/layout/Topbar";

export default function DashboardPage() {
  return (
    <PageShell>
      <Topbar
        title="Dashboard"
        subtitle="April 2026 · Platform overview"
        actions={
          <>
            <button className="btn btn-s">Export report</button>
            <button className="btn btn-p">+ Add institute</button>
          </>
        }
      />
      <div className="pb">
        <div className="g4" style={{ marginBottom: 18 }}>
          <div className="kpi"><div className="kpi-lbl">Total MRR</div><div className="kpi-val">387K</div></div>
          <div className="kpi"><div className="kpi-lbl">Active Institutes</div><div className="kpi-val">68</div></div>
          <div className="kpi"><div className="kpi-lbl">Overdue</div><div className="kpi-val">7</div></div>
          <div className="kpi"><div className="kpi-lbl">Trials Expiring</div><div className="kpi-val">4</div></div>
        </div>
        <div className="g2">
          <div className="tw">
            <table className="table">
              <thead><tr><th>Institute</th><th>Plan</th><th>Status</th><th>Date</th></tr></thead>
              <tbody>
                <tr><td>St. Patrick&apos;s</td><td>Premium</td><td>Paid</td><td className="mono">Apr 17</td></tr>
                <tr><td>Alpha Lanka</td><td>Basic</td><td>Trial</td><td className="mono">Apr 16</td></tr>
                <tr><td>Bright Minds</td><td>Basic</td><td>Due</td><td className="mono">Apr 15</td></tr>
              </tbody>
            </table>
          </div>
          <div className="card">
            <div className="kpi-lbl">USD goal tracker</div>
            <div className="kpi-val">$1,248</div>
            <div style={{ color: "var(--ink3)", fontSize: 12 }}>$2,000 goal · 62% completed</div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
