"use client";
import { useState, useEffect } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { PageShell } from "@/components/layout/PageShell";
import { Modal } from "@/components/ui/Modal";
import { api } from "@/lib/api";
import { getStoredUser } from "@/lib/auth";
import { Avatar } from "@/components/ui/Avatar";

const BG_OPTS = [
  { label: "Teal", bg: "var(--sp-l)", fg: "var(--sp)" },
  { label: "Green", bg: "var(--tc-l)", fg: "var(--tc-d)" },
  { label: "Red", bg: "var(--rb-l)", fg: "var(--rb)" },
  { label: "Amber", bg: "var(--sf-l)", fg: "var(--sf)" },
  { label: "Purple", bg: "var(--pr-l)", fg: "var(--pr)" },
];

type Subject = { id: number; name: string; icon: string; image?: string | null; batch: string; color_bg: string; color_fg: string; is_active: boolean };

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [editTarget, setEditTarget] = useState<Subject | null>(null);
  const [form, setForm] = useState({ name: "", batch: "All", icon: "Mx", color_bg: "var(--sp-l)", color_fg: "var(--sp)" });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [user, setUser] = useState<any>(null);

  const load = () => {
    setUser(getStoredUser());
    api.get("/api/academics/subjects").then(r => {
      const d = r.data; setSubjects(Array.isArray(d) ? d : d.results || []); setLoading(false);
    }).catch(() => setLoading(false));
  };
  useEffect(load, []);

  const openAdd = () => { 
    setForm({ name: "", batch: "All", icon: "Mx", color_bg: "var(--sp-l)", color_fg: "var(--sp)" }); 
    setEditTarget(null); setImageFile(null); setModal("add"); 
  };
  const openEdit = (s: Subject) => { 
    setForm({ name: s.name, batch: s.batch, icon: s.icon, color_bg: s.color_bg || "var(--sp-l)", color_fg: s.color_fg || "var(--sp)" }); 
    setEditTarget(s); setImageFile(null); setModal("edit"); 
  };
  const close = () => setModal(null);

  const save = async () => {
    const newErrors: Record<string, string> = {};
    if (!form.name.trim()) newErrors.name = "Required";
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});

    const payload = new FormData();
    payload.append("name", form.name);
    payload.append("batch", form.batch);
    payload.append("icon", form.icon);
    payload.append("color_bg", form.color_bg);
    payload.append("color_fg", form.color_fg);
    if (imageFile) payload.append("image", imageFile);

    if (modal === "add") {
      await api.post("/api/academics/subjects", payload);
    } else if (editTarget) {
      await api.patch(`/api/academics/subjects/${editTarget.id}`, payload);
    }
    close(); load();
  };

  const remove = async (id: number) => {
    await api.delete(`/api/academics/subjects/${id}`);
    load();
  };

  return (
    <PageShell>
      <Topbar title="Subjects" subtitle={`${subjects.length} subjects`} right={<button className="btn btn-p btn-sm" onClick={openAdd}>+ Add subject</button>} />
      <div className="pb fi">
        {loading ? <div style={{ textAlign: "center", padding: 40, color: "var(--ink3)" }}>Loading...</div> : (
          <div className="g3">
            {subjects.map(s => {
              const bg = s.color_bg || BG_OPTS[0].bg;
              const fg = s.color_fg || BG_OPTS[0].fg;
              return (
                <div key={s.id} className="card" style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {s.image ? (
                    <img src={s.image} alt={s.name} style={{ width: 36, height: 36, borderRadius: 9, objectFit: "cover", flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 36, height: 36, borderRadius: 9, background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: fg, flexShrink: 0 }}>
                      {s.icon || s.name.substring(0, 2)}
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{s.name}</div>
                    <div style={{ fontSize: 11, color: "var(--ink3)", marginTop: 2 }}>Batch: {s.batch}</div>
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button className="btn btn-xs btn-s" onClick={() => openEdit(s)}>Edit</button>
                    <button className="btn btn-xs btn-d" onClick={() => remove(s.id)}>Delete</button>
                  </div>
                </div>
              );
            })}
            <div className="card" onClick={openAdd} style={{ display: "flex", alignItems: "center", justifyContent: "center", borderStyle: "dashed", cursor: "pointer", color: "var(--ink3)", gap: 6, fontSize: 12.5, minHeight: 78 }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 3v10M3 8h10"/></svg>
              Add subject
            </div>
          </div>
        )}
      </div>

      <Modal open={modal !== null} onClose={() => { close(); setErrors({}); }} title={modal === "add" ? "Add subject" : `Edit — ${editTarget?.name}`}
        footer={<><button className="btn btn-s btn-sm" onClick={() => { close(); setErrors({}); }}>Cancel</button><button className="btn btn-p btn-sm" onClick={save}>{modal === "add" ? "Create Subject" : "Save Changes"}</button></>}>
        <div className="form-gap">
          <div className="field-row">
            <div className="fg" style={{ flex: 2 }}>
              <label className="flbl freq">Subject Name</label>
              <input className={errors.name ? "input-error" : ""} placeholder="e.g. Combined Mathematics" value={form.name} onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setErrors(e => ({ ...e, name: "" })); }} autoFocus />
              {errors.name && <div className="f-error">{errors.name}</div>}
            </div>
            <div className="fg" style={{ flex: 1 }}>
              <label className="flbl">Target Batch</label>
              <input placeholder="e.g. All, O/L, A/L" value={form.batch} onChange={e => setForm(f => ({ ...f, batch: e.target.value }))} />
            </div>
          </div>
          
          <div className="field-row">
            <div className="fg">
              <label className="flbl">Subject Icon</label>
              <input placeholder="e.g. 🧪 or Math" value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} maxLength={10} />
            </div>
            <div className="fg">
              <label className="flbl">Colour Theme</label>
              <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                {BG_OPTS.map(o => (
                  <button key={o.label} type="button" onClick={() => setForm(f => ({ ...f, color_bg: o.bg, color_fg: o.fg }))}
                    style={{ width: 28, height: 28, borderRadius: 8, background: o.bg, border: `2.5px solid ${form.color_bg === o.bg ? o.fg : "transparent"}`, cursor: "pointer" }} title={o.label} />
                ))}
              </div>
            </div>
          </div>

          <div className="fg fg-full">
            <label className="flbl">Cover Image</label>
            {user?.institute?.plan === "institute_pro" ? (
              <div style={{
                border: "2px dashed var(--ln)", borderRadius: 12, padding: "24px",
                textAlign: "center", background: "var(--cr)", cursor: "pointer",
                transition: "all 0.2s"
              }}>
                {!imageFile && editTarget?.image && (
                  <img src={editTarget.image} alt={editTarget.name} style={{ width: 56, height: 56, borderRadius: 12, objectFit: "cover", marginBottom: 10 }} />
                )}
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
                <div style={{ fontSize: 12.5, color: "var(--ink2)" }}>Upgrade to Institute Pro to upload custom cover images.</div>
              </div>
            )}
          </div>
        </div>
      </Modal>
    </PageShell>
  );
}
