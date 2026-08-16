"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { Topbar } from "@/components/layout/Topbar";
import { PageShell } from "@/components/layout/PageShell";
import { Modal } from "@/components/ui/Modal";
import { QRCard } from "@/components/ui/QRCard";
import { Avatar } from "@/components/ui/Avatar";
import { ImageLightbox } from "@/components/ui/ImageLightbox";
import { useToast } from "@/components/ui/ToastProvider";
import { getStoredUser } from "@/lib/auth";
import { api } from "@/lib/api";

type Student = { id: number; name: string; image?: string | null; parent_name: string; parent_mobile: string; has_whatsapp: boolean; batch: string; is_free: boolean; is_active: boolean; join_date: string; qr_token: string };
type Enrollment = { id: number; batch: number; batch_name: string; academic_year: number; status: string; enrolled_at: string };
type Fee = { id: number; batch_name: string; month: string; amount: string; status: string; paid_at: string | null };
type AttendanceRow = { id: number; date: string; is_present: boolean; batch: number; batch_name?: string; subject?: number };
type Slot = { id: number; batch: number; batch_name: string; subject_name: string; day_of_week: string; start_time: string; end_time: string; room: string };
type ExamMark = { id: number; subject: string; marks: string | null; max_marks: number };
type Exam = { id: number; name: string; year: number; batch: number; batch_name: string; start_date: string; end_date: string; status: string; max_marks: number };

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const fmt = (n: number | string) => `LKR ${Number(n || 0).toLocaleString()}`;
const fmtTime = (t: string) => {
  if (!t) return "—";
  const [h, m] = t.split(":");
  let hi = parseInt(h, 10);
  const ampm = hi >= 12 ? "PM" : "AM";
  hi = hi % 12 || 12;
  return `${hi}:${m} ${ampm}`;
};

type Tab = "overview" | "fees" | "attendance" | "exams" | "timetable";

export default function StudentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const toast = useToast();
  const id = params.id as string;

  const [student, setStudent] = useState<Student | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [fees, setFees] = useState<Fee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [examMarks, setExamMarks] = useState<Record<number, ExamMark[]>>({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("overview");
  const [showQR, setShowQR] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [markModal, setMarkModal] = useState(false);
  const [markForm, setMarkForm] = useState({ batch: "", date: new Date().toISOString().slice(0, 10), is_present: true });
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get(`/api/students/students/${id}`).then(r => r.data).catch(() => null),
      api.get(`/api/students/enrollments`).then(r => (Array.isArray(r.data) ? r.data : r.data.results || []).filter((e: Enrollment & { student?: number }) => String(e.student) === id)).catch(() => []),
      api.get(`/api/fees/`, { params: { student: id } }).then(r => Array.isArray(r.data) ? r.data : r.data.results || []).catch(() => []),
      api.get(`/api/attendance/`, { params: { student: id } }).then(r => Array.isArray(r.data) ? r.data : r.data.results || []).catch(() => []),
      api.get(`/api/timetable/`, { params: { student: id } }).then(r => Array.isArray(r.data) ? r.data : r.data.results || []).catch(() => []),
      api.get(`/api/academics/exams`).then(r => Array.isArray(r.data) ? r.data : r.data.results || []).catch(() => []),
    ]).then(([s, e, f, a, t, ex]) => {
      setStudent(s); setEnrollments(e); setFees(f); setAttendance(a); setSlots(t); setExams(ex);
      setLoading(false);
    });
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // Load this student's marks for each exam in their batches.
  useEffect(() => {
    const activeBatchIds = new Set(enrollments.filter(en => en.status === "active").map(en => en.batch));
    const myExams = exams.filter(e => activeBatchIds.has(e.batch));
    Promise.all(myExams.map(e =>
      api.get(`/api/academics/exams/${e.id}/marks`).then(r => {
        const all: (ExamMark & { student: number })[] = Array.isArray(r.data) ? r.data : [];
        return { id: e.id, mine: all.filter(m => String(m.student) === id) };
      }).catch(() => ({ id: e.id, mine: [] }))
    )).then(rows => {
      const next: Record<number, ExamMark[]> = {};
      rows.forEach(r => { next[r.id] = r.mine; });
      setExamMarks(next);
    });
  }, [enrollments, exams, id]);

  // ── Stats ────────────────────────────────────────────────────────────────
  const year = new Date().getFullYear();
  const yearFees = fees.filter(f => f.month.includes(String(year)) || (f.month && /\d{4}/.test(f.month) === false));
  const feesPaid = yearFees.filter(f => f.status === "paid").reduce((s, f) => s + Number(f.amount || 0), 0);
  const feesDue = yearFees.filter(f => f.status !== "paid").reduce((s, f) => s + Number(f.amount || 0), 0);
  const feesPendingCount = yearFees.filter(f => f.status !== "paid").length;

  const attTotal = attendance.length;
  const attPresent = attendance.filter(a => a.is_present).length;
  const attRate = attTotal ? Math.round((attPresent / attTotal) * 1000) / 10 : 0;

  // Exam average
  const myExams = exams.filter(e => enrollments.some(en => en.status === "active" && en.batch === e.batch));
  const allMarks = Object.values(examMarks).flat().filter(m => m.marks !== null && m.max_marks > 0);
  const examAvg = allMarks.length
    ? Math.round((allMarks.reduce((s, m) => s + (Number(m.marks) / m.max_marks) * 100, 0) / allMarks.length) * 10) / 10
    : null;

  const activeBatches = enrollments.filter(en => en.status === "active");

  // Slots by day
  const slotsByDay: Record<string, Slot[]> = {};
  DAYS.forEach((_, i) => { slotsByDay[String(i)] = []; });
  slots.forEach(s => { (slotsByDay[s.day_of_week] = slotsByDay[s.day_of_week] || []).push(s); });

  const toggleFee = async (feeId: number, paid: boolean) => {
    try {
      await api.post(`/api/fees/${feeId}/${paid ? "mark_unpaid" : "mark_paid"}`);
      toast.success(paid ? "Reverted to pending." : "Marked as paid.");
      load();
    } catch { toast.error("Couldn't update fee status."); }
  };

  // ── Add / edit fee for a specific month ─────────────────────────────────
  type FeeEdit = { id?: number; batch: string; month: string; amount: string; status: string };
  const [feeEdit, setFeeEdit] = useState<FeeEdit | null>(null);
  const [feeBusy, setFeeBusy] = useState(false);

  const openAddFee = () => {
    const activeEnrollment = enrollments.find(en => en.status === "active");
    setFeeEdit({
      batch: activeEnrollment ? String(activeEnrollment.batch) : "",
      month: new Date().toISOString().slice(0, 7) + "-01",
      amount: "",
      status: "pending",
    });
  };
  const openEditFee = (f: Fee) => {
    setFeeEdit({ id: f.id, batch: String((f as Fee & { batch?: number }).batch ?? ""), month: f.month, amount: String(f.amount), status: f.status });
  };
  const saveFeeEdit = async () => {
    if (!feeEdit) return;
    if (!feeEdit.batch) { toast.error("This student has no active batch enrollment."); return; }
    setFeeBusy(true);
    try {
      await api.patch("/api/fees/upsert", {
        student: Number(id),
        batch: Number(feeEdit.batch),
        month: feeEdit.month,
        amount: feeEdit.amount || undefined,
        status: feeEdit.status,
      });
      toast.success(feeEdit.id ? "Fee updated." : "Fee added.");
      setFeeEdit(null); load();
    } catch { toast.error("Couldn't save the fee."); }
    finally { setFeeBusy(false); }
  };

  const openMarkAttendance = () => {
    if (activeBatches.length === 0) { toast.error("No active batches to mark attendance against."); return; }
    setMarkForm(f => ({ ...f, batch: String(activeBatches[0].batch), date: new Date().toISOString().slice(0, 10), is_present: true }));
    setMarkModal(true);
  };

  const submitAttendance = async () => {
    if (!markForm.batch || !markForm.date) { toast.error("Pick a batch and date."); return; }
    setBusy(true);
    try {
      await api.post("/api/attendance/mark", {
        batch: Number(markForm.batch),
        date: markForm.date,
        records: [{ student: Number(id), is_present: markForm.is_present }],
      });
      toast.success(`Attendance recorded for ${markForm.date}.`);
      setMarkModal(false); load();
    } catch { toast.error("Couldn't record attendance."); }
    finally { setBusy(false); }
  };

  if (loading) return <PageShell><div style={{ padding: 60, textAlign: "center", color: "var(--ink3)" }}>Loading…</div></PageShell>;
  if (!student) return <PageShell><div style={{ padding: 60, textAlign: "center", color: "var(--ink3)" }}>Student not found</div></PageShell>;

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "overview", label: "Overview" },
    { key: "fees", label: "Fees", count: fees.length },
    { key: "attendance", label: "Attendance", count: attendance.length },
    { key: "exams", label: "Exam results", count: myExams.length },
    { key: "timetable", label: "Timetable", count: slots.length },
  ];

  return (
    <PageShell>
      <Topbar
        title={student.name}
        subtitle={student.batch}
        onBack={() => router.back()}
        backLabel="Back"
        right={
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-p btn-sm" onClick={openMarkAttendance}>+ Mark attendance</button>
            <button className="btn btn-s btn-sm" onClick={() => setShowQR(true)}>QR / ID</button>
          </div>
        }
      />

      <div className="pb fi">
        {/* Profile hero — the record's own photo, name, and identity at a
            glance, separate from the page title bar above it. Click the
            photo to view it full-size. */}
        <div className="card" style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
          <Avatar
            src={student.image} name={student.name} size={88} radius={20}
            onClick={student.image ? () => setLightboxOpen(true) : undefined}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--ink)" }}>{student.name}</div>
            <div style={{ fontSize: 13, color: "var(--ink3)", marginTop: 2 }}>{student.batch}</div>
            <div style={{ marginTop: 8 }}>
              {student.is_active ? <span className="dot-st dot-active">Active</span> : <span className="dot-st dot-paused">Inactive</span>}
            </div>
          </div>
        </div>
        <ImageLightbox src={lightboxOpen ? student.image ?? null : null} alt={student.name} onClose={() => setLightboxOpen(false)} />

        {/* KPI strip */}
        <div className="g4" style={{ marginBottom: 16 }}>
          <div className="kpi" style={{ "--kc": attRate >= 85 ? "var(--jd)" : "var(--sf)" } as React.CSSProperties}>
            <div className="kpi-lbl">Attendance</div>
            <div className="kpi-val">{attTotal ? `${attRate}%` : "—"}</div>
            <div className={`kpi-tr ${attRate >= 85 ? "up" : "nt"}`}>{attPresent}/{attTotal} marks</div>
          </div>
          <div className="kpi" style={{ "--kc": "var(--tc)" } as React.CSSProperties}>
            <div className="kpi-lbl">Fees paid ({year})</div>
            <div className="kpi-val">{fmt(feesPaid)}</div>
            <div className="kpi-tr nt">{yearFees.filter(f => f.status === "paid").length} months</div>
          </div>
          <div className="kpi" style={{ "--kc": feesDue > 0 ? "var(--rb)" : "var(--ink3)" } as React.CSSProperties}>
            <div className="kpi-lbl">Fees due</div>
            <div className="kpi-val">{fmt(feesDue)}</div>
            <div className={`kpi-tr ${feesDue > 0 ? "dn" : "nt"}`}>{feesPendingCount} unpaid</div>
          </div>
          <div className="kpi" style={{ "--kc": "var(--ac)" } as React.CSSProperties}>
            <div className="kpi-lbl">Exam average</div>
            <div className="kpi-val">{examAvg !== null ? `${examAvg}%` : "—"}</div>
            <div className="kpi-tr nt">{allMarks.length} graded paper{allMarks.length !== 1 ? "s" : ""}</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="filter-tabs" style={{ marginBottom: 16 }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} className={`filter-tab ${tab === t.key ? "on" : ""}`}>
              {t.label}
              {t.count !== undefined && <span className="filter-tab-ct">{t.count}</span>}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div className="card">
              <div className="sec-title" style={{ marginBottom: 12 }}>Profile</div>
              <div className="detail-row"><span className="detail-k">Parent</span><span className="detail-v">{student.parent_name || "—"}</span></div>
              <div className="detail-row"><span className="detail-k">Mobile</span><span className="detail-v" style={{ fontFamily: "var(--font-mono)" }}>{student.parent_mobile || "—"}</span></div>
              <div className="detail-row"><span className="detail-k">WhatsApp</span><span className="detail-v">{student.has_whatsapp ? "Yes" : "No"}</span></div>
              <div className="detail-row"><span className="detail-k">Batch</span><span className="detail-v">{student.batch}</span></div>
              <div className="detail-row"><span className="detail-k">Joined</span><span className="detail-v">{student.join_date || "—"}</span></div>
              <div className="detail-row"><span className="detail-k">Status</span>
                <span className="detail-v">
                  {student.is_free ? <span className="bdg b-trial">Free</span> :
                   student.is_active ? <span className="dot-st dot-active">Active</span> :
                   <span className="dot-st dot-paused">Inactive</span>}
                </span>
              </div>
            </div>
            <div className="card">
              <div className="sec-title" style={{ marginBottom: 12 }}>Enrollments</div>
              {enrollments.length === 0
                ? <div style={{ fontSize: 13, color: "var(--ink3)" }}>Not enrolled in any batch.</div>
                : enrollments.map(e => (
                  <div key={e.id} className="detail-row">
                    <span className="detail-k">{e.batch_name}</span>
                    <span className="detail-v" style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>
                      {e.academic_year} · {e.status === "active" ? <span className="dot-st dot-active">Active</span> : <span className="dot-st dot-paused">{e.status}</span>}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* FEES */}
        {tab === "fees" && (
          <div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
              <button className="btn btn-p btn-sm" onClick={openAddFee}>+ Add fee record</button>
            </div>
            {fees.length === 0 ? (
              <div className="card" style={{ textAlign: "center", color: "var(--ink3)", padding: 28 }}>
                No fee records yet. Click <strong>+ Add fee record</strong> to enter this student's monthly fee for any month.
              </div>
            ) : (
              <div className="tw">
                <table>
                  <thead><tr><th>Batch</th><th>Month</th><th>Amount</th><th>Status</th><th>Paid</th><th></th></tr></thead>
                  <tbody>
                    {fees.map(f => {
                      const isPaid = f.status === "paid";
                      return (
                        <tr key={f.id}>
                          <td>{f.batch_name}</td>
                          <td className="mono">{f.month}</td>
                          <td className="mono">{fmt(f.amount)}</td>
                          <td>{isPaid ? <span className="bdg b-paid">Paid</span> : <span className="bdg b-due">{f.status}</span>}</td>
                          <td className="mono" style={{ color: "var(--ink3)", fontSize: 11 }}>{f.paid_at || "—"}</td>
                          <td>
                            <div style={{ display: "flex", gap: 4 }}>
                              <button className="btn btn-xs btn-s" onClick={() => openEditFee(f)}>Edit</button>
                              {isPaid
                                ? <button className="btn btn-xs btn-s" onClick={() => toggleFee(f.id, true)}>Unmark</button>
                                : <button className="btn btn-xs btn-ok" onClick={() => toggleFee(f.id, false)}>Mark paid</button>}
                            </div>
                          </td>
                        </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ATTENDANCE */}
        {tab === "attendance" && (
          <>
            <div className="card" style={{ padding: "12px 16px", marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 12, color: "var(--ink3)" }}>Overall rate</div>
                <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "var(--font-display)", color: attRate >= 85 ? "var(--jd)" : "var(--sf)" }}>
                  {attTotal ? `${attRate}%` : "No data"}
                </div>
              </div>
              <button className="btn btn-p btn-sm" onClick={openMarkAttendance}>+ Mark today</button>
            </div>
            {attendance.length === 0 ? (
              <div className="card" style={{ textAlign: "center", color: "var(--ink3)", padding: 28 }}>No attendance records.</div>
            ) : (
              <div className="tw">
                <table>
                  <thead><tr><th>Date</th><th>Batch</th><th>Status</th></tr></thead>
                  <tbody>
                    {attendance.slice(0, 60).map(a => (
                      <tr key={a.id}>
                        <td className="mono">{a.date}</td>
                        <td>{a.batch_name || "—"}</td>
                        <td>{a.is_present ? <span className="bdg b-present">Present</span> : <span className="bdg b-absent">Absent</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* EXAMS */}
        {tab === "exams" && (
          myExams.length === 0 ? (
            <div className="card" style={{ textAlign: "center", color: "var(--ink3)", padding: 28 }}>No exams for this student's active batches yet.</div>
          ) : (
            <div className="g2">
              {myExams.map(ex => {
                const marks = examMarks[ex.id] || [];
                return (
                  <div key={ex.id} className="card">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <div>
                        <div style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 700 }}>{ex.name}</div>
                        <div style={{ fontSize: 11.5, color: "var(--ink3)", marginTop: 2 }}>
                          {ex.batch_name} · {ex.start_date} → {ex.end_date}
                        </div>
                      </div>
                      <span className={`bdg b-${ex.status}`}>{ex.status}</span>
                    </div>
                    {marks.length === 0 ? (
                      <div style={{ fontSize: 12, color: "var(--ink3)", padding: 6 }}>No marks recorded yet.</div>
                    ) : (
                      <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
                        {marks.map(m => {
                          const pct = m.marks !== null && m.max_marks ? Math.round((Number(m.marks) / m.max_marks) * 1000) / 10 : null;
                          return (
                            <div key={m.id} className="exam-subj-row">
                              <span className="exam-subj-name">{m.subject}</span>
                              <span className="exam-subj-date">{m.marks ?? "—"} / {m.max_marks}</span>
                              <span className="exam-subj-time">{pct !== null ? `${pct}%` : "Not graded"}</span>
                              <span style={{ fontSize: 11, color: pct !== null && pct >= 50 ? "var(--jd)" : pct !== null ? "var(--rb)" : "var(--ink3)", fontWeight: 700 }}>
                                {pct !== null ? (pct >= 75 ? "A" : pct >= 65 ? "B" : pct >= 50 ? "C" : pct >= 35 ? "S" : "F") : ""}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* TIMETABLE */}
        {tab === "timetable" && (
          slots.length === 0 ? (
            <div className="card" style={{ textAlign: "center", color: "var(--ink3)", padding: 28 }}>
              No timetable slots configured for this student's batches. Set them up in{" "}
              <Link href="/timetable" style={{ color: "var(--tc)" }}>Timetable</Link>.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {DAYS.map((d, di) => {
                const dayKey = String(di);
                const list = (slotsByDay[dayKey] || []).slice().sort((a, b) => a.start_time.localeCompare(b.start_time));
                if (list.length === 0) return null;
                return (
                  <div key={dayKey} className="card" style={{ padding: 16 }}>
                    <div className="sec-title" style={{ marginBottom: 10 }}>{d} · {list.length} class{list.length !== 1 ? "es" : ""}</div>
                    <div style={{ display: "grid", gap: 6 }}>
                      {list.map(s => (
                        <div key={s.id} className="exam-subj-row">
                          <span className="exam-subj-name">{s.subject_name || "—"}</span>
                          <span className="exam-subj-date">{s.batch_name}</span>
                          <span className="exam-subj-time">{fmtTime(s.start_time)} – {fmtTime(s.end_time)}</span>
                          <span style={{ fontSize: 11, color: "var(--ink3)" }}>{s.room || ""}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>

      {/* QR */}
      <Modal open={showQR} onClose={() => setShowQR(false)} title="Student ID card">
        <div style={{ padding: "8px 0 14px", display: "flex", justifyContent: "center" }}>
          {student.qr_token ? (
            <QRCard kind="student" token={student.qr_token} name={student.name} subtitle={student.batch} code={`STU-${String(student.id).padStart(5, "0")}`} photoUrl={student.image} institute={getStoredUser()?.institute?.name} instituteLogoUrl={getStoredUser()?.institute?.logo} />
          ) : <div style={{ color: "var(--ink3)", padding: 24, fontSize: 13 }}>QR token not generated. Save the student and reopen.</div>}
        </div>
      </Modal>

      {/* Mark attendance modal */}
      <Modal open={markModal} onClose={() => setMarkModal(false)} title="Mark attendance"
        footer={<>
          <button className="btn btn-s btn-sm" onClick={() => setMarkModal(false)} disabled={busy}>Cancel</button>
          <button className="btn btn-p btn-sm" onClick={submitAttendance} disabled={busy}>{busy ? "Saving…" : "Save"}</button>
        </>}>
        <div className="form-gap">
          <div className="field-row">
            <div className="fg">
              <label className="flbl">Batch</label>
              <select value={markForm.batch} onChange={e => setMarkForm(f => ({ ...f, batch: e.target.value }))}>
                {activeBatches.map(en => <option key={en.batch} value={en.batch}>{en.batch_name}</option>)}
              </select>
            </div>
            <div className="fg">
              <label className="flbl">Date</label>
              <input type="date" value={markForm.date} onChange={e => setMarkForm(f => ({ ...f, date: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="flbl">Status</label>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" className={`btn btn-sm ${markForm.is_present ? "btn-ok" : "btn-s"}`} style={{ flex: 1 }} onClick={() => setMarkForm(f => ({ ...f, is_present: true }))}>Present</button>
              <button type="button" className={`btn btn-sm ${!markForm.is_present ? "btn-d" : "btn-s"}`} style={{ flex: 1 }} onClick={() => setMarkForm(f => ({ ...f, is_present: false }))}>Absent</button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Add / Edit fee modal */}
      <Modal
        open={!!feeEdit}
        onClose={() => setFeeEdit(null)}
        title={feeEdit?.id ? "Edit fee record" : "Add fee record"}
        footer={<>
          <button className="btn btn-s btn-sm" onClick={() => setFeeEdit(null)} disabled={feeBusy}>Cancel</button>
          <button className="btn btn-p btn-sm" onClick={saveFeeEdit} disabled={feeBusy}>
            {feeBusy ? "Saving…" : feeEdit?.id ? "Save changes" : "Add fee"}
          </button>
        </>}
      >
        {feeEdit && (
          <div className="form-gap">
            <div>
              <label className="flbl">Batch</label>
              <select
                value={feeEdit.batch}
                onChange={e => setFeeEdit(f => f ? { ...f, batch: e.target.value } : f)}
                disabled={!!feeEdit.id}
              >
                <option value="">Pick a batch…</option>
                {enrollments.map(en => (
                  <option key={en.batch} value={String(en.batch)}>
                    {en.batch_name} · {en.academic_year} {en.status !== "active" && `(${en.status})`}
                  </option>
                ))}
              </select>
              {enrollments.length === 0 && (
                <div className="hint" style={{ color: "var(--rb)" }}>
                  This student has no enrollments. Enroll them in a batch first from the Attendance screen.
                </div>
              )}
            </div>
            <div className="field-row">
              <div className="fg">
                <label className="flbl">Month</label>
                <input
                  type="month"
                  value={feeEdit.month.slice(0, 7)}
                  onChange={e => setFeeEdit(f => f ? { ...f, month: `${e.target.value}-01` } : f)}
                  disabled={!!feeEdit.id}
                />
              </div>
              <div className="fg">
                <label className="flbl">Amount (LKR)</label>
                <input
                  type="number"
                  value={feeEdit.amount}
                  onChange={e => setFeeEdit(f => f ? { ...f, amount: e.target.value } : f)}
                  placeholder="Defaults to batch monthly fee"
                />
              </div>
            </div>
            <div>
              <label className="flbl">Status</label>
              <div style={{ display: "flex", gap: 6 }}>
                {["pending", "paid"].map(s => (
                  <button
                    type="button"
                    key={s}
                    className={`btn btn-sm ${feeEdit.status === s ? (s === "paid" ? "btn-ok" : "btn-p") : "btn-s"}`}
                    style={{ flex: 1 }}
                    onClick={() => setFeeEdit(f => f ? { ...f, status: s } : f)}
                  >
                    {s === "paid" ? "Paid" : "Pending"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </PageShell>
  );
}
