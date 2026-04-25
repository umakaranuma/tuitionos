"use client";
import { useState, useMemo } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { PageShell } from "@/components/layout/PageShell";
import { Modal } from "@/components/ui/Modal";
import { DataTable, Column } from "@/components/ui/DataTable";
import { BatchTabs } from "@/components/ui/BatchTabs";
import { BATCHES, ALL_STUDENTS, Student, BatchId } from "@/lib/batchData";
import { useRouter } from "next/navigation";

/* ─── helpers ── */
function attColor(v: number) {
  if (v >= 90) return "#1a5040";
  if (v >= 75) return "#c07b1a";
  return "#b83030";
}
function attBg(v: number) {
  if (v >= 90) return "#d4ede3";
  if (v >= 75) return "#fef3d7";
  return "#fceaea";
}

function makeInitials(n: string) {
  return n.split(" ").filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join("");
}

function blankEnroll(batchId: BatchId) {
  const batch = BATCHES.find(b => b.id === batchId)!;
  return { name: "", guardian: "", mobile: "", batch: batch.name, joinDate: new Date().toISOString().slice(0, 10), isFree: false };
}

export default function StudentsPage() {
  const [selBatch, setSelBatch] = useState<BatchId>("g7a");
  const [students, setStudents] = useState<Student[]>(ALL_STUDENTS);
  const [search, setSearch]     = useState("");
  const [modal, setModal]       = useState<"enroll" | null>(null);
  const [form, setForm]         = useState(blankEnroll("g7a"));
  const [nextId, setNextId]     = useState(ALL_STUDENTS.length + 1);
  const router = useRouter();

  const batch     = BATCHES.find(b => b.id === selBatch)!;
  const batchStudents = students.filter(s => s.batch === selBatch);
  const filtered  = useMemo(() => batchStudents.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.mobile.includes(search) || s.guardian.toLowerCase().includes(search.toLowerCase())
  ), [batchStudents, search]);

  /* batch KPIs */
  const paid      = batchStudents.filter(s => s.fee === "paid" || s.isFree).length;
  const due       = batchStudents.filter(s => s.fee !== "paid" && !s.isFree).length;
  const avgAtt    = batchStudents.length ? Math.round(batchStudents.reduce((a, s) => a + s.attPct, 0) / batchStudents.length) : 0;

  const changeBatch = (id: BatchId) => { setSelBatch(id); setSearch(""); };
  const openEnroll  = () => { setForm(blankEnroll(selBatch)); setModal("enroll"); };
  const close       = () => setModal(null);

  const markPaid = (id: number) =>
    setStudents(prev => prev.map(s => s.id === id ? { ...s, fee: "paid" } : s));

  const sendReminder = (s: Student) => {
    alert(`Fee reminder sent to ${s.guardian} at ${s.mobile}`);
  };

  const enroll = () => {
    if (!form.name.trim()) return;
    const P: [string, string][] = [["#d4ede3","#1a5040"],["#d8e6fa","#2a5fa8"],["#fceaea","#b83030"],["#fef3d7","#6b3e20"],["#ede8fc","#6b3ea8"]];
    const [bg, fg] = P[nextId % P.length];
    setStudents(prev => {
      const newStudent = {
        id: nextId, batch: selBatch, name: form.name, initials: makeInitials(form.name),
        guardian: form.guardian, mobile: form.mobile, fee: "due" as const, feeAmount: batch.id === "g11" ? 7000 : batch.id === "g10" ? 5500 : 3000,
        feeMonth: "April 2026", attPct: 100, joinDate: form.joinDate, bg, fg, isFree: form.isFree
      };
      ALL_STUDENTS.push(newStudent);
      return [...prev, newStudent];
    });
    setNextId(n => n + 1);
    close();
  };

  /* ── Column definitions ── */
  const columns: Column<Student>[] = [
    {
      key: "student",
      header: "Student",
      width: 200,
      render: (s) => (
        <div className="td-nm">
          <div className="ava" style={{ background: s.bg, color: s.fg }}>{s.initials}</div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 12.5 }}>{s.name}</div>
            <div style={{ fontSize: 10.5, color: "var(--ink3)" }}>Joined {s.joinDate}</div>
          </div>
        </div>
      ),
    },
    {
      key: "guardian",
      header: "Guardian & mobile",
      render: (s) => (
        <div>
          <div style={{ fontSize: 12.5, color: "var(--ink2)" }}>{s.guardian}</div>
          <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--ink3)" }}>{s.mobile}</div>
        </div>
      ),
    },
    {
      key: "fee",
      header: `Fee — ${new Date().toLocaleString("en",{month:"short",year:"numeric"})}`,
      render: (s) => (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {s.isFree 
              ? <span style={{ background:"#ede8fc",color:"#6b3ea8",fontSize:10.5,fontWeight:600,padding:"2px 8px",borderRadius:99 }}>Free Scholar</span>
              : s.fee === "paid"
                ? <span className="bdg b-paid">Paid</span>
                : s.fee === "overdue"
                  ? <span style={{ background:"#fceaea",color:"#b83030",fontSize:10.5,fontWeight:600,padding:"2px 8px",borderRadius:99 }}>Overdue</span>
                  : <span className="bdg b-due">Due</span>
            }
            {!s.isFree && (
              <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--ink3)" }}>
                LKR {s.feeAmount.toLocaleString()}
              </span>
            )}
          </div>
          {s.fee !== "paid" && !s.isFree && (
            <div style={{ display: "flex", gap: 4 }}>
              <button
                className="btn btn-xs btn-ok"
                style={{ fontSize: 10 }}
                onClick={(e) => { e.stopPropagation(); markPaid(s.id); }}
              >
                Mark paid
              </button>
              <button
                className="btn btn-xs btn-s"
                style={{ fontSize: 10 }}
                onClick={(e) => { e.stopPropagation(); sendReminder(s); }}
              >
                Remind
              </button>
            </div>
          )}
        </div>
      ),
    },
    {
      key: "attendance",
      header: "Attendance",
      width: 130,
      render: (s) => (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{
            height: 5, width: 60, borderRadius: 99,
            background: `linear-gradient(to right, ${attColor(s.attPct)} ${s.attPct}%, var(--ln) ${s.attPct}%)`,
          }} />
          <span style={{
            fontSize: 11.5, fontWeight: 700, fontFamily: "var(--font-mono)",
            color: attColor(s.attPct),
            background: attBg(s.attPct), padding: "1px 6px", borderRadius: 6,
          }}>
            {s.attPct}%
          </span>
        </div>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      width: 100,
      render: (s) => (
        <button
          className="btn btn-xs btn-s"
          onClick={(e) => { e.stopPropagation(); router.push(`/students/${s.id}`); }}
        >
          View profile
        </button>
      ),
    },
  ];

  return (
    <PageShell>
      <Topbar
        title="Students"
        subtitle="Manage enrolment by batch"
        right={
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ position: "relative" }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="var(--ink3)" strokeWidth="1.5"
                style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }}>
                <circle cx="6" cy="6" r="4.5"/><path d="M9.5 9.5L13 13"/>
              </svg>
              <input
                placeholder="Search name, mobile, guardian…"
                style={{ width: 240, paddingLeft: 30 }}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <button className="btn btn-p btn-sm" onClick={openEnroll}>+ Enroll student</button>
          </div>
        }
      />
      <div className="pb fi">
        <BatchTabs active={selBatch} onChange={changeBatch} />

        {/* Batch KPI bar */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 18,
        }}>
          {[
            { label: "Students", val: batchStudents.length, sub: `in ${batch.label}`, color: batch.color, colorL: batch.colorL },
            { label: "Fee paid", val: paid, sub: `${Math.round(paid/Math.max(batchStudents.length,1)*100)}% collected`, color: "#1a5040", colorL: "#d4ede3" },
            { label: "Fee due", val: due, sub: `LKR ${(due * (batchStudents[0]?.feeAmount || 0)).toLocaleString()}`, color: "#c07b1a", colorL: "#fef3d7" },
            { label: "Avg attendance", val: `${avgAtt}%`, sub: `${batchStudents.length} enrolled`, color: "#2a5fa8", colorL: "#d8e6fa" },
          ].map(kpi => (
            <div key={kpi.label} style={{
              background: "#fff", border: `1.5px solid ${kpi.color}22`,
              borderTop: `4px solid ${kpi.color}`,
              borderRadius: 12, padding: "12px 14px",
              boxShadow: "0 1px 3px rgba(28,25,23,.06)",
            }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4 }}>{kpi.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: kpi.color, fontFamily: "var(--font-mono)", lineHeight: 1 }}>{kpi.val}</div>
              <div style={{ fontSize: 10.5, color: "var(--ink3)", marginTop: 4 }}>{kpi.sub}</div>
            </div>
          ))}
        </div>

        {/* Student table with pagination */}
        <DataTable<Student>
          columns={columns}
          data={filtered}
          rowKey={s => s.id}
          defaultPerPage={10}
          onRowClick={s => router.push(`/students/${s.id}`)}
          rowBg={s => s.fee === "overdue" ? "#fffbeb" : undefined}
          emptyMessage={search ? `No students match "${search}"` : "No students in this batch yet"}
          title={`${batch.name} · ${filtered.length} student${filtered.length !== 1 ? "s" : ""}`}
        />
      </div>

      {/* Enroll modal */}
      <Modal
        open={modal === "enroll"}
        onClose={close}
        title={`Enroll into ${batch.name}`}
        footer={
          <>
            <button className="btn btn-s btn-sm" onClick={close}>Cancel</button>
            <button className="btn btn-p btn-sm" onClick={enroll} disabled={!form.name.trim()}>Enroll student</button>
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
              <label className="flbl req">Guardian name</label>
              <input placeholder="Parent / guardian" value={form.guardian}
                onChange={e => setForm(f => ({ ...f, guardian: e.target.value }))} />
            </div>
            <div>
              <label className="flbl req">Guardian mobile</label>
              <input placeholder="+94 77 000 0000" value={form.mobile}
                onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))} />
              <div className="fhint">For fee reminders &amp; absent alerts</div>
            </div>
          </div>
          <div className="field-row">
            <div>
              <label className="flbl">Batch</label>
              <input value={batch.name} disabled style={{ background: "#f5f5f3", cursor: "not-allowed" }} />
            </div>
            <div>
              <label className="flbl">Join date</label>
              <input type="date" value={form.joinDate}
                onChange={e => setForm(f => ({ ...f, joinDate: e.target.value }))} />
            </div>
          </div>
          <div style={{ padding: "12px 14px", marginTop: 4, background: form.isFree ? "#f6f3fc" : "#fff", border: form.isFree ? "1px solid #d9ccf5" : "1px solid var(--ln)", borderRadius: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: form.isFree ? "#6b3ea8" : "var(--ink)" }}>Free Scholar (Permanent)</div>
              <div style={{ fontSize: 10.5, color: "var(--ink3)", marginTop: 2 }}>Permanently exempt this student from all future monthly fee billing cycles.</div>
            </div>
            <button className={`toggle ${form.isFree ? "on" : ""}`} onClick={() => setForm(f => ({ ...f, isFree: !f.isFree }))} />
          </div>
        </div>
      </Modal>
    </PageShell>
  );
}
