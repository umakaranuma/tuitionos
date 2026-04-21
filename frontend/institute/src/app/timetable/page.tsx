"use client";
import { useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { PageShell } from "@/components/layout/PageShell";
import { Modal } from "@/components/ui/Modal";
import { INIT_TIMETABLE, BATCHES, TEACHERS, TimetableSession } from "@/lib/batchData";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const TIMESLOTS = ["8:00 – 9:30 AM", "10:00 – 11:30 AM", "2:00 – 3:30 PM", "4:00 – 5:30 PM"];

export default function TimetablePage() {
  const [sessions, setSessions] = useState<TimetableSession[]>(INIT_TIMETABLE);
  const [selectedBatch, setSelectedBatch] = useState(BATCHES[0].id);
  
  // Edit modal state
  const [editSlot, setEditSlot] = useState<{ day: string; timeStr: string; batchId: string } | null>(null);
  const [editForm, setEditForm] = useState({ type: "class" as "class" | "leave", subject: "", teacherId: "", leaveLabel: "", leaveColor: "#fceaea" });

  const batchSessions = sessions.filter(s => s.batchId === selectedBatch);
  const batch = BATCHES.find(b => b.id === selectedBatch);

  // Build grid matrix
  const matrix: Record<string, (TimetableSession | null)[]> = {};
  TIMESLOTS.forEach(time => {
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
    const { day, timeStr, batchId } = editSlot;
    
    let newSessions = sessions.filter(s => !(s.batchId === batchId && s.day === day && s.timeStr === timeStr));
    
    if (editForm.type === "class" && editForm.subject && editForm.teacherId) {
      newSessions.push({
        id: Date.now(), type: "class", batchId, day, timeStr,
        subject: editForm.subject, teacherId: parseInt(editForm.teacherId)
      });
    } else if (editForm.type === "leave" && editForm.leaveLabel) {
      newSessions.push({
        id: Date.now(), type: "leave", batchId, day, timeStr,
        leaveLabel: editForm.leaveLabel, leaveColor: editForm.leaveColor
      });
    }
    
    setSessions(newSessions);
    setEditSlot(null);
  };

  return (
    <PageShell>
      <Topbar
        title="Timetable"
        subtitle="Weekly academic schedule"
        right={
          <>
            <select value={selectedBatch} onChange={e => setSelectedBatch(e.target.value as any)} style={{ width: "auto" }}>
              {BATCHES.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            <button className="btn btn-p btn-sm">Save & notify parents</button>
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
          Click any slot to assign a teacher. Changes affecting 3+ sessions will trigger a PDF notification to parents.
        </div>

        <div className="tt-grid" style={{ marginBottom: 4 }}>
          <div />
          {DAYS.map(d => <div key={d} className="tt-day">{d}</div>)}
        </div>

        {TIMESLOTS.map(timeLabel => (
          <div key={timeLabel} className="tt-grid" style={{ marginBottom: 8, gridTemplateColumns: "80px repeat(7, 1fr)" }}>
            <div style={{ fontSize: 10.5, color: "var(--ink3)", fontFamily: "var(--font-mono)", paddingTop: 12, paddingRight: 8, textAlign: "right", fontWeight: 600 }}>
              {timeLabel.split(" – ")[0]}
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
      </div>

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
                    {batch.subjects.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
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
    </PageShell>
  );
}
