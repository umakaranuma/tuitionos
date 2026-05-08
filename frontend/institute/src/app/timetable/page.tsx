"use client";
import { useState, useEffect } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { PageShell } from "@/components/layout/PageShell";
import { api } from "@/lib/api";

type Slot = { id: number; batch: number; batch_name: string; day_of_week: string; start_time: string; end_time: string; room: string; notes: string };
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAY_MAP: Record<string, string> = { "0": "Monday", "1": "Tuesday", "2": "Wednesday", "3": "Thursday", "4": "Friday", "5": "Saturday", "6": "Sunday" };

export default function TimetablePage() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/api/timetable/").then(r => {
      const d = r.data; setSlots(Array.isArray(d) ? d : d.results || []); setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const grouped = DAYS.reduce((acc, day, idx) => {
    acc[day] = slots.filter(s => s.day_of_week === String(idx));
    return acc;
  }, {} as Record<string, Slot[]>);

  return (
    <PageShell>
      <Topbar title="Timetable" subtitle={`${slots.length} sessions scheduled`} />
      <div className="pb fi">
        {loading ? <div style={{ textAlign: "center", padding: 40, color: "var(--ink3)" }}>Loading...</div> : (
          <div style={{ display: "grid", gap: 12 }}>
            {DAYS.map((day, dayIdx) => {
              const daySlots = grouped[day] || [];
              if (daySlots.length === 0) return null;
              return (
                <div key={day}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink3)", letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 8 }}>{day}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 8 }}>
                    {daySlots.sort((a, b) => a.start_time.localeCompare(b.start_time)).map(s => (
                      <div key={s.id} className="card" style={{ padding: "10px 14px" }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>{s.batch_name || `Batch #${s.batch}`}</div>
                        <div style={{ fontSize: 11.5, color: "var(--ink3)", display: "flex", gap: 8 }}>
                          <span className="mono">{s.start_time?.slice(0, 5)} — {s.end_time?.slice(0, 5)}</span>
                          <span>{s.room}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            {slots.length === 0 && <div className="card" style={{ textAlign: "center", color: "var(--ink3)", padding: 24 }}>No timetable entries yet</div>}
          </div>
        )}
      </div>
    </PageShell>
  );
}
