import { PageShell } from "@/components/layout/PageShell";
import { Topbar } from "@/components/layout/Topbar";

export default function TeachersPage() {
  return (
    <PageShell>
      <Topbar title="Teachers" subtitle="Staff directory" actions={<button className="btn btn-p">+ Add teacher</button>} />
      <div className="pb">
        <div className="tw">
          <table className="table">
            <thead><tr><th>Teacher</th><th>Subject</th><th>Mobile</th><th>Batches</th></tr></thead>
            <tbody>
              <tr><td>Mr. Rajan Nair</td><td>Mathematics</td><td className="mono">+94 77 234 5678</td><td className="mono">3</td></tr>
              <tr><td>Ms. Geetha S.</td><td>Physics</td><td className="mono">+94 77 345 6789</td><td className="mono">2</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </PageShell>
  );
}
