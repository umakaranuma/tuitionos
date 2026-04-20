"use client";
import { useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { PageShell } from "@/components/layout/PageShell";
import { Modal } from "@/components/ui/Modal";

const EMOJIS = ["∑", "⚛", "🧪", "📖", "📐", "🌿", "🎨", "🏛", "💻", "🔬", "🧬", "📊", "🧮", "🌍", "🎵", "⚡"];

const BG_OPTS = [
  { label: "Teal",   bg: "var(--sp-l)", fg: "var(--sp)"   },
  { label: "Green",  bg: "var(--tc-l)", fg: "var(--tc-d)" },
  { label: "Red",    bg: "var(--rb-l)", fg: "var(--rb)"   },
  { label: "Amber",  bg: "var(--sf-l)", fg: "var(--sf)"   },
  { label: "Purple", bg: "var(--pr-l)", fg: "var(--pr)"   },
];

type Subject = {
  id: number; name: string; icon: string; bg: string; fg: string; batches: number; teacher: string;
};

const INIT: Subject[] = [
  { id: 1, name: "Mathematics",     icon: "∑",  bg: "var(--sp-l)", fg: "var(--sp)",   batches: 3, teacher: "Mr. Rajan" },
  { id: 2, name: "Physics",         icon: "⚛",  bg: "var(--tc-l)", fg: "var(--tc-d)", batches: 2, teacher: "Ms. Geetha" },
  { id: 3, name: "Chemistry",       icon: "🧪", bg: "var(--rb-l)", fg: "var(--rb)",   batches: 2, teacher: "Mr. Arjun" },
  { id: 4, name: "English",         icon: "📖", bg: "var(--sf-l)", fg: "var(--sf)",   batches: 4, teacher: "Ms. Ramya" },
  { id: 5, name: "Tamil Literature",icon: "📐", bg: "var(--pr-l)", fg: "var(--pr)",   batches: 3, teacher: "Ms. Valli" },
  { id: 6, name: "Biology",         icon: "🌿", bg: "var(--tc-l)", fg: "var(--tc-d)", batches: 1, teacher: "Ms. Anitha" },
];

const TEACHERS_LIST = ["Mr. Rajan", "Ms. Geetha", "Mr. Arjun", "Ms. Ramya", "Ms. Valli", "Ms. Anitha"];

function blankSubject(): Omit<Subject, "id" | "batches"> {
  return { name: "", icon: "∑", bg: "var(--sp-l)", fg: "var(--sp)", teacher: "" };
}

export default function SubjectsPage() {
  const [subjects, setSubjects]   = useState<Subject[]>(INIT);
  const [modal, setModal]         = useState<"add" | "edit" | null>(null);
  const [editTarget, setEditTarget] = useState<Subject | null>(null);
  const [form, setForm]           = useState(blankSubject());
  const [nextId, setNextId]       = useState(INIT.length + 1);

  const openAdd = () => {
    setForm(blankSubject());
    setEditTarget(null);
    setModal("add");
  };

  const openEdit = (s: Subject) => {
    setForm({ name: s.name, icon: s.icon, bg: s.bg, fg: s.fg, teacher: s.teacher });
    setEditTarget(s);
    setModal("edit");
  };

  const close = () => setModal(null);

  const save = () => {
    if (!form.name.trim()) return;
    if (modal === "add") {
      setSubjects(prev => [...prev, { ...form, id: nextId, batches: 0 }]);
      setNextId(n => n + 1);
    } else if (modal === "edit" && editTarget) {
      setSubjects(prev => prev.map(s => s.id === editTarget.id ? { ...s, ...form } : s));
    }
    close();
  };

  const remove = (id: number) => setSubjects(prev => prev.filter(s => s.id !== id));

  const selectedBg = BG_OPTS.find(o => o.bg === form.bg) ?? BG_OPTS[0];

  const modalBody = (
    <div className="form-gap">
      {/* Name */}
      <div>
        <label className="flbl freq">Subject name</label>
        <input
          placeholder="e.g. Combined Mathematics"
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          autoFocus
        />
      </div>

      {/* Icon picker */}
      <div>
        <label className="flbl">Icon</label>
        <div className="emoji-wrap">
          {EMOJIS.map(em => (
            <button
              key={em}
              type="button"
              className={`emoji-btn${form.icon === em ? " sel" : ""}`}
              onClick={() => setForm(f => ({ ...f, icon: em }))}
            >
              {em}
            </button>
          ))}
        </div>
      </div>

      {/* Colour */}
      <div>
        <label className="flbl">Colour theme</label>
        <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
          {BG_OPTS.map(o => (
            <button
              key={o.label}
              type="button"
              onClick={() => setForm(f => ({ ...f, bg: o.bg, fg: o.fg }))}
              style={{
                width: 28, height: 28, borderRadius: 8, background: o.bg,
                border: `2.5px solid ${form.bg === o.bg ? o.fg : "transparent"}`,
                cursor: "pointer", transition: "all 120ms",
              }}
              title={o.label}
            />
          ))}
        </div>
      </div>

      {/* Teacher */}
      <div>
        <label className="flbl">Assigned teacher</label>
        <select value={form.teacher} onChange={e => setForm(f => ({ ...f, teacher: e.target.value }))}>
          <option value="">— Select teacher —</option>
          {TEACHERS_LIST.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Preview */}
      <div style={{ background: "var(--cr)", borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 9, background: form.bg,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
        }}>
          {form.icon}
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{form.name || "Subject name"}</div>
          <div style={{ fontSize: 11, color: "var(--ink3)" }}>{form.teacher || "No teacher assigned"}</div>
        </div>
      </div>
    </div>
  );

  return (
    <PageShell>
      <Topbar
        title="Subjects"
        subtitle="Define what you teach"
        right={<button className="btn btn-p btn-sm" onClick={openAdd}>+ Add subject</button>}
      />
      <div className="pb fi">
        <div className="g3">
          {subjects.map(s => (
            <div key={s.id} className="card" style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 9, background: s.bg,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0,
              }}>
                {s.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{s.name}</div>
                <div style={{ fontSize: 11, color: "var(--ink3)", marginTop: 2 }}>
                  {s.batches} batch{s.batches !== 1 ? "es" : ""} · Teacher: {s.teacher || "—"}
                </div>
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                <button className="btn btn-xs btn-s" onClick={() => openEdit(s)}>Edit</button>
                <button className="btn btn-xs btn-d" onClick={() => remove(s.id)}>✕</button>
              </div>
            </div>
          ))}

          {/* Add card */}
          <div
            className="card"
            onClick={openAdd}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              borderStyle: "dashed", cursor: "pointer", color: "var(--ink3)", gap: 6,
              fontSize: 12.5, minHeight: 78, transition: "all 140ms",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M8 3v10M3 8h10"/>
            </svg>
            Add subject
          </div>
        </div>
      </div>

      {/* Add / Edit modal */}
      <Modal
        open={modal !== null}
        onClose={close}
        title={modal === "add" ? "Add subject" : `Edit — ${editTarget?.name}`}
        footer={
          <>
            <button className="btn btn-s btn-sm" onClick={close}>Cancel</button>
            <button className="btn btn-p btn-sm" onClick={save} disabled={!form.name.trim()}>
              {modal === "add" ? "Create subject" : "Save changes"}
            </button>
          </>
        }
      >
        {modalBody}
      </Modal>
    </PageShell>
  );
}
