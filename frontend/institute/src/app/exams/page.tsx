"use client";
import { useState, useMemo } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { PageShell } from "@/components/layout/PageShell";
import { Modal } from "@/components/ui/Modal";
import { DataTable, Column } from "@/components/ui/DataTable";
import { BatchTabs } from "@/components/ui/BatchTabs";
import {
  BATCHES, ALL_STUDENTS, INIT_EXAMS, INIT_EXAM_MARKS,
  Exam, ExamMark, ExamScheduleItem, Student, BatchId
} from "@/lib/batchData";

type Tab = "exams" | "timetable" | "marks" | "grades";

const STATUS_STYLE: Record<string, { bg: string; fg: string; label: string }> = {
  completed: { bg: "#d4ede3", fg: "#1a5040", label: "Completed" },
  ongoing:   { bg: "#fef3d7", fg: "#c07b1a", label: "Ongoing" },
  upcoming:  { bg: "#d8e6fa", fg: "#2a5fa8", label: "Upcoming" },
};

type GradeRange = { label: string; minPct: number; bg: string; fg: string };
const DEFAULT_GRADES: GradeRange[] = [
  { label: "A", minPct: 75, bg: "#d4ede3", fg: "#1a5040" },
  { label: "B", minPct: 65, bg: "#d8e6fa", fg: "#2a5fa8" },
  { label: "C", minPct: 50, bg: "#fef3d7", fg: "#c07b1a" },
  { label: "S", minPct: 35, bg: "#ede8fc", fg: "#6b3ea8" },
  { label: "F", minPct: 0,  bg: "#fceaea", fg: "#b83030" },
];

export default function ExamsPage() {
  const [tab, setTab] = useState<Tab>("exams");
  const [selBatch, setSelBatch] = useState<BatchId>("g7a");
  const [exams, setExams] = useState<Exam[]>(INIT_EXAMS);
  const [marks, setMarks] = useState<ExamMark[]>(INIT_EXAM_MARKS);
  const [nextId, setNextId] = useState(exams.length + 1);

  // Create exam modal
  const [createModal, setCreateModal] = useState(false);
  const [examForm, setExamForm] = useState({ name: "", startDate: "", endDate: "", maxMarks: "100" });

  // Marks entry modal
  const [marksExam, setMarksExam] = useState<Exam | null>(null);
  const [marksSubject, setMarksSubject] = useState("");
  const [editingMarks, setEditingMarks] = useState<Record<number, string>>({});
  const [marksSearch, setMarksSearch] = useState("");

  // Grade config
  const [gradeRanges, setGradeRanges] = useState<GradeRange[]>(DEFAULT_GRADES);

  // Confirm dialog
  const [confirmDialog, setConfirmDialog] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  const gradeLabel = (m: number, max: number) => {
    const pct = (m / max) * 100;
    for (const g of gradeRanges) { if (pct >= g.minPct) return g; }
    return gradeRanges[gradeRanges.length - 1];
  };

  const batch = BATCHES.find(b => b.id === selBatch)!;
  const batchExams = exams.filter(e => e.batchId === selBatch);
  const batchStudents = ALL_STUDENTS.filter(s => s.batch === selBatch);

  const changeBatch = (id: BatchId) => { setSelBatch(id); };

  /* ── Create exam ── */
  const openCreate = () => {
    setExamForm({ name: "", startDate: "", endDate: "", maxMarks: "100" });
    setCreateModal(true);
  };

  const saveExam = () => {
    if (!examForm.name || !examForm.startDate) return;
    const maxM = parseInt(examForm.maxMarks) || 100;
    const schedule: ExamScheduleItem[] = batch.subjects.map((subj, i) => {
      const d = new Date(examForm.startDate);
      d.setDate(d.getDate() + i);
      return { date: d.toISOString().slice(0, 10), subject: subj, startTime: "09:00", endTime: "11:00" };
    });
    const newExam: Exam = {
      id: nextId, name: examForm.name, year: 2026, batchId: selBatch,
      startDate: examForm.startDate, endDate: examForm.endDate || examForm.startDate,
      status: "upcoming", maxMarks: maxM, schedule,
    };
    setExams(prev => [...prev, newExam]);
    // Generate empty marks
    const newMarks: ExamMark[] = [];
    batchStudents.forEach(st => {
      batch.subjects.forEach(subj => {
        newMarks.push({ examId: nextId, studentId: st.id, subject: subj, marks: null, maxMarks: maxM });
      });
    });
    setMarks(prev => [...prev, ...newMarks]);
    setNextId(n => n + 1);
    setCreateModal(false);
  };

  const deleteExam = (exam: Exam) => {
    setConfirmDialog({
      title: "Delete exam?",
      message: `Are you sure you want to delete "${exam.name}" for ${batch.name}? All marks and schedule data will be lost.`,
      onConfirm: () => {
        setExams(prev => prev.filter(e => e.id !== exam.id));
        setMarks(prev => prev.filter(m => m.examId !== exam.id));
        setConfirmDialog(null);
      },
    });
  };

  /* ── Marks entry ── */
  const openMarksEntry = (exam: Exam, subject: string) => {
    setMarksExam(exam);
    setMarksSubject(subject);
    setMarksSearch("");
    const subjectMarks = marks.filter(m => m.examId === exam.id && m.subject === subject);
    const initial: Record<number, string> = {};
    subjectMarks.forEach(m => { initial[m.studentId] = m.marks !== null ? String(m.marks) : ""; });
    setEditingMarks(initial);
  };

  const saveMarks = () => {
    if (!marksExam) return;
    setMarks(prev => prev.map(m => {
      if (m.examId === marksExam.id && m.subject === marksSubject && editingMarks[m.studentId] !== undefined) {
        const val = editingMarks[m.studentId];
        return { ...m, marks: val === "" ? null : Math.min(m.maxMarks, Math.max(0, parseInt(val) || 0)) };
      }
      return m;
    }));
    // Auto-complete exam if all marks entered
    const examMarks = marks.filter(m => m.examId === marksExam.id);
    const allEntered = examMarks.every(m => {
      if (m.subject === marksSubject) return editingMarks[m.studentId] !== undefined && editingMarks[m.studentId] !== "";
      return m.marks !== null;
    });
    if (allEntered) {
      setExams(prev => prev.map(e => e.id === marksExam.id ? { ...e, status: "completed" } : e));
    }
    setMarksExam(null);
  };

  /* ── Exam list columns ── */
  const examColumns: Column<Exam>[] = [
    {
      key: "name", header: "Exam name", width: 220,
      render: (e) => (
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, color: "var(--ink)" }}>{e.name}</div>
          <div style={{ fontSize: 10.5, color: "var(--ink3)" }}>{e.year} · {batch.name}</div>
        </div>
      ),
    },
    {
      key: "dates", header: "Dates",
      render: (e) => (
        <div style={{ fontSize: 12, color: "var(--ink2)", fontFamily: "var(--font-mono)" }}>
          {e.startDate} → {e.endDate}
        </div>
      ),
    },
    {
      key: "subjects", header: "Subjects",
      render: (e) => <span style={{ fontSize: 12, color: "var(--ink2)" }}>{e.schedule.length} subjects</span>,
    },
    {
      key: "maxMarks", header: "Max marks",
      render: (e) => <span className="mono" style={{ fontSize: 12 }}>{e.maxMarks}</span>,
    },
    {
      key: "status", header: "Status",
      render: (e) => {
        const st = STATUS_STYLE[e.status];
        return <span style={{ background: st.bg, color: st.fg, fontSize: 10.5, fontWeight: 600, padding: "2px 8px", borderRadius: 99 }}>{st.label}</span>;
      },
    },
    {
      key: "actions", header: "Actions", width: 180,
      render: (e) => (
        <div style={{ display: "flex", gap: 4 }} onClick={ev => ev.stopPropagation()}>
          <button className="btn btn-xs btn-ok" onClick={() => { setTab("marks"); }}>Enter marks</button>
          <button className="btn btn-xs btn-d" onClick={() => deleteExam(e)}>Delete</button>
        </div>
      ),
    },
  ];

  /* ── Timetable view ── */
  const renderTimetable = () => {
    if (batchExams.length === 0) return <div style={{ textAlign: "center", padding: 40, color: "var(--ink3)", fontSize: 13 }}>No exams created for {batch.name} yet. Create one first.</div>;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {batchExams.map(exam => (
          <div key={exam.id} style={{ background: "#fff", border: "1.5px solid var(--ln)", borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 4px rgba(28,25,23,.05)" }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--ln)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>{exam.name}</div>
                <div style={{ fontSize: 11, color: "var(--ink3)", marginTop: 2 }}>{exam.startDate} — {exam.endDate} · {batch.name}</div>
              </div>
              {(() => { const st = STATUS_STYLE[exam.status]; return <span style={{ background: st.bg, color: st.fg, fontSize: 10.5, fontWeight: 600, padding: "3px 10px", borderRadius: 99 }}>{st.label}</span>; })()}
            </div>
            <div className="tw" style={{ margin: 0 }}>
              <table>
                <thead>
                  <tr><th>Date</th><th>Day</th><th>Subject</th><th>Time</th><th>Duration</th></tr>
                </thead>
                <tbody>
                  {exam.schedule.map((s, i) => {
                    const d = new Date(s.date);
                    const day = d.toLocaleDateString("en", { weekday: "short" });
                    return (
                      <tr key={i}>
                        <td className="mono" style={{ fontWeight: 600 }}>{s.date}</td>
                        <td style={{ color: "var(--ink2)" }}>{day}</td>
                        <td style={{ fontWeight: 600, color: "var(--ink)" }}>{s.subject}</td>
                        <td className="mono" style={{ fontSize: 11 }}>{s.startTime} – {s.endTime}</td>
                        <td style={{ fontSize: 11, color: "var(--ink3)" }}>2 hours</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    );
  };

  /* ── Marks view ── */
  const renderMarks = () => {
    if (batchExams.length === 0) return <div style={{ textAlign: "center", padding: 40, color: "var(--ink3)", fontSize: 13 }}>No exams yet.</div>;
    const completedExams = batchExams.filter(e => e.status === "completed");
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {batchExams.map(exam => {
          const examMarks = marks.filter(m => m.examId === exam.id);
          const subjects = batch.subjects;
          const entered = examMarks.filter(m => m.marks !== null).length;
          const total = examMarks.length;
          return (
            <div key={exam.id} style={{ background: "#fff", border: "1.5px solid var(--ln)", borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 4px rgba(28,25,23,.05)" }}>
              <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--ln)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>{exam.name}</div>
                  <div style={{ fontSize: 11, color: "var(--ink3)", marginTop: 2 }}>{entered}/{total} marks entered</div>
                </div>
                {(() => { const st = STATUS_STYLE[exam.status]; return <span style={{ background: st.bg, color: st.fg, fontSize: 10.5, fontWeight: 600, padding: "3px 10px", borderRadius: 99 }}>{st.label}</span>; })()}
              </div>
              <div style={{ padding: "14px 18px" }}>
                <div style={{ display: "grid", gridTemplateColumns: `repeat(${subjects.length}, 1fr)`, gap: 8 }}>
                  {subjects.map(subj => {
                    const subjMarks = examMarks.filter(m => m.subject === subj);
                    const subjEntered = subjMarks.filter(m => m.marks !== null).length;
                    const allDone = subjEntered === subjMarks.length && subjMarks.length > 0;
                    const avg = allDone ? Math.round(subjMarks.reduce((a, m) => a + (m.marks || 0), 0) / subjMarks.length) : null;
                    return (
                      <div key={subj} onClick={() => openMarksEntry(exam, subj)} style={{
                        border: `1.5px solid ${allDone ? "#b8ddd0" : "var(--ln)"}`,
                        borderRadius: 10, padding: "12px 14px", cursor: "pointer",
                        background: allDone ? "#f0faf5" : "#fff",
                        transition: "all 150ms",
                      }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--tc)"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(45,122,90,.12)"; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = allDone ? "#b8ddd0" : "var(--ln)"; e.currentTarget.style.boxShadow = "none"; }}
                      >
                        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)", marginBottom: 4 }}>{subj}</div>
                        <div style={{ fontSize: 10.5, color: allDone ? "var(--tc-d)" : "var(--ink3)" }}>
                          {allDone ? `✓ All done · Avg: ${avg}/${exam.maxMarks}` : `${subjEntered}/${subjMarks.length} entered`}
                        </div>
                        <div style={{ fontSize: 10, color: "var(--tc-d)", marginTop: 6, fontWeight: 600 }}>
                          {allDone ? "Edit marks →" : "Enter marks →"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  /* ── KPIs ── */
  const completed = batchExams.filter(e => e.status === "completed").length;
  const upcoming = batchExams.filter(e => e.status === "upcoming").length;
  const totalMarkEntries = marks.filter(m => batchExams.some(e => e.id === m.examId));
  const enteredCount = totalMarkEntries.filter(m => m.marks !== null).length;

  const TAB_OPTS: { id: Tab; label: string; icon: string }[] = [
    { id: "exams", label: "All exams", icon: "📋" },
    { id: "timetable", label: "Exam timetable", icon: "📅" },
    { id: "marks", label: "Marks & results", icon: "📊" },
    { id: "grades", label: "Grade settings", icon: "⚙️" },
  ];

  return (
    <PageShell>
      <Topbar title="Exams" subtitle={`${batch.name} · ${new Date().getFullYear()}`}
        right={
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-p btn-sm" onClick={openCreate}>+ Create exam</button>
          </div>
        }
      />
      <div className="pb fi">
        <BatchTabs active={selBatch} onChange={changeBatch} />

        {/* KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 18 }}>
          {[
            { label: "Total exams", val: batchExams.length, sub: `${batch.label} · ${new Date().getFullYear()}`, color: batch.color, colorL: batch.colorL },
            { label: "Completed", val: completed, sub: `${upcoming} upcoming`, color: "#1a5040", colorL: "#d4ede3" },
            { label: "Students", val: batchStudents.length, sub: batch.name, color: "#2a5fa8", colorL: "#d8e6fa" },
            { label: "Marks entered", val: `${Math.round((enteredCount / Math.max(totalMarkEntries.length, 1)) * 100)}%`, sub: `${enteredCount}/${totalMarkEntries.length}`, color: "#c07b1a", colorL: "#fef3d7" },
          ].map(kpi => (
            <div key={kpi.label} style={{ background: "#fff", border: `1.5px solid ${kpi.color}22`, borderTop: `4px solid ${kpi.color}`, borderRadius: 12, padding: "12px 14px", boxShadow: "0 1px 3px rgba(28,25,23,.06)" }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4 }}>{kpi.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: kpi.color, fontFamily: "var(--font-mono)", lineHeight: 1 }}>{kpi.val}</div>
              <div style={{ fontSize: 10.5, color: "var(--ink3)", marginTop: 4 }}>{kpi.sub}</div>
            </div>
          ))}
        </div>

        {/* Tab navigation */}
        <div style={{ display: "flex", gap: 0, borderBottom: "2px solid var(--ln)", marginBottom: 18 }}>
          {TAB_OPTS.map(t => {
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                padding: "12px 20px", background: "transparent", border: "none",
                fontSize: 13, fontWeight: active ? 700 : 600,
                color: active ? "var(--tc-d)" : "var(--ink3)",
                borderBottom: `3px solid ${active ? "var(--tc)" : "transparent"}`,
                cursor: "pointer", transition: "all 140ms", transform: "translateY(2px)",
                display: "flex", alignItems: "center", gap: 6,
              }}>
                <span style={{ fontSize: 14 }}>{t.icon}</span> {t.label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        {tab === "exams" && (
          <DataTable<Exam>
            columns={examColumns}
            data={batchExams}
            rowKey={e => e.id}
            defaultPerPage={10}
            emptyMessage="No exams created yet. Click '+ Create exam' to get started."
            title={`${batch.name} exams (${batchExams.length})`}
          />
        )}
        {tab === "timetable" && renderTimetable()}
        {tab === "marks" && renderMarks()}

        {/* Grade config */}
        {tab === "grades" && (
          <div style={{ maxWidth: 600 }}>
            <div style={{ background: "#fff", border: "1.5px solid var(--ln)", borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 4px rgba(28,25,23,.05)" }}>
              <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--ln)" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>Grade ranges</div>
                <div style={{ fontSize: 11, color: "var(--ink3)", marginTop: 2 }}>Set the minimum percentage for each grade. Students below the lowest range will get the last grade.</div>
              </div>
              <div style={{ padding: "14px 18px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {gradeRanges.map((g, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: g.bg, borderRadius: 10, border: `1.5px solid ${g.fg}22` }}>
                      <input value={g.label} onChange={e => { const v = e.target.value; setGradeRanges(prev => prev.map((r, ri) => ri === i ? { ...r, label: v } : r)); }}
                        style={{ width: 50, textAlign: "center", fontWeight: 700, fontSize: 16, background: "#fff", borderRadius: 6 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, color: "var(--ink3)", marginBottom: 2 }}>{i === gradeRanges.length - 1 ? "Below all above (Fail)" : `Minimum ${g.minPct}% and above`}</div>
                        {i < gradeRanges.length - 1 && (
                          <input type="number" min="0" max="100" value={g.minPct}
                            onChange={e => { const v = parseInt(e.target.value) || 0; setGradeRanges(prev => prev.map((r, ri) => ri === i ? { ...r, minPct: v } : r)); }}
                            style={{ width: 70, fontSize: 12, fontFamily: "var(--font-mono)", fontWeight: 600 }} />
                        )}
                      </div>
                      <div style={{ width: 24, height: 24, borderRadius: 6, background: g.fg, flexShrink: 0 }} />
                      {gradeRanges.length > 2 && (
                        <button className="btn btn-xs btn-d" onClick={() => setGradeRanges(prev => prev.filter((_, ri) => ri !== i))}>✕</button>
                      )}
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <button className="btn btn-xs btn-ok" onClick={() => setGradeRanges(prev => [
                    ...prev.slice(0, -1),
                    { label: "New", minPct: 10, bg: "#e5e5e5", fg: "#555" },
                    prev[prev.length - 1],
                  ])}>+ Add grade</button>
                  <button className="btn btn-xs btn-s" onClick={() => setGradeRanges(DEFAULT_GRADES)}>Reset to default</button>
                </div>
                <div style={{ background: "var(--cr)", borderRadius: 8, padding: "10px 14px", marginTop: 14, fontSize: 11, color: "var(--ink3)" }}>
                  <strong>Preview:</strong> {gradeRanges.map((g, i) => (
                    <span key={i} style={{ marginLeft: 8 }}>
                      <span style={{ background: g.bg, color: g.fg, padding: "1px 6px", borderRadius: 4, fontWeight: 700, fontSize: 10 }}>{g.label}</span>
                      <span style={{ marginLeft: 3 }}>{i < gradeRanges.length - 1 ? `≥ ${g.minPct}%` : `< ${gradeRanges[i - 1]?.minPct || 0}%`}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create exam modal */}
      <Modal open={createModal} onClose={() => setCreateModal(false)} title={`Create exam — ${batch.name}`}
        footer={<><button className="btn btn-s btn-sm" onClick={() => setCreateModal(false)}>Cancel</button><button className="btn btn-p btn-sm" onClick={saveExam} disabled={!examForm.name || !examForm.startDate}>Create exam</button></>}
      >
        <div className="form-gap">
          <div>
            <label className="flbl freq">Exam name</label>
            <input placeholder="e.g. Term 2 Exam, Final Exam" value={examForm.name} onChange={e => setExamForm(f => ({ ...f, name: e.target.value }))} autoFocus />
          </div>
          <div className="field-row">
            <div><label className="flbl freq">Start date</label><input type="date" value={examForm.startDate} onChange={e => setExamForm(f => ({ ...f, startDate: e.target.value }))} /></div>
            <div><label className="flbl">End date</label><input type="date" value={examForm.endDate} onChange={e => setExamForm(f => ({ ...f, endDate: e.target.value }))} /></div>
          </div>
          <div>
            <label className="flbl">Max marks per subject</label>
            <input type="number" value={examForm.maxMarks} onChange={e => setExamForm(f => ({ ...f, maxMarks: e.target.value }))} />
            <div className="fhint">Default marks for each subject. You can change per subject later.</div>
          </div>
          <div style={{ background: "var(--cr)", borderRadius: 10, padding: "12px 14px" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--ink3)", marginBottom: 6 }}>Subjects included ({batch.subjects.length})</div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {batch.subjects.map(s => <span key={s} style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", background: batch.colorL, color: batch.color, borderRadius: 6 }}>{s}</span>)}
            </div>
          </div>
        </div>
      </Modal>

      {/* Marks entry modal */}
      <Modal open={!!marksExam} onClose={() => setMarksExam(null)}
        title={marksExam ? `${marksSubject} — ${marksExam.name}` : ""}
        footer={<><button className="btn btn-s btn-sm" onClick={() => setMarksExam(null)}>Cancel</button><button className="btn btn-ok btn-sm" onClick={saveMarks}>Save marks</button></>}
      >
        {marksExam && (() => {
          const filtered = batchStudents.filter(st =>
            !marksSearch || st.name.toLowerCase().includes(marksSearch.toLowerCase())
          );
          return (
            <div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
                <div style={{ position: "relative", flex: 1 }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="var(--ink3)" strokeWidth="1.5" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }}>
                    <circle cx="6" cy="6" r="4.5"/><path d="M9.5 9.5L13 13"/>
                  </svg>
                  <input placeholder="Search student…" value={marksSearch} onChange={e => setMarksSearch(e.target.value)}
                    style={{ paddingLeft: 30, width: "100%", fontSize: 12 }} />
                </div>
                <div style={{ fontSize: 11, color: "var(--ink3)", whiteSpace: "nowrap" }}>out of {marksExam.maxMarks}</div>
              </div>
              <div style={{ maxHeight: 400, overflowY: "auto" }}>
                {filtered.map(st => (
                  <div key={st.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--ln)" }}>
                    <div className="ava" style={{ background: st.bg, color: st.fg, width: 30, height: 30, fontSize: 10 }}>{st.initials}</div>
                    <div style={{ flex: 1, fontSize: 12.5, fontWeight: 600 }}>{st.name}</div>
                    <input
                      type="number" min="0" max={marksExam.maxMarks}
                      value={editingMarks[st.id] ?? ""}
                      onChange={e => setEditingMarks(prev => ({ ...prev, [st.id]: e.target.value }))}
                      placeholder="—"
                      style={{ width: 70, textAlign: "center", fontFamily: "var(--font-mono)", fontWeight: 700 }}
                    />
                    <span style={{ fontSize: 11, color: "var(--ink3)", width: 30 }}>/ {marksExam.maxMarks}</span>
                    {editingMarks[st.id] && parseInt(editingMarks[st.id]) >= 0 && (() => {
                      const g = gradeLabel(parseInt(editingMarks[st.id]), marksExam.maxMarks);
                      return <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: g.bg, color: g.fg, width: 22, textAlign: "center" }}>{g.label}</span>;
                    })()}
                  </div>
                ))}
                {filtered.length === 0 && <div style={{ textAlign: "center", padding: 20, color: "var(--ink3)", fontSize: 12 }}>No students match "{marksSearch}"</div>}
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Confirm dialog */}
      <Modal open={!!confirmDialog} onClose={() => setConfirmDialog(null)} title={confirmDialog?.title || ""}
        footer={<><button className="btn btn-s btn-sm" onClick={() => setConfirmDialog(null)}>Cancel</button><button className="btn btn-d btn-sm" onClick={confirmDialog?.onConfirm}>Yes, delete</button></>}
      >
        {confirmDialog && (
          <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, background: "#fceaea", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>⚠️</div>
            <div style={{ fontSize: 13, color: "var(--ink2)", lineHeight: 1.5 }}>{confirmDialog.message}</div>
          </div>
        )}
      </Modal>
    </PageShell>
  );
}
