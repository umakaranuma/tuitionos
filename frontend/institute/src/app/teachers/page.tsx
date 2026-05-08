"use client";
import { useState, useEffect } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { PageShell } from "@/components/layout/PageShell";
import { Modal } from "@/components/ui/Modal";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { api } from "@/lib/api";

type Teacher = { id: number; name: string; mobile: string; email: string; subject: string; monthly_salary: string; is_active: boolean };
type Subject = { id: number; name: string };

const P: [string,string][] = [["var(--tc-l)","var(--tc-d)"],["var(--sp-l)","var(--sp)"],["var(--sf-l)","var(--sf)"],["var(--jd-l)","var(--jd)"],["var(--rb-l)","var(--rb)"],["var(--pr-l)","var(--pr)"]];
const initials = (n: string) => n.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [editTarget, setEditTarget] = useState<Teacher | null>(null);
  const [form, setForm] = useState({ name: "", mobile: "", email: "", subject: "", monthly_salary: "" });

  const load = () => {
    Promise.all([
      api.get("/api/academics/teachers").then(r => Array.isArray(r.data) ? r.data : r.data.results || []),
      api.get("/api/academics/subjects").then(r => Array.isArray(r.data) ? r.data : r.data.results || [])
    ]).then(([t, s]) => {
      setTeachers(t);
      setSubjects(s);
      setLoading(false);
    }).catch(() => setLoading(false));
  };
  useEffect(load, []);

  const searchSubjects = async (q: string) => {
    try {
      const r = await api.get(`/api/academics/subjects?search=${encodeURIComponent(q)}`);
      setSubjects(Array.isArray(r.data) ? r.data : r.data.results || []);
    } catch (e) {}
  };

  const openAdd = () => { setForm({ name: "", mobile: "", email: "", subject: "", monthly_salary: "" }); setEditTarget(null); setModal("add"); };
  const openEdit = (t: Teacher) => { setForm({ name: t.name, mobile: t.mobile, email: t.email, subject: t.subject, monthly_salary: String(t.monthly_salary) }); setEditTarget(t); setModal("edit"); };
  const close = () => setModal(null);

  const save = async () => {
    if (!form.name.trim()) return;
    if (modal === "add") { await api.post("/api/academics/teachers", form); }
    else if (editTarget) { await api.patch(`/api/academics/teachers/${editTarget.id}`, form); }
    close(); load();
  };

  const remove = async (id: number) => { await api.delete(`/api/academics/teachers/${id}`); load(); };

  return (
    <PageShell>
      <Topbar title="Teachers" subtitle={`${teachers.length} teachers`} right={<button className="btn btn-p btn-sm" onClick={openAdd}>+ Add teacher</button>} />
      <div className="pb fi">
        {loading ? <div style={{ textAlign: "center", padding: 40, color: "var(--ink3)" }}>Loading...</div> : (
          <div className="tw">
            <table>
              <thead><tr><th>Teacher</th><th>Subject</th><th>Mobile</th><th>Email</th><th>Salary (LKR)</th><th>Actions</th></tr></thead>
              <tbody>
                {teachers.map((t, idx) => {
                  const [bg, fg] = P[idx % P.length];
                  return (
                    <tr key={t.id}>
                      <td><div className="td-nm"><div className="ava" style={{ background: bg, color: fg }}>{initials(t.name)}</div>{t.name}</div></td>
                      <td style={{ color: "var(--ink3)" }}>{t.subject || "—"}</td>
                      <td className="mono">{t.mobile}</td>
                      <td style={{ color: "var(--ink3)" }}>{t.email || "—"}</td>
                      <td className="mono">{Number(t.monthly_salary).toLocaleString()}</td>
                      <td>
                        <div style={{ display: "flex", gap: 4 }}>
                          <button className="btn btn-xs btn-s" onClick={() => openEdit(t)}>Edit</button>
                          <button className="btn btn-xs btn-d" onClick={() => remove(t.id)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {teachers.length === 0 && <tr><td colSpan={6} style={{ textAlign: "center", color: "var(--ink3)", padding: 24 }}>No teachers yet</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={modal !== null} onClose={close} title={modal === "add" ? "Add teacher" : `Edit — ${editTarget?.name}`}
        footer={<><button className="btn btn-s btn-sm" onClick={close}>Cancel</button><button className="btn btn-p btn-sm" onClick={save}>{modal === "add" ? "Create" : "Save"}</button></>}>
        <div className="form-gap">
          <div><label className="flbl freq">Full name</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoFocus /></div>
          <div className="field-row">
            <div className="fg">
              <label className="flbl">Subject</label>
              <SearchableSelect 
                value={form.subject} 
                onChange={val => setForm(f => ({ ...f, subject: String(val) }))}
                placeholder="Select subject..."
                onSearch={searchSubjects}
                options={subjects.map(s => ({ value: s.name, label: s.name }))}
              />
            </div>
            <div className="fg"><label className="flbl">Monthly salary (LKR)</label><input type="number" value={form.monthly_salary} onChange={e => setForm(f => ({ ...f, monthly_salary: e.target.value }))} /></div>
          </div>
          <div className="field-row">
            <div className="fg"><label className="flbl">Mobile</label><input value={form.mobile} onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))} /></div>
            <div className="fg"><label className="flbl">Email</label><input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
          </div>
        </div>
      </Modal>
    </PageShell>
  );
}
