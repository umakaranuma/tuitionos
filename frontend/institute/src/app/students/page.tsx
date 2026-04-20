"use client";
import { useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { PageShell } from "@/components/layout/PageShell";
import { Modal } from "@/components/ui/Modal";

const BATCHES_LIST = ["Grade 7 — Batch A", "Grade 8 — Batch B", "Grade 9 — Batch A", "Grade 10 — O/L Batch", "Grade 11 — A/L Science"];
const PALETTE: [string, string][] = [
  ["var(--tc-l)","var(--tc-d)"],["var(--sp-l)","var(--sp)"],["var(--rb-l)","var(--rb)"],
  ["var(--sf-l)","var(--sf)"],["var(--pr-l)","var(--pr)"],
];

type Student = { id: number; initials: string; name: string; batch: string; grade: string; mobile: string; fee: "paid"|"due"; att: string; attOk: boolean; bg: string; fg: string; guardian: string; joinDate: string; };

const INIT: Student[] = [
  { id:1, initials:"AK", name:"Aarav Kumar",  batch:"Grade 10 O/L", grade:"10", mobile:"+94 77 123 4567", fee:"paid", att:"94%", attOk:true,  guardian:"Raj Kumar",  joinDate:"2024-01-08", bg:"var(--tc-l)", fg:"var(--tc-d)" },
  { id:2, initials:"PS", name:"Priya Selvan", batch:"Grade 10 O/L", grade:"10", mobile:"+94 77 234 5678", fee:"due",  att:"81%", attOk:false, guardian:"Selvan M.",  joinDate:"2024-01-15", bg:"var(--sp-l)", fg:"var(--sp)"   },
  { id:3, initials:"DR", name:"Dinesh Raj",   batch:"Grade 11 A/L", grade:"11", mobile:"+94 77 345 6789", fee:"paid", att:"97%", attOk:true,  guardian:"Raj D.",     joinDate:"2023-09-01", bg:"var(--rb-l)", fg:"var(--rb)"   },
  { id:4, initials:"KM", name:"Kavitha M.",   batch:"Grade 7 A",    grade:"7",  mobile:"+94 77 456 7890", fee:"paid", att:"99%", attOk:true,  guardian:"Meena S.",   joinDate:"2025-01-06", bg:"var(--sf-l)", fg:"var(--sf)"   },
  { id:5, initials:"ST", name:"Surya T.",     batch:"Grade 10 O/L", grade:"10", mobile:"+94 77 567 8901", fee:"due",  att:"72%", attOk:false, guardian:"Thilaga R.", joinDate:"2024-01-10", bg:"var(--pr-l)", fg:"var(--pr)"   },
  { id:6, initials:"NV", name:"Nithya V.",    batch:"Grade 7 A",    grade:"7",  mobile:"+94 77 678 9012", fee:"paid", att:"96%", attOk:true,  guardian:"Valli P.",   joinDate:"2025-01-06", bg:"var(--tc-l)", fg:"var(--tc-d)" },
  { id:7, initials:"RP", name:"Rajan P.",     batch:"Grade 11 A/L", grade:"11", mobile:"+94 77 789 0123", fee:"paid", att:"88%", attOk:true,  guardian:"Priya R.",   joinDate:"2023-09-01", bg:"var(--sp-l)", fg:"var(--sp)"   },
  { id:8, initials:"MJ", name:"Meena J.",     batch:"Grade 10 O/L", grade:"10", mobile:"+94 77 890 1234", fee:"paid", att:"78%", attOk:false, guardian:"Jaya M.",    joinDate:"2024-01-08", bg:"var(--sf-l)", fg:"var(--sf)"   },
];

const GRADE_FILTERS = [
  { key:"all", label:"All" },
  { key:"7",   label:"Grade 7" },
  { key:"10",  label:"Grade 10" },
  { key:"11",  label:"Grade 11" },
];

function blankForm() {
  return { name:"", guardian:"", mobile:"", batch:"", joinDate: new Date().toISOString().slice(0,10) };
}
function makeInitials(n:string){ return n.split(" ").filter(Boolean).slice(0,2).map(w=>w[0].toUpperCase()).join(""); }

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>(INIT);
  const [filter, setFilter]     = useState("all");
  const [search, setSearch]     = useState("");
  const [modal, setModal]       = useState<"add" | "view" | null>(null);
  const [viewTarget, setViewTarget] = useState<Student | null>(null);
  const [form, setForm]         = useState(blankForm());
  const [nextId, setNextId]     = useState(INIT.length + 1);

  const openAdd  = () => { setForm(blankForm()); setModal("add"); };
  const openView = (s: Student) => { setViewTarget(s); setModal("view"); };
  const close    = () => setModal(null);

  const enroll = () => {
    if (!form.name.trim() || !form.batch) return;
    const [bg, fg] = PALETTE[nextId % PALETTE.length];
    const gradeMatch = form.batch.match(/Grade (\d+)/);
    setStudents(prev => [...prev, {
      id: nextId, name: form.name, initials: makeInitials(form.name),
      batch: form.batch, grade: gradeMatch?.[1] ?? "—",
      mobile: form.mobile, fee: "due", att: "—", attOk: true,
      guardian: form.guardian, joinDate: form.joinDate, bg, fg,
    }]);
    setNextId(n => n + 1);
    close();
  };

  const markPaid = (id: number) => setStudents(prev => prev.map(s => s.id === id ? { ...s, fee: "paid" } : s));

  const filtered = students.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.mobile.includes(search);
    if (!matchSearch) return false;
    return filter === "all" || s.grade === filter;
  });

  return (
    <PageShell>
      <Topbar
        title="Students"
        subtitle={`${students.length} enrolled`}
        right={
          <>
            <input placeholder="Search students…" style={{ width:180 }} value={search} onChange={e => setSearch(e.target.value)} />
            <button className="btn btn-p btn-sm" onClick={openAdd}>+ Enroll student</button>
          </>
        }
      />
      <div className="pb fi">
        <div style={{ display:"flex", gap:6, marginBottom:14 }}>
          {GRADE_FILTERS.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`btn btn-sm ${filter === f.key ? "btn-p" : "btn-s"}`}>
              {f.label} {f.key === "all" ? `(${students.length})` : `(${students.filter(s => s.grade === f.key).length})`}
            </button>
          ))}
        </div>

        <div className="tw">
          <table>
            <thead>
              <tr><th>Student</th><th>Batch</th><th>Guardian mobile</th><th>Fee status</th><th>Attendance</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.id}>
                  <td>
                    <div className="td-nm">
                      <div className="ava" style={{ background:s.bg, color:s.fg }}>{s.initials}</div>
                      {s.name}
                    </div>
                  </td>
                  <td style={{ color:"var(--ink3)" }}>{s.batch}</td>
                  <td className="mono">{s.mobile}</td>
                  <td>
                    {s.fee === "paid" ? <span className="bdg b-paid">Paid</span> : <span className="bdg b-due">Due</span>}
                  </td>
                  <td className="mono" style={{ color: s.att==="—" ? "var(--ink3)" : s.attOk ? "var(--tc)" : "var(--sf)" }}>
                    {s.att}
                  </td>
                  <td>
                    <div style={{ display:"flex", gap:4 }}>
                      {s.fee === "due" && <button className="btn btn-xs btn-ok" onClick={() => markPaid(s.id)}>Mark paid</button>}
                      <button className="btn btn-xs btn-s" onClick={() => openView(s)}>View</button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign:"center", color:"var(--ink3)", padding:"24px 0" }}>No students found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Enroll student modal */}
      <Modal
        open={modal === "add"}
        onClose={close}
        title="Enroll student"
        footer={
          <>
            <button className="btn btn-s btn-sm" onClick={close}>Cancel</button>
            <button className="btn btn-p btn-sm" onClick={enroll} disabled={!form.name.trim() || !form.batch}>
              Enroll student
            </button>
          </>
        }
      >
        <div className="form-gap">
          <div>
            <label className="flbl freq">Student full name</label>
            <input placeholder="e.g. Kavitha Suresh" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoFocus />
          </div>
          <div className="field-row">
            <div>
              <label className="flbl freq">Guardian name</label>
              <input placeholder="Parent / guardian" value={form.guardian}
                onChange={e => setForm(f => ({ ...f, guardian: e.target.value }))} />
            </div>
            <div>
              <label className="flbl freq">Guardian mobile</label>
              <input placeholder="+94 77 000 0000" value={form.mobile}
                onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))} />
              <div className="fhint">Used for fee reminders &amp; absent alerts</div>
            </div>
          </div>
          <div className="field-row">
            <div>
              <label className="flbl freq">Batch</label>
              <select value={form.batch} onChange={e => setForm(f => ({ ...f, batch: e.target.value }))}>
                <option value="">— Select batch —</option>
                {BATCHES_LIST.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="flbl">Join date</label>
              <input type="date" value={form.joinDate}
                onChange={e => setForm(f => ({ ...f, joinDate: e.target.value }))} />
            </div>
          </div>
          <div style={{
            background:"var(--tc-l)", border:"1px solid #b8ddd0", borderRadius:10,
            padding:"9px 13px", fontSize:11.5, color:"var(--tc-d)"
          }}>
            Fee reminder &amp; absent alerts will automatically be sent to the guardian&apos;s WhatsApp number.
          </div>
        </div>
      </Modal>

      {/* View student modal */}
      <Modal
        open={modal === "view"}
        onClose={close}
        title={`Student profile`}
        footer={<button className="btn btn-s btn-sm" onClick={close}>Close</button>}
      >
        {viewTarget && (
          <div className="form-gap">
            <div style={{ display:"flex", alignItems:"center", gap:14, padding:"12px 14px", background:"var(--cr)", borderRadius:12 }}>
              <div className="ava" style={{ background:viewTarget.bg, color:viewTarget.fg, width:48, height:48, fontSize:16 }}>
                {viewTarget.initials}
              </div>
              <div>
                <div style={{ fontSize:16, fontWeight:700, color:"var(--ink)" }}>{viewTarget.name}</div>
                <div style={{ fontSize:12, color:"var(--ink3)", marginTop:2 }}>{viewTarget.batch}</div>
              </div>
              {viewTarget.fee === "paid"
                ? <span className="bdg b-paid" style={{ marginLeft:"auto" }}>Paid</span>
                : <span className="bdg b-due" style={{ marginLeft:"auto" }}>Fee due</span>}
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              {[
                { label:"Guardian",    val: viewTarget.guardian || "—" },
                { label:"Mobile",      val: viewTarget.mobile },
                { label:"Attendance",  val: viewTarget.att },
                { label:"Joined",      val: viewTarget.joinDate },
              ].map(row => (
                <div key={row.label} style={{ padding:"10px 12px", background:"var(--cr-d)", borderRadius:9 }}>
                  <div style={{ fontSize:10.5, color:"var(--ink3)", fontWeight:500, marginBottom:3 }}>{row.label}</div>
                  <div style={{ fontSize:13, fontWeight:600, color:"var(--ink)", fontFamily: row.label==="Mobile" ? "var(--font-mono)" : undefined }}>
                    {row.val}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </PageShell>
  );
}
