import { Topbar } from "@/components/layout/Topbar";
import { PageShell } from "@/components/layout/PageShell";

const batches = [
  {
    name: "Grade 7 — Batch A", students: 18, fee: "LKR 3,000/mo",
    subjects: [
      { name: "Mathematics", bg: "var(--sp-l)", fg: "var(--sp)" },
      { name: "Science", bg: "var(--tc-l)", fg: "var(--tc-d)" },
      { name: "English", bg: "var(--sf-l)", fg: "var(--sf)" },
      { name: "Tamil", bg: "var(--pr-l)", fg: "var(--pr)" },
    ],
  },
  {
    name: "Grade 10 — O/L Batch", students: 25, fee: "LKR 5,500/mo",
    subjects: [
      { name: "Mathematics", bg: "var(--sp-l)", fg: "var(--sp)" },
      { name: "Physics", bg: "var(--tc-l)", fg: "var(--tc-d)" },
      { name: "Chemistry", bg: "var(--rb-l)", fg: "var(--rb)" },
      { name: "English", bg: "var(--sf-l)", fg: "var(--sf)" },
    ],
  },
  {
    name: "Grade 11 — A/L Science", students: 19, fee: "LKR 7,000/mo",
    subjects: [
      { name: "Physics", bg: "var(--tc-l)", fg: "var(--tc-d)" },
      { name: "Chemistry", bg: "var(--rb-l)", fg: "var(--rb)" },
      { name: "Combined Maths", bg: "var(--sp-l)", fg: "var(--sp)" },
      { name: "Biology", bg: "var(--jd-l,#d4ede3)", fg: "var(--tc-d)" },
    ],
  },
  {
    name: "Grade 8 — Batch B", students: 22, fee: "LKR 3,000/mo",
    subjects: [
      { name: "Mathematics", bg: "var(--sp-l)", fg: "var(--sp)" },
      { name: "English", bg: "var(--sf-l)", fg: "var(--sf)" },
      { name: "Tamil", bg: "var(--pr-l)", fg: "var(--pr)" },
    ],
  },
];

export default function BatchesPage() {
  return (
    <PageShell>
      <Topbar
        title="Batches"
        subtitle="Grade groups and packages"
        right={<button className="btn btn-p btn-sm">+ Create batch</button>}
      />
      <div className="pb fi">
        <div className="g2">
          {batches.map((b) => (
            <div key={b.name} className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>{b.name}</div>
                  <div style={{ fontSize: 11, color: "var(--ink3)", marginTop: 2 }}>
                    {b.students} students · {b.fee}
                  </div>
                </div>
                <button className="btn btn-xs btn-s">Edit</button>
              </div>
              <hr className="dv" />
              <div style={{ fontSize: 11, color: "var(--ink3)", marginBottom: 6 }}>Subjects</div>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                {b.subjects.map((s) => (
                  <span key={s.name} className="bdg" style={{ background: s.bg, color: s.fg }}>{s.name}</span>
                ))}
              </div>
            </div>
          ))}
          <div
            className="card"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              borderStyle: "dashed", cursor: "pointer", color: "var(--ink3)", gap: 6,
              fontSize: 12.5, minHeight: 120,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M8 3v10M3 8h10"/>
            </svg>
            Create new batch
          </div>
        </div>
      </div>
    </PageShell>
  );
}
