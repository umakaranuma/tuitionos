"use client";
import { useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { PageShell } from "@/components/layout/PageShell";
import { Modal } from "@/components/ui/Modal";
import { INIT_TIMETABLE, BATCHES, TEACHERS, TimetableSession, INIT_TIMESLOTS, INIT_EXAMS, Exam, ExamScheduleItem, BatchId } from "@/lib/batchData";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
type ViewType = "class" | "exam";

export default function TimetablePage() {
  const [viewType, setViewType] = useState<ViewType>("class");
  const [sessions, setSessions] = useState<TimetableSession[]>(INIT_TIMETABLE);
  const [timeSlots, setTimeSlots] = useState<string[]>(INIT_TIMESLOTS);
  const [selectedBatch, setSelectedBatch] = useState(BATCHES[0].id);
  const [exams, setExams] = useState<Exam[]>(INIT_EXAMS);
  const [nextExamId, setNextExamId] = useState(INIT_EXAMS.length + 1);

  // Edit session slot state
  const [editSlot, setEditSlot] = useState<{ day: string; timeStr: string; batchId: string } | null>(null);
  const [editForm, setEditForm] = useState({ type: "class" as "class" | "leave", subject: "", teacherId: "", leaveLabel: "", leaveColor: "#fceaea" });

  // Manage timeslot row state
  const [manageRow, setManageRow] = useState<{ originalName: string; currentName: string; } | null>(null);

  // Edit exam schedule modal
  const [editExamSlot, setEditExamSlot] = useState<{ examId: number; index: number } | null>(null);
  const [examSlotForm, setExamSlotForm] = useState({ date: "", subject: "", startTime: "09:00", endTime: "11:00" });

  // Create exam timetable modal
  const [createExamModal, setCreateExamModal] = useState(false);
  const [newExamForm, setNewExamForm] = useState({ name: "", startDate: "", endDate: "", maxMarks: "100" });
  const [newExamSchedule, setNewExamSchedule] = useState<ExamScheduleItem[]>([]);

  // Confirm dialog
  const [confirmDialog, setConfirmDialog] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  const batchSessions = sessions.filter(s => s.batchId === selectedBatch);
  const batch = BATCHES.find(b => b.id === selectedBatch);
  const batchExams = exams.filter(e => e.batchId === selectedBatch);

  // Build grid matrix
  const matrix: Record<string, (TimetableSession | null)[]> = {};
  timeSlots.forEach(time => {
    matrix[time] = DAYS.map(day =>
      batchSessions.find(s => s.day === day && s.timeStr === time) || null
    );
  });

  const openSlot = (day: string, timeStr: string, existingSession: TimetableSession | null) => {
    setEditSlot({ day, timeStr, batchId: selectedBatch });
    if (existingSession) {
      setEditForm({
        type: existingSession.type || "class",
        subject: existingSession.subject || "",
        teacherId: existingSession.teacherId ? String(existingSession.teacherId) : "",
        leaveLabel: existingSession.leaveLabel || "",
        leaveColor: existingSession.leaveColor || "#fceaea",
      });
    } else {
      setEditForm({ type: "class", subject: "", teacherId: "", leaveLabel: "", leaveColor: "#fceaea" });
    }
  };

  const saveSlot = () => {
    if (!editSlot) return;
    const { day, timeStr } = editSlot;
    const batchId = editSlot.batchId as BatchId;
    let newSessions = sessions.filter(s => !(s.batchId === batchId && s.day === day && s.timeStr === timeStr));
    if (editForm.type === "class" && editForm.subject && editForm.teacherId) {
      newSessions.push({ id: Date.now(), type: "class", batchId, day, timeStr, subject: editForm.subject, teacherId: parseInt(editForm.teacherId) });
    } else if (editForm.type === "leave" && editForm.leaveLabel) {
      newSessions.push({ id: Date.now(), type: "leave", batchId, day, timeStr, leaveLabel: editForm.leaveLabel, leaveColor: editForm.leaveColor });
    }
    setSessions(newSessions);
    setEditSlot(null);
  };

  const saveManageRow = () => {
    if (!manageRow) return;
    if (manageRow.originalName) {
      if (manageRow.currentName.trim() === "") {
        setTimeSlots(prev => prev.filter(t => t !== manageRow.originalName));
        setSessions(prev => prev.filter(s => s.timeStr !== manageRow.originalName));
      } else {
        setTimeSlots(prev => prev.map(t => t === manageRow.originalName ? manageRow.currentName.trim() : t));
        setSessions(prev => prev.map(s => s.timeStr === manageRow.originalName ? { ...s, timeStr: manageRow.currentName.trim() } : s));
      }
    } else if (manageRow.currentName.trim() !== "") {
      setTimeSlots(prev => [...prev, manageRow.currentName.trim()]);
    }
    setManageRow(null);
  };

  const openEditExamSlot = (examId: number, index: number) => {
    const exam = exams.find(e => e.id === examId);
    if (!exam) return;
    const item = exam.schedule[index];
    setExamSlotForm({ date: item.date, subject: item.subject, startTime: item.startTime, endTime: item.endTime });
    setEditExamSlot({ examId, index });
  };

  const saveExamSlot = () => {
    if (!editExamSlot) return;
    setExams(prev => prev.map(e => {
      if (e.id === editExamSlot.examId) {
        const newSchedule = [...e.schedule];
        newSchedule[editExamSlot.index] = { ...examSlotForm };
        return { ...e, schedule: newSchedule };
      }
      return e;
    }));
    setEditExamSlot(null);
  };

  const openCreateExam = () => {
    if (!batch) return;
    const today = new Date().toISOString().slice(0, 10);
    setNewExamForm({ name: "", startDate: today, endDate: "", maxMarks: "100" });
    setNewExamSchedule(batch.subjects.map((subj, i) => {
      const d = new Date(); d.setDate(d.getDate() + i);
      return { date: d.toISOString().slice(0, 10), subject: subj, startTime: "09:00", endTime: "11:00" };
    }));
    setCreateExamModal(true);
  };

  const saveNewExam = () => {
    if (!newExamForm.name || !batch || newExamSchedule.length === 0) return;
    const dates = newExamSchedule.map(s => s.date).filter(Boolean).sort();
    const newExam: Exam = {
      id: nextExamId, name: newExamForm.name, year: 2026, batchId: selectedBatch as any,
      startDate: dates[0] || newExamForm.startDate, endDate: dates[dates.length - 1] || newExamForm.endDate || newExamForm.startDate,
      status: "upcoming", maxMarks: parseInt(newExamForm.maxMarks) || 100, schedule: newExamSchedule.filter(s => s.subject && s.date),
    };
    setExams(prev => [...prev, newExam]);
    setNextExamId(n => n + 1);
    setCreateExamModal(false);
  };

  const addScheduleRow = (examId: number) => {
    if (!batch) return;
    const exam = exams.find(e => e.id === examId);
    if (!exam) return;
    const lastDate = exam.schedule.length > 0 ? exam.schedule[exam.schedule.length - 1].date : new Date().toISOString().slice(0, 10);
    const d = new Date(lastDate); d.setDate(d.getDate() + 1);
    setExams(prev => prev.map(e => e.id === examId ? {
      ...e, schedule: [...e.schedule, { date: d.toISOString().slice(0, 10), subject: batch.subjects[0] || "", startTime: "09:00", endTime: "11:00" }]
    } : e));
  };

  const removeScheduleRow = (examId: number, index: number) => {
    setExams(prev => prev.map(e => e.id === examId ? {
      ...e, schedule: e.schedule.filter((_, i) => i !== index)
    } : e));
  };

  const deleteExam = (exam: Exam) => {
    setConfirmDialog({
      title: "Delete exam timetable?",
      message: `Are you sure you want to delete "${exam.name}" for ${batch?.name}? The exam schedule will be permanently removed.`,
      onConfirm: () => { setExams(prev => prev.filter(e => e.id !== exam.id)); setConfirmDialog(null); },
    });
  };

  const STATUS_STYLE: Record<string, { bg: string; fg: string; label: string }> = {
    completed: { bg: "#d4ede3", fg: "#1a5040", label: "Completed" },
    ongoing:   { bg: "#fef3d7", fg: "#c07b1a", label: "Ongoing" },
    upcoming:  { bg: "#d8e6fa", fg: "#2a5fa8", label: "Upcoming" },
  };

  return (
    <PageShell>
      <Topbar
        title="Timetable"
        subtitle={viewType === "class" ? "Weekly class schedule" : "Exam schedule"}
        right={
          <>
            <select value={selectedBatch} onChange={e => setSelectedBatch(e.target.value as any)} style={{ width: "auto" }}>
              {BATCHES.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            {viewType === "class" && <button className="btn btn-p btn-sm">Save & notify parents</button>}
          </>
        }
      />
      <div className="pb fi">
        {/* Type toggle */}
        <div style={{ display: "flex", gap: 0, marginBottom: 16 }}>
          {([
            { id: "class" as ViewType, label: "📅 Class timetable", desc: "Weekly schedule" },
            { id: "exam" as ViewType, label: "📝 Exam timetable", desc: `${batchExams.length} exams` },
          ]).map(t => {
            const active = viewType === t.id;
            return (
              <button key={t.id} onClick={() => setViewType(t.id)} style={{
                flex: 1, padding: "14px 18px", border: `2px solid ${active ? "var(--tc)" : "var(--ln)"}`,
                background: active ? "var(--tc-l)" : "#fff", borderRadius: t.id === "class" ? "12px 0 0 12px" : "0 12px 12px 0",
                cursor: "pointer", textAlign: "left", transition: "all 150ms",
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: active ? "var(--tc-d)" : "var(--ink)" }}>{t.label}</div>
                <div style={{ fontSize: 10.5, color: "var(--ink3)", marginTop: 2 }}>{t.desc}</div>
              </button>
            );
          })}
        </div>

        {/* ═══ CLASS TIMETABLE ═══ */}
        {viewType === "class" && (
          <>
            <div style={{
              background: "var(--ac-l)", border: "1px solid #e0c0a8", borderRadius: "var(--r)",
              padding: "10px 14px", marginBottom: 16, fontSize: 12, color: "var(--ac)",
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.75">
                <circle cx="7" cy="7" r="6"/><path d="M7 4.5v3.5l2 1"/>
              </svg>
              Click any slot to assign classes. Click the time label on the left to edit or remove time blocks.
            </div>

            <div className="tt-grid" style={{ marginBottom: 4, gridTemplateColumns: "110px repeat(7, 1fr)" }}>
              <div />
              {DAYS.map(d => <div key={d} className="tt-day">{d}</div>)}
            </div>

            {timeSlots.map(timeLabel => (
              <div key={timeLabel} className="tt-grid" style={{ marginBottom: 8, gridTemplateColumns: "110px repeat(7, 1fr)" }}>
                <div
                  style={{ fontSize: 10.5, color: "var(--ink3)", fontFamily: "var(--font-mono)", paddingTop: 12, paddingRight: 8, textAlign: "right", fontWeight: 600, cursor: "pointer", transition: "color 150ms" }}
                  onClick={() => setManageRow({ originalName: timeLabel, currentName: timeLabel })}
                  title="Click to edit or remove this time block"
                >
                  {timeLabel}
                </div>
                {DAYS.map((day, i) => {
                  const slot = matrix[timeLabel][i];
                  if (slot && slot.type === "leave") {
                    return (
                      <div key={i} className="tt-slot" onClick={() => openSlot(day, timeLabel, slot)} style={{ cursor: "pointer", background: slot.leaveColor || "#fceaea", borderLeftColor: "rgba(0,0,0,0.2)" }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)", marginTop: 6, opacity: 0.8 }}>{slot.leaveLabel}</div>
                      </div>
                    );
                  }
                  return slot ? (
                    <div key={i} className="tt-slot" onClick={() => openSlot(day, timeLabel, slot)} style={{ cursor: "pointer" }}>
                      <div className="tt-sub">{slot.subject}</div>
                      <div className="tt-time" style={{ color: "var(--ink2)" }}>{slot.timeStr.split(" – ")[1]}</div>
                      <div className="tt-teacher">{TEACHERS.find(t => t.id === slot.teacherId)?.name || "Unknown"}</div>
                    </div>
                  ) : (
                    <div key={i} className="tt-slot empty" onClick={() => openSlot(day, timeLabel, null)} style={{ cursor: "pointer" }}>
                      + Add class
                    </div>
                  );
                })}
              </div>
            ))}

            <div style={{ marginTop: 16, textAlign: "left", paddingLeft: 118 }}>
              <button className="btn btn-xs btn-ok" onClick={() => setManageRow({ originalName: "", currentName: "" })}>
                + Add Time Block
              </button>
            </div>
          </>
        )}

        {/* ═══ EXAM TIMETABLE ═══ */}
        {viewType === "exam" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Create button */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 13, color: "var(--ink3)" }}>{batchExams.length} exam{batchExams.length !== 1 ? "s" : ""} for {batch?.name}</div>
              <button className="btn btn-p btn-sm" onClick={openCreateExam}>+ Create exam timetable</button>
            </div>

            {batchExams.length === 0 ? (
              <div style={{ textAlign: "center", padding: 50, color: "var(--ink3)", background: "#fff", border: "1.5px solid var(--ln)", borderRadius: 14 }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>📝</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>No exam timetables yet</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>Click "+ Create exam timetable" to set up an exam schedule.</div>
              </div>
            ) : batchExams.map(exam => {
              const st = STATUS_STYLE[exam.status];
              return (
                <div key={exam.id} style={{ background: "#fff", border: "1.5px solid var(--ln)", borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 4px rgba(28,25,23,.05)" }}>
                  <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--ln)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>{exam.name}</div>
                      <div style={{ fontSize: 11, color: "var(--ink3)", marginTop: 2 }}>
                        {exam.startDate} — {exam.endDate} · {batch?.name} · {exam.schedule.length} subjects
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <span style={{ background: st.bg, color: st.fg, fontSize: 10.5, fontWeight: 600, padding: "3px 10px", borderRadius: 99 }}>{st.label}</span>
                      <button className="btn btn-xs btn-d" onClick={() => deleteExam(exam)}>Delete</button>
                    </div>
                  </div>
                  <div className="tw" style={{ margin: 0 }}>
                    <table>
                      <thead>
                        <tr><th>Date</th><th>Day</th><th>Subject</th><th>Start</th><th>End</th><th>Duration</th><th style={{ width: 110 }}>Actions</th></tr>
                      </thead>
                      <tbody>
                        {exam.schedule.map((s, i) => {
                          const d = new Date(s.date);
                          const day = d.toLocaleDateString("en", { weekday: "short" });
                          const startH = parseInt(s.startTime.split(":")[0]);
                          const endH = parseInt(s.endTime.split(":")[0]);
                          const startM = parseInt(s.startTime.split(":")[1]);
                          const endM = parseInt(s.endTime.split(":")[1]);
                          const dur = (endH * 60 + endM) - (startH * 60 + startM);
                          const durStr = dur >= 60 ? `${Math.floor(dur / 60)}h ${dur % 60 ? dur % 60 + "m" : ""}` : `${dur}m`;
                          return (
                            <tr key={i}>
                              <td className="mono" style={{ fontWeight: 600 }}>{s.date}</td>
                              <td style={{ color: "var(--ink2)" }}>{day}</td>
                              <td style={{ fontWeight: 600, color: "var(--ink)" }}>{s.subject}</td>
                              <td className="mono" style={{ fontSize: 12 }}>{s.startTime}</td>
                              <td className="mono" style={{ fontSize: 12 }}>{s.endTime}</td>
                              <td style={{ fontSize: 11, color: "var(--ink3)" }}>{durStr.trim()}</td>
                              <td>
                                <div style={{ display: "flex", gap: 4 }}>
                                  <button className="btn btn-xs btn-s" onClick={() => openEditExamSlot(exam.id, i)}>Edit</button>
                                  <button className="btn btn-xs btn-d" onClick={() => removeScheduleRow(exam.id, i)}>Remove</button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ padding: "10px 18px", borderTop: "1px solid var(--ln)" }}>
                    <button className="btn btn-xs btn-ok" onClick={() => addScheduleRow(exam.id)}>+ Add subject slot</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Edit class session modal ── */}
      <Modal open={!!editSlot} onClose={() => setEditSlot(null)} title={`Edit Schedule — ${editSlot?.day}`} footer={
        <><button className="btn btn-s btn-sm" onClick={() => setEditSlot(null)}>Cancel</button>
        <button className="btn btn-ok btn-sm" onClick={saveSlot}>Save session</button></>
      }>
        {editSlot && batch && (
          <div className="form-gap">
            <div style={{ background: "var(--cr)", padding: "10px 14px", borderRadius: 8, fontSize: 13, color: "var(--ink)" }}>
              <span style={{ fontWeight: 700 }}>{batch.name}</span> · {editSlot.timeStr}
            </div>
            <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600 }}>
                <input type="radio" checked={editForm.type === "class"} onChange={() => setEditForm(f => ({ ...f, type: "class" }))} />
                Class Block
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600 }}>
                <input type="radio" checked={editForm.type === "leave"} onChange={() => setEditForm(f => ({ ...f, type: "leave" }))} />
                Leave / Blocked
              </label>
            </div>

            {editForm.type === "class" ? (
              <>
                <div>
                  <label className="flbl">Subject</label>
                  <select value={editForm.subject} onChange={e => setEditForm(f => ({ ...f, subject: e.target.value, teacherId: "" }))}>
                    <option value="">— Clear / No Subject —</option>
                    {batch.subjects.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                {editForm.subject && (
                  <div>
                    <label className="flbl">Teacher</label>
                    <select value={editForm.teacherId} onChange={e => setEditForm(f => ({ ...f, teacherId: e.target.value }))}>
                      <option value="">— Select Teacher —</option>
                      {TEACHERS.filter(t => t.subject === editForm.subject).map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                {!editForm.subject && <div className="fhint">Saving with no subject will clear this time block.</div>}
              </>
            ) : (
              <>
                <div>
                  <label className="flbl">Leave Description</label>
                  <input placeholder="e.g. Public Holiday, Teacher Absent" value={editForm.leaveLabel} onChange={e => setEditForm(f => ({ ...f, leaveLabel: e.target.value }))} />
                </div>
                <div>
                  <label className="flbl">Block Color</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    {["#fceaea", "#fef3d7", "#ede8fc", "#e5e5e5", "#d8e6fa"].map(c => (
                      <div key={c} onClick={() => setEditForm(f => ({ ...f, leaveColor: c }))} style={{
                        width: 28, height: 28, borderRadius: "50%", background: c, cursor: "pointer",
                        border: editForm.leaveColor === c ? "2px solid var(--ink)" : "2px solid transparent"
                      }} />
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>

      {/* ── Row Manager Modal ── */}
      <Modal open={!!manageRow} onClose={() => setManageRow(null)} title={manageRow?.originalName ? "Manage Time Block" : "Add Time Block"} footer={
        <><button className="btn btn-s btn-sm" onClick={() => setManageRow(null)}>Cancel</button>
        <button className="btn btn-ok btn-sm" onClick={saveManageRow}>Save changes</button></>
      }>
        {manageRow && (
          <div className="form-gap">
            <div>
              <label className="flbl freq">Time Block Label</label>
              <input
                value={manageRow.currentName}
                onChange={e => setManageRow(f => f ? { ...f, currentName: e.target.value } : null)}
                placeholder="e.g. 5:30 – 7:00 PM"
              />
              <div className="fhint" style={{ marginTop: 6 }}>
                If you rename this block, all existing sessions at this time will be updated. <br/>
                If you clear the text and save, this time block and all its sessions will be deleted.
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Edit exam slot modal ── */}
      <Modal open={!!editExamSlot} onClose={() => setEditExamSlot(null)} title="Edit exam slot" footer={
        <><button className="btn btn-s btn-sm" onClick={() => setEditExamSlot(null)}>Cancel</button>
        <button className="btn btn-ok btn-sm" onClick={saveExamSlot}>Save</button></>
      }>
        {editExamSlot && (
          <div className="form-gap">
            <div className="field-row">
              <div>
                <label className="flbl freq">Subject</label>
                <select value={examSlotForm.subject} onChange={e => setExamSlotForm(f => ({ ...f, subject: e.target.value }))}>
                  {batch?.subjects.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="flbl freq">Date</label>
                <input type="date" value={examSlotForm.date} onChange={e => setExamSlotForm(f => ({ ...f, date: e.target.value }))} />
              </div>
            </div>
            <div className="field-row">
              <div>
                <label className="flbl">Start time</label>
                <input type="time" value={examSlotForm.startTime} onChange={e => setExamSlotForm(f => ({ ...f, startTime: e.target.value }))} />
              </div>
              <div>
                <label className="flbl">End time</label>
                <input type="time" value={examSlotForm.endTime} onChange={e => setExamSlotForm(f => ({ ...f, endTime: e.target.value }))} />
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Create exam timetable modal ── */}
      <Modal open={createExamModal} onClose={() => setCreateExamModal(false)} title={`Create exam timetable — ${batch?.name}`}
        footer={<><button className="btn btn-s btn-sm" onClick={() => setCreateExamModal(false)}>Cancel</button><button className="btn btn-p btn-sm" onClick={saveNewExam} disabled={!newExamForm.name || newExamSchedule.length === 0}>Create</button></>}
      >
        <div className="form-gap">
          <div>
            <label className="flbl freq">Exam name</label>
            <input placeholder="e.g. Term 2 Exam, Final Exam" value={newExamForm.name} onChange={e => setNewExamForm(f => ({ ...f, name: e.target.value }))} autoFocus />
          </div>
          <div>
            <label className="flbl">Max marks per subject</label>
            <input type="number" value={newExamForm.maxMarks} onChange={e => setNewExamForm(f => ({ ...f, maxMarks: e.target.value }))} />
          </div>

          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)", marginTop: 4 }}>Schedule ({newExamSchedule.length} slots)</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 300, overflowY: "auto" }}>
            {newExamSchedule.map((row, i) => (
              <div key={i} style={{ display: "flex", gap: 6, alignItems: "center", padding: "8px 10px", background: "var(--cr)", borderRadius: 8 }}>
                <div style={{ flex: 2 }}>
                  <select value={row.subject} onChange={e => { const v = e.target.value; setNewExamSchedule(prev => prev.map((r, ri) => ri === i ? { ...r, subject: v } : r)); }} style={{ fontSize: 12 }}>
                    {batch?.subjects.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div style={{ flex: 2 }}>
                  <input type="date" value={row.date} onChange={e => { const v = e.target.value; setNewExamSchedule(prev => prev.map((r, ri) => ri === i ? { ...r, date: v } : r)); }} style={{ fontSize: 12 }} />
                </div>
                <div style={{ flex: 1 }}>
                  <input type="time" value={row.startTime} onChange={e => { const v = e.target.value; setNewExamSchedule(prev => prev.map((r, ri) => ri === i ? { ...r, startTime: v } : r)); }} style={{ fontSize: 12 }} />
                </div>
                <div style={{ flex: 1 }}>
                  <input type="time" value={row.endTime} onChange={e => { const v = e.target.value; setNewExamSchedule(prev => prev.map((r, ri) => ri === i ? { ...r, endTime: v } : r)); }} style={{ fontSize: 12 }} />
                </div>
                <button className="btn btn-xs btn-d" style={{ flexShrink: 0 }} onClick={() => setNewExamSchedule(prev => prev.filter((_, ri) => ri !== i))}>✕</button>
              </div>
            ))}
          </div>
          <button className="btn btn-xs btn-ok" onClick={() => {
            if (!batch) return;
            const lastDate = newExamSchedule.length > 0 ? newExamSchedule[newExamSchedule.length - 1].date : new Date().toISOString().slice(0, 10);
            const d = new Date(lastDate); d.setDate(d.getDate() + 1);
            setNewExamSchedule(prev => [...prev, { date: d.toISOString().slice(0, 10), subject: batch.subjects[0] || "", startTime: "09:00", endTime: "11:00" }]);
          }}>+ Add another slot</button>
        </div>
      </Modal>

      {/* ── Confirm dialog ── */}
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
