"use client";
import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/ToastProvider";
import { api } from "@/lib/api";

type Student = { id: number; name: string };
type Mark = { id?: number; student: number; subject: string; marks: number | null; max_marks: number };
type ExamShape = {
  id: number;
  name: string;
  batch: number | string;
  batchLabel?: string;
  maxMarks: number;
  subjects: string[];
};

type Props = {
  open: boolean;
  onClose: () => void;
  exam: ExamShape | null;
};

export function ExamMarksModal({ open, onClose, exam }: Props) {
  const toast = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  // Marks indexed by `${studentId}::${subject}` for O(1) lookups in the grid.
  const [marks, setMarks] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open || !exam) return;
    setLoading(true);
    setQuery("");
    Promise.all([
      api.get(`/api/students/students?batch=${exam.batch}`).then(r => Array.isArray(r.data) ? r.data : r.data.results || []),
      api.get(`/api/academics/exams/${exam.id}/marks`).then(r => Array.isArray(r.data) ? r.data : r.data.results || []),
    ]).then(([st, m]: [Student[], Mark[]]) => {
      setStudents(st);
      const map: Record<string, string> = {};
      m.forEach(row => {
        if (row.marks !== null && row.marks !== undefined) {
          map[`${row.student}::${row.subject}`] = String(row.marks);
        }
      });
      setMarks(map);
    }).catch(() => toast.error("Couldn't load marks data."))
      .finally(() => setLoading(false));
  }, [open, exam, toast]);

  if (!exam) return null;

  const keyFor = (sid: number, subj: string) => `${sid}::${subj}`;
  const filteredStudents = query
    ? students.filter(s => s.name.toLowerCase().includes(query.toLowerCase()))
    : students;

  const setMark = (sid: number, subj: string, v: string) => {
    // Numeric input only; allow blank to clear a mark.
    if (v !== "" && !/^\d*\.?\d*$/.test(v)) return;
    setMarks(prev => ({ ...prev, [keyFor(sid, subj)]: v }));
  };

  const save = async () => {
    setSaving(true);
    try {
      const records = [];
      for (const s of students) {
        for (const subj of exam.subjects) {
          const v = marks[keyFor(s.id, subj)];
          if (v === undefined || v === "") continue;
          const n = Number(v);
          if (Number.isNaN(n)) continue;
          if (n < 0 || n > exam.maxMarks) {
            toast.error(`${s.name} · ${subj}: ${n} is outside 0–${exam.maxMarks}.`);
            setSaving(false);
            return;
          }
          records.push({ student: s.id, subject: subj, marks: n, max_marks: exam.maxMarks });
        }
      }
      if (records.length === 0) {
        toast.info?.("Nothing to save.");
        setSaving(false);
        return;
      }
      await api.post(`/api/academics/exams/${exam.id}/marks`, { records });
      toast.success(`Saved ${records.length} mark${records.length !== 1 ? "s" : ""}.`);
      onClose();
    } catch { toast.error("Couldn't save marks."); }
    finally { setSaving(false); }
  };

  // Grade helper used as a non-blocking hint next to each input.
  const gradeOf = (mark: number, max: number) => {
    if (max <= 0) return "";
    const pct = (mark / max) * 100;
    if (pct >= 75) return "A";
    if (pct >= 65) return "B";
    if (pct >= 50) return "C";
    if (pct >= 35) return "S";
    return "F";
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Marks — ${exam.name}`}
      wide
      footer={<>
        <button className="btn btn-s btn-sm" onClick={onClose} disabled={saving}>Close</button>
        <button className="btn btn-p btn-sm" onClick={save} disabled={saving || loading || students.length === 0}>
          {saving ? "Saving…" : "Save marks"}
        </button>
      </>}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ fontSize: 12.5, color: "var(--ink3)" }}>
            {exam.batchLabel ? <strong style={{ color: "var(--ink)" }}>{exam.batchLabel}</strong> : null}
            {exam.batchLabel ? " · " : ""}
            {students.length} student{students.length !== 1 ? "s" : ""} · {exam.subjects.length} subject{exam.subjects.length !== 1 ? "s" : ""} · max {exam.maxMarks}
          </div>
          <input
            placeholder="Search student…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{ maxWidth: 220 }}
          />
        </div>

        {loading ? (
          <div style={{ padding: 32, textAlign: "center", color: "var(--ink3)" }}>Loading…</div>
        ) : students.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", color: "var(--ink3)", background: "var(--cr)", borderRadius: 10 }}>
            No students enrolled in this batch.
          </div>
        ) : (
          <div className="tw" style={{ maxHeight: "60vh", overflow: "auto" }}>
            <table>
              <thead style={{ position: "sticky", top: 0, zIndex: 1 }}>
                <tr>
                  <th style={{ minWidth: 200 }}>Student</th>
                  {exam.subjects.map(s => (
                    <th key={s} style={{ textAlign: "center", minWidth: 110 }}>{s}</th>
                  ))}
                  <th style={{ textAlign: "right" }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map(s => {
                  // Per-row total + average grade so the user can sanity-check as they type.
                  let total = 0, totalMax = 0;
                  exam.subjects.forEach(subj => {
                    const v = marks[keyFor(s.id, subj)];
                    if (v !== undefined && v !== "" && !Number.isNaN(Number(v))) {
                      total += Number(v);
                      totalMax += exam.maxMarks;
                    }
                  });
                  const pct = totalMax > 0 ? Math.round((total / totalMax) * 100) : null;
                  return (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 600 }}>{s.name}</td>
                      {exam.subjects.map(subj => {
                        const v = marks[keyFor(s.id, subj)] ?? "";
                        const n = v !== "" ? Number(v) : null;
                        const grade = n !== null ? gradeOf(n, exam.maxMarks) : "";
                        return (
                          <td key={subj} style={{ textAlign: "center", padding: "6px 8px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "center" }}>
                              <input
                                type="text"
                                inputMode="decimal"
                                value={v}
                                onChange={e => setMark(s.id, subj, e.target.value)}
                                style={{ width: 60, height: 30, textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 12.5 }}
                                placeholder={`/${exam.maxMarks}`}
                              />
                              {grade && (
                                <span style={{
                                  fontSize: 10, fontWeight: 800,
                                  color: grade === "F" ? "var(--rb)" : grade === "S" ? "var(--sf)" : grade === "C" ? "var(--ac)" : "var(--jd)",
                                }}>
                                  {grade}
                                </span>
                              )}
                            </div>
                          </td>
                        );
                      })}
                      <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700 }}>
                        {totalMax > 0 ? (
                          <span style={{ color: pct !== null && pct >= 50 ? "var(--jd)" : pct !== null ? "var(--rb)" : "var(--ink3)" }}>
                            {total}/{totalMax}
                            <div style={{ fontSize: 10, color: "var(--ink3)", fontWeight: 500 }}>{pct}%</div>
                          </span>
                        ) : <span style={{ color: "var(--ink3)" }}>—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ fontSize: 11.5, color: "var(--ink3)", lineHeight: 1.5 }}>
          Empty cells stay unrecorded. Filled cells save together when you hit <strong>Save marks</strong> — you can come back any time to edit or fill more.
        </div>
      </div>
    </Modal>
  );
}
