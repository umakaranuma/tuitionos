import { Topbar } from "@/components/layout/Topbar";
import { PageShell } from "@/components/layout/PageShell";

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

const slots: Record<string, Array<{ sub: string; time: string; teacher: string } | null>> = {
  "8:00 – 9:30 AM": [
    { sub: "Mathematics", time: "8:00 – 9:30 AM", teacher: "Mr. Rajan" },
    { sub: "Physics", time: "8:00 – 9:30 AM", teacher: "Ms. Geetha" },
    null,
    { sub: "Chemistry", time: "8:00 – 9:30 AM", teacher: "Mr. Arjun" },
    null,
  ],
  "10:00 – 11:30 AM": [
    { sub: "Mathematics", time: "10:00 – 11:30 AM", teacher: "Mr. Rajan" },
    { sub: "English", time: "10:00 – 11:30 AM", teacher: "Ms. Ramya" },
    null,
    { sub: "Physics", time: "10:00 – 11:30 AM", teacher: "Ms. Geetha" },
    null,
  ],
  "2:00 – 3:30 PM": [
    null,
    null,
    { sub: "Chemistry", time: "2:00 – 3:30 PM", teacher: "Mr. Arjun" },
    null,
    { sub: "English", time: "2:00 – 3:30 PM", teacher: "Ms. Ramya" },
  ],
  "4:00 – 5:30 PM": [
    { sub: "Tamil", time: "4:00 – 5:30 PM", teacher: "Ms. Valli" },
    null,
    null,
    null,
    { sub: "Tamil", time: "4:00 – 5:30 PM", teacher: "Ms. Valli" },
  ],
};

export default function TimetablePage() {
  return (
    <PageShell>
      <Topbar
        title="Timetable"
        subtitle="Weekly schedule"
        right={
          <>
            <select style={{ width: "auto" }}>
              <option>Grade 10 — O/L Batch</option>
              <option>Grade 7 — Batch A</option>
              <option>Grade 11 — A/L</option>
            </select>
            <button className="btn btn-p btn-sm">Save &amp; notify parents</button>
          </>
        }
      />
      <div className="pb fi">
        <div style={{
          background: "var(--ac-l)", border: "1px solid #e0c0a8", borderRadius: "var(--r)",
          padding: "10px 14px", marginBottom: 16, fontSize: 12, color: "var(--ac)",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.75">
            <circle cx="7" cy="7" r="6"/><path d="M7 4.5v3.5l2 1"/>
          </svg>
          Click any slot to edit. Changes affecting 3+ sessions will trigger a PDF notification to parents.
        </div>

        <div className="tt-grid" style={{ marginBottom: 4 }}>
          <div />
          {days.map((d) => <div key={d} className="tt-day">{d}</div>)}
        </div>

        {Object.entries(slots).map(([timeLabel, row]) => (
          <div key={timeLabel} className="tt-grid" style={{ marginBottom: 8, gridTemplateColumns: "80px repeat(5, 1fr)" }}>
            <div style={{ fontSize: 10, color: "var(--ink3)", fontFamily: "var(--font-mono)", paddingTop: 12, paddingRight: 8, textAlign: "right" }}>
              {timeLabel.split(" – ")[0]}
            </div>
            {row.map((slot, i) =>
              slot ? (
                <div key={i} className="tt-slot">
                  <div className="tt-sub">{slot.sub}</div>
                  <div className="tt-time">{slot.time}</div>
                  <div className="tt-teacher">{slot.teacher}</div>
                </div>
              ) : (
                <div key={i} className="tt-slot empty">+ Add class</div>
              )
            )}
          </div>
        ))}
      </div>
    </PageShell>
  );
}
