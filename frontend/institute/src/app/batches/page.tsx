"use client";
import { useState, useEffect } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { PageShell } from "@/components/layout/PageShell";
import { Modal } from "@/components/ui/Modal";
import { api } from "@/lib/api";

type Batch = { id: number; name: string; label: string; subject: number; subject_name: string; teacher: number | null; teacher_name: string | null; academic_year: number; monthly_fee: string; color: string; color_light: string; student_count: number; is_active: boolean };
type Subject = { id: number; name: string };
type Teacher = { id: number; name: string };

export default function BatchesPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [editTarget, setEditTarget] = useState<Batch | null>(null);
  const [form, setForm] = useState({ name: "", label: "", subject: "", teacher: "", academic_year: "2026", monthly_fee: "" });

  const load = () => {
    Promise.all([
      api.get("/api/academics/batches").then(r => { const d = r.data; return Array.isArray(d) ? d : d.results || []; }),
      api.get("/api/academics/subjects").then(r => { const d = r.data; return Array.isArray(d) ? d : d.results || []; }),
      api.get("/api/academics/teachers").then(r => { const d = r.data; return Array.isArray(d) ? d : d.results || []; }),
    ]).then(([b, s, t]) => { setBatches(b); setSubjects(s); setTeachers(t); setLoading(false); });
  };
  useEffect(load, []);

  const openAdd = () => { setForm({ name: "", label: "", subject: "", teacher: "", academic_year: "2026", monthly_fee: "" }); setEditTarget(null); setModal("add"); };
  const openEdit = (b: Batch) => { setForm({ name: b.name, label: b.label, subject: String(b.subject), teacher: b.teacher ? String(b.teacher) : "", academic_year: String(b.academic_year), monthly_fee: String(b.monthly_fee) }); setEditTarget(b); setModal("edit"); };
  const close = () => setModal(null);

  const save = async () => {
    if (!form.name.trim() || !form.subject) return;
    const payload = { ...form, subject: Number(form.subject), teacher: form.teacher ? Number(form.teacher) : null, academic_year: Number(form.academic_year), monthly_fee: Number(form.monthly_fee) };
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
                    <div style={{ fontSize: 11, color: "var(--ink3)", marginTop: 2 }}>{b.subject_name} · {b.teacher_name || "No teacher"}</div>
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button className="btn btn-xs btn-s" onClick={() => openEdit(b)}>Edit</button>
                    <button className="btn btn-xs btn-d" onClick={() => remove(b.id)}>Delete</button>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 16, fontSize: 11.5 }}>
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
          <div className="field-row">
            <div className="fg"><label className="flbl freq">Subject</label>
              <select value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}>
                <option value="">Select...</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="fg"><label className="flbl">Teacher</label>
              <select value={form.teacher} onChange={e => setForm(f => ({ ...f, teacher: e.target.value }))}>
                <option value="">Select...</option>
                {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
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
