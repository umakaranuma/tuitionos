import { PageShell } from "@/components/layout/PageShell";
import { Topbar } from "@/components/layout/Topbar";

export default function PromotionPage() {
  return (
    <PageShell>
      <Topbar title="Year-end promotion" subtitle="2026 to 2027 · Move students to next grade" actions={<button className="btn btn-p">Confirm & notify</button>} />
      <div className="pb">
        <div className="g2">
          <div className="card"><div className="kpi-lbl">Batch mapping</div><p>Grade 7 A → Grade 8 A</p><p>Grade 10 O/L → Grade 11 A/L</p></div>
          <div className="card"><div className="kpi-lbl">Student actions</div><p>Promote: 18 · Retain: 3 · Remove: 1</p></div>
        </div>
      </div>
    </PageShell>
  );
}
