"use client";
import { useState, useMemo, useEffect } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { PageShell } from "@/components/layout/PageShell";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/ToastProvider";
import { Avatar } from "@/components/ui/Avatar";
import { getScheduledSubjects, getTodayShort, TEACHERS, INIT_TIMETABLE } from "@/lib/batchData";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

type AttStatus = "present" | "absent";
type AttRecord = Record<string, AttStatus>;
type Batch = { id: number; name: string; grade?: string; section?: string; display_name?: string; color?: string; color_light?: string; label?: string };
type Student = { id: number; name: string; image?: string | null; bg?: string; fg?: string; initials?: string; mobile?: string; attPct?: number };
type TimetableSlot = { id: number; batch: number; subject: number | null; subject_name: string; teacher: number | null; teacher_name: string; day_of_week: string; start_time: string; end_time: string; room: string };
// Backend stores day_of_week as "0".."6" (Mon..Sun). The page uses 3-letter short codes.
const DAY_SHORT_TO_NUM: Record<string, string> = { Mon: "0", Tue: "1", Wed: "2", Thu: "3", Fri: "4", Sat: "5", Sun: "6" };

function todayLabel() {
  return new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

const DAY_LABELS: Record<string, string> = {
  Mon: "Monday", Tue: "Tuesday", Wed: "Wednesday",
  Thu: "Thursday", Fri: "Friday", Sat: "Saturday", Sun: "Sunday",
};

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
  const toast = useToast();

  const [batches, setBatches] = useState<Batch[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [slots, setSlots] = useState<TimetableSlot[]>([]);
  // Enroll-students modal state.
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [allInstituteStudents, setAllInstituteStudents] = useState<Student[]>([]);
  const [enrollPicked, setEnrollPicked] = useState<Set<number>>(new Set());
  const [enrolling, setEnrolling] = useState(false);
  const [enrollSearch, setEnrollSearch] = useState("");
  
  const [selBatch, setSelBatch] = useState<number | null>(null);
  const [selSubject, setSelSubject] = useState<string | null>(null);
  const [att, setAtt] = useState<AttRecord>({});
  const [completed, setCompleted] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [sendingAlerts, setSendingAlerts] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDay, setSelectedDay] = useState(getTodayShort());
  const [dbDate, setDbDate] = useState(new Date().toISOString().split("T")[0]);

  // Load batches initially
  useEffect(() => {
    api.get("/api/academics/batches")
      .then(r => {
        const d = Array.isArray(r.data) ? r.data : r.data.results || [];
        // Map colors for UI
        const withColors = d.map((b: any, i: number) => {
          const colors = [
            { c: "#2a5fa8", cl: "#d8e6fa" }, { c: "#2d7a5a", cl: "#d4ede3" },
            { c: "#6b3ea8", cl: "#ede8fc" }, { c: "#c07b1a", cl: "#fef3d7" }, { c: "#b83030", cl: "#fceaea" }
          ];
          const cs = colors[i % colors.length];
          // Prefer the API's `display_name` (canonical), fall back to short `grade` or `name`.
          return { ...b, color: cs.c, color_light: cs.cl, label: b.display_name || b.grade || b.name };
        });
        setBatches(withColors);
        if (withColors.length > 0) setSelBatch(withColors[0].id);
      })
      .catch(console.error);
  }, []);

  // Load students, attendance, and the real timetable for this batch.
  useEffect(() => {
    if (!selBatch) return;

    Promise.all([
      // Each fetch swallows its own failures so a 404 on one endpoint can't
      // wipe out the other two responses (and leave the page stuck on empty).
      api.get(`/api/students/students?batch=${selBatch}`)
        .then(r => Array.isArray(r.data) ? r.data : r.data.results || [])
        .catch(() => []),
      // The attendance app is mounted at `/api/attendance/` and its DRF router
      // uses trailing_slash=False — so the list URL is `/api/attendance/`
      // (the include prefix carries the slash). Hitting `/api/attendance`
      // returned 404 and rejected the whole Promise.all.
      api.get(`/api/attendance/?batch=${selBatch}&date=${dbDate}`)
        .then(r => Array.isArray(r.data) ? r.data : r.data.results || [])
        .catch(() => []),
      // Real timetable from the API (year-scoped via the X-Academic-Year header).
      api.get(`/api/timetable/?batch=${selBatch}`)
        .then(r => Array.isArray(r.data) ? r.data : r.data.results || [])
        .catch(() => []),
    ]).then(([st, attRecords, ts]) => {
      setSlots(ts);
      // Add UI mock fields to students
      const styledStudents = st.map((s: any, i: number) => {
        const cs = [
          { bg: "#d4ede3", fg: "#1a5040" }, { bg: "#d8e6fa", fg: "#2a5fa8" },
          { bg: "#fceaea", fg: "#b83030" }, { bg: "#fef3d7", fg: "#6b3e20" }, { bg: "#ede8fc", fg: "#6b3ea8" }
        ];
        const c = cs[i % cs.length];
        return { ...s, bg: c.bg, fg: c.fg, initials: s.name.substring(0, 2).toUpperCase(), attPct: Math.floor(Math.random() * 15) + 85, mobile: "+94770000000" };
      });
      setStudents(styledStudents);

      const attMap: AttRecord = {};
      attRecords.forEach((r: any) => {
        // Backend attendance structure mapping
        const subj = r.subject_name || "General";
        attMap[`${selBatch}::${subj}::${r.student}`] = r.is_present ? "present" : "absent";
      });
      setAtt(attMap);
    }).catch(console.error);
  }, [selBatch, dbDate]);

  const batch = batches.find(b => b.id === selBatch);

  // Real subjects scheduled for the selected day, sourced from /api/timetable/.
  // Falls back to mock-only when a batch genuinely has no timetable yet — that
  // way the page still works but doesn't lie about classes that don't exist.
  const scheduledSubjects = useMemo(() => {
    if (!batch) return [] as string[];
    const dayNum = DAY_SHORT_TO_NUM[selectedDay];
    const todaysSlots = slots.filter(s => s.day_of_week === dayNum);
    const subjects = Array.from(new Set(todaysSlots.map(s => s.subject_name).filter(Boolean)));
    // If no real slots exist for this batch at all, fall back to the seed mock
    // so the UI still shows something sensible until timetable is configured.
    if (slots.length === 0) return getScheduledSubjects(batch.name as any || "g10", selectedDay);
    return subjects;
  }, [batch, selectedDay, slots]);

  const getTeacherForSubject = (subj: string) => {
    if (!batch) return null;
    const dayNum = DAY_SHORT_TO_NUM[selectedDay];
    const realSlot = slots.find(s => s.day_of_week === dayNum && s.subject_name === subj);
    if (realSlot && realSlot.teacher_name) {
      return { name: realSlot.teacher_name, id: realSlot.teacher ?? 0 };
    }
    const session = INIT_TIMETABLE.find(
      s => s.batchId === batch.name as any && s.day === selectedDay && s.subject === subj,
    );
    if (!session) return null;
    return TEACHERS.find(t => t.id === session.teacherId) || null;
  };

  // The backend's Attendance.subject is a real FK id, not a name — resolve the
  // currently selected subject *name* back to its id via today's timetable slots.
  // "General" (a batch with no schedule for the day) has no backing Subject row,
  // so it resolves to null and is saved as a general/unscheduled-day record.
  const selSubjectId = useMemo(() => {
    if (!selSubject || selSubject === "General") return null;
    const dayNum = DAY_SHORT_TO_NUM[selectedDay];
    const slot = slots.find(s => s.day_of_week === dayNum && s.subject_name === selSubject);
    return slot?.subject ?? null;
  }, [selSubject, selectedDay, slots]);

  const attKey = (studentId: number) => `${selBatch}::${selSubject || "General"}::${studentId}`;
  const getAtt = (sid: number): AttStatus => att[attKey(sid)] ?? "present";
  const isAttMarked = (sid: number): boolean => attKey(sid) in att;

  // Marking a student writes straight to the DB — no separate Save step.
  const setStudentAtt = (sid: number, val: AttStatus) => {
    setAtt(prev => ({ ...prev, [attKey(sid)]: val }));
    setCompleted(false);
    if (!selBatch) return;
    api.post("/api/attendance/mark", {
      batch: selBatch, date: dbDate, subject: selSubjectId,
      records: [{ student: sid, is_present: val === "present" }],
    }).catch(e => { console.error(e); toast.error("Couldn't save that student's attendance."); });
  };

  const bulkMark = (val: AttStatus) => {
    setAtt(prev => {
      const next = { ...prev };
      students.forEach(s => { next[attKey(s.id)] = val; });
      return next;
    });
    setCompleted(false);
    if (!selBatch || students.length === 0) return;
    api.post("/api/attendance/mark", {
      batch: selBatch, date: dbDate, subject: selSubjectId,
      records: students.map(s => ({ student: s.id, is_present: val === "present" })),
    }).catch(e => { console.error(e); toast.error("Couldn't save bulk attendance."); });
  };

  const changeBatch = (id: number) => {
    setSelBatch(id);
    setSelSubject(null);
    setCompleted(false);
    setSearchQuery("");
  };

  const changeDay = (day: string) => {
    setSelectedDay(day);
    // Find nearest actual date for this day
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const targetIdx = days.indexOf(day);
    const d = new Date();
    const currentIdx = d.getDay();
    const diff = targetIdx - currentIdx;
    d.setDate(d.getDate() + diff);
    setDbDate(d.toISOString().split("T")[0]);

    setSelSubject(null);
    setCompleted(false);
  };

  // Any student the teacher never tapped is finalized as Absent — they can
  // still be flipped back to Present individually afterwards.
  const completeAttendance = async () => {
    if (!selBatch || !selSubject) return;
    const unmarked = students.filter(s => !isAttMarked(s.id));
    setCompleting(true);
    try {
      if (unmarked.length > 0) {
        setAtt(prev => {
          const next = { ...prev };
          unmarked.forEach(s => { next[attKey(s.id)] = "absent"; });
          return next;
        });
        await api.post("/api/attendance/mark", {
          batch: selBatch, date: dbDate, subject: selSubjectId,
          records: unmarked.map(s => ({ student: s.id, is_present: false })),
        });
      }
      setCompleted(true);
    } catch (e) {
      console.error(e);
      toast.error("Couldn't finalize attendance.");
    } finally {
      setCompleting(false);
    }
  };

  // Separate from marking/completing — explicitly notifies parents of
  // whoever is currently marked absent for this batch/date/subject.
  const sendAbsentAlerts = async () => {
    if (!selBatch || !selSubject) return;
    setSendingAlerts(true);
    try {
      const res = await api.post("/api/attendance/notify_absentees", {
        batch: selBatch, date: dbDate, subject: selSubjectId,
      });
      const { sent, failed } = res.data;
      if (sent === 0 && failed === 0) {
        toast.info("No absent students to notify.");
      } else if (failed > 0 && sent === 0) {
        toast.error(`Couldn't send any alerts (${failed} failed).`);
      } else if (failed > 0) {
        toast.info(`Sent ${sent} alert${sent !== 1 ? "s" : ""}, ${failed} failed.`);
      } else {
        toast.success(`Sent ${sent} absent alert${sent !== 1 ? "s" : ""} to parents.`);
      }
    } catch (e) {
      console.error(e);
      toast.error("Couldn't send absent alerts.");
    } finally {
      setSendingAlerts(false);
    }
  };

  const presentCount = selSubject ? students.filter(s => getAtt(s.id) === "present").length : 0;
  const absentCount = selSubject ? students.filter(s => getAtt(s.id) === "absent").length : 0;
  const pct = students.length ? Math.round(presentCount / students.length * 100) : 0;

  const filteredStudents = students.filter(s =>
    !searchQuery || s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Auto-select a subject so the student list shows the moment a batch is
  // picked. If the day has scheduled classes, default to the first one; if
  // not, fall back to "General" so attendance can still be marked.
  useEffect(() => {
    if (!selBatch) return;
    if (selSubject && (scheduledSubjects.includes(selSubject) || selSubject === "General")) return;
    setSelSubject(scheduledSubjects.length > 0 ? scheduledSubjects[0] : "General");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selBatch, selectedDay, scheduledSubjects.length]);

  // ── Enroll-students helpers ────────────────────────────────────────────────
  const openEnrollModal = async () => {
    setEnrollPicked(new Set());
    setEnrollSearch("");
    setEnrollOpen(true);
    try {
      // Load every institute student, regardless of batch, so the user can
      // pick anyone who isn't already in this batch.
      const r = await api.get(`/api/students/students`, { params: { limit: 500, student_status: "all" } });
      const list: Student[] = Array.isArray(r.data) ? r.data : r.data.results || [];
      const existingIds = new Set(students.map(s => s.id));
      setAllInstituteStudents(list.filter(s => !existingIds.has(s.id)));
    } catch {
      toast.error("Couldn't load the student list.");
    }
  };

  const togglePick = (id: number) =>
    setEnrollPicked(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const submitEnroll = async () => {
    if (!selBatch || enrollPicked.size === 0) return;
    setEnrolling(true);
    try {
      const r = await api.post(`/api/students/students/bulk_enroll`, {
        student_ids: Array.from(enrollPicked),
        batch: selBatch,
      });
      const n = r.data?.total ?? enrollPicked.size;
      toast.success(`Enrolled ${n} student${n !== 1 ? "s" : ""}.`);
      setEnrollOpen(false);
      // Re-trigger the batch+date effect to refresh the student list.
      setDbDate(d => d);
      // Easier: force reload by toggling selBatch off then back.
      const b = selBatch;
      setSelBatch(null);
      setTimeout(() => setSelBatch(b), 0);
    } catch {
      toast.error("Couldn't enroll those students.");
    } finally { setEnrolling(false); }
  };

  const enrollFiltered = enrollSearch
    ? allInstituteStudents.filter(s => s.name.toLowerCase().includes(enrollSearch.toLowerCase()))
    : allInstituteStudents;

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
                className="btn btn-s btn-sm"
                onClick={sendAbsentAlerts}
                disabled={sendingAlerts || absentCount === 0}
              >
                {sendingAlerts ? "Sending..." : "Send WhatsApp alerts"}
              </button>
              <button
                className="btn btn-p btn-sm"
                onClick={completeAttendance}
                disabled={completing}
                style={{ background: completed ? "var(--tc-d)" : undefined }}
              >
                {completing ? "Finalizing..." : completed ? "✓ Completed" : "Mark complete"}
              </button>
            </div>
          ) : undefined
        }
      />
      <div className="pb fi">
        {/* ── STEP 1: Batch selection ── */}
        <div style={{ marginBottom: 20 }}>
          <div className="step-indicator">
            <span className="step-num active">1</span>
            Select Batch
          </div>
          <div style={{
            display: "flex", gap: 6, flexWrap: "wrap",
            padding: "10px 14px",
            background: "#fff", border: "1px solid var(--ln)",
            borderRadius: 12, boxShadow: "0 1px 3px rgba(28,25,23,.05)",
          }}>
            {batches.map(b => {
              const isActive = selBatch === b.id;
              // Mocking student count for the pill if not fetched yet
              const count = isActive ? students.length : 20; 
              return (
                <button
                  key={b.id}
                  onClick={() => changeBatch(b.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "6px 13px", borderRadius: 8, border: "1.5px solid",
                    borderColor: isActive ? b.color : "var(--ln)",
                    background: isActive ? b.color_light : "transparent",
                    color: isActive ? b.color : "var(--ink3)",
                    fontSize: 12.5, fontWeight: isActive ? 700 : 500,
                    cursor: "pointer", transition: "all 140ms",
                  }}
                >
                  {b.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Day Selector ── */}
        <div style={{ marginBottom: 20 }}>
          <div className="step-indicator">
            <span className={`step-num ${selBatch ? "active" : "pending"}`}>2</span>
            Select Day &amp; Subject
          </div>

          <div style={{
            display: "flex", gap: 4, marginBottom: 12,
            padding: "8px 12px",
            background: "#fff", border: "1px solid var(--ln)",
            borderRadius: 10, boxShadow: "0 1px 3px rgba(28,25,23,.05)",
          }}>
            {WEEKDAYS.map(day => {
              const isToday = day === getTodayShort();
              const isSelected = day === selectedDay;
              const hasSubjects = batch ? getScheduledSubjects(batch.name as any || "g10", day).length > 0 : false;
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
              {DAY_LABELS[selectedDay]} ({dbDate})
            </span>
          </div>

          {scheduledSubjects.length === 0 ? (
            // No timetable for this day — show a soft notice but DON'T block
            // attendance marking. The student list below stays usable because
            // `selSubject` auto-defaults to "General" for batches with no schedule.
            <div style={{
              background: "var(--cr)", border: "1px dashed var(--ln)", borderRadius: 12,
              padding: "14px 18px", display: "flex", alignItems: "center", gap: 10,
              color: "var(--ink2)", fontSize: 13,
            }}>
              <span style={{ fontSize: 16 }}>🗓️</span>
              <span>
                <strong>{batch?.label || batch?.name}</strong> has no schedule for <strong>{DAY_LABELS[selectedDay]}</strong>.
                You can still mark attendance below — it'll be recorded as a general day.
              </span>
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
                    onClick={() => { setSelSubject(isSelected ? null : subj); setCompleted(false); setSearchQuery(""); }}
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
            <div className="step-indicator">
              <span className="step-num active">3</span>
              Mark Attendance
            </div>

            {completed ? (
              <div style={{
                background: "var(--tc-l)", border: "1px solid #b8ddd0", borderRadius: 10,
                padding: "12px 16px", marginBottom: 14, fontSize: 12, color: "var(--tc-d)",
                display: "flex", alignItems: "center", gap: 10,
              }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M2 7l3 3 7-7"/></svg>
                <div style={{ flex: 1 }}>
                  Attendance completed for <strong>{selSubject}</strong> — any unmarked students were set to Absent. Use "Send WhatsApp alerts" to notify parents.
                </div>
              </div>
            ) : (
              <div style={{
                background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10,
                padding: "12px 16px", marginBottom: 14, fontSize: 12, color: "#92400e",
                display: "flex", alignItems: "center", gap: 8,
              }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.75"><circle cx="7" cy="7" r="6"/><path d="M7 4.5v3.5l2 1"/></svg>
                Each tap saves immediately. Unmarked students count as Present for now — tap <strong>Mark complete</strong> to set anyone still unmarked to Absent automatically.
              </div>
            )}

            <div style={{
              display: "flex", alignItems: "center", gap: 10, marginBottom: 14,
              flexWrap: "wrap",
            }}>
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
              {batch?.name} · {filteredStudents.length} student{filteredStudents.length !== 1 ? "s" : ""}
            </div>

            <div style={{
              background: "#fff", border: "1.5px solid var(--ln)",
              borderRadius: 14, overflow: "hidden",
              boxShadow: "0 1px 3px rgba(28,25,23,.05)",
            }}>
              {filteredStudents.map((s, si) => {
                const val = getAtt(s.id);
                const marked = isAttMarked(s.id);
                const isPresentSelected = marked && val === "present";
                const isAbsentSelected = marked && val === "absent";

                const indicatorColor = isPresentSelected ? "#69bf96" : isAbsentSelected ? "#ef8a8a" : "transparent";

                return (
                  <div
                    key={s.id}
                    style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "10px 16px",
                      borderTop: si > 0 ? "1px solid var(--ln)" : "none",
                      borderLeft: `3px solid ${indicatorColor}`,
                      background: isAbsentSelected ? "#fffbeb" : "#fff",
                      transition: "background 200ms, border-color 150ms",
                    }}
                  >
                    <div
                      className="td-nm"
                      style={{ flex: 1, cursor: "pointer" }}
                      onClick={() => router.push(`/students/${s.id}`)}
                    >
                      <Avatar src={s.image} name={s.name} size={30} radius={8} bg={s.bg} fg={s.fg} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>
                          {s.name}
                        </div>
                        <div style={{ fontSize: 10, color: "var(--ink3)", fontFamily: "var(--font-mono)" }}>
                          {s.mobile} · {s.attPct}% avg
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        onClick={() => setStudentAtt(s.id, "present")}
                        style={{
                          padding: "7px 16px", borderRadius: 8, border: "1.5px solid",
                          borderColor: isPresentSelected ? "#69bf96" : "var(--ln)",
                          background: isPresentSelected ? "#d4ede3" : "transparent",
                          color: isPresentSelected ? "#1a5040" : "var(--ink3)",
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
                          borderColor: isAbsentSelected ? "#ef8a8a" : "var(--ln)",
                          background: isAbsentSelected ? "#fceaea" : "transparent",
                          color: isAbsentSelected ? "#b83030" : "var(--ink3)",
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
                <div style={{ padding: "32px 18px", textAlign: "center", color: "var(--ink3)", fontSize: 12.5 }}>
                  {searchQuery ? (
                    `No students found matching "${searchQuery}"`
                  ) : (
                    <div>
                      <div style={{ fontSize: 28, marginBottom: 10 }}>👥</div>
                      <div style={{ fontWeight: 800, color: "var(--ink)", marginBottom: 6, fontSize: 14 }}>
                        No students are enrolled in {batch?.label || batch?.name}
                      </div>
                      <div style={{ fontSize: 12.5, color: "var(--ink2)", marginBottom: 6, lineHeight: 1.55, maxWidth: 480, margin: "0 auto 14px" }}>
                        <strong>The timetable you created sets the class schedule</strong> — but students don't join the batch automatically.
                        Enroll them once below and they'll appear here every time you pick this batch.
                      </div>
                      <button className="btn btn-p btn-sm" onClick={openEnrollModal}>
                        + Enroll students into this batch
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              marginTop: 16, padding: "12px 18px",
              background: "#fff", border: "1.5px solid var(--ln)",
              borderRadius: 12, boxShadow: "0 1px 3px rgba(28,25,23,.05)",
            }}>
              <div style={{ fontSize: 12, color: "var(--ink3)" }}>
                {presentCount} present · {absentCount} absent
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="btn btn-s"
                  onClick={sendAbsentAlerts}
                  disabled={sendingAlerts || absentCount === 0}
                >
                  {sendingAlerts ? "Sending..." : "Send WhatsApp alerts"}
                </button>
                <button
                  className="btn btn-p"
                  onClick={completeAttendance}
                  disabled={completing}
                  style={{ background: completed ? "var(--tc-d)" : undefined }}
                >
                  {completing ? "Finalizing..." : completed ? "✓ Completed" : "Mark complete"}
                </button>
              </div>
            </div>
          </div>
        )}

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
              Choose one of the {scheduledSubjects.length} subject{scheduledSubjects.length !== 1 ? "s" : ""} scheduled for {DAY_LABELS[selectedDay]} in {batch?.name}
            </div>
          </div>
        )}
      </div>

      {/* ── Enroll-students modal ── */}
      <Modal
        open={enrollOpen}
        onClose={() => setEnrollOpen(false)}
        title={`Enroll students into ${batch?.label || batch?.name || "this batch"}`}
        wide
        footer={<>
          <button className="btn btn-s btn-sm" onClick={() => setEnrollOpen(false)} disabled={enrolling}>Cancel</button>
          <button className="btn btn-p btn-sm" onClick={submitEnroll} disabled={enrolling || enrollPicked.size === 0}>
            {enrolling ? "Enrolling…" : `Enroll ${enrollPicked.size || ""} student${enrollPicked.size !== 1 ? "s" : ""}`.trim()}
          </button>
        </>}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <input
            placeholder="Search students…"
            value={enrollSearch}
            onChange={e => setEnrollSearch(e.target.value)}
            autoFocus
          />
          <div style={{ fontSize: 11.5, color: "var(--ink3)" }}>
            {enrollFiltered.length} candidate{enrollFiltered.length !== 1 ? "s" : ""} · {enrollPicked.size} selected
          </div>
          {enrollFiltered.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: "var(--ink3)", background: "var(--cr)", borderRadius: 10, fontSize: 13 }}>
              No more students to enroll.{" "}
              <a href="/students" style={{ color: "var(--tc)" }}>Add new students</a> first.
            </div>
          ) : (
            <div style={{
              maxHeight: "50vh", overflowY: "auto", border: "1px solid var(--ln)",
              borderRadius: 10, padding: 4,
            }}>
              {enrollFiltered.map(s => {
                const picked = enrollPicked.has(s.id);
                return (
                  <label key={s.id} style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "8px 10px",
                    cursor: "pointer", borderRadius: 8, background: picked ? "var(--tc-l)" : "transparent",
                  }}>
                    <input type="checkbox" checked={picked} onChange={() => togglePick(s.id)} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{s.name}</div>
                      <div style={{ fontSize: 11, color: "var(--ink3)" }}>
                        {(s as Student & { batch_code?: string; parent_name?: string }).parent_name || "—"}
                        {(s as Student & { batch_code?: string }).batch_code && (s as Student & { batch_code?: string }).batch_code !== "DEFAULT"
                          ? ` · current batch_code: ${(s as Student & { batch_code?: string }).batch_code}`
                          : " · no batch"}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
          <div style={{ fontSize: 11.5, color: "var(--ink3)", lineHeight: 1.5 }}>
            Selected students are added to <strong>{batch?.label || batch?.name}</strong> for the current academic year.
            Any archived enrollment in this batch is re-activated.
          </div>
        </div>
      </Modal>
    </PageShell>
  );
}
