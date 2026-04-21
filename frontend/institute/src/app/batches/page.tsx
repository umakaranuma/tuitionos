"use client";
import { useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { PageShell } from "@/components/layout/PageShell";
import { Modal } from "@/components/ui/Modal";
import { TEACHERS, Teacher } from "@/lib/batchData";

const ALL_SUBJECTS = ["Mathematics", "Physics", "Chemistry", "English", "Tamil Literature", "Biology", "Combined Maths"];
const GRADES = ["Grade 1","Grade 2","Grade 3","Grade 4","Grade 5","Grade 6","Grade 7","Grade 8","Grade 9","Grade 10","Grade 11","Grade 12"];

type SubjectChip = { name: string; bg: string; fg: string };
type Batch = {
  id: number; name: string; grade: string; students: number;
  fee: string; subjects: SubjectChip[];
  teacherAssignments: Record<string, number[]>; // Subject -> Teacher IDs
};

const CHIP_COLORS: [string, string][] = [
  ["var(--sp-l)","var(--sp)"], ["var(--tc-l)","var(--tc-d)"], ["var(--rb-l)","var(--rb)"],
  ["var(--sf-l)","var(--sf)"], ["var(--pr-l)","var(--pr)"],
];

function makeChips(names: string[]): SubjectChip[] {
  return names.map((name, i) => {
    const [bg, fg] = CHIP_COLORS[i % CHIP_COLORS.length];
    return { name, bg, fg };
  });
}

const INIT_BATCHES: Batch[] = [
  { id: 1, name: "Grade 7 — Batch A",      grade: "Grade 7",  students: 18, fee: "3,000",
    subjects: makeChips(["Mathematics","Science","English","Tamil"]), teacherAssignments: { Mathematics: [1] } },
  { id: 2, name: "Grade 10 — O/L Batch",   grade: "Grade 10", students: 25, fee: "5,500",
    subjects: makeChips(["Mathematics","Physics","Chemistry","English"]), teacherAssignments: {} },
  { id: 3, name: "Grade 11 — A/L Science", grade: "Grade 11", students: 19, fee: "7,000",
    subjects: makeChips(["Physics","Chemistry","Combined Maths","Biology"]), teacherAssignments: { Physics: [2] } },
  { id: 4, name: "Grade 8 — Batch B",      grade: "Grade 8",  students: 22, fee: "3,000",
    subjects: makeChips(["Mathematics","English","Tamil"]), teacherAssignments: {} },
];

function blankForm() {
  return { name: "", grade: "", fee: "", subjects: [] as string[], teacherAssignments: {} as Record<string, number[]> };
}

export default function BatchesPage() {
  const [batches, setBatches] = useState<Batch[]>(INIT_BATCHES);
  const [modal, setModal]     = useState<"add" | "edit" | null>(null);
  const [editTarget, setEditTarget] = useState<Batch | null>(null);
  const [form, setForm]       = useState(blankForm());
  const [nextId, setNextId]   = useState(INIT_BATCHES.length + 1);

  const openAdd = () => { setForm(blankForm()); setEditTarget(null); setModal("add"); };
  const openEdit = (b: Batch) => {
    setForm({ name: b.name, grade: b.grade, fee: b.fee, subjects: b.subjects.map(s => s.name), teacherAssignments: b.teacherAssignments || {} });
    setEditTarget(b);
    setModal("edit");
  };
  const close = () => setModal(null);

  const toggleSubject = (subj: string) =>
    setForm(f => {
      const isSelected = f.subjects.includes(subj);
      const newSubjects = isSelected ? f.subjects.filter(s => s !== subj) : [...f.subjects, subj];
      const newAssignments = { ...f.teacherAssignments };
      if (isSelected) delete newAssignments[subj]; // cleanup teachers if subject removed
      return { ...f, subjects: newSubjects, teacherAssignments: newAssignments };
    });

  const toggleTeacher = (subj: string, teacherId: number) => {
    setForm(f => {
      const current = f.teacherAssignments[subj] || [];
      const isSelected = current.includes(teacherId);
      return {
        ...f,
        teacherAssignments: {
          ...f.teacherAssignments,
          [subj]: isSelected ? current.filter(id => id !== teacherId) : [...current, teacherId]
        }
      };
    });
  };

  const save = () => {
    if (!form.name.trim() || !form.grade) return;
    if (modal === "add") {
      setBatches(prev => [...prev, {
        id: nextId, name: form.name, grade: form.grade,
        students: 0, fee: form.fee || "0",
        subjects: makeChips(form.subjects),
        teacherAssignments: form.teacherAssignments
      }]);
      setNextId(n => n + 1);
    } else if (editTarget) {
      setBatches(prev => prev.map(b =>
        b.id === editTarget.id
          ? { ...b, name: form.name, grade: form.grade, fee: form.fee, subjects: makeChips(form.subjects), teacherAssignments: form.teacherAssignments }
          : b
      ));
    }
    close();
  };

  const modalBody = (
    <div className="form-gap">
      <div className="field-row">
        <div>
          <label className="flbl freq">Batch name</label>
          <input placeholder="e.g. Grade 9 — Batch A" value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoFocus />
        </div>
        <div>
          <label className="flbl freq">Grade level</label>
          <select value={form.grade} onChange={e => setForm(f => ({ ...f, grade: e.target.value }))}>
            <option value="">— Pick grade —</option>
            {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="flbl">Monthly fee (LKR)</label>
        <input type="number" placeholder="e.g. 5500" value={form.fee}
          onChange={e => setForm(f => ({ ...f, fee: e.target.value }))} />
        <div className="fhint">Leave blank for custom / per-subject pricing</div>
      </div>
      <div>
        <label className="flbl">Subjects in this batch</label>
        <div className="check-grid">
          {ALL_SUBJECTS.map(subj => {
            const checked = form.subjects.includes(subj);
            return (
              <label
                key={subj}
                className={`check-item${checked ? " checked" : ""}`}
                onClick={() => toggleSubject(subj)}
              >
                <input type="checkbox" checked={checked} onChange={() => {}} />
                {subj}
              </label>
            );
          })}
        </div>
      </div>
      {/* Preview / Teacher Assignments */}
      {form.subjects.length > 0 && (
        <div style={{ background: "var(--cr)", borderRadius: 10, padding: "14px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <div style={{ fontSize: 11, color: "var(--ink3)", marginBottom: 6, fontWeight: 600 }}>Selected Subjects</div>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {makeChips(form.subjects).map(s => (
                <span key={s.name} className="bdg" style={{ background: s.bg, color: s.fg }}>{s.name}</span>
              ))}
            </div>
          </div>
          
          <hr className="dv" />
          
          <div>
            <div style={{ fontSize: 11, color: "var(--ink3)", marginBottom: 8, fontWeight: 600 }}>Assign Teachers per Subject</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {form.subjects.map(subj => {
                const availableTeachers = TEACHERS.filter(t => t.subject === subj);
                const assigned = form.teacherAssignments[subj] || [];
                return (
                  <div key={subj} style={{ background: "#fff", border: "1px solid var(--ln)", borderRadius: 8, padding: "10px 12px" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)", marginBottom: 6 }}>{subj}</div>
                    {availableTeachers.length === 0 ? (
                      <div style={{ fontSize: 11, color: "var(--ink3)" }}>No {subj} teachers found in directory.</div>
                    ) : (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {availableTeachers.map(t => {
                          const isSelected = assigned.includes(t.id);
                          return (
                            <button key={t.id} onClick={() => toggleTeacher(subj, t.id)} style={{
                              padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer",
                              border: `1.5px solid ${isSelected ? "var(--tc)" : "var(--ln)"}`,
                              background: isSelected ? "var(--tc-l)" : "#fff",
                              color: isSelected ? "var(--tc-d)" : "var(--ink3)", transition: "all 150ms"
                            }}>
                              {isSelected ? "✓ " : ""}{t.name}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <PageShell>
      <Topbar
        title="Batches"
        subtitle="Grade groups and packages"
        right={<button className="btn btn-p btn-sm" onClick={openAdd}>+ Create batch</button>}
      />
      <div className="pb fi">
        <div className="g2">
          {batches.map(b => (
            <div key={b.id} className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>{b.name}</div>
                  <div style={{ fontSize: 11, color: "var(--ink3)", marginTop: 2 }}>
                    {b.students} students · LKR {b.fee}/mo
                  </div>
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  <button className="btn btn-xs btn-s" onClick={() => openEdit(b)}>Edit</button>
                  <button className="btn btn-xs btn-d"
                    onClick={() => setBatches(prev => prev.filter(x => x.id !== b.id))}>✕</button>
                </div>
              </div>
              <hr className="dv" />
              <div style={{ fontSize: 11, color: "var(--ink3)", marginBottom: 6 }}>Subjects</div>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                {b.subjects.map(s => (
                  <span key={s.name} className="bdg" style={{ background: s.bg, color: s.fg }}>{s.name}</span>
                ))}
                {b.subjects.length === 0 && <span style={{ fontSize: 11, color: "var(--ink3)" }}>No subjects added yet</span>}
              </div>
            </div>
          ))}
          <div
            className="card"
            onClick={openAdd}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              borderStyle: "dashed", cursor: "pointer", color: "var(--ink3)", gap: 6,
              fontSize: 12.5, minHeight: 120, transition: "all 140ms",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M8 3v10M3 8h10"/>
            </svg>
            Create new batch
          </div>
        </div>
      </div>

      <Modal
        open={modal !== null}
        onClose={close}
        title={modal === "add" ? "Create batch" : `Edit — ${editTarget?.name}`}
        wide
        footer={
          <>
            <button className="btn btn-s btn-sm" onClick={close}>Cancel</button>
            <button className="btn btn-p btn-sm" onClick={save} disabled={!form.name.trim() || !form.grade}>
              {modal === "add" ? "Create batch" : "Save changes"}
            </button>
          </>
        }
      >
        {modalBody}
      </Modal>
    </PageShell>
  );
}
