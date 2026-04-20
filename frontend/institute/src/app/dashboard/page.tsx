import { PageShell } from "@/components/layout/PageShell";
import { Topbar } from "@/components/layout/Topbar";

export default function DashboardPage() {
  return (
    <PageShell>
      <Topbar title="Dashboard" subtitle="St. Patrick's Institute · April 2026" />
      <div className="pb">
        <div className="g4" style={{ marginBottom: 18 }}>
          <div className="kpi"><div className="kpi-lbl">Total Students</div><div className="kpi-val">312</div></div>
          <div className="kpi"><div className="kpi-lbl">Active Batches</div><div className="kpi-val">8</div></div>
          <div className="kpi"><div className="kpi-lbl">Fees Due</div><div className="kpi-val">47</div></div>
          <div className="kpi"><div className="kpi-lbl">Absent Today</div><div className="kpi-val">23</div></div>
        </div>
        <div className="g2">
          <div className="card"><div className="kpi-lbl">Fee collection — April</div><div className="kpi-val">265 / 312</div></div>
          <div className="card"><div className="kpi-lbl">Recent alerts</div><p>Aarav Kumar absent · Today 6:00 PM</p></div>
        </div>
      </div>
    </PageShell>
  );
}
