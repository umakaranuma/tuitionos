"use client";
import { useState, useEffect } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { PageShell } from "@/components/layout/PageShell";
import { Modal } from "@/components/ui/Modal";
import { api } from "@/lib/api";

const BG_OPTS = [
  { label: "Teal", bg: "var(--sp-l)", fg: "var(--sp)" },
  { label: "Green", bg: "var(--tc-l)", fg: "var(--tc-d)" },
  { label: "Red", bg: "var(--rb-l)", fg: "var(--rb)" },
  { label: "Amber", bg: "var(--sf-l)", fg: "var(--sf)" },
  { label: "Purple", bg: "var(--pr-l)", fg: "var(--pr)" },
];

type Subject = { id: number; name: string; icon: string; grade: string; color_bg: string; color_fg: string; is_active: boolean };

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [editTarget, setEditTarget] = useState<Subject | null>(null);
  const [form, setForm] = useState({ name: "", grade: "All", icon: "Mx", color_bg: "var(--sp-l)", color_fg: "var(--sp)" });

  const load = () => {
    api.get("/api/academics/subjects").then(r => {
      const d = r.data; setSubjects(Array.isArray(d) ? d : d.results || []); setLoading(false);
    }).catch(() => setLoading(false));
  };
  useEffect(load, []);

  const openAdd = () => { setForm({ name: "", grade: "All", icon: "Mx", color_bg: "var(--sp-l)", color_fg: "var(--sp)" }); setEditTarget(null); setModal("add"); };
  const openEdit = (s: Subject) => { setForm({ name: s.name, grade: s.grade, icon: s.icon, color_bg: s.color_bg || "var(--sp-l)", color_fg: s.color_fg || "var(--sp)" }); setEditTarget(s); setModal("edit"); };
  const close = () => setModal(null);

  const save = async () => {
    if (!form.name.trim()) return;
    if (modal === "add") {
      await api.post("/api/academics/subjects", form);
    } else if (editTarget) {
      await api.patch(`/api/academics/subjects/${editTarget.id}`, form);
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
                  <div style={{ width: 36, height: 36, borderRadius: 9, background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: fg, flexShrink: 0 }}>
                    {s.icon || s.name.substring(0, 2)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{s.name}</div>
                    <div style={{ fontSize: 11, color: "var(--ink3)", marginTop: 2 }}>Grade: {s.grade}</div>
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

      <Modal open={modal !== null} onClose={close} title={modal === "add" ? "Add subject" : `Edit — ${editTarget?.name}`}
        footer={<><button className="btn btn-s btn-sm" onClick={close}>Cancel</button><button className="btn btn-p btn-sm" onClick={save} disabled={!form.name.trim()}>{modal === "add" ? "Create" : "Save"}</button></>}>
        <div className="form-gap">
          <div><label className="flbl freq">Subject name</label><input placeholder="e.g. Combined Mathematics" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoFocus /></div>
          <div><label className="flbl">Grade</label><input placeholder="e.g. All, O/L, A/L" value={form.grade} onChange={e => setForm(f => ({ ...f, grade: e.target.value }))} /></div>
          <div>
            <label className="flbl">Colour theme</label>
            <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
              {BG_OPTS.map(o => (
                <button key={o.label} type="button" onClick={() => setForm(f => ({ ...f, color_bg: o.bg, color_fg: o.fg }))}
                  style={{ width: 28, height: 28, borderRadius: 8, background: o.bg, border: `2.5px solid ${form.color_bg === o.bg ? o.fg : "transparent"}`, cursor: "pointer" }} title={o.label} />
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </PageShell>
  );
}
