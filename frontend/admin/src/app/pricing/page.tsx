import { PageShell } from "@/components/layout/PageShell";
import { Topbar } from "@/components/layout/Topbar";

export default function PricingPage() {
  return (
    <PageShell>
      <Topbar title="Pricing" subtitle="Tier comparison · Revenue milestones" />
      <div className="pb">
        <div className="g2" style={{ maxWidth: 720, marginBottom: 20 }}>
          <div className="card">
            <div className="kpi-lbl">Basic</div>
            <div className="kpi-val">LKR 3,000/mo</div>
            <p>Up to 200 students, attendance + fee tracking.</p>
          </div>
          <div className="card">
            <div className="kpi-lbl">Premium</div>
            <div className="kpi-val">LKR 6,000/mo</div>
            <p>Unlimited students, all notifications, yearly PDF blast.</p>
          </div>
        </div>
        <div className="tw" style={{ maxWidth: 720 }}>
          <table className="table">
            <thead><tr><th>Milestone</th><th>Basic</th><th>Premium</th><th>MRR (LKR)</th><th>MRR (USD)</th></tr></thead>
            <tbody>
              <tr><td>Q1 — Launch</td><td className="mono">5</td><td className="mono">2</td><td className="mono">27,000</td><td className="mono">~$87</td></tr>
              <tr><td>$2,000 goal</td><td className="mono">80</td><td className="mono">30</td><td className="mono">420,000</td><td className="mono">~$1,355</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </PageShell>
  );
}
