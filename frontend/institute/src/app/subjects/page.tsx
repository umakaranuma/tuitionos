import { PageShell } from "@/components/layout/PageShell";
import { Topbar } from "@/components/layout/Topbar";

export default function SubjectsPage() {
  return (
    <PageShell>
      <Topbar title="Subjects" subtitle="Define what you teach" actions={<button className="btn btn-p">+ Add subject</button>} />
      <div className="pb">
        <div className="g2">
          <div className="card"><strong>Mathematics</strong><p>3 batches · Mr. Rajan</p></div>
          <div className="card"><strong>Physics</strong><p>2 batches · Ms. Geetha</p></div>
          <div className="card"><strong>Chemistry</strong><p>2 batches · Mr. Arjun</p></div>
          <div className="card"><strong>English</strong><p>4 batches · Ms. Ramya</p></div>
        </div>
      </div>
    </PageShell>
  );
}
