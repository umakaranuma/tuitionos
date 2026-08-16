"use client";
import { useState, useEffect } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { PageShell } from "@/components/layout/PageShell";
import { Modal } from "@/components/ui/Modal";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { api } from "@/lib/api";
import { getStoredUser } from "@/lib/auth";
import { useToast } from "@/components/ui/ToastProvider";
import { CroppableImageInput } from "@/components/ui/CroppableImageInput";

type BatchSubject = { id?: number; subject: number; subject_name?: string; teacher: number | null; teacher_name?: string | null };
type Batch = {
  id: number; grade: string; section: string; display_name: string;
  name: string; label: string; image?: string | null;
  subjects: BatchSubject[]; academic_year: number; monthly_fee: string;
  color: string; color_light: string; student_count: number; is_active: boolean;
};
type Subject = { id: number; name: string };
type Teacher = { id: number; name: string; subject: string };

export default function BatchesPage() {
  const toast = useToast();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [copyingYear, setCopyingYear] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachersBySubject, setTeachersBySubject] = useState<Record<string, Teacher[]>>({});
  const [allTeachers, setAllTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [editTarget, setEditTarget] = useState<Batch | null>(null);
  const [form, setForm] = useState({ grade: "", section: "", academic_year: "2026", monthly_fee: "", subjects: [] as { subject: string; teacher: string }[] });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [user, setUser] = useState<any>(null);

  const load = () => {
    setUser(getStoredUser());
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

  // No subject picked yet for this row — a subject match is a helpful filter,
  // not a hard requirement, so fall back to the institute's full teacher list
  // instead of leaving the picker empty and disabled.
  const fetchAllTeachers = async (query: string = "") => {
    try {
      const qs = query ? `&search=${encodeURIComponent(query)}` : "";
      const r = await api.get(`/api/academics/teachers?limit=500${qs}`);
      const d = r.data;
      setAllTeachers(Array.isArray(d) ? d : d.results || []);
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
    setForm({ grade: "", section: "", academic_year: "2026", monthly_fee: "", subjects: [{ subject: "", teacher: "" }] });
    setEditTarget(null); setImageFile(null); setModal("add"); 
  };
  const openEdit = (b: Batch) => { 
    fetchSubjects();
    b.subjects.forEach(s => { if (s.subject_name) fetchTeachers(s.subject_name); });
    setForm({
      grade: b.grade || b.label || b.name || "",
      section: b.section || "",
      academic_year: String(b.academic_year),
      monthly_fee: String(b.monthly_fee),
      subjects: b.subjects.map(s => ({ subject: String(s.subject), teacher: s.teacher ? String(s.teacher) : "" })),
    });
    setEditTarget(b); setImageFile(null); setModal("edit"); 
  };
  const close = () => setModal(null);

  const save = async () => {
    const newErrors: Record<string, string> = {};
    if (!form.grade.trim()) newErrors.grade = "Required";
    if (!form.monthly_fee) newErrors.monthly_fee = "Required";
    if (!form.academic_year) newErrors.academic_year = "Required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});

    const subjectsPayload = form.subjects.filter(s => s.subject).map(s => ({ subject: Number(s.subject), teacher: s.teacher ? Number(s.teacher) : null }));

    const payload = new FormData();
    payload.append("grade", form.grade.trim());
    payload.append("section", form.section.trim());
    payload.append("academic_year", form.academic_year);
    payload.append("monthly_fee", form.monthly_fee);
    payload.append("subjects", JSON.stringify(subjectsPayload));
    if (imageFile) payload.append("image", imageFile);

    if (modal === "add") { await api.post("/api/academics/batches", payload); }
    else if (editTarget) { await api.patch(`/api/academics/batches/${editTarget.id}`, payload); }
    close(); load();
  };

  const remove = async (id: number) => { await api.delete(`/api/academics/batches/${id}`); load(); };

  // ── Copy from previous year — explicit, whole-year, one click ──
  // Clones every batch (grade, section, fee, colour, subjects, teacher) from
  // last year into the current year. A batch is only created if this year has
  // no batch with that same grade+section yet, so clicking this again later
  // (or after adding some batches by hand) only fills in what's still
  // missing — it never duplicates an existing batch.
  const copyYear = async () => {
    const year = Number(localStorage.getItem("academic_year") || new Date().getFullYear());
    setCopyingYear(true);
    try {
      const r = await api.post("/api/academics/batches/copy_year", { to_year: year });
      toast.success(r.data?.message || "Batches copied.");
      load();
    } catch {
      toast.error("Couldn't copy last year's batches.");
    } finally {
      setCopyingYear(false);
    }
  };

  return (
    <PageShell>
      <Topbar
        title="Batches"
        subtitle={`${batches.length} batches · ${batches.reduce((s, b) => s + b.student_count, 0)} students`}
        right={
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-s btn-sm" onClick={copyYear} disabled={copyingYear}>
              {copyingYear ? "Copying…" : "⧉ Copy from previous year"}
            </button>
            <button className="btn btn-p btn-sm" onClick={openAdd}>+ Add batch</button>
          </div>
        }
      />
      <div className="pb fi">
        {loading ? <div style={{ textAlign: "center", padding: 40, color: "var(--ink3)" }}>Loading...</div> : (
          <div className="g3">
            {batches.map(b => (
              <div key={b.id} className="card" style={{ borderLeft: `4px solid ${b.color || "var(--tc)"}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>{b.display_name || b.name}</div>
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

      <Modal open={modal !== null} onClose={() => { close(); setErrors({}); }} title={modal === "add" ? "Add batch" : `Edit — ${editTarget?.display_name || editTarget?.name}`}
        footer={<><button className="btn btn-s btn-sm" onClick={() => { close(); setErrors({}); }}>Cancel</button><button className="btn btn-p btn-sm" onClick={save}>{modal === "add" ? "Create Batch" : "Save Changes"}</button></>}>
        <div className="form-gap">
          <div className="field-row">
            <div className="fg">
              <label className="flbl freq">Grade *</label>
              <input
                className={errors.grade ? "input-error" : ""}
                value={form.grade}
                onChange={e => { setForm(f => ({ ...f, grade: e.target.value })); setErrors(e => ({ ...e, grade: "" })); }}
                autoFocus placeholder="e.g. Grade 11"
              />
              {errors.grade && <div className="f-error">{errors.grade}</div>}
            </div>
            <div className="fg">
              <label className="flbl">Section / Stream</label>
              <input
                value={form.section}
                onChange={e => setForm(f => ({ ...f, section: e.target.value }))}
                placeholder="e.g. Science, Batch A, A/L Maths"
              />
              <div className="hint">Optional — leave blank if the grade has no sub-stream.</div>
            </div>
          </div>

          {/* Live preview of the canonical display name */}
          {(form.grade || form.section) && (
            <div style={{ fontSize: 12, color: "var(--ink3)", padding: "8px 12px", background: "var(--cr)", borderRadius: 8 }}>
              Display name: <strong style={{ color: "var(--ink)" }}>{form.grade}{form.section ? ` · ${form.section}` : ""}</strong>
            </div>
          )}

          <div className="field-row">
            <div className="fg">
              <label className="flbl freq">Monthly fee (LKR)</label>
              <input type="number" className={errors.monthly_fee ? "input-error" : ""} value={form.monthly_fee} onChange={e => { setForm(f => ({ ...f, monthly_fee: e.target.value })); setErrors(e => ({ ...e, monthly_fee: "" })); }} />
              {errors.monthly_fee && <div className="f-error">{errors.monthly_fee}</div>}
            </div>
            <div className="fg">
              <label className="flbl freq">Academic year</label>
              <input type="number" className={errors.academic_year ? "input-error" : ""} value={form.academic_year} onChange={e => { setForm(f => ({ ...f, academic_year: e.target.value })); setErrors(e => ({ ...e, academic_year: "" })); }} />
              {errors.academic_year && <div className="f-error">{errors.academic_year}</div>}
            </div>
          </div>

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
                        if (subjectName) fetchTeachers(subjectName); else fetchAllTeachers();
                      }}
                      onChange={val => {
                        const newSubs = [...form.subjects]; newSubs[idx].teacher = String(val); setForm({ ...form, subjects: newSubs });
                      }}
                      placeholder="Select teacher..."
                      onSearch={q => {
                        const subjectName = subjects.find(sub => sub.id === Number(s.subject))?.name;
                        if (subjectName) fetchTeachers(subjectName, q); else fetchAllTeachers(q);
                      }}
                      options={(() => {
                        const subjectName = subjects.find(sub => sub.id === Number(s.subject))?.name;
                        const list = subjectName ? (teachersBySubject[subjectName] || []) : allTeachers;
                        return list.map(t => ({ value: t.id, label: t.name }));
                      })()}
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

          <div className="fg fg-full">
            <label className="flbl">Cover Image</label>
            {user?.institute?.plan === "institute_pro" ? (
              <CroppableImageInput
                value={editTarget?.image}
                name={form.grade || "Batch"}
                onChange={setImageFile}
                hint="Click to upload a cover image"
              />
            ) : (
              <div style={{ padding: 16, background: "var(--w)", border: "1px solid var(--ln)", borderRadius: 12, display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ background: "var(--tc)", color: "white", padding: "4px 8px", borderRadius: 8, fontSize: 10, fontWeight: 700 }}>PRO</div>
                <div style={{ fontSize: 12.5, color: "var(--ink2)" }}>Upgrade to Institute Pro to upload custom cover images.</div>
              </div>
            )}
          </div>
        </div>
      </Modal>
    </PageShell>
  );
}
