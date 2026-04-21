"use client";
import { useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { PageShell } from "@/components/layout/PageShell";
import { Modal } from "@/components/ui/Modal";
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

const BATCHES_LIST = BATCHES.map(b => b.name);

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
  const [modal, setModal]       = useState<"enroll" | "attend" | null>(null);
  const [viewTarget, setViewTarget] = useState<Student | null>(null);
  const [form, setForm]         = useState(blankEnroll("g7a"));
  const [nextId, setNextId]     = useState(ALL_STUDENTS.length + 1);
  const router = useRouter();
  // attendance quick-mark per student today
  const [todayAtt, setTodayAtt] = useState<Record<number, "present" | "absent">>({});

  const batch     = BATCHES.find(b => b.id === selBatch)!;
  const batchStudents = students.filter(s => s.batch === selBatch);
  const filtered  = batchStudents.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.mobile.includes(search) || s.guardian.toLowerCase().includes(search.toLowerCase())
  );

  /* batch KPIs */
  const paid      = batchStudents.filter(s => s.fee === "paid" || s.isFree).length;
  const due       = batchStudents.filter(s => s.fee !== "paid" && !s.isFree).length;
  const avgAtt    = batchStudents.length ? Math.round(batchStudents.reduce((a, s) => a + s.attPct, 0) / batchStudents.length) : 0;
  const markedToday = Object.keys(todayAtt).filter(id => batchStudents.some(s => s.id === Number(id))).length;

  const changeBatch = (id: BatchId) => { setSelBatch(id); setSearch(""); };
  const openEnroll  = () => { setForm(blankEnroll(selBatch)); setModal("enroll"); };
  const openView    = (s: Student) => router.push(`/students/${s.id}`);
  const openAttend  = (s: Student) => { setViewTarget(s); setModal("attend"); };
  const close       = () => { setModal(null); setViewTarget(null); };

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

  return (
    <PageShell>
      <Topbar
        title="Students"
        subtitle="Manage by batch"
        right={
          <>
            <input
              placeholder="Search name / mobile…"
              style={{ width: 200 }}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <button className="btn btn-p btn-sm" onClick={openEnroll}>+ Enroll student</button>
          </>
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
            { label: "Fee due", val: due, sub: `LKR ${(due * batchStudents[0]?.feeAmount || 0).toLocaleString()}`, color: "#c07b1a", colorL: "#fef3d7" },
            { label: "Avg attendance", val: `${avgAtt}%`, sub: `${markedToday}/${batchStudents.length} marked today`, color: "#2a5fa8", colorL: "#d8e6fa" },
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

        {/* Student table */}
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>Guardian & mobile</th>
                <th>Fee — {new Date().toLocaleString("en",{month:"short",year:"numeric"})}</th>
                <th>Attendance</th>
                <th>Today</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => {
                const att = todayAtt[s.id];
                return (
                  <tr key={s.id}>
                    {/* Name */}
                    <td>
                      <div className="td-nm">
                        <div className="ava" style={{ background: s.bg, color: s.fg }}>{s.initials}</div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 12.5 }}>{s.name}</div>
                          <div style={{ fontSize: 10.5, color: "var(--ink3)" }}>Joined {s.joinDate}</div>
                        </div>
                      </div>
                    </td>

                    {/* Guardian */}
                    <td>
                      <div style={{ fontSize: 12.5, color: "var(--ink2)" }}>{s.guardian}</div>
                      <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--ink3)" }}>{s.mobile}</div>
                    </td>

                    {/* Fee */}
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          {s.isFree 
                            ? <span style={{ background:"#ede8fc",color:"#6b3ea8",fontSize:10.5,fontWeight:600,padding:"2px 8px",borderRadius:99 }}>Free Scholar (Permanent)</span>
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
                              onClick={() => markPaid(s.id)}
                            >
                              Mark paid
                            </button>
                            <button
                              className="btn btn-xs btn-s"
                              style={{ fontSize: 10 }}
                              onClick={() => sendReminder(s)}
                            >
                              Remind
                            </button>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Attendance history */}
                    <td>
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
                    </td>

                    {/* Today's quick attendance toggle */}
                    <td>
                      {att ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          <span style={{
                            fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 7,
                            background: att === "present" ? "#d4ede3" : "#fceaea",
                            color: att === "present" ? "#1a5040" : "#b83030",
                            border: `1px solid ${att === "present" ? "#b8ddd0" : "#f5c5c5"}`,
                          }}>
                            {att === "present" ? "✓ In" : "✕ Out"}
                          </span>
                          <button
                            style={{ background:"none",border:"none",cursor:"pointer",color:"var(--ink3)",fontSize:12 }}
                            onClick={() => setTodayAtt(prev => { const n={...prev}; delete n[s.id]; return n; })}
                          >↩</button>
                        </div>
                      ) : (
                        <div style={{ display: "flex", gap: 4 }}>
                          <button
                            onClick={() => setTodayAtt(prev => ({ ...prev, [s.id]: "present" }))}
                            style={{
                              padding: "3px 8px", borderRadius: 7, border: "1.5px solid #b8ddd0",
                              background: "transparent", color: "#1a5040", fontSize: 11, fontWeight: 700,
                              cursor: "pointer", transition: "all 120ms",
                            }}
                          >✓ In</button>
                          <button
                            onClick={() => setTodayAtt(prev => ({ ...prev, [s.id]: "absent" }))}
                            style={{
                              padding: "3px 8px", borderRadius: 7, border: "1.5px solid #f5c5c5",
                              background: "transparent", color: "#b83030", fontSize: 11, fontWeight: 700,
                              cursor: "pointer", transition: "all 120ms",
                            }}
                          >✕ Out</button>
                        </div>
                      )}
                    </td>

                    {/* Actions */}
                    <td>
                      <button className="btn btn-xs btn-s" onClick={() => openView(s)}>View profile</button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", color: "var(--ink3)", padding: "28px 0" }}>
                    {search ? `No students match "${search}"` : "No students in this batch yet"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Attendance save banner */}
        {markedToday > 0 && (
          <div style={{
            position: "fixed", bottom: 24, right: 24,
            background: "#1a5040", color: "#fff",
            borderRadius: 12, padding: "12px 18px",
            fontSize: 12.5, fontWeight: 600,
            display: "flex", alignItems: "center", gap: 12,
            boxShadow: "0 8px 24px rgba(28,25,23,.2)",
            zIndex: 50,
          }}>
            <span>{markedToday}/{batchStudents.length} marked for today</span>
            <button
              style={{
                background: "#fff", color: "#1a5040",
                border: "none", borderRadius: 8, padding: "4px 12px",
                fontSize: 12, fontWeight: 700, cursor: "pointer",
              }}
              onClick={() => alert("Attendance saved. Absent alerts will fire at 6:00 PM.")}
            >
              Save &amp; alert
            </button>
          </div>
        )}
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
