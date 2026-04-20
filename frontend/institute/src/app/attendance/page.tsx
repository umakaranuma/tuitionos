import { PageShell } from "@/components/layout/PageShell";
import { Topbar } from "@/components/layout/Topbar";

export default function AttendancePage() {
  return (
    <PageShell>
      <Topbar title="Attendance" subtitle="Today · Wednesday 17 April 2026" actions={<button className="btn btn-p">Save & send alerts</button>} />
      <div className="pb">
        <div className="card" style={{ marginBottom: 12 }}>
          Absent alerts fire at 6:00 PM as a daily digest - one WhatsApp message per parent.
        </div>
        <div className="tw">
          <table className="table">
            <thead><tr><th>Student</th><th>Mathematics</th><th>Physics</th><th>Chemistry</th><th>English</th></tr></thead>
            <tbody>
              <tr><td>Aarav Kumar</td><td>Present</td><td>Absent</td><td>Present</td><td>Present</td></tr>
              <tr><td>Priya Selvan</td><td>Absent</td><td>Absent</td><td>Present</td><td>Present</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </PageShell>
  );
}
