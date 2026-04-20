import { PageShell } from "@/components/layout/PageShell";
import { Topbar } from "@/components/layout/Topbar";

export default function StudentsPage() {
  return (
    <PageShell>
      <Topbar title="Students" subtitle="312 enrolled" actions={<button className="btn btn-p">+ Enroll student</button>} />
      <div className="pb">
        <div className="tw">
          <table className="table">
            <thead><tr><th>Student</th><th>Batch</th><th>Parent mobile</th><th>Fee</th><th>Attendance</th></tr></thead>
            <tbody>
              <tr><td>Aarav Kumar</td><td>Grade 10 O/L</td><td className="mono">+94 77 123 4567</td><td>Paid</td><td className="mono">94%</td></tr>
              <tr><td>Priya Selvan</td><td>Grade 10 O/L</td><td className="mono">+94 77 234 5678</td><td>Due</td><td className="mono">81%</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </PageShell>
  );
}
