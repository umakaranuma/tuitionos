import { PageShell } from "@/components/layout/PageShell";
import { Topbar } from "@/components/layout/Topbar";

export default function IncomePage() {
  return (
    <PageShell>
      <Topbar title="Income" subtitle="April 2026" />
      <div className="pb">
        <div className="g4" style={{ marginBottom: 18 }}>
          <div className="kpi"><div className="kpi-lbl">This Month MRR</div><div className="kpi-val">387K</div></div>
          <div className="kpi"><div className="kpi-lbl">Collected</div><div className="kpi-val">321K</div></div>
          <div className="kpi"><div className="kpi-lbl">Outstanding</div><div className="kpi-val">66K</div></div>
          <div className="kpi"><div className="kpi-lbl">Notif Spend</div><div className="kpi-val">18.2K</div></div>
        </div>
        <div className="tw">
          <table className="table">
            <thead><tr><th>Month</th><th>Basic</th><th>Premium</th><th>Total</th><th>USD</th><th>Status</th></tr></thead>
            <tbody>
              <tr><td>Apr 2026</td><td className="mono">135,000</td><td className="mono">138,000</td><td className="mono">387,000</td><td className="mono">$1,248</td><td>Collecting</td></tr>
              <tr><td>Mar 2026</td><td className="mono">126,000</td><td className="mono">120,000</td><td className="mono">345,000</td><td className="mono">$1,113</td><td>Done</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </PageShell>
  );
}
