import { PageShell } from "@/components/layout/PageShell";
import { Topbar } from "@/components/layout/Topbar";

export default function StudentProfilePage({ params }: { params: { id: string } }) {
  return (
    <PageShell>
      <Topbar title={`Student #${params.id}`} subtitle="Profile and payment history" />
      <div className="pb">
        <div className="card">
          <div className="kpi-lbl">Student profile</div>
          <p>Detailed profile view is prepared for attendance, fees, and communication history.</p>
        </div>
      </div>
    </PageShell>
  );
}
