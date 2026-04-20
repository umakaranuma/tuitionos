"use client";
import { useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { PageShell } from "@/components/layout/PageShell";
import { Modal } from "@/components/ui/Modal";

const SUBJECTS_LIST = ["Mathematics", "Physics", "Chemistry", "English", "Tamil Literature", "Biology", "Combined Maths"];

type Teacher = {
  id: number; initials: string; name: string; subject: string;
  mobile: string; email: string; batches: number;
  bg: string; fg: string;
};

const PALETTE: [string, string][] = [
  ["var(--tc-l)", "var(--tc-d)"], ["var(--sp-l)", "var(--sp)"],
  ["var(--rb-l)", "var(--rb)"],   ["var(--sf-l)", "var(--sf)"],
  ["var(--pr-l)", "var(--pr)"],
];

const INIT_TEACHERS: Teacher[] = [
  { id: 1, initials: "RN", name: "Mr. Rajan Nair",  subject: "Mathematics",     mobile: "+94 77 234 5678", email: "rajan@stpatricks.lk",  batches: 3, bg: "var(--sp-l)", fg: "var(--sp)"   },
  { id: 2, initials: "GS", name: "Ms. Geetha S.",   subject: "Physics",         mobile: "+94 77 345 6789", email: "geetha@stpatricks.lk", batches: 2, bg: "var(--tc-l)", fg: "var(--tc-d)" },
  { id: 3, initials: "AK", name: "Mr. Arjun K.",    subject: "Chemistry",       mobile: "+94 77 456 7890", email: "arjun@stpatricks.lk",  batches: 2, bg: "var(--rb-l)", fg: "var(--rb)"   },
  { id: 4, initials: "RM", name: "Ms. Ramya M.",    subject: "English",         mobile: "+94 77 567 8901", email: "ramya@stpatricks.lk",  batches: 4, bg: "var(--sf-l)", fg: "var(--sf)"   },
  { id: 5, initials: "VF", name: "Ms. Valli F.",    subject: "Tamil Literature", mobile: "+94 77 678 9012", email: "valli@stpatricks.lk",  batches: 3, bg: "var(--pr-l)", fg: "var(--pr)"   },
  { id: 6, initials: "AN", name: "Ms. Anitha N.",   subject: "Biology",         mobile: "+94 77 789 0123", email: "anitha@stpatricks.lk", batches: 1, bg: "var(--tc-l)", fg: "var(--tc-d)" },
];

function blankForm() {
  return { name: "", subject: "", mobile: "", email: "" };
}

function makeInitials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join("");
}

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>(INIT_TEACHERS);
  const [modal, setModal]       = useState<"add" | "edit" | null>(null);
  const [editTarget, setEditTarget] = useState<Teacher | null>(null);
  const [form, setForm]         = useState(blankForm());
  const [nextId, setNextId]     = useState(INIT_TEACHERS.length + 1);

  const openAdd = () => { setForm(blankForm()); setEditTarget(null); setModal("add"); };
  const openEdit = (t: Teacher) => {
    setForm({ name: t.name, subject: t.subject, mobile: t.mobile, email: t.email });
    setEditTarget(t);
    setModal("edit");
  };
  const close = () => setModal(null);

  const save = () => {
    if (!form.name.trim() || !form.subject) return;
    if (modal === "add") {
      const [bg, fg] = PALETTE[nextId % PALETTE.length];
      setTeachers(prev => [...prev, {
        id: nextId, name: form.name, subject: form.subject,
        mobile: form.mobile, email: form.email, batches: 0,
        initials: makeInitials(form.name), bg, fg,
      }]);
      setNextId(n => n + 1);
    } else if (editTarget) {
      setTeachers(prev => prev.map(t =>
        t.id === editTarget.id
          ? { ...t, name: form.name, subject: form.subject, mobile: form.mobile, email: form.email, initials: makeInitials(form.name) }
          : t
      ));
    }
    close();
  };

  const modalBody = (
    <div className="form-gap">
      <div className="field-row">
        <div>
          <label className="flbl freq">Full name</label>
          <input placeholder="e.g. Mr. Suresh Kumar" value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoFocus />
        </div>
        <div>
          <label className="flbl freq">Subject</label>
          <select value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}>
            <option value="">— Select —</option>
            {SUBJECTS_LIST.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div className="field-row">
        <div>
          <label className="flbl freq">Mobile number</label>
          <input placeholder="+94 77 000 0000" value={form.mobile}
            onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))} />
        </div>
        <div>
          <label className="flbl">Email (optional)</label>
          <input type="email" placeholder="teacher@institute.lk" value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
        </div>
      </div>
      {/* Preview avatar */}
      {form.name && (
        <div style={{ background: "var(--cr)", borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: "50%", background: "var(--tc-l)", color: "var(--tc-d)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700,
          }}>
            {makeInitials(form.name)}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{form.name}</div>
            <div style={{ fontSize: 11, color: "var(--ink3)" }}>{form.subject || "Subject not selected"}</div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <PageShell>
      <Topbar
        title="Teachers"
        subtitle="Staff directory"
        right={<button className="btn btn-p btn-sm" onClick={openAdd}>+ Add teacher</button>}
      />
      <div className="pb fi">
        <div className="tw">
          <table>
            <thead>
              <tr><th>Teacher</th><th>Subject</th><th>Mobile</th><th>Email</th><th>Batches</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {teachers.map(t => (
                <tr key={t.id}>
                  <td>
                    <div className="td-nm">
                      <div className="ava" style={{ background: t.bg, color: t.fg }}>{t.initials}</div>
                      {t.name}
                    </div>
                  </td>
                  <td>{t.subject}</td>
                  <td className="mono">{t.mobile}</td>
                  <td style={{ color: "var(--ink3)", fontSize: 12 }}>{t.email || "—"}</td>
                  <td className="mono">{t.batches}</td>
                  <td>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button className="btn btn-xs btn-s" onClick={() => openEdit(t)}>Edit</button>
                      <button className="btn btn-xs btn-d"
                        onClick={() => setTeachers(prev => prev.filter(x => x.id !== t.id))}>
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={modal !== null}
        onClose={close}
        title={modal === "add" ? "Add teacher" : `Edit — ${editTarget?.name}`}
        footer={
          <>
            <button className="btn btn-s btn-sm" onClick={close}>Cancel</button>
            <button className="btn btn-p btn-sm" onClick={save} disabled={!form.name.trim() || !form.subject}>
              {modal === "add" ? "Add teacher" : "Save changes"}
            </button>
          </>
        }
      >
        {modalBody}
      </Modal>
    </PageShell>
  );
}
