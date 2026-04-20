import { PageShell } from "@/components/layout/PageShell";
import { Topbar } from "@/components/layout/Topbar";

export default function BatchesPage() {
  return (
    <PageShell>
      <Topbar title="Batches" subtitle="Grade groups and packages" actions={<button className="btn btn-p">+ Create batch</button>} />
      <div className="pb">
        <div className="g2">
          <div className="card"><strong>Grade 7 — Batch A</strong><p>18 students · LKR 3,000/mo</p></div>
          <div className="card"><strong>Grade 10 — O/L</strong><p>25 students · LKR 5,500/mo</p></div>
          <div className="card"><strong>Grade 11 — A/L</strong><p>19 students · LKR 7,000/mo</p></div>
        </div>
      </div>
    </PageShell>
  );
}
