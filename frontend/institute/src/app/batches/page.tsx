"use client";
import { useState, useEffect } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { PageShell } from "@/components/layout/PageShell";
import { Modal } from "@/components/ui/Modal";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { api } from "@/lib/api";

type BatchSubject = { id?: number; subject: number; subject_name?: string; teacher: number | null; teacher_name?: string | null };
type Batch = { id: number; name: string; label: string; subjects: BatchSubject[]; academic_year: number; monthly_fee: string; color: string; color_light: string; student_count: number; is_active: boolean };
type Subject = { id: number; name: string };
type Teacher = { id: number; name: string; subject: string };

export default function BatchesPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachersBySubject, setTeachersBySubject] = useState<Record<string, Teacher[]>>({});
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [editTarget, setEditTarget] = useState<Batch | null>(null);
  const [form, setForm] = useState({ name: "", label: "", academic_year: "2026", monthly_fee: "", subjects: [] as { subject: string; teacher: string }[] });

  const load = () => {
    api.get("/api/academics/batches").then(r => {
      setBatches(Array.isArray(r.data) ? r.data : r.data.results || []);
      setLoading(false);
    });
  };

  const fetchSubjects = async () => {
    if (subjects.length > 0) return;
    try {
      const r = await api.get("/api/academics/subjects");
      setSubjects(Array.isArray(r.data) ? r.data : r.data.results || []);
    } catch (e) {}
  };

  const fetchTeachers = async (subjectName: string, query: string = "") => {
    if (!subjectName && !query) return;
    try {
      const qs = query ? `&search=${encodeURIComponent(query)}` : "";
      const r = await api.get(`/api/academics/teachers?subject=${encodeURIComponent(subjectName)}${qs}`);
      setTeachersBySubject(prev => ({ ...prev, [subjectName]: Array.isArray(r.data) ? r.data : r.data.results || [] }));
    } catch (e) {}
  };

  const searchSubjects = async (q: string) => {
    try {
      const r = await api.get(`/api/academics/subjects?search=${encodeURIComponent(q)}`);
      setSubjects(Array.isArray(r.data) ? r.data : r.data.results || []);
    } catch (e) {}
  };

  useEffect(load, []);

  const openAdd = () => { 
    fetchSubjects();
    setForm({ name: "", label: "", academic_year: "2026", monthly_fee: "", subjects: [{ subject: "", teacher: "" }] }); 
    setEditTarget(null); setModal("add"); 
  };
  const openEdit = (b: Batch) => { 
    fetchSubjects();
    b.subjects.forEach(s => { if (s.subject_name) fetchTeachers(s.subject_name); });
    setForm({ 
      name: b.name, label: b.label, academic_year: String(b.academic_year), monthly_fee: String(b.monthly_fee),
      subjects: b.subjects.map(s => ({ subject: String(s.subject), teacher: s.teacher ? String(s.teacher) : "" }))
    }); 
    setEditTarget(b); setModal("edit"); 
  };
  const close = () => setModal(null);

  const save = async () => {
    if (!form.name.trim()) return;
    const payload = { 
      ...form, 
      academic_year: Number(form.academic_year), 
      monthly_fee: Number(form.monthly_fee),
      subjects: form.subjects.filter(s => s.subject).map(s => ({ subject: Number(s.subject), teacher: s.teacher ? Number(s.teacher) : null }))
    };
    if (modal === "add") { await api.post("/api/academics/batches", payload); }
    else if (editTarget) { await api.patch(`/api/academics/batches/${editTarget.id}`, payload); }
    close(); load();
  };

  const remove = async (id: number) => { await api.delete(`/api/academics/batches/${id}`); load(); };

  return (
    <PageShell>
      <Topbar title="Batches" subtitle={`${batches.length} batches · ${batches.reduce((s, b) => s + b.student_count, 0)} students`} right={<button className="btn btn-p btn-sm" onClick={openAdd}>+ Add batch</button>} />
      <div className="pb fi">
        {loading ? <div style={{ textAlign: "center", padding: 40, color: "var(--ink3)" }}>Loading...</div> : (
          <div className="g3">
            {batches.map(b => (
              <div key={b.id} className="card" style={{ borderLeft: `4px solid ${b.color || "var(--tc)"}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>{b.name}</div>
                    <div style={{ fontSize: 11, color: "var(--ink3)", marginTop: 4 }}>
                      {b.subjects?.length ? b.subjects.map((s, i) => (
                        <div key={i}>• {s.subject_name} {s.teacher_name && <span style={{ opacity: 0.7 }}>(by {s.teacher_name})</span>}</div>
                      )) : "No subjects assigned"}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button className="btn btn-xs btn-s" onClick={() => openEdit(b)}>Edit</button>
                    <button className="btn btn-xs btn-d" onClick={() => remove(b.id)}>Delete</button>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 16, fontSize: 11.5, marginTop: 12 }}>
                  <span><strong>{b.student_count}</strong> students</span>
                  <span>Fee: <strong className="mono">LKR {Number(b.monthly_fee).toLocaleString()}</strong></span>
                  <span>Year: <strong className="mono">{b.academic_year}</strong></span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={modal !== null} onClose={close} title={modal === "add" ? "Add batch" : `Edit — ${editTarget?.name}`}
        footer={<><button className="btn btn-s btn-sm" onClick={close}>Cancel</button><button className="btn btn-p btn-sm" onClick={save}>{modal === "add" ? "Create" : "Save"}</button></>}>
        <div className="form-gap">
          <div><label className="flbl freq">Batch name</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoFocus placeholder="e.g. Grade 7 — Batch A" /></div>
          
          <div>
            <label className="flbl">Subjects & Teachers</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, background: "var(--bg-d)", padding: 12, borderRadius: 8 }}>
              {form.subjects.map((s, idx) => (
                <div key={idx} style={{ display: "flex", gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <SearchableSelect 
                      value={s.subject} 
                      onOpen={fetchSubjects}
                      onChange={val => {
                        const newSubs = [...form.subjects]; newSubs[idx].subject = String(val); setForm({ ...form, subjects: newSubs });
                      }}
                      placeholder="Select subject..."
                      onSearch={searchSubjects}
                      options={subjects.map(sub => ({ value: sub.id, label: sub.name }))}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <SearchableSelect 
                      value={s.teacher} 
                      onOpen={() => {
                        const subjectName = subjects.find(sub => sub.id === Number(s.subject))?.name;
                        if (subjectName) fetchTeachers(subjectName);
                      }}
                      onChange={val => {
                        const newSubs = [...form.subjects]; newSubs[idx].teacher = String(val); setForm({ ...form, subjects: newSubs });
                      }}
                      placeholder="Select teacher..."
                      disabled={!s.subject}
                      onSearch={q => {
                        const subjectName = subjects.find(sub => sub.id === Number(s.subject))?.name;
                        if (subjectName) fetchTeachers(subjectName, q);
                      }}
                      options={(subjects.find(sub => sub.id === Number(s.subject))?.name 
                        ? teachersBySubject[subjects.find(sub => sub.id === Number(s.subject))!.name] || []
                        : []
                      ).map(t => ({ value: t.id, label: t.name }))}
                    />
                  </div>
                  <button className="btn btn-xs btn-d" onClick={() => {
                    setForm({ ...form, subjects: form.subjects.filter((_, i) => i !== idx) });
                  }}>✕</button>
                </div>
              ))}
              <button className="btn btn-s btn-sm" style={{ alignSelf: "flex-start", marginTop: 4 }} onClick={() => setForm({ ...form, subjects: [...form.subjects, { subject: "", teacher: "" }] })}>
                + Add subject
              </button>
            </div>
          </div>

          <div className="field-row">
            <div className="fg"><label className="flbl">Monthly fee (LKR)</label><input type="number" value={form.monthly_fee} onChange={e => setForm(f => ({ ...f, monthly_fee: e.target.value }))} /></div>
            <div className="fg"><label className="flbl">Academic year</label><input type="number" value={form.academic_year} onChange={e => setForm(f => ({ ...f, academic_year: e.target.value }))} /></div>
          </div>
        </div>
      </Modal>
    </PageShell>
  );
}
