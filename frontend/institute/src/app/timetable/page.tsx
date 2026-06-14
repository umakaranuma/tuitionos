"use client";
import { useState, useMemo, useEffect } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { PageShell } from "@/components/layout/PageShell";
import { api } from "@/lib/api";
import { getStoredUser } from "@/lib/auth";
import { Modal } from "@/components/ui/Modal";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { Toast } from "@/components/ui/Toast";
import { INIT_EXAMS, BATCHES } from "@/lib/batchData";

type Slot = { id: number; batch: number; batch_name: string; subject: number; subject_name: string; teacher: number; teacher_name: string; day_of_week: string; start_time: string; end_time: string; notes: string };
// Local exam shape — keeps the existing camelCase UI, transformed to/from the
// backend's snake_case `Exam` + `ExamScheduleItem` resources.
type ExamScheduleEntry = { date: string; subject: string; startTime: string; endTime: string };
type Exam = {
  id: number; name: string; year: number; batchId: number | string;
  startDate: string; endDate: string; status: "upcoming" | "ongoing" | "completed";
  maxMarks: number; schedule: ExamScheduleEntry[];
};
type ApiExam = {
  id: number; name: string; year: number; batch: number; batch_name: string;
  start_date: string; end_date: string; status: "upcoming" | "ongoing" | "completed";
  max_marks: number;
  schedule: { id: number; date: string; subject: string; start_time: string; end_time: string }[];
};
const examFromApi = (e: ApiExam): Exam => ({
  id: e.id, name: e.name, year: e.year, batchId: e.batch,
  startDate: e.start_date, endDate: e.end_date,
  status: e.status, maxMarks: e.max_marks,
  schedule: (e.schedule || []).map(s => ({
    date: s.date, subject: s.subject, startTime: s.start_time, endTime: s.end_time,
  })),
});
const examToApi = (e: Partial<Exam>) => ({
  ...(e.name !== undefined ? { name: e.name } : {}),
  ...(e.year !== undefined ? { year: e.year } : {}),
  ...(e.batchId !== undefined ? { batch: Number(e.batchId) } : {}),
  ...(e.startDate !== undefined ? { start_date: e.startDate } : {}),
  ...(e.endDate !== undefined ? { end_date: e.endDate } : {}),
  ...(e.status !== undefined ? { status: e.status } : {}),
  ...(e.maxMarks !== undefined ? { max_marks: e.maxMarks } : {}),
  ...(e.schedule !== undefined ? {
    schedule: e.schedule.map(s => ({
      date: s.date, subject: s.subject, start_time: s.startTime, end_time: s.endTime,
    })),
  } : {}),
});

// ── Time Block = a reusable time range definition ──
type TimeBlock = { id: number; label: string; startTime: string; endTime: string };

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const FULL_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// Default time blocks (matching INIT_TIMESLOTS from batchData)
const DEFAULT_TIME_BLOCKS: TimeBlock[] = [
  { id: 1, label: "Block 1", startTime: "08:00", endTime: "09:30" },
  { id: 2, label: "Block 2", startTime: "10:00", endTime: "11:30" },
  { id: 3, label: "Block 3", startTime: "14:00", endTime: "15:30" },
  { id: 4, label: "Block 4", startTime: "16:00", endTime: "17:30" },
];

function formatTime12(t: string) {
  const [hStr, mStr] = t.split(":");
  let h = parseInt(hStr, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${mStr} ${ampm}`;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

const SUBJ_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  Mathematics:     { bg: "#eef4ff", border: "#b8d0fa", text: "#2a5fa8" },
  Physics:         { bg: "#fef3d7", border: "#f5d98a", text: "#6b3e20" },
  Chemistry:       { bg: "#ede8fc", border: "#c8b8f0", text: "#6b3ea8" },
  English:         { bg: "#d4ede3", border: "#90cdb5", text: "#1a5040" },
  Tamil:           { bg: "#fceaea", border: "#f5b5b5", text: "#b83030" },
  Science:         { bg: "#e0f5ee", border: "#a0d8c0", text: "#1a6b48" },
  Biology:         { bg: "#e0f5ee", border: "#a0d8c0", text: "#1a6b48" },
  "Combined Maths":{ bg: "#eef4ff", border: "#b8d0fa", text: "#2a5fa8" },
};
const DEFAULT_SUBJ_COLOR = { bg: "#f0ede6", border: "#d5d0c8", text: "#44403c" };

const STATUS_CONFIG: Record<string, { label: string; stripe: string }> = {
  upcoming:  { label: "Upcoming",  stripe: "var(--sp)" },
  ongoing:   { label: "Ongoing",   stripe: "var(--ac)" },
  completed: { label: "Completed", stripe: "var(--tc)" },
};

export default function TimetablePage() {
  // ── Core state ──
  const [viewMode, setViewMode] = useState<"class" | "exam">("class");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [batches, setBatches] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);

  // ── Time blocks ──
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>(DEFAULT_TIME_BLOCKS);
  const [blockModal, setBlockModal] = useState(false);
  const [newBlock, setNewBlock] = useState({ label: "", startTime: "", endTime: "" });
  const [blockErrors, setBlockErrors] = useState<Record<string, string>>({});

  // ── Session modal ──
  const [slotModal, setSlotModal] = useState<any>(null);
  const [slotType, setSlotType] = useState<"class" | "leave">("class");
  const [leaveColor, setLeaveColor] = useState("#ef4444");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [alertModal, setAlertModal] = useState<{open: boolean, message: string, type: "success"|"error"}|null>(null);

  const [filterBatch, setFilterBatch] = useState<string>("");
  const [filterTeacher, setFilterTeacher] = useState<string>("");

  // ── Publish modal ──
  const [publishModal, setPublishModal] = useState(false);
  const [publishTarget, setPublishTarget] = useState<"all" | "current">("all");

  // ── Exam state — fetched from the backend (year-scoped by header) ──
  const [exams, setExams] = useState<Exam[]>([]);
  const [examFilter, setExamFilter] = useState<string>("all");
  const [examModal, setExamModal] = useState<{ id?: number; name: string; batchId: string | number; startDate: string; endDate: string; maxMarks: number; timeBlockId: string | number } | null>(null);
  const [examErrors, setExamErrors] = useState<Record<string, string>>({});

  const LEAVE_COLORS = [
    { color: "#ef4444", label: "Red" },
    { color: "#f59e0b", label: "Amber" },
    { color: "#3b82f6", label: "Blue" },
    { color: "#8b5cf6", label: "Purple" },
    { color: "#6b7280", label: "Grey" },
  ];

  // ── Data loading ──
  const loadData = () => {
    const user = getStoredUser();
    if (user?.institute?.plan !== "institute_pro") {
      setIsLocked(true);
      return;
    }
    const yearParam = (typeof window !== "undefined"
      ? (localStorage.getItem("academic_year") || String(new Date().getFullYear()))
      : String(new Date().getFullYear()));
    Promise.all([
      api.get("/api/timetable/"),
      // Pass academic_year explicitly so the batch list always reflects the
      // year selector in the topbar — no stale cross-year leakage.
      api.get(`/api/academics/batches?academic_year=${yearParam}`),
      api.get("/api/academics/subjects"),
      api.get("/api/academics/teachers"),
      api.get("/api/academics/exams"),
    ]).then(([resT, resB, resS, resTea, resExams]) => {
      setSlots(Array.isArray(resT.data) ? resT.data : resT.data.results || []);
      setBatches(Array.isArray(resB.data) ? resB.data : resB.data.results || []);
      setSubjects(Array.isArray(resS.data) ? resS.data : resS.data.results || []);
      setTeachers(Array.isArray(resTea.data) ? resTea.data : resTea.data.results || []);
      const examData: ApiExam[] = Array.isArray(resExams.data) ? resExams.data : resExams.data.results || [];
      setExams(examData.map(examFromApi));
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  const reloadExams = async () => {
    try {
      const r = await api.get("/api/academics/exams");
      const data: ApiExam[] = Array.isArray(r.data) ? r.data : r.data.results || [];
      setExams(data.map(examFromApi));
    } catch { /* keep existing */ }
  };
  
  useEffect(() => { loadData(); }, []);

  // Resolve the current academic year from the topbar selector. Always pass it
  // explicitly so a search query (which replaces the `batches` state) can never
  // leak batches from another year — belt-and-suspenders with the header.
  const currentAcademicYear = (typeof window !== "undefined"
    ? (localStorage.getItem("academic_year") || String(new Date().getFullYear()))
    : String(new Date().getFullYear()));

  const searchBatches = async (q: string) => {
    try {
      const r = await api.get(`/api/academics/batches?academic_year=${currentAcademicYear}&search=${encodeURIComponent(q)}`);
      setBatches(Array.isArray(r.data) ? r.data : r.data.results || []);
    } catch { /* keep current */ }
  };
  const searchSubjects = async (q: string) => {
    try { const r = await api.get(`/api/academics/subjects?search=${encodeURIComponent(q)}`); setSubjects(Array.isArray(r.data) ? r.data : r.data.results || []); } catch (e) {}
  };
  const searchTeachers = async (q: string) => {
    try { const r = await api.get(`/api/academics/teachers?search=${encodeURIComponent(q)}`); setTeachers(Array.isArray(r.data) ? r.data : r.data.results || []); } catch (e) {}
  };

  // ── Time block CRUD ──
  const addTimeBlock = () => {
    const errs: Record<string, string> = {};
    if (!newBlock.startTime) errs.startTime = "Required";
    if (!newBlock.endTime) errs.endTime = "Required";
    if (newBlock.startTime && newBlock.endTime && newBlock.startTime >= newBlock.endTime) errs.endTime = "Must be after start";
    if (Object.keys(errs).length > 0) { setBlockErrors(errs); return; }
    setBlockErrors({});

    const label = newBlock.label || `${formatTime12(newBlock.startTime)} – ${formatTime12(newBlock.endTime)}`;
    const id = Math.max(0, ...timeBlocks.map(b => b.id)) + 1;
    setTimeBlocks(prev => [...prev, { id, label, startTime: newBlock.startTime, endTime: newBlock.endTime }].sort((a, b) => a.startTime.localeCompare(b.startTime)));
    setNewBlock({ label: "", startTime: "", endTime: "" });
    setBlockModal(false);
    setAlertModal({ open: true, message: "Time block created.", type: "success" });
  };

  const removeTimeBlock = (id: number) => {
    setTimeBlocks(prev => prev.filter(b => b.id !== id));
  };

  // ── Session save ──
  const saveSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (slotType === "leave") {
      setAlertModal({ open: true, message: "Leave block saved.", type: "success" });
      setSlotModal(null); setErrors({}); return;
    }

    const newErrors: Record<string, string> = {};
    if (!slotModal.batch) newErrors.batch = "Required";
    if (!slotModal.subject) newErrors.subject = "Required";
    if (!slotModal.teacher) newErrors.teacher = "Required";
    if (!slotModal.day_of_week && slotModal.day_of_week !== "0") newErrors.day_of_week = "Required";
    if (!slotModal.timeBlockId && !slotModal.id) newErrors.timeBlockId = "Select a time block";
    
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
    setErrors({});

    // Resolve time block to start_time / end_time
    let startTime = slotModal.start_time;
    let endTime = slotModal.end_time;
    if (slotModal.timeBlockId) {
      const block = timeBlocks.find(b => b.id === Number(slotModal.timeBlockId));
      if (block) { startTime = block.startTime; endTime = block.endTime; }
    }

    try {
      const payload = {
        batch: slotModal.batch,
        subject: slotModal.subject,
        teacher: slotModal.teacher,
        day_of_week: slotModal.day_of_week,
        start_time: startTime.length === 5 ? `${startTime}:00` : startTime,
        end_time: endTime.length === 5 ? `${endTime}:00` : endTime,
      };

      if (slotModal.id) {
        await api.put(`/api/timetable/${slotModal.id}/`, payload);
        setAlertModal({ open: true, message: "Session updated.", type: "success" });
      } else {
        await api.post("/api/timetable/", payload);
        setAlertModal({ open: true, message: "Session added.", type: "success" });
      }
      setSlotModal(null); setErrors({}); loadData();
    } catch (err) {
      setAlertModal({ open: true, message: "Failed to save session.", type: "error" });
    }
  };

  const deleteSlot = async (id: number) => {
    try {
      await api.delete(`/api/timetable/${id}/`);
      setAlertModal({ open: true, message: "Session deleted.", type: "success" });
      setSlotModal(null); loadData();
    } catch (err) {
      setAlertModal({ open: true, message: "Failed to delete session.", type: "error" });
    }
  };

  // ── Filtering ──
  const filteredSlots = useMemo(() => {
    return slots.filter(s => {
      if (filterBatch && String(s.batch) !== filterBatch) return false;
      if (filterTeacher && String(s.teacher) !== filterTeacher) return false;
      return true;
    });
  }, [slots, filterBatch, filterTeacher]);

  // ── Build grid matrix keyed by time-block + day ──
  const matrix = useMemo(() => {
    const m: Record<number, Record<string, Slot[]>> = {};
    timeBlocks.forEach(tb => {
      m[tb.id] = {};
      DAYS.forEach((_, di) => { m[tb.id][String(di)] = []; });
    });

    filteredSlots.forEach(slot => {
      const sTime = slot.start_time.substring(0, 5);
      const dIndex = slot.day_of_week;
      // Match slot to the time block whose start matches
      const matchBlock = timeBlocks.find(tb => tb.startTime === sTime);
      if (matchBlock && m[matchBlock.id] && m[matchBlock.id][dIndex]) {
        m[matchBlock.id][dIndex].push(slot);
      }
    });
    return m;
  }, [filteredSlots, timeBlocks]);

  // ── Exam helpers ──
  // Sort priority puts ongoing first, upcoming next, completed at the bottom so
  // the operator's attention lands on what's happening now / about to happen.
  // Within a status group, sort by start date (soonest first for upcoming/ongoing,
  // most-recent first for completed).
  const STATUS_ORDER: Record<string, number> = { ongoing: 0, upcoming: 1, completed: 2 };
  const sortExams = (list: typeof exams) =>
    [...list].sort((a, b) => {
      const oa = STATUS_ORDER[a.status] ?? 9;
      const ob = STATUS_ORDER[b.status] ?? 9;
      if (oa !== ob) return oa - ob;
      const da = new Date(a.startDate).getTime();
      const db = new Date(b.startDate).getTime();
      return a.status === "completed" ? db - da : da - db;
    });

  const filteredExams = useMemo(() => {
    const base = examFilter === "all" ? exams : exams.filter(e => e.status === examFilter);
    return sortExams(base);
  }, [exams, examFilter]);

  // Group by status when "all" filter is selected so completed exams visually
  // separate from the active ones with a clear section header above.
  const examGroups = useMemo(() => {
    if (examFilter !== "all") return [{ status: examFilter, label: "", items: filteredExams }];
    const groups: { status: string; label: string; items: typeof exams }[] = [];
    const ongoing = filteredExams.filter(e => e.status === "ongoing");
    const upcoming = filteredExams.filter(e => e.status === "upcoming");
    const completed = filteredExams.filter(e => e.status === "completed");
    if (ongoing.length) groups.push({ status: "ongoing", label: "Ongoing", items: ongoing });
    if (upcoming.length) groups.push({ status: "upcoming", label: "Upcoming", items: upcoming });
    if (completed.length) groups.push({ status: "completed", label: "Completed", items: completed });
    return groups;
  }, [filteredExams, examFilter]);

  const openEditExam = (ex: Exam) => {
    setExamModal({
      id: ex.id,
      name: ex.name,
      batchId: ex.batchId,
      startDate: ex.startDate,
      endDate: ex.endDate,
      maxMarks: ex.maxMarks,
      timeBlockId: "",
    });
    setExamErrors({});
  };

  const saveExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!examModal) return;
    const ne: Record<string, string> = {};
    if (!examModal.name) ne.name = "Required";
    if (!examModal.batchId) ne.batchId = "Required";
    if (!examModal.startDate) ne.startDate = "Required";
    if (!examModal.endDate) ne.endDate = "Required";
    if (!examModal.maxMarks) ne.maxMarks = "Required";
    // Time block is only needed when creating a fresh exam (we auto-generate
    // the per-subject schedule from it). Editing keeps the existing schedule.
    if (!examModal.id && !examModal.timeBlockId) ne.timeBlockId = "Select a time block";
    if (Object.keys(ne).length > 0) { setExamErrors(ne); return; }
    setExamErrors({});

    try {
      if (examModal.id) {
        // Edit — patch the metadata only; keep the existing schedule intact.
        await api.patch(`/api/academics/exams/${examModal.id}`, examToApi({
          name: examModal.name,
          batchId: Number(examModal.batchId),
          startDate: examModal.startDate,
          endDate: examModal.endDate,
          maxMarks: Number(examModal.maxMarks),
        }));
        setAlertModal({ open: true, message: "Exam updated.", type: "success" });
      } else {
        // Create — generate the per-subject schedule from the chosen time block
        // and the selected batch's subjects.
        const batchId = Number(examModal.batchId);
        const liveBatch = batches.find(b => b.id === batchId);
        const subjectNames: string[] = liveBatch?.subjects?.map((bs: { subject_name?: string }) => bs.subject_name || "").filter(Boolean)
          || BATCHES.find(b => b.id === examModal.batchId)?.subjects as unknown as string[]
          || [];
        const block = timeBlocks.find(b => b.id === Number(examModal.timeBlockId));
        const start = new Date(examModal.startDate);
        const schedule: ExamScheduleEntry[] = subjectNames.map((subj, i) => {
          const d = new Date(start); d.setDate(d.getDate() + i);
          return {
            date: d.toISOString().slice(0, 10),
            subject: subj,
            startTime: block?.startTime || "09:00",
            endTime: block?.endTime || "11:00",
          };
        });
        await api.post(`/api/academics/exams`, examToApi({
          name: examModal.name,
          year: new Date().getFullYear(),
          batchId,
          startDate: examModal.startDate,
          endDate: examModal.endDate,
          status: "upcoming",
          maxMarks: Number(examModal.maxMarks),
          schedule,
        }));
        setAlertModal({ open: true, message: "Exam created.", type: "success" });
      }
      setExamModal(null); setExamErrors({});
      reloadExams();
    } catch {
      setAlertModal({ open: true, message: "Couldn't save the exam. Please try again.", type: "error" });
    }
  };

  const removeExamSlot = async (examId: number, si: number) => {
    const ex = exams.find(e => e.id === examId);
    if (!ex) return;
    const nextSchedule = ex.schedule.filter((_, i) => i !== si);
    try {
      await api.patch(`/api/academics/exams/${examId}`, examToApi({ schedule: nextSchedule }));
      setAlertModal({ open: true, message: "Schedule entry removed.", type: "success" });
      reloadExams();
    } catch {
      setAlertModal({ open: true, message: "Couldn't remove the schedule entry.", type: "error" });
    }
  };

  const deleteExam = async (examId: number) => {
    try {
      await api.delete(`/api/academics/exams/${examId}`);
      setExams(prev => prev.filter(ex => ex.id !== examId));
      setAlertModal({ open: true, message: "Exam deleted.", type: "success" });
    } catch {
      setAlertModal({ open: true, message: "Couldn't delete the exam.", type: "error" });
    }
  };

  const setExamStatus = async (examId: number, status: Exam["status"]) => {
    try {
      await api.patch(`/api/academics/exams/${examId}`, examToApi({ status }));
      setExams(prev => prev.map(ex => ex.id !== examId ? ex : { ...ex, status }));
      setAlertModal({
        open: true,
        type: "success",
        message: status === "completed" ? "Marked as completed." : status === "ongoing" ? "Marked as ongoing." : "Reopened as upcoming.",
      });
    } catch {
      setAlertModal({ open: true, type: "error", message: "Couldn't update exam status." });
    }
  };

  const handlePublish = () => {
    setPublishModal(false);
    setAlertModal({ open: true, message: `Timetable published! Notifications sent to ${publishTarget === "all" ? "all batches" : "current batch"}.`, type: "success" });
  };

  // Find which time block a slot belongs to (for editing)
  const findBlockForSlot = (slot: Slot): number | undefined => {
    const sTime = slot.start_time.substring(0, 5);
    return timeBlocks.find(tb => tb.startTime === sTime)?.id;
  };

  // ── LOCKED STATE ──
  if (isLocked) {
    return (
      <PageShell>
        <Topbar title="Timetable" />
        <div className="pb fi" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", paddingTop: 80 }}>
          <div style={{ background: "var(--tc)", color: "white", padding: "4px 12px", borderRadius: 12, fontSize: 12, fontWeight: 700, marginBottom: 16 }}>PRO FEATURE</div>
          <h2 style={{ fontSize: 24, color: "var(--ink)", fontWeight: 700, marginBottom: 12 }}>Timetable Locked</h2>
          <p style={{ color: "var(--ink2)", textAlign: "center", maxWidth: 400, lineHeight: 1.5 }}>
            Timetable management is an Institute Pro feature. Please upgrade your package in Settings.
          </p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <Topbar 
        title="Timetable" 
        subtitle="Manage master class & exam schedule"
        right={
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-s btn-sm" onClick={() => setPublishModal(true)}>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1 9.5v2h11v-2M6.5 1v7.5M3.5 5.5l3 3 3-3"/></svg>
              Publish timetable
            </button>
            {viewMode === "class" && (
              <button className="btn btn-p btn-sm" onClick={() => { setSlotType("class"); setSlotModal({ batch: "", subject: "", teacher: "", day_of_week: "0", timeBlockId: "" }); }}>+ Add Session</button>
            )}
            {viewMode === "exam" && (
              <button className="btn btn-p btn-sm" onClick={() => setExamModal({ name: "", batchId: "", startDate: "", endDate: "", maxMarks: 100, timeBlockId: "" })}>+ Create Exam</button>
            )}
          </div>
        }
      />
      <div className="pb fi">
        {/* ── Segmented Toggle ── */}
        <div style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 16 }}>
          <div className="seg-ctrl">
            <button className={`seg-btn ${viewMode === "class" ? "active" : ""}`} onClick={() => setViewMode("class")}>
              📅 Class timetable
            </button>
            <button className={`seg-btn ${viewMode === "exam" ? "active" : ""}`} onClick={() => setViewMode("exam")}>
              📝 Exam timetable
            </button>
          </div>
        </div>

        {loading ? <div style={{ textAlign: "center", padding: 40, color: "var(--ink3)" }}>Loading...</div> : (
          <>
            {/* ═══════════ CLASS TIMETABLE VIEW ═══════════ */}
            {viewMode === "class" && (
              <>
                {/* ── Time Blocks Management Strip ── */}
                <div style={{
                  background: "#fff", border: "1px solid var(--ln)", borderRadius: 12,
                  padding: "12px 16px", marginBottom: 14, boxShadow: "0 1px 3px rgba(28,25,23,.05)",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="var(--ink3)" strokeWidth="1.5"><circle cx="7" cy="7" r="6"/><path d="M7 3.5v4l2.5 1.5"/></svg>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: ".06em" }}>Time Blocks</span>
                    <span style={{ fontSize: 10.5, color: "var(--ink3)", marginLeft: 4 }}>— Define reusable time slots for the grid</span>
                    <button className="btn btn-s btn-xs" style={{ marginLeft: "auto" }} onClick={() => setBlockModal(true)}>+ Add Block</button>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {timeBlocks.map(tb => (
                      <div key={tb.id} style={{
                        display: "inline-flex", alignItems: "center", gap: 8,
                        padding: "6px 12px", borderRadius: 8,
                        border: "1.5px solid var(--ln)", background: "var(--cr)",
                        fontSize: 12, fontWeight: 600, color: "var(--ink2)",
                      }}>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>
                          {formatTime12(tb.startTime)} – {formatTime12(tb.endTime)}
                        </span>
                        <button
                          onClick={() => removeTimeBlock(tb.id)}
                          title="Remove block"
                          style={{
                            background: "none", border: "none", color: "var(--ink3)",
                            fontSize: 13, cursor: "pointer", padding: 0, lineHeight: 1,
                            opacity: .5, transition: "opacity 120ms",
                          }}
                          onMouseEnter={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.color = "var(--rb)"; }}
                          onMouseLeave={e => { e.currentTarget.style.opacity = ".5"; e.currentTarget.style.color = "var(--ink3)"; }}
                        >×</button>
                      </div>
                    ))}
                    {timeBlocks.length === 0 && (
                      <span style={{ fontSize: 12, color: "var(--ink3)", fontStyle: "italic" }}>No time blocks defined. Add one to build your schedule.</span>
                    )}
                  </div>
                </div>

                {/* ── Filters ── */}
                <div style={{
                  background: "#fff", border: "1px solid var(--ln)", borderRadius: 12,
                  padding: "12px 16px", marginBottom: 20, display: "flex", gap: 16, alignItems: "center",
                  boxShadow: "0 1px 3px rgba(28,25,23,.05)"
                }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: ".05em" }}>Filter View</div>
                  <div style={{ width: 1, height: 24, background: "var(--ln)" }} />
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <select style={{ width: 200, height: 32, fontSize: 12 }} value={filterBatch} onChange={e => setFilterBatch(e.target.value)}>
                      <option value="">All Batches</option>
                      {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                    <select style={{ width: 200, height: 32, fontSize: 12 }} value={filterTeacher} onChange={e => setFilterTeacher(e.target.value)}>
                      <option value="">All Teachers</option>
                      {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                  {(filterBatch || filterTeacher) && (
                    <button onClick={() => { setFilterBatch(""); setFilterTeacher(""); }} style={{ background: "none", border: "none", color: "var(--rb)", fontSize: 12, fontWeight: 600, cursor: "pointer", marginLeft: "auto" }}>Clear Filters</button>
                  )}
                </div>

                {/* ── Schedule Grid ── */}
                {timeBlocks.length === 0 ? (
                  <div style={{ background: "#fff", border: "2px dashed var(--ln)", borderRadius: 16, padding: "40px 20px", textAlign: "center" }}>
                    <div style={{ fontSize: 32, marginBottom: 10 }}>🕐</div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", marginBottom: 6 }}>No time blocks defined</div>
                    <div style={{ fontSize: 13, color: "var(--ink3)", marginBottom: 16 }}>Create time blocks first, then assign subjects to them.</div>
                    <button className="btn btn-p btn-sm" onClick={() => setBlockModal(true)}>+ Add Time Block</button>
                  </div>
                ) : (
                  <div style={{ background: "#fff", border: "1px solid var(--ln)", borderRadius: 16, boxShadow: "0 2px 8px rgba(28,25,23,.04)", overflow: "hidden" }}>
                    {/* Header row: days */}
                    <div style={{ display: "flex", borderBottom: "1.5px solid var(--ln)", background: "#faf9f8" }}>
                      <div style={{ width: 90, flexShrink: 0, borderRight: "1.5px solid var(--ln)" }} />
                      {DAYS.map((day, di) => (
                        <div key={day} style={{ flex: 1, padding: "12px 10px", textAlign: "center", borderRight: di < DAYS.length - 1 ? "1.5px solid var(--ln)" : "none" }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>{day}</div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Body: one row per time block */}
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      {timeBlocks.map((tb, ti) => (
                        <div key={tb.id} style={{ display: "flex", borderBottom: ti < timeBlocks.length - 1 ? "1px solid var(--ln)" : "none" }}>
                          {/* Time label */}
                          <div style={{
                            width: 90, flexShrink: 0, borderRight: "1.5px solid var(--ln)",
                            padding: "14px 8px", textAlign: "center", background: "#faf9f8",
                            display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 2,
                          }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink2)" }}>{formatTime12(tb.startTime).replace(/ (AM|PM)/, "")}</div>
                            <div style={{ fontSize: 8.5, fontWeight: 700, color: "var(--ink3)" }}>{formatTime12(tb.startTime).includes("PM") ? "PM" : "AM"}</div>
                            <div style={{ width: 12, height: 1, background: "var(--ln)", margin: "2px 0" }} />
                            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink2)" }}>{formatTime12(tb.endTime).replace(/ (AM|PM)/, "")}</div>
                            <div style={{ fontSize: 8.5, fontWeight: 700, color: "var(--ink3)" }}>{formatTime12(tb.endTime).includes("PM") ? "PM" : "AM"}</div>
                          </div>

                          {/* Day cells */}
                          {DAYS.map((_, di) => {
                            const daySlots = matrix[tb.id]?.[String(di)] || [];
                            return (
                              <div
                                key={di}
                                onClick={() => {
                                  if (daySlots.length === 0) {
                                    setSlotType("class");
                                    setSlotModal({ batch: "", subject: "", teacher: "", day_of_week: String(di), timeBlockId: String(tb.id) });
                                  }
                                }}
                                style={{
                                  flex: 1, padding: "6px 6px", minHeight: 80,
                                  borderRight: di < DAYS.length - 1 ? "1px dashed var(--ln)" : "none",
                                  cursor: daySlots.length === 0 ? "pointer" : "default",
                                  transition: "background 120ms",
                                }}
                                onMouseEnter={e => { if (daySlots.length === 0) e.currentTarget.style.background = "var(--cr-d)"; }}
                                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                              >
                                {daySlots.length === 0 && (
                                  <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0, transition: "opacity 120ms" }}
                                    onMouseEnter={e => { e.currentTarget.style.opacity = "1"; }}
                                    onMouseLeave={e => { e.currentTarget.style.opacity = "0"; }}
                                  >
                                    <span style={{ fontSize: 18, color: "var(--ink3)", opacity: .4 }}>+</span>
                                  </div>
                                )}
                                {daySlots.map(s => {
                                  const sc = SUBJ_COLORS[s.subject_name] || DEFAULT_SUBJ_COLOR;
                                  return (
                                    <div
                                      key={s.id}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSlotType("class");
                                        setSlotModal({
                                          ...s,
                                          timeBlockId: String(findBlockForSlot(s) || ""),
                                          start_time: s.start_time.substring(0, 5),
                                          end_time: s.end_time.substring(0, 5),
                                        });
                                      }}
                                      style={{
                                        background: sc.bg, border: `1px solid ${sc.border}`,
                                        borderRadius: 8, padding: "7px 9px", marginBottom: 4,
                                        cursor: "pointer", transition: "all 150ms",
                                      }}
                                      onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = `0 2px 6px ${sc.border}40`; }}
                                      onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}
                                    >
                                      <div style={{ fontSize: 11, fontWeight: 700, color: sc.text, marginBottom: 2 }}>{s.subject_name}</div>
                                      <div style={{ fontSize: 10, fontWeight: 600, color: "var(--ink2)", marginBottom: 2 }}>{s.batch_name}</div>
                                      <div style={{ fontSize: 9, color: sc.text, opacity: 0.7 }}>{s.teacher_name}</div>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ═══════════ EXAM TIMETABLE VIEW ═══════════ */}
            {viewMode === "exam" && (
              <>
                {/* Status Filter Pills */}
                <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
                  {[
                    { key: "all", label: "All Exams", count: exams.length },
                    { key: "upcoming", label: "Upcoming", count: exams.filter(e => e.status === "upcoming").length },
                    { key: "ongoing", label: "Ongoing", count: exams.filter(e => e.status === "ongoing").length },
                    { key: "completed", label: "Completed", count: exams.filter(e => e.status === "completed").length },
                  ].map(f => (
                    <button key={f.key} onClick={() => setExamFilter(f.key)} style={{
                      padding: "6px 14px", borderRadius: 8, border: "1.5px solid",
                      borderColor: examFilter === f.key ? "var(--tc)" : "var(--ln)",
                      background: examFilter === f.key ? "var(--tc-l)" : "#fff",
                      color: examFilter === f.key ? "var(--tc-d)" : "var(--ink3)",
                      fontSize: 12, fontWeight: examFilter === f.key ? 700 : 500,
                      cursor: "pointer", transition: "all 140ms",
                      display: "flex", alignItems: "center", gap: 6,
                    }}>
                      {f.label}
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 99, background: examFilter === f.key ? "var(--tc)" : "var(--ln)", color: examFilter === f.key ? "#fff" : "var(--ink3)" }}>{f.count}</span>
                    </button>
                  ))}
                </div>

                {/* Exam Cards */}
                {filteredExams.length === 0 ? (
                  <div style={{ background: "#fff", border: "2px dashed var(--ln)", borderRadius: 16, padding: "40px 20px", textAlign: "center" }}>
                    <div style={{ fontSize: 32, marginBottom: 12 }}>📝</div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>No exams found</div>
                    <div style={{ fontSize: 13, color: "var(--ink3)", marginBottom: 16 }}>Create a new exam to get started.</div>
                    <button className="btn btn-p btn-sm" onClick={() => setExamModal({ name: "", batchId: "", startDate: "", endDate: "", maxMarks: 100, timeBlockId: "" })}>+ Create Exam</button>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
                    {examGroups.map(group => (
                      <div key={group.status}>
                        {/* Section header only when showing all groups together */}
                        {group.label && (
                          <div className="exam-group-hdr">
                            <span className={`exam-group-dot exam-group-dot-${group.status}`} />
                            <span className="exam-group-lbl">{group.label}</span>
                            <span className="exam-group-ct">{group.items.length}</span>
                          </div>
                        )}
                        <div style={{
                          display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16,
                          opacity: group.status === "completed" ? 0.78 : 1,
                        }}>
                          {group.items.map(exam => {
                            const sc = STATUS_CONFIG[exam.status];
                            // Prefer the live batch from API (with display_name); fall back to the seed.
                            const liveBatch = batches.find(b => b.id === Number(exam.batchId));
                            const batchLabel = liveBatch?.grade || liveBatch?.display_name || liveBatch?.name
                              || BATCHES.find(b => b.id === exam.batchId)?.label
                              || String(exam.batchId);
                            return (
                              <div key={exam.id} className={`exam-card exam-card-${exam.status}`}>
                                <div className="exam-card-stripe" style={{ background: sc.stripe }} />
                                <div className="exam-card-body">
                                  <div className="exam-card-hdr">
                                    <div className="exam-card-title">{exam.name}</div>
                                    <span className={`bdg b-${exam.status}`}>{sc.label}</span>
                                  </div>
                                  <div className="exam-card-meta">
                                    <span style={{ fontWeight: 600, color: "var(--ink2)" }}>{batchLabel}</span>
                                    <span>·</span>
                                    <span style={{ fontFamily: "var(--font-mono)" }}>{formatDate(exam.startDate)} — {formatDate(exam.endDate)}</span>
                                    <span>·</span>
                                    <span>Max {exam.maxMarks} marks</span>
                                  </div>
                                  <div className="exam-card-subjects">
                                    {exam.schedule.map((slot, si) => (
                                      <div key={si} className="exam-subj-row">
                                        <span className="exam-subj-name">{slot.subject}</span>
                                        <span className="exam-subj-date">{formatDate(slot.date)}</span>
                                        <span className="exam-subj-time">{formatTime12(slot.startTime)} – {formatTime12(slot.endTime)}</span>
                                        {exam.status === "upcoming" && (
                                          <button onClick={() => removeExamSlot(exam.id, si)} style={{ background: "none", border: "none", color: "var(--rb)", fontSize: 10, cursor: "pointer", padding: "2px 4px" }} title="Remove this paper">✕</button>
                                        )}
                                      </div>
                                    ))}
                                  </div>

                                  {/* Action footer — Edit, status change, Delete */}
                                  <div className="exam-card-actions">
                                    <button className="btn btn-xs btn-s" onClick={() => openEditExam(exam)}>Edit</button>
                                    {exam.status === "upcoming" && (
                                      <button className="btn btn-xs btn-s" onClick={() => setExamStatus(exam.id, "ongoing")}>Start exam</button>
                                    )}
                                    {exam.status === "ongoing" && (
                                      <button className="btn btn-xs btn-ok" onClick={() => setExamStatus(exam.id, "completed")}>Mark completed</button>
                                    )}
                                    {exam.status === "completed" && (
                                      <button className="btn btn-xs btn-s" onClick={() => setExamStatus(exam.id, "upcoming")}>Reopen</button>
                                    )}
                                    {exam.status === "upcoming" && (
                                      <button className="btn btn-xs btn-ok" onClick={() => setExamStatus(exam.id, "completed")}>Mark completed</button>
                                    )}
                                    <button className="btn btn-xs btn-d" style={{ marginLeft: "auto" }} onClick={() => deleteExam(exam.id)}>Delete</button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* ═══════════ ADD TIME BLOCK MODAL ═══════════ */}
      <Modal
        open={blockModal}
        onClose={() => { setBlockModal(false); setBlockErrors({}); setNewBlock({ label: "", startTime: "", endTime: "" }); }}
        title="Add Time Block"
        footer={
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button className="btn btn-s" onClick={() => { setBlockModal(false); setBlockErrors({}); }}>Cancel</button>
            <button className="btn btn-p" onClick={addTimeBlock}>Add Block</button>
          </div>
        }
      >
        <div className="form-gap">
          <div style={{
            background: "var(--sp-l)", border: "1px solid #b8d0fa", borderRadius: 8,
            padding: "10px 14px", fontSize: 11.5, color: "var(--sp)",
            display: "flex", alignItems: "center", gap: 8, marginBottom: 4,
          }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="7" cy="7" r="6"/><path d="M7 4v3.5l2 1.5"/></svg>
            Time blocks define the rows of your timetable grid. Sessions are assigned to these blocks.
          </div>
          <div className="fg">
            <label className="flbl">Label (optional)</label>
            <input placeholder="e.g. Morning Session, Afternoon Block" value={newBlock.label} onChange={e => setNewBlock({ ...newBlock, label: e.target.value })} />
            <div className="fhint">Auto-generated from time range if left empty</div>
          </div>
          <div className="field-row">
            <div className="fg">
              <label className="flbl freq">Start Time</label>
              <input type="time" className={blockErrors.startTime ? "input-error" : ""} value={newBlock.startTime} onChange={e => setNewBlock({ ...newBlock, startTime: e.target.value })} />
              {blockErrors.startTime && <div className="f-error">{blockErrors.startTime}</div>}
            </div>
            <div className="fg">
              <label className="flbl freq">End Time</label>
              <input type="time" className={blockErrors.endTime ? "input-error" : ""} value={newBlock.endTime} onChange={e => setNewBlock({ ...newBlock, endTime: e.target.value })} />
              {blockErrors.endTime && <div className="f-error">{blockErrors.endTime}</div>}
            </div>
          </div>
        </div>
      </Modal>

      {/* ═══════════ ADD/EDIT SESSION MODAL ═══════════ */}
      <Modal
        open={!!slotModal}
        onClose={() => { setSlotModal(null); setErrors({}); setSlotType("class"); }}
        title={slotModal?.id ? "Edit Session" : "Add Session"}
        footer={
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            {slotModal?.id && <button className="btn btn-d" style={{ marginRight: "auto" }} onClick={() => deleteSlot(slotModal.id)}>Delete</button>}
            <button className="btn btn-s" onClick={() => { setSlotModal(null); setErrors({}); setSlotType("class"); }}>Cancel</button>
            <button className="btn btn-p" onClick={saveSlot}>Save Session</button>
          </div>
        }
      >
        <form className="form-gap" onSubmit={saveSlot}>
          {/* Slot type toggle — only for new sessions */}
          {!slotModal?.id && (
            <div style={{ marginBottom: 8 }}>
              <div className="seg-ctrl" style={{ width: "100%" }}>
                <button type="button" className={`seg-btn ${slotType === "class" ? "active" : ""}`} style={{ flex: 1, justifyContent: "center" }} onClick={() => setSlotType("class")}>📚 Class Block</button>
                <button type="button" className={`seg-btn ${slotType === "leave" ? "active" : ""}`} style={{ flex: 1, justifyContent: "center" }} onClick={() => setSlotType("leave")}>🚫 Leave / Blocked</button>
              </div>
            </div>
          )}

          {/* ── Time block selector ── */}
          <div className="fg">
            <label className="flbl freq">Time Block</label>
            <select
              className={errors.timeBlockId ? "input-error" : ""}
              value={slotModal?.timeBlockId || ""}
              onChange={e => { setSlotModal({ ...slotModal, timeBlockId: e.target.value }); setErrors({ ...errors, timeBlockId: "" }); }}
            >
              <option value="">Select time block...</option>
              {timeBlocks.map(tb => (
                <option key={tb.id} value={tb.id}>{formatTime12(tb.startTime)} – {formatTime12(tb.endTime)}{tb.label ? ` (${tb.label})` : ""}</option>
              ))}
            </select>
            {errors.timeBlockId && <div className="f-error">{errors.timeBlockId}</div>}
            <div className="fhint">
              <button type="button" onClick={() => setBlockModal(true)} style={{ background: "none", border: "none", color: "var(--tc)", fontSize: 10.5, fontWeight: 600, cursor: "pointer", padding: 0 }}>
                + Create a new time block
              </button>
            </div>
          </div>

          {/* ── Day of week ── */}
          <div className="fg">
            <label className="flbl freq">Day of Week</label>
            <select className={errors.day_of_week ? "input-error" : ""} value={slotModal?.day_of_week ?? "0"} onChange={e => { setSlotModal({ ...slotModal, day_of_week: e.target.value }); setErrors({ ...errors, day_of_week: "" }); }}>
              {FULL_DAYS.map((d, i) => <option key={i} value={String(i)}>{d}</option>)}
            </select>
            {errors.day_of_week && <div className="f-error">{errors.day_of_week}</div>}
          </div>

          {slotType === "class" ? (
            <>
              <div className="fg">
                <label className="flbl freq">Batch</label>
                <div className={errors.batch ? "input-error" : ""}>
                  <SearchableSelect
                    value={slotModal?.batch ? String(slotModal.batch) : ""}
                    onChange={val => { setSlotModal({ ...slotModal, batch: val }); setErrors({ ...errors, batch: "" }); }}
                    placeholder={`Select Batch for ${currentAcademicYear}…`}
                    onSearch={searchBatches}
                    // Client-side guard — only show batches whose academic_year
                    // matches the topbar selector, so even a stale/over-broad
                    // server response can't surface other years' batches.
                    options={batches
                      .filter(b => String(b.academic_year) === currentAcademicYear)
                      .map(b => ({
                        value: String(b.id),
                        label: `${b.grade || b.label || b.name} · ${b.academic_year}`,
                      }))}
                  />
                </div>
                {errors.batch && <div className="f-error">{errors.batch}</div>}
              </div>
              <div className="field-row">
                <div className="fg">
                  <label className="flbl freq">Subject</label>
                  <div className={errors.subject ? "input-error" : ""}>
                    <SearchableSelect 
                      value={slotModal?.subject ? String(slotModal.subject) : ""} 
                      onChange={val => { setSlotModal({ ...slotModal, subject: val }); setErrors({ ...errors, subject: "" }); }}
                      placeholder="Select Subject..."
                      onSearch={searchSubjects}
                      options={subjects.map(sub => ({ value: String(sub.id), label: sub.name }))}
                    />
                  </div>
                  {errors.subject && <div className="f-error">{errors.subject}</div>}
                </div>
                <div className="fg">
                  <label className="flbl freq">Teacher</label>
                  <div className={errors.teacher ? "input-error" : ""}>
                    <SearchableSelect 
                      value={slotModal?.teacher ? String(slotModal.teacher) : ""} 
                      onChange={val => { setSlotModal({ ...slotModal, teacher: val }); setErrors({ ...errors, teacher: "" }); }}
                      placeholder="Select Teacher..."
                      onSearch={searchTeachers}
                      options={teachers.map(t => ({ value: String(t.id), label: t.name }))}
                    />
                  </div>
                  {errors.teacher && <div className="f-error">{errors.teacher}</div>}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="fg">
                <label className="flbl freq">Leave Label</label>
                <input placeholder="e.g. Public Holiday, Staff Day Off" value={slotModal?.leaveLabel || ""} onChange={e => setSlotModal({ ...slotModal, leaveLabel: e.target.value })} />
              </div>
              <div className="fg">
                <label className="flbl">Block Color</label>
                <div className="color-swatches">
                  {LEAVE_COLORS.map(lc => (
                    <div key={lc.color} className={`color-swatch ${leaveColor === lc.color ? "sel" : ""}`} style={{ background: lc.color }} onClick={() => setLeaveColor(lc.color)} title={lc.label} />
                  ))}
                </div>
              </div>
            </>
          )}
        </form>
      </Modal>

      {/* ═══════════ PUBLISH MODAL ═══════════ */}
      <Modal
        open={publishModal}
        onClose={() => setPublishModal(false)}
        title="Publish Timetable"
        footer={
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button className="btn btn-s" onClick={() => setPublishModal(false)}>Cancel</button>
            <button className="btn btn-p" onClick={handlePublish}>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1 9.5v2h11v-2M6.5 1v7.5M3.5 5.5l3 3 3-3"/></svg>
              Publish & Notify
            </button>
          </div>
        }
      >
        <div className="form-gap">
          <div style={{ fontSize: 13, color: "var(--ink2)", lineHeight: 1.6, marginBottom: 8 }}>
            Publishing will send the current timetable to parents via <strong>WhatsApp</strong> and <strong>SMS</strong>.
          </div>
          <div className="fg">
            <label className="flbl freq">Target Audience</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", border: `1.5px solid ${publishTarget === "all" ? "var(--tc)" : "var(--ln)"}`, borderRadius: 10, cursor: "pointer", background: publishTarget === "all" ? "var(--tc-l)" : "#fff", transition: "all 140ms" }}>
                <input type="radio" name="pt" checked={publishTarget === "all"} onChange={() => setPublishTarget("all")} style={{ accentColor: "var(--tc)" }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: publishTarget === "all" ? "var(--tc-d)" : "var(--ink)" }}>All batches</div>
                  <div style={{ fontSize: 11, color: "var(--ink3)" }}>Notify parents across all batches</div>
                </div>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", border: `1.5px solid ${publishTarget === "current" ? "var(--tc)" : "var(--ln)"}`, borderRadius: 10, cursor: "pointer", background: publishTarget === "current" ? "var(--tc-l)" : "#fff", transition: "all 140ms" }}>
                <input type="radio" name="pt" checked={publishTarget === "current"} onChange={() => setPublishTarget("current")} style={{ accentColor: "var(--tc)" }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: publishTarget === "current" ? "var(--tc-d)" : "var(--ink)" }}>Current batch only</div>
                  <div style={{ fontSize: 11, color: "var(--ink3)" }}>{filterBatch ? `Only batch #${filterBatch}` : "Select a batch filter first"}</div>
                </div>
              </label>
            </div>
          </div>
          <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "10px 14px", fontSize: 11.5, color: "#92400e", display: "flex", alignItems: "center", gap: 8 }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="7" cy="7" r="6"/><path d="M7 4.5v3M7 9.5h.01"/></svg>
            Estimated cost: ~LKR 2 per WhatsApp message.
          </div>
        </div>
      </Modal>

      {/* ═══════════ CREATE EXAM MODAL ═══════════ */}
      <Modal
        open={!!examModal}
        onClose={() => { setExamModal(null); setExamErrors({}); }}
        title={examModal?.id ? "Edit exam" : "Create exam"}
        wide
        footer={
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button className="btn btn-s" onClick={() => { setExamModal(null); setExamErrors({}); }}>Cancel</button>
            <button className="btn btn-p" onClick={saveExam}>{examModal?.id ? "Save changes" : "Create exam"}</button>
          </div>
        }
      >
        <form className="form-gap" onSubmit={saveExam}>
          <div className="fg">
            <label className="flbl freq">Exam Name</label>
            <input className={examErrors.name ? "input-error" : ""} placeholder="e.g. Term 1 Exam" value={examModal?.name || ""} onChange={e => { setExamModal({ ...examModal!, name: e.target.value }); setExamErrors({ ...examErrors, name: "" }); }} />
            {examErrors.name && <div className="f-error">{examErrors.name}</div>}
          </div>
          <div className="field-row">
            <div className="fg">
              <label className="flbl freq">Batch</label>
              <select className={examErrors.batchId ? "input-error" : ""} value={examModal?.batchId || ""} onChange={e => { setExamModal({ ...examModal!, batchId: e.target.value }); setExamErrors({ ...examErrors, batchId: "" }); }}>
                <option value="">Select batch for {currentAcademicYear}…</option>
                {batches
                  .filter(b => String(b.academic_year) === currentAcademicYear)
                  .map(b => (
                    <option key={b.id} value={b.id}>
                      {b.grade || b.display_name || b.name} · {b.academic_year}
                    </option>
                  ))}
              </select>
              {examErrors.batchId && <div className="f-error">{examErrors.batchId}</div>}
            </div>
            <div className="fg">
              <label className="flbl freq">Max Marks</label>
              <input type="number" className={examErrors.maxMarks ? "input-error" : ""} value={examModal?.maxMarks || ""} onChange={e => { setExamModal({ ...examModal!, maxMarks: Number(e.target.value) }); setExamErrors({ ...examErrors, maxMarks: "" }); }} />
              {examErrors.maxMarks && <div className="f-error">{examErrors.maxMarks}</div>}
            </div>
          </div>

          {/* Time block for exams */}
          <div className="fg">
            <label className="flbl freq">Exam Time Block</label>
            <select className={examErrors.timeBlockId ? "input-error" : ""} value={examModal?.timeBlockId || ""} onChange={e => { setExamModal({ ...examModal!, timeBlockId: e.target.value }); setExamErrors({ ...examErrors, timeBlockId: "" }); }}>
              <option value="">Select time block...</option>
              {timeBlocks.map(tb => (
                <option key={tb.id} value={tb.id}>{formatTime12(tb.startTime)} – {formatTime12(tb.endTime)}{tb.label ? ` (${tb.label})` : ""}</option>
              ))}
            </select>
            {examErrors.timeBlockId && <div className="f-error">{examErrors.timeBlockId}</div>}
            <div className="fhint">All exam subjects will use this time block.</div>
          </div>

          <div className="field-row">
            <div className="fg">
              <label className="flbl freq">Start Date</label>
              <input type="date" className={examErrors.startDate ? "input-error" : ""} value={examModal?.startDate || ""} onChange={e => { setExamModal({ ...examModal!, startDate: e.target.value }); setExamErrors({ ...examErrors, startDate: "" }); }} />
              {examErrors.startDate && <div className="f-error">{examErrors.startDate}</div>}
            </div>
            <div className="fg">
              <label className="flbl freq">End Date</label>
              <input type="date" className={examErrors.endDate ? "input-error" : ""} value={examModal?.endDate || ""} onChange={e => { setExamModal({ ...examModal!, endDate: e.target.value }); setExamErrors({ ...examErrors, endDate: "" }); }} />
              {examErrors.endDate && <div className="f-error">{examErrors.endDate}</div>}
            </div>
          </div>

          {/* Subject preview */}
          {examModal?.batchId && (() => {
            const batch = BATCHES.find(b => b.id === examModal.batchId);
            if (!batch) return null;
            const block = examModal.timeBlockId ? timeBlocks.find(b => b.id === Number(examModal.timeBlockId)) : null;
            return (
              <div className="fg" style={{ marginTop: 4 }}>
                <label className="flbl">Subjects to schedule ({batch.subjects.length})</label>
                <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4 }}>
                  {batch.subjects.map((subj, i) => {
                    const sc = SUBJ_COLORS[subj] || DEFAULT_SUBJ_COLOR;
                    const startD = examModal.startDate ? new Date(examModal.startDate) : null;
                    let dateLabel = "—";
                    if (startD) { const d = new Date(startD); d.setDate(d.getDate() + i); dateLabel = formatDate(d.toISOString().slice(0, 10)); }
                    return (
                      <div key={subj} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 10px", background: sc.bg, borderRadius: 6, border: `1px solid ${sc.border}` }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: sc.text, flex: 1 }}>{subj}</span>
                        <span style={{ fontSize: 10.5, fontFamily: "var(--font-mono)", color: sc.text, opacity: .7 }}>{dateLabel}</span>
                        <span style={{ fontSize: 10.5, fontFamily: "var(--font-mono)", color: sc.text, opacity: .7 }}>
                          {block ? `${formatTime12(block.startTime)} – ${formatTime12(block.endTime)}` : "Select block"}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="fhint">Subjects are pulled from the batch config. Each gets one exam day.</div>
              </div>
            );
          })()}
        </form>
      </Modal>

      <Toast open={!!alertModal?.open} message={alertModal?.message || ""} type={alertModal?.type || "success"} onClose={() => setAlertModal(null)} />
    </PageShell>
  );
}
