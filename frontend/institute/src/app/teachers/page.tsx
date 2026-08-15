"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Topbar } from "@/components/layout/Topbar";
import { PageShell } from "@/components/layout/PageShell";
import { Modal } from "@/components/ui/Modal";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { Pagination } from "@/components/ui/Pagination";
import { api } from "@/lib/api";
import { getStoredUser } from "@/lib/auth";

type Teacher = { id: number; name: string; mobile: string; email: string; subject: string; monthly_salary: string; is_active: boolean };
type Subject = { id: number; name: string };

const P: [string,string][] = [["var(--tc-l)","var(--tc-d)"],["var(--sp-l)","var(--sp)"],["var(--sf-l)","var(--sf)"],["var(--jd-l)","var(--jd)"],["var(--rb-l)","var(--rb)"],["var(--pr-l)","var(--pr)"]];
const initials = (n: string) => n.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();

export default function TeachersPage() {
  const router = useRouter();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [meta, setMeta] = useState({ total_count: 0, total_pages: 1 });
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [editTarget, setEditTarget] = useState<Teacher | null>(null);
  const [form, setForm] = useState({ name: "", mobile: "", email: "", subject: "", monthly_salary: "", is_active: true });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [user, setUser] = useState<any>(null);

  const load = () => {
    setUser(getStoredUser());
    setLoading(true);
    Promise.all([
      api.get(`/api/academics/teachers?page=${page}&limit=${limit}`).then(r => {
        const d = r.data;
        if (d.total_count !== undefined) setMeta({ total_count: d.total_count, total_pages: d.total_pages });
        return Array.isArray(d) ? d : d.results || [];
      }),
      api.get("/api/academics/subjects").then(r => Array.isArray(r.data) ? r.data : r.data.results || [])
    ]).then(([t, s]) => {
      setTeachers(t);
      setSubjects(s);
      setLoading(false);
    }).catch(() => setLoading(false));
  };
  useEffect(load, [page, limit]);

  const searchSubjects = async (q: string) => {
    try {
      const r = await api.get(`/api/academics/subjects?search=${encodeURIComponent(q)}`);
      setSubjects(Array.isArray(r.data) ? r.data : r.data.results || []);
    } catch (e) {}
  };

  const openAdd = () => { setForm({ name: "", mobile: "", email: "", subject: "", monthly_salary: "", is_active: true }); setEditTarget(null); setImageFile(null); setModal("add"); };
  const openEdit = (t: Teacher) => { setForm({ name: t.name, mobile: t.mobile, email: t.email, subject: t.subject, monthly_salary: String(t.monthly_salary), is_active: t.is_active }); setEditTarget(t); setImageFile(null); setModal("edit"); };
  const close = () => setModal(null);

  const save = async () => {
    const newErrors: Record<string, string> = {};
    if (!form.name.trim()) newErrors.name = "Required";
    if (!form.mobile.trim()) newErrors.mobile = "Required";
    if (!form.monthly_salary) newErrors.monthly_salary = "Required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});

    const payload = new FormData();
    payload.append("name", form.name);
    payload.append("mobile", form.mobile);
    payload.append("email", form.email);
    payload.append("subject", form.subject);
    payload.append("monthly_salary", form.monthly_salary);
    payload.append("is_active", form.is_active ? "true" : "false");
    if (imageFile) payload.append("image", imageFile);

    if (modal === "add") { await api.post("/api/academics/teachers", payload); }
    else if (editTarget) { await api.patch(`/api/academics/teachers/${editTarget.id}`, payload); }
    close(); load();
  };

  // Quick toggle straight from the table — no need to open the edit modal
  // just to flip a teacher active/inactive. This is also the only way to
  // recover a teacher that somehow ended up inactive with no UI path back,
  // which was silently hiding them from every "active teachers" picker
  // across payroll and advances despite the API correctly returning them.
  const toggleActive = async (t: Teacher) => {
    await api.patch(`/api/academics/teachers/${t.id}`, { is_active: !t.is_active });
    load();
  };

  const remove = async (id: number) => { await api.delete(`/api/academics/teachers/${id}`); load(); };

  return (
    <PageShell>
      <Topbar title="Teachers" subtitle={`${teachers.length} teachers`} right={<button className="btn btn-p btn-sm" onClick={openAdd}>+ Add teacher</button>} />
      <div className="pb fi">
        {loading ? <div style={{ textAlign: "center", padding: 40, color: "var(--ink3)" }}>Loading...</div> : (
          <div className="tw">
            <table>
              <thead><tr><th>Teacher</th><th>Subject</th><th>Mobile</th><th>Salary (LKR)</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {teachers.map((t, idx) => {
                  const [bg, fg] = P[idx % P.length];
                  return (
                    <tr
                      key={t.id}
                      onClick={() => router.push(`/teachers/${t.id}`)}
                      style={{ cursor: "pointer" }}
                    >
                      <td>
                        <div className="td-nm">
                          <div className="ava" style={{ background: bg, color: fg }}>{initials(t.name)}</div>
                          <div>
                            <div className="td-nm-main">{t.name}</div>
                            {t.email && <div className="td-nm-sub">{t.email}</div>}
                          </div>
                        </div>
                      </td>
                      <td style={{ color: "var(--ink3)" }}>{t.subject || "—"}</td>
                      <td className="mono">{t.mobile}</td>
                      <td className="mono">{Number(t.monthly_salary).toLocaleString()}</td>
                      <td onClick={e => e.stopPropagation()}>
                        <button
                          style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}
                          title="Click to toggle active/inactive"
                          onClick={() => toggleActive(t)}
                        >
                          {t.is_active ? <span className="dot-st dot-active">Active</span> : <span className="dot-st dot-paused">Inactive</span>}
                        </button>
                      </td>
                      <td onClick={e => e.stopPropagation()}>
                        <div style={{ display: "flex", gap: 4 }}>
                          <button className="btn btn-xs btn-s" onClick={() => router.push(`/teachers/${t.id}`)}>View</button>
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
            <Pagination 
              page={page} 
              limit={limit} 
              totalCount={meta.total_count} 
              totalPages={meta.total_pages} 
              onPageChange={setPage} 
              onLimitChange={l => { setLimit(l); setPage(1); }} 
              itemName="teachers" 
            />
          </div>
        )}
      </div>

      <Modal open={modal !== null} onClose={() => { close(); setErrors({}); }} title={modal === "add" ? "Add teacher" : `Edit — ${editTarget?.name}`}
        footer={<><button className="btn btn-s btn-sm" onClick={() => { close(); setErrors({}); }}>Cancel</button><button className="btn btn-p btn-sm" onClick={save}>{modal === "add" ? "Create Teacher" : "Save Changes"}</button></>}>
        <div className="form-gap">
          <div className="fg">
            <label className="flbl freq">Full name</label>
            <input className={errors.name ? "input-error" : ""} value={form.name} onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setErrors(e => ({ ...e, name: "" })); }} autoFocus />
            {errors.name && <div className="f-error">{errors.name}</div>}
          </div>
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
            <div className="fg">
              <label className="flbl freq">Monthly salary (LKR)</label>
              <input type="number" className={errors.monthly_salary ? "input-error" : ""} value={form.monthly_salary} onChange={e => { setForm(f => ({ ...f, monthly_salary: e.target.value })); setErrors(e => ({ ...e, monthly_salary: "" })); }} />
              {errors.monthly_salary && <div className="f-error">{errors.monthly_salary}</div>}
            </div>
          </div>
          <div className="field-row">
            <div className="fg">
              <label className="flbl freq">Mobile</label>
              <input className={errors.mobile ? "input-error" : ""} value={form.mobile} onChange={e => { setForm(f => ({ ...f, mobile: e.target.value })); setErrors(e => ({ ...e, mobile: "" })); }} />
              {errors.mobile && <div className="f-error">{errors.mobile}</div>}
            </div>
            <div className="fg"><label className="flbl">Email</label><input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
          </div>
          <div>
            <label className="flbl">Status</label>
            <div style={{ display: "flex", gap: 6 }}>
              <button type="button" className={`btn btn-sm ${form.is_active ? "btn-ok" : "btn-s"}`} style={{ flex: 1 }} onClick={() => setForm(f => ({ ...f, is_active: true }))}>Active</button>
              <button type="button" className={`btn btn-sm ${!form.is_active ? "btn-d" : "btn-s"}`} style={{ flex: 1 }} onClick={() => setForm(f => ({ ...f, is_active: false }))}>Inactive</button>
            </div>
          </div>
          <div className="fg fg-full">
            <label className="flbl">Profile Image</label>
            {user?.institute?.plan === "institute_pro" ? (
              <div style={{ 
                border: "2px dashed var(--ln)", borderRadius: 12, padding: "24px", 
                textAlign: "center", background: "var(--cr)", cursor: "pointer", 
                transition: "all 0.2s" 
              }}>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={e => setImageFile(e.target.files?.[0] || null)} 
                  style={{ display: "block", width: "100%", margin: "0 auto", cursor: "pointer", padding: "12px", background: "#fff", borderRadius: 8, border: "1px solid var(--ln)" }} 
                />
                {imageFile && <div style={{ fontSize: 12, color: "var(--tc)", marginTop: 8, fontWeight: 600 }}>Selected: {imageFile.name}</div>}
              </div>
            ) : (
              <div style={{ padding: 16, background: "var(--w)", border: "1px solid var(--ln)", borderRadius: 12, display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ background: "var(--tc)", color: "white", padding: "4px 8px", borderRadius: 8, fontSize: 10, fontWeight: 700 }}>PRO</div>
                <div style={{ fontSize: 12.5, color: "var(--ink2)" }}>Upgrade to Institute Pro to upload profile images.</div>
              </div>
            )}
          </div>
        </div>
      </Modal>
    </PageShell>
  );
}
