import { Topbar } from "@/components/layout/Topbar";
import { PageShell } from "@/components/layout/PageShell";

const subjects = [
  { name: "Mathematics", icon: "∑", bg: "var(--sp-l)", batches: 3, teacher: "Mr. Rajan" },
  { name: "Physics", icon: "⚛", bg: "var(--tc-l)", batches: 2, teacher: "Ms. Geetha" },
  { name: "Chemistry", icon: "🧪", bg: "var(--rb-l)", batches: 2, teacher: "Mr. Arjun" },
  { name: "English", icon: "📖", bg: "var(--sf-l)", batches: 4, teacher: "Ms. Ramya" },
  { name: "Tamil Literature", icon: "📐", bg: "var(--pr-l)", batches: 3, teacher: "Ms. Valli" },
  { name: "Biology", icon: "🌿", bg: "var(--jd-l, #d4ede3)", batches: 1, teacher: "Ms. Anitha" },
];

export default function SubjectsPage() {
  return (
    <PageShell>
      <Topbar
        title="Subjects"
        subtitle="Define what you teach"
        right={<button className="btn btn-p btn-sm">+ Add subject</button>}
      />
      <div className="pb fi">
        <div className="g3">
          {subjects.map((s) => (
            <div key={s.name} className="card" style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 9, background: s.bg,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0
              }}>
                {s.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{s.name}</div>
                <div style={{ fontSize: 11, color: "var(--ink3)", marginTop: 2 }}>
                  {s.batches} batch{s.batches !== 1 ? "es" : ""} · Teacher: {s.teacher}
                </div>
              </div>
              <button className="btn btn-xs btn-s">Edit</button>
            </div>
          ))}
          <div
            className="card"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              borderStyle: "dashed", cursor: "pointer", color: "var(--ink3)", gap: 6,
              fontSize: 12.5, minHeight: 78,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M8 3v10M3 8h10"/>
            </svg>
            Add subject
          </div>
        </div>
      </div>
    </PageShell>
  );
}
