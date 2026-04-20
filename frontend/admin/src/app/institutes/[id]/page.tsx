import { PageShell } from "@/components/layout/PageShell";
import { Topbar } from "@/components/layout/Topbar";

export default function InstituteDetailPage({ params }: { params: { id: string } }) {
  return (
    <PageShell>
      <Topbar title={`Institute #${params.id}`} subtitle="Detailed institute profile" />
      <div className="pb">
        <div className="card">
          <div className="kpi-lbl">Profile snapshot</div>
          <p>This screen is ready for institute-level metrics, billing status, and activity timeline.</p>
        </div>
      </div>
    </PageShell>
  );
}
