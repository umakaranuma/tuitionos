"use client";
import { useState, useMemo } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { PageShell } from "@/components/layout/PageShell";
import { BATCHES, ALL_STUDENTS, BatchId, getScheduledSubjects, getTodayShort, TEACHERS, INIT_TIMETABLE } from "@/lib/batchData";
import { useRouter } from "next/navigation";

type AttStatus = "present" | "absent";
// keyed by `${batchId}::${subject}::${studentId}`
type AttRecord = Record<string, AttStatus>;

function todayLabel() {
  return new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

const DAY_LABELS: Record<string, string> = {
  Mon: "Monday", Tue: "Tuesday", Wed: "Wednesday",
  Thu: "Thursday", Fri: "Friday", Sat: "Saturday", Sun: "Sunday",
};

/* Subject color palette */
const SUBJ_COLORS: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  Mathematics:     { bg: "#eef4ff", border: "#b8d0fa", text: "#2a5fa8", icon: "📐" },
  Physics:         { bg: "#fef3d7", border: "#f5d98a", text: "#6b3e20", icon: "⚡" },
  Chemistry:       { bg: "#ede8fc", border: "#c8b8f0", text: "#6b3ea8", icon: "🧪" },
  English:         { bg: "#d4ede3", border: "#90cdb5", text: "#1a5040", icon: "📖" },
  Tamil:           { bg: "#fceaea", border: "#f5b5b5", text: "#b83030", icon: "📜" },
  Science:         { bg: "#e0f5ee", border: "#a0d8c0", text: "#1a6b48", icon: "🔬" },
  Biology:         { bg: "#e0f5ee", border: "#a0d8c0", text: "#1a6b48", icon: "🧬" },
  "Combined Maths":{ bg: "#eef4ff", border: "#b8d0fa", text: "#2a5fa8", icon: "∑" },
};
const DEFAULT_SUBJ_COLOR = { bg: "#f0ede6", border: "#d5d0c8", text: "#44403c", icon: "📚" };

function getSubjColor(subj: string) {
  return SUBJ_COLORS[subj] || DEFAULT_SUBJ_COLOR;
}

export default function AttendancePage() {
  const router = useRouter();
  const [selBatch, setSelBatch] = useState<BatchId>("g10");
  const [selSubject, setSelSubject] = useState<string | null>(null);
  const [att, setAtt] = useState<AttRecord>({});
  const [saved, setSaved] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDay, setSelectedDay] = useState(getTodayShort());

  const batch = BATCHES.find(b => b.id === selBatch)!;
  const students = ALL_STUDENTS.filter(s => s.batch === selBatch);

  // Get subjects scheduled for the selected day for this batch
  const scheduledSubjects = useMemo(
    () => getScheduledSubjects(selBatch, selectedDay),
    [selBatch, selectedDay]
  );

  // Get teacher for this subject+batch from timetable
  const getTeacherForSubject = (subj: string) => {
    const session = INIT_TIMETABLE.find(
      s => s.batchId === selBatch && s.day === selectedDay && s.subject === subj
    );
    if (!session) return null;
    return TEACHERS.find(t => t.id === session.teacherId) || null;
  };

  // Attendance key helpers
  const attKey = (studentId: number) => `${selBatch}::${selSubject}::${studentId}`;
  const getAtt = (sid: number): AttStatus => att[attKey(sid)] ?? "present";

  const setStudentAtt = (sid: number, val: AttStatus) => {
    setAtt(prev => ({ ...prev, [attKey(sid)]: val }));
    setSaved(false);
  };

  const bulkMark = (val: AttStatus) => {
    setAtt(prev => {
      const next = { ...prev };
      students.forEach(s => { next[attKey(s.id)] = val; });
      return next;
    });
    setSaved(false);
  };

  // When batch changes, reset subject selection
  const changeBatch = (id: BatchId) => {
    setSelBatch(id);
    setSelSubject(null);
    setSaved(false);
    setSearchQuery("");
  };

  // When day changes, reset subject selection
  const changeDay = (day: string) => {
    setSelectedDay(day);
    setSelSubject(null);
    setSaved(false);
  };

  // Stats
  const presentCount = selSubject ? students.filter(s => getAtt(s.id) === "present").length : 0;
  const absentCount = selSubject ? students.filter(s => getAtt(s.id) === "absent").length : 0;
  const pct = students.length ? Math.round(presentCount / students.length * 100) : 0;

  // Filtered students by search
  const filteredStudents = students.filter(s =>
    !searchQuery || s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Stats per subject (for the summary cards)
  const getSubjectStats = (subj: string) => {
    const present = students.filter(s => {
      const key = `${selBatch}::${subj}::${s.id}`;
      return (att[key] ?? "present") === "present";
    }).length;
    const marked = students.filter(s => {
      const key = `${selBatch}::${subj}::${s.id}`;
      return att[key] !== undefined;
    }).length;
    return { present, total: students.length, marked };
  };

  const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <PageShell>
      <Topbar
        title="Attendance"
        subtitle={todayLabel()}
        right={
          selSubject ? (
            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="btn btn-p btn-sm"
                onClick={() => setSaved(true)}
                style={{ background: saved ? "var(--tc-d)" : undefined }}
              >
                {saved ? "✓ Saved" : "Save & send alerts"}
              </button>
            </div>
          ) : undefined
        }
      />
      <div className="pb fi">

        {/* ── STEP 1: Batch selection ── */}
        <div style={{ marginBottom: 20 }}>
          <div style={{
            fontSize: 10, fontWeight: 700, color: "var(--ink3)",
            letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 8,
            display: "flex", alignItems: "center", gap: 6,
          }}>
            <span style={{
              width: 18, height: 18, borderRadius: "50%", background: "var(--tc)",
              color: "#fff", display: "inline-flex", alignItems: "center",
              justifyContent: "center", fontSize: 10, fontWeight: 800,
            }}>1</span>
            Select Batch
          </div>
          <div style={{
            display: "flex", gap: 6, flexWrap: "wrap",
            padding: "10px 14px",
            background: "#fff", border: "1px solid var(--ln)",
            borderRadius: 12, boxShadow: "0 1px 3px rgba(28,25,23,.05)",
          }}>
            {BATCHES.map(b => {
              const isActive = selBatch === b.id;
              const count = ALL_STUDENTS.filter(s => s.batch === b.id).length;
              return (
                <button
                  key={b.id}
                  onClick={() => changeBatch(b.id as BatchId)}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "6px 13px", borderRadius: 8, border: "1.5px solid",
                    borderColor: isActive ? b.color : "var(--ln)",
                    background: isActive ? b.colorL : "transparent",
                    color: isActive ? b.color : "var(--ink3)",
                    fontSize: 12.5, fontWeight: isActive ? 700 : 500,
                    cursor: "pointer", transition: "all 140ms",
                  }}
                >
                  {b.label}
                  <span style={{
                    fontSize: 10.5, fontWeight: 700,
                    background: isActive ? b.color : "var(--cr-d)",
                    color: isActive ? "#fff" : "var(--ink3)",
                    borderRadius: 99, padding: "1px 6px",
                    transition: "all 140ms",
                  }}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Day Selector ── */}
        <div style={{ marginBottom: 20 }}>
          <div style={{
            fontSize: 10, fontWeight: 700, color: "var(--ink3)",
            letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 8,
            display: "flex", alignItems: "center", gap: 6,
          }}>
            <span style={{
              width: 18, height: 18, borderRadius: "50%", background: selBatch ? "var(--tc)" : "var(--ln)",
              color: "#fff", display: "inline-flex", alignItems: "center",
              justifyContent: "center", fontSize: 10, fontWeight: 800,
            }}>2</span>
            Select Day &amp; Subject
          </div>

          {/* Day pills */}
          <div style={{
            display: "flex", gap: 4, marginBottom: 12,
            padding: "8px 12px",
            background: "#fff", border: "1px solid var(--ln)",
            borderRadius: 10, boxShadow: "0 1px 3px rgba(28,25,23,.05)",
          }}>
            {WEEKDAYS.map(day => {
              const isToday = day === getTodayShort();
              const isSelected = day === selectedDay;
              const hasSubjects = getScheduledSubjects(selBatch, day).length > 0;
              return (
                <button
                  key={day}
                  onClick={() => changeDay(day)}
                  style={{
                    padding: "6px 14px", borderRadius: 8, border: "1.5px solid",
                    borderColor: isSelected ? "var(--tc)" : "transparent",
                    background: isSelected ? "var(--tc-l)" : "transparent",
                    color: isSelected ? "var(--tc-d)" : hasSubjects ? "var(--ink)" : "var(--ink3)",
                    fontSize: 12, fontWeight: isSelected ? 700 : 500,
                    cursor: "pointer", transition: "all 140ms",
                    position: "relative", opacity: hasSubjects ? 1 : 0.5,
                  }}
                >
                  {day}
                  {isToday && (
                    <span style={{
                      position: "absolute", top: 2, right: 4,
                      width: 5, height: 5, borderRadius: "50%",
                      background: "var(--tc)",
                    }} />
                  )}
                </button>
              );
            })}
            <span style={{
              marginLeft: "auto", fontSize: 10.5, color: "var(--ink3)",
              alignSelf: "center", fontFamily: "var(--font-mono)",
            }}>
              {DAY_LABELS[selectedDay]}
            </span>
          </div>

          {/* Subject cards for selected day */}
          {scheduledSubjects.length === 0 ? (
            <div style={{
              background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 12,
              padding: "20px 18px", textAlign: "center",
            }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>📭</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#92400e" }}>
                No classes scheduled
              </div>
              <div style={{ fontSize: 11.5, color: "#a16207", marginTop: 4 }}>
                {batch.name} has no subjects on {DAY_LABELS[selectedDay]}
              </div>
            </div>
          ) : (
            <div style={{
              display: "grid",
              gridTemplateColumns: `repeat(${Math.min(scheduledSubjects.length, 4)}, 1fr)`,
              gap: 10,
            }}>
              {scheduledSubjects.map(subj => {
                const sc = getSubjColor(subj);
                const isSelected = selSubject === subj;
                const teacher = getTeacherForSubject(subj);
                const stats = getSubjectStats(subj);

                return (
                  <button
                    key={subj}
                    onClick={() => { setSelSubject(isSelected ? null : subj); setSaved(false); setSearchQuery(""); }}
                    style={{
                      background: isSelected ? sc.bg : "#fff",
                      border: `2px solid ${isSelected ? sc.border : "var(--ln)"}`,
                      borderRadius: 14, padding: "14px 16px",
                      cursor: "pointer", transition: "all 160ms",
                      textAlign: "left", position: "relative",
                      boxShadow: isSelected
                        ? `0 4px 16px ${sc.border}40, 0 0 0 1px ${sc.border}`
                        : "0 1px 3px rgba(28,25,23,.05)",
                      transform: isSelected ? "translateY(-2px)" : "none",
                    }}
                  >
                    {/* Selected indicator */}
                    {isSelected && (
                      <div style={{
                        position: "absolute", top: 10, right: 10,
                        width: 22, height: 22, borderRadius: "50%",
                        background: sc.text, color: "#fff",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 12, fontWeight: 700,
                      }}>✓</div>
                    )}

                    <div style={{ fontSize: 20, marginBottom: 6 }}>{sc.icon}</div>
                    <div style={{
                      fontSize: 13, fontWeight: 700,
                      color: isSelected ? sc.text : "var(--ink)",
                      marginBottom: 4,
                    }}>{subj}</div>
                    {teacher && (
                      <div style={{
                        fontSize: 10.5, color: isSelected ? sc.text : "var(--ink3)",
                        opacity: 0.8, marginBottom: 6,
                      }}>{teacher.name}</div>
                    )}
                    {/* Mini progress */}
                    {stats.marked > 0 && (
                      <div style={{ marginTop: 4 }}>
                        <div style={{
                          height: 3, background: isSelected ? `${sc.border}60` : "var(--ln)",
                          borderRadius: 99, overflow: "hidden",
                        }}>
                          <div style={{
                            height: "100%", borderRadius: 99,
                            width: `${Math.round(stats.present / stats.total * 100)}%`,
                            background: sc.text, transition: "width 300ms",
                          }} />
                        </div>
                        <div style={{
                          fontSize: 10, color: isSelected ? sc.text : "var(--ink3)",
                          marginTop: 3, opacity: 0.7,
                        }}>
                          {stats.present}/{stats.total} present
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── STEP 3: Student attendance marking ── */}
        {selSubject && (
          <div style={{ animation: "fadeUp 300ms cubic-bezier(.16,1,.3,1) both" }}>
            {/* Step header */}
            <div style={{
              fontSize: 10, fontWeight: 700, color: "var(--ink3)",
              letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 10,
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <span style={{
                width: 18, height: 18, borderRadius: "50%", background: "var(--tc)",
                color: "#fff", display: "inline-flex", alignItems: "center",
                justifyContent: "center", fontSize: 10, fontWeight: 800,
              }}>3</span>
              Mark Attendance
            </div>

            {/* Info banner */}
            {saved ? (
              <div style={{
                background: "var(--tc-l)", border: "1px solid #b8ddd0", borderRadius: 10,
                padding: "10px 14px", marginBottom: 14, fontSize: 12, color: "var(--tc-d)",
                display: "flex", alignItems: "center", gap: 8,
              }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M2 7l3 3 7-7"/></svg>
                Attendance saved for <strong>{selSubject}</strong> · {absentCount} absent alert{absentCount !== 1 ? "s" : ""} queued for 6:00 PM digest
              </div>
            ) : (
              <div style={{
                background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10,
                padding: "10px 14px", marginBottom: 14, fontSize: 12, color: "#92400e",
                display: "flex", alignItems: "center", gap: 8,
              }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.75"><circle cx="7" cy="7" r="6"/><path d="M7 4.5v3.5l2 1"/></svg>
                All students default to <strong>Present</strong>. Toggle individually or use bulk actions below.
              </div>
            )}

            {/* Toolbar: search + bulk + stats */}
            <div style={{
              display: "flex", alignItems: "center", gap: 10, marginBottom: 14,
              flexWrap: "wrap",
            }}>
              {/* Search */}
              <div style={{ position: "relative", flex: "1 1 180px", maxWidth: 260 }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="var(--ink3)" strokeWidth="1.5"
                  style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }}>
                  <circle cx="6" cy="6" r="4.5"/><path d="M9.5 9.5L13 13"/>
                </svg>
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search students..."
                  style={{ paddingLeft: 30, height: 34, fontSize: 12 }}
                />
              </div>

              {/* Bulk actions */}
              <div style={{ display: "flex", gap: 6 }}>
                <button className="btn btn-ok btn-sm" onClick={() => bulkMark("present")}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 6l3 3 5-5"/></svg>
                  All Present
                </button>
                <button className="btn btn-d btn-sm" onClick={() => bulkMark("absent")}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3l6 6M9 3l-6 6"/></svg>
                  All Absent
                </button>
              </div>

              {/* Stats summary */}
              <div style={{ marginLeft: "auto", display: "flex", gap: 12, alignItems: "center" }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "var(--tc-d)", fontFamily: "var(--font-serif)" }}>{presentCount}</div>
                  <div style={{ fontSize: 9.5, fontWeight: 600, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: ".06em" }}>Present</div>
                </div>
                <div style={{ width: 1, height: 28, background: "var(--ln)" }} />
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: absentCount > 0 ? "var(--rb)" : "var(--ink3)", fontFamily: "var(--font-serif)" }}>{absentCount}</div>
                  <div style={{ fontSize: 9.5, fontWeight: 600, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: ".06em" }}>Absent</div>
                </div>
                <div style={{ width: 1, height: 28, background: "var(--ln)" }} />
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: pct >= 90 ? "var(--tc-d)" : pct >= 75 ? "var(--sf)" : "var(--rb)", fontFamily: "var(--font-serif)" }}>{pct}%</div>
                  <div style={{ fontSize: 9.5, fontWeight: 600, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: ".06em" }}>Rate</div>
                </div>
              </div>
            </div>

            {/* Student list header */}
            <div style={{
              fontSize: 11, fontWeight: 700, color: "var(--ink3)",
              letterSpacing: ".06em", textTransform: "uppercase",
              marginBottom: 8, display: "flex", alignItems: "center", gap: 8,
            }}>
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                padding: "3px 10px", borderRadius: 6,
                background: getSubjColor(selSubject).bg,
                color: getSubjColor(selSubject).text,
                fontSize: 11, fontWeight: 700,
              }}>
                {getSubjColor(selSubject).icon} {selSubject}
              </span>
              <span style={{ color: "var(--ink3)" }}>·</span>
              {batch.name} · {filteredStudents.length} student{filteredStudents.length !== 1 ? "s" : ""}
            </div>

            {/* Student attendance table */}
            <div style={{
              background: "#fff", border: "1.5px solid var(--ln)",
              borderRadius: 14, overflow: "hidden",
              boxShadow: "0 1px 3px rgba(28,25,23,.05)",
            }}>
              {filteredStudents.map((s, si) => {
                const val = getAtt(s.id);
                const isAbsent = val === "absent";

                return (
                  <div
                    key={s.id}
                    style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "10px 16px",
                      borderTop: si > 0 ? "1px solid var(--ln)" : "none",
                      background: isAbsent ? "#fffbeb" : "#fff",
                      transition: "background 200ms",
                    }}
                  >
                    {/* Student info */}
                    <div
                      className="td-nm"
                      style={{ flex: 1, cursor: "pointer" }}
                      onClick={() => router.push(`/students/${s.id}`)}
                    >
                      <div className="ava" style={{
                        background: s.bg, color: s.fg,
                        width: 30, height: 30, fontSize: 11, flexShrink: 0,
                      }}>
                        {s.initials}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>
                          {s.name}
                        </div>
                        <div style={{ fontSize: 10, color: "var(--ink3)", fontFamily: "var(--font-mono)" }}>
                          {s.mobile} · {s.attPct}% avg
                        </div>
                      </div>
                    </div>

                    {/* Toggle buttons */}
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        onClick={() => setStudentAtt(s.id, "present")}
                        style={{
                          padding: "7px 16px", borderRadius: 8, border: "1.5px solid",
                          borderColor: val === "present" ? "#69bf96" : "var(--ln)",
                          background: val === "present" ? "#d4ede3" : "transparent",
                          color: val === "present" ? "#1a5040" : "var(--ink3)",
                          fontWeight: 700, fontSize: 11.5, cursor: "pointer",
                          transition: "all 150ms", display: "flex", alignItems: "center", gap: 5,
                        }}
                      >
                        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 6.5l3 3 6-6"/></svg>
                        Present
                      </button>
                      <button
                        onClick={() => setStudentAtt(s.id, "absent")}
                        style={{
                          padding: "7px 16px", borderRadius: 8, border: "1.5px solid",
                          borderColor: val === "absent" ? "#ef8a8a" : "var(--ln)",
                          background: val === "absent" ? "#fceaea" : "transparent",
                          color: val === "absent" ? "#b83030" : "var(--ink3)",
                          fontWeight: 700, fontSize: 11.5, cursor: "pointer",
                          transition: "all 150ms", display: "flex", alignItems: "center", gap: 5,
                        }}
                      >
                        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3l7 7M10 3l-7 7"/></svg>
                        Absent
                      </button>
                    </div>
                  </div>
                );
              })}

              {filteredStudents.length === 0 && (
                <div style={{ padding: "28px 16px", textAlign: "center", color: "var(--ink3)", fontSize: 12.5 }}>
                  No students found matching "{searchQuery}"
                </div>
              )}
            </div>

            {/* Bottom save bar */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              marginTop: 16, padding: "12px 18px",
              background: "#fff", border: "1.5px solid var(--ln)",
              borderRadius: 12, boxShadow: "0 1px 3px rgba(28,25,23,.05)",
            }}>
              <div style={{ fontSize: 12, color: "var(--ink3)" }}>
                {presentCount} present · {absentCount} absent
                {absentCount > 0 && (
                  <span style={{ color: "var(--rb)", fontWeight: 600 }}> · {absentCount} alert{absentCount !== 1 ? "s" : ""} will be sent at 6:00 PM</span>
                )}
              </div>
              <button
                className="btn btn-p"
                onClick={() => setSaved(true)}
                style={{ background: saved ? "var(--tc-d)" : undefined }}
              >
                {saved ? "✓ Saved successfully" : "Save & send alerts"}
              </button>
            </div>
          </div>
        )}

        {/* Prompt when no subject selected */}
        {!selSubject && scheduledSubjects.length > 0 && (
          <div style={{
            background: "#fff", border: "1.5px dashed var(--ln)",
            borderRadius: 14, padding: "32px 20px", textAlign: "center",
            marginTop: 8,
          }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>👆</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>
              Select a subject to begin
            </div>
            <div style={{ fontSize: 12, color: "var(--ink3)", marginTop: 4 }}>
              Choose one of the {scheduledSubjects.length} subject{scheduledSubjects.length !== 1 ? "s" : ""} scheduled for {DAY_LABELS[selectedDay]} in {batch.name}
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}
