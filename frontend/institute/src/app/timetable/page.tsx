import { PageShell } from "@/components/layout/PageShell";
import { Topbar } from "@/components/layout/Topbar";

export default function TimetablePage() {
  return (
    <PageShell>
      <Topbar title="Timetable" subtitle="Weekly schedule" actions={<button className="btn btn-p">Save & notify parents</button>} />
      <div className="pb">
        <div className="card">
          <div className="kpi-lbl">Grade 10 - O/L batch</div>
          <p>Monday 8:00 - Mathematics</p>
          <p>Tuesday 8:00 - Physics</p>
          <p>Thursday 8:00 - Chemistry</p>
        </div>
      </div>
    </PageShell>
  );
}
