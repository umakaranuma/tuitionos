import { Topbar } from "@/components/layout/Topbar";
import { PageShell } from "@/components/layout/PageShell";

const teachers = [
  { initials: "RN", name: "Mr. Rajan Nair", subject: "Mathematics", mobile: "+94 77 234 5678", batches: 3, bg: "var(--sp-l)", fg: "var(--sp)" },
  { initials: "GS", name: "Ms. Geetha S.", subject: "Physics", mobile: "+94 77 345 6789", batches: 2, bg: "var(--tc-l)", fg: "var(--tc-d)" },
  { initials: "AK", name: "Mr. Arjun K.", subject: "Chemistry", mobile: "+94 77 456 7890", batches: 2, bg: "var(--rb-l)", fg: "var(--rb)" },
  { initials: "RM", name: "Ms. Ramya M.", subject: "English", mobile: "+94 77 567 8901", batches: 4, bg: "var(--sf-l)", fg: "var(--sf)" },
  { initials: "VF", name: "Ms. Valli F.", subject: "Tamil Literature", mobile: "+94 77 678 9012", batches: 3, bg: "var(--pr-l)", fg: "var(--pr)" },
  { initials: "AN", name: "Ms. Anitha N.", subject: "Biology", mobile: "+94 77 789 0123", batches: 1, bg: "var(--jd-l,#d4ede3)", fg: "var(--tc-d)" },
];

export default function TeachersPage() {
  return (
    <PageShell>
      <Topbar
        title="Teachers"
        subtitle="Staff directory"
        right={<button className="btn btn-p btn-sm">+ Add teacher</button>}
      />
      <div className="pb fi">
        <div className="tw">
          <table>
            <thead>
              <tr><th>Teacher</th><th>Subject</th><th>Mobile</th><th>Batches</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {teachers.map((t) => (
                <tr key={t.name}>
                  <td>
                    <div className="td-nm">
                      <div className="ava" style={{ background: t.bg, color: t.fg }}>{t.initials}</div>
                      {t.name}
                    </div>
                  </td>
                  <td>{t.subject}</td>
                  <td className="mono">{t.mobile}</td>
                  <td className="mono">{t.batches}</td>
                  <td>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button className="btn btn-xs btn-s">Edit</button>
                      <button className="btn btn-xs btn-d">Remove</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PageShell>
  );
}
