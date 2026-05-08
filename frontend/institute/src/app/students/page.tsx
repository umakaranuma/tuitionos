"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Topbar } from "@/components/layout/Topbar";
import { PageShell } from "@/components/layout/PageShell";
import { Modal } from "@/components/ui/Modal";
import { api } from "@/lib/api";

type Student = { id: number; name: string; initials: string; parent_name: string; parent_mobile: string; has_whatsapp: boolean; grade: string; is_free: boolean; is_active: boolean; join_date: string };

const P: [string,string][] = [["var(--tc-l)","var(--tc-d)"],["var(--sp-l)","var(--sp)"],["var(--sf-l)","var(--sf)"],["var(--jd-l)","var(--jd)"],["var(--rb-l)","var(--rb)"]];

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<"add" | null>(null);
  const [form, setForm] = useState({ name: "", parent_name: "", parent_mobile: "", grade: "", has_whatsapp: true });

  const load = () => {
    api.get("/api/students/students").then(r => {
      const d = r.data; setStudents(Array.isArray(d) ? d : d.results || []); setLoading(false);
    }).catch(() => setLoading(false));
  };
  useEffect(load, []);

  const filtered = students.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.grade.toLowerCase().includes(search.toLowerCase()));

  const save = async () => {
    if (!form.name.trim()) return;
    await api.post("/api/students/students", form);
    setModal(null); load();
  };

  return (
    <PageShell>
      <Topbar title="Students" subtitle={`${students.length} students`}
        right={<>
          <input placeholder="Search..." style={{ width: 180 }} value={search} onChange={e => setSearch(e.target.value)} />
          <button className="btn btn-p btn-sm" onClick={() => { setForm({ name: "", parent_name: "", parent_mobile: "", grade: "", has_whatsapp: true }); setModal("add"); }}>+ Add student</button>
        </>} />
      <div className="pb fi">
        {loading ? <div style={{ textAlign: "center", padding: 40, color: "var(--ink3)" }}>Loading...</div> : (
          <div className="tw">
            <table>
              <thead><tr><th>Student</th><th>Grade</th><th>Parent</th><th>Mobile</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {filtered.map((s, idx) => {
                  const [bg, fg] = P[idx % P.length];
                  return (
                    <tr key={s.id}>
                      <td><div className="td-nm"><div className="ava" style={{ background: bg, color: fg }}>{s.initials}</div>{s.name}</div></td>
                      <td style={{ color: "var(--ink3)" }}>{s.grade}</td>
                      <td>{s.parent_name || "—"}</td>
                      <td className="mono">{s.parent_mobile}{s.has_whatsapp && " (WA)"}</td>
                      <td>{s.is_free ? <span className="bdg b-trial">Free</span> : s.is_active ? <span className="bdg b-paid">Active</span> : <span className="bdg b-over">Inactive</span>}</td>
                      <td><Link href={`/students/${s.id}`}><button className="btn btn-xs btn-s">View</button></Link></td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && <tr><td colSpan={6} style={{ textAlign: "center", color: "var(--ink3)", padding: 24 }}>No students found</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={modal !== null} onClose={() => setModal(null)} title="Add student"
        footer={<><button className="btn btn-s btn-sm" onClick={() => setModal(null)}>Cancel</button><button className="btn btn-p btn-sm" onClick={save}>Create</button></>}>
        <div className="form-gap">
          <div><label className="flbl freq">Student name</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoFocus /></div>
          <div className="field-row">
            <div className="fg"><label className="flbl">Parent name</label><input value={form.parent_name} onChange={e => setForm(f => ({ ...f, parent_name: e.target.value }))} /></div>
            <div className="fg"><label className="flbl">Parent mobile</label><input value={form.parent_mobile} onChange={e => setForm(f => ({ ...f, parent_mobile: e.target.value }))} /></div>
          </div>
          <div><label className="flbl">Grade</label><input value={form.grade} onChange={e => setForm(f => ({ ...f, grade: e.target.value }))} placeholder="e.g. Grade 7" /></div>
        </div>
      </Modal>
    </PageShell>
  );
}
