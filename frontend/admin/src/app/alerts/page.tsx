import { PageShell } from "@/components/layout/PageShell";
import { Topbar } from "@/components/layout/Topbar";

export default function AlertsPage() {
  return (
    <PageShell>
      <Topbar title="Alerts" subtitle="3 items need action" />
      <div className="pb">
        <div className="g2">
          <div className="card">
            <div className="kpi-lbl">Requiring action now</div>
            <p>Edu Leaders — 14 days overdue</p>
            <p>Bright Minds — due today</p>
            <p>Alpha Lanka — trial ends in 3 days</p>
          </div>
          <div className="card">
            <div className="kpi-lbl">Auto-action settings</div>
            <p>WhatsApp reminder — day 3 overdue</p>
            <p>Auto-suspend — day 21 overdue</p>
            <p>Trial expiry email — 3 days before</p>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
