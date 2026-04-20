import { PageShell } from "@/components/layout/PageShell";
import { Topbar } from "@/components/layout/Topbar";

export default function FeesPage() {
  return (
    <PageShell>
      <Topbar title="Fee tracking" subtitle="April 2026" />
      <div className="pb">
        <div className="g4" style={{ marginBottom: 18 }}>
          <div className="kpi"><div className="kpi-lbl">Collected</div><div className="kpi-val">265</div></div>
          <div className="kpi"><div className="kpi-lbl">Outstanding</div><div className="kpi-val">47</div></div>
          <div className="kpi"><div className="kpi-lbl">Total revenue</div><div className="kpi-val">936K</div></div>
          <div className="kpi"><div className="kpi-lbl">Overdue 10+ days</div><div className="kpi-val">12</div></div>
        </div>
      </div>
    </PageShell>
  );
}
