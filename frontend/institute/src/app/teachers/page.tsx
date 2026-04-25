"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Topbar } from "@/components/layout/Topbar";
import { PageShell } from "@/components/layout/PageShell";
import { Modal } from "@/components/ui/Modal";
import { DataTable, Column } from "@/components/ui/DataTable";
import { TEACHERS, INIT_TEACHER_PAYMENTS, BATCHES, Teacher, TeacherPayment, INIT_TIMETABLE } from "@/lib/batchData";

const SUBJECTS_LIST = ["Mathematics", "Physics", "Chemistry", "English", "Tamil Literature", "Biology", "Combined Maths"];
const PAYMENT_METHODS = ["Bank transfer", "Cash", "Cheque", "Online (card)"];

function blankForm() {
  return { name: "", subject: "", mobile: "", email: "", salary: "", batchIds: [] as string[] };
}

function makeInitials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join("");
}

const PALETTE: [string, string][] = [
  ["#d4ede3", "#1a5040"], ["#d8e6fa", "#2a5fa8"],
  ["#fceaea", "#b83030"], ["#fef3d7", "#6b3e20"],
  ["#ede8fc", "#6b3ea8"],
];

export default function TeachersPage() {
  const router = useRouter();
  const [teachers, setTeachers] = useState<Teacher[]>(TEACHERS);
  const [payments, setPayments] = useState<TeacherPayment[]>(INIT_TEACHER_PAYMENTS);
  const [modal, setModal]       = useState<"add" | "edit" | null>(null);
  const [editTarget, setEditTarget] = useState<Teacher | null>(null);
  const [form, setForm]         = useState(blankForm());
  const [nextId, setNextId]     = useState(TEACHERS.length + 1);
  const [search, setSearch]     = useState("");

  // Record payment modal state
  const [payTarget, setPayTarget] = useState<{ teacherId: number; month: string } | null>(null);
  const [payForm, setPayForm] = useState({ method: "Bank transfer", date: new Date().toISOString().slice(0, 10), referenceNo: "" });

  // Unused but kept for type compat
  const [viewTeacher, setViewTeacher] = useState<Teacher | null>(null);

  // ── Computed KPI values ──
  const now = new Date();
  const currentMonth = `${now.toLocaleString("en", { month: "long" })} ${now.getFullYear()}`;
  const monthShort = now.toLocaleString("en", { month: "short" });
  const currentPayments = payments.filter(p => p.month === currentMonth);
  const totalPayroll = teachers.reduce((s, t) => s + t.monthlySalary, 0);
  const settledThisMonth = currentPayments.filter(p => p.status === "paid").length;
  const pendingThisMonth = currentPayments.filter(p => p.status !== "paid").length;
  const settledAmount = currentPayments.filter(p => p.status === "paid").reduce((s, p) => s + p.amount, 0);
  const pendingAmount = currentPayments.filter(p => p.status !== "paid").reduce((s, p) => s + p.amount, 0);
  const totalClassesPerWeek = INIT_TIMETABLE.length;

  const getTeacherCurrentStatus = (t: Teacher) => {
    const cp = payments.find(p => p.teacherId === t.id && p.month === currentMonth);
    return cp?.status ?? "pending";
  };

  // Search filter
  const filteredTeachers = teachers.filter(t =>
    !search ||
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.subject.toLowerCase().includes(search.toLowerCase()) ||
    t.mobile.includes(search)
  );

  // ── Add / Edit modals ──
  const openAdd = () => { setForm(blankForm()); setEditTarget(null); setModal("add"); };
  const openEdit = (t: Teacher, e: React.MouseEvent) => {
    e.stopPropagation();
    setForm({ name: t.name, subject: t.subject, mobile: t.mobile, email: t.email, salary: String(t.monthlySalary), batchIds: [...t.batchIds] });
    setEditTarget(t);
    setModal("edit");
  };
  const close = () => setModal(null);

  const save = () => {
    if (!form.name.trim() || !form.subject) return;
    if (modal === "add") {
      const [bg, fg] = PALETTE[nextId % PALETTE.length];
      const newTeacher: Teacher = {
        id: nextId, name: form.name, subject: form.subject,
        mobile: form.mobile, email: form.email,
        monthlySalary: parseInt(form.salary) || 0,
        batchIds: form.batchIds as typeof newTeacher.batchIds, joinDate: new Date().toISOString().slice(0, 10),
        initials: makeInitials(form.name), bg, fg,
      };
      setTeachers(prev => [...prev, newTeacher]);
      setPayments(prev => [...prev, {
        teacherId: nextId, month: currentMonth, amount: newTeacher.monthlySalary,
        status: "pending", paidDate: null, method: null, referenceNo: null,
        payslipFile: null, notes: null, type: "salary", advanceDeduction: 0, editHistory: [],
      }]);
      setNextId(n => n + 1);
    } else if (editTarget) {
      setTeachers(prev => prev.map(t =>
        t.id === editTarget.id
          ? { ...t, name: form.name, subject: form.subject, mobile: form.mobile, email: form.email, monthlySalary: parseInt(form.salary) || t.monthlySalary, initials: makeInitials(form.name) }
          : t
      ));
    }
    close();
  };

  // ── Record payment ──
  const openRecordPayment = (teacherId: number, month: string) => {
    setPayForm({
      method: "Bank transfer",
      date: new Date().toISOString().slice(0, 10),
      referenceNo: `SAL-${teacherId}${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(new Date().getFullYear()).slice(2)}`,
    });
    setPayTarget({ teacherId, month });
    setViewTeacher(null);
  };

  const confirmPayment = () => {
    if (!payTarget) return;
    setPayments(prev => prev.map(p =>
      p.teacherId === payTarget.teacherId && p.month === payTarget.month
        ? { ...p, status: "paid" as const, paidDate: payForm.date, method: payForm.method, referenceNo: payForm.referenceNo }
        : p
    ));
    setPayTarget(null);
  };

  const payTeacher = payTarget ? teachers.find(t => t.id === payTarget.teacherId) : null;

  /* ── Column definitions ── */
  const columns: Column<Teacher>[] = [
    {
      key: "teacher",
      header: "Teacher",
      width: 200,
      render: (t) => (
        <div className="td-nm" style={{ transition: "all 150ms" }}>
          <div className="ava" style={{ background: t.bg, color: t.fg }}>{t.initials}</div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 12.5 }}
              onMouseEnter={e => e.currentTarget.style.textDecoration = "underline"}
              onMouseLeave={e => e.currentTarget.style.textDecoration = "none"}>
              {t.name}
            </div>
            <div style={{ fontSize: 10.5, color: "var(--ink3)" }}>Since {t.joinDate}</div>
          </div>
        </div>
      ),
    },
    {
      key: "subject",
      header: "Subject",
      render: (t) => <span style={{ fontSize: 12.5 }}>{t.subject}</span>,
    },
    {
      key: "mobile",
      header: "Mobile",
      render: (t) => <span className="mono">{t.mobile}</span>,
    },
    {
      key: "batches",
      header: "Batches",
      render: (t) => (
        <div>
          <div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginBottom: 4 }}>
            {t.batchIds.map(bid => {
              const batch = BATCHES.find(b => b.id === bid);
              return batch ? (
                <span key={bid} style={{
                  fontSize: 9.5, fontWeight: 600, padding: "1px 5px",
                  background: batch.colorL, color: batch.color, borderRadius: 5,
                }}>
                  {batch.label}
                </span>
              ) : null;
            })}
            {t.batchIds.length === 0 && <span style={{ fontSize: 11, color: "var(--ink3)" }}>—</span>}
          </div>
          <div style={{ fontSize: 10.5, color: "var(--ink3)", fontWeight: 600 }}>
            {INIT_TIMETABLE.filter(s => s.teacherId === t.id).length} classes/wk
          </div>
        </div>
      ),
    },
    {
      key: "salary",
      header: "Monthly Salary",
      render: (t) => (
        <span className="mono" style={{ fontWeight: 700 }}>
          {t.monthlySalary.toLocaleString()}
        </span>
      ),
    },
    {
      key: "status",
      header: "This Month",
      render: (t) => {
        const status = getTeacherCurrentStatus(t);
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {status === "paid" && <span className="bdg b-paid">Settled</span>}
            {status === "pending" && <span className="bdg b-due">Pending</span>}
            {status === "overdue" && (
              <span style={{ background: "#fceaea", color: "#b83030", fontSize: 10.5, fontWeight: 600, padding: "2px 8px", borderRadius: 99, display: "inline-flex" }}>Overdue</span>
            )}
          </div>
        );
      },
    },
    {
      key: "actions",
      header: "Actions",
      width: 160,
      render: (t) => {
        const status = getTeacherCurrentStatus(t);
        return (
          <div style={{ display: "flex", gap: 4 }} onClick={e => e.stopPropagation()}>
            {status !== "paid" && (
              <button className="btn btn-xs btn-ok" onClick={() => openRecordPayment(t.id, currentMonth)}>
                Pay
              </button>
            )}
            <button className="btn btn-xs btn-s" onClick={(e) => openEdit(t, e)}>Edit</button>
            <button className="btn btn-xs btn-d"
              onClick={() => setTeachers(prev => prev.filter(x => x.id !== t.id))}>
              Remove
            </button>
          </div>
        );
      },
    },
  ];

  // ── Add / Edit form body ──
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
      <div>
        <label className="flbl freq">Monthly salary (LKR)</label>
        <input type="number" placeholder="e.g. 45000" value={form.salary}
          onChange={e => setForm(f => ({ ...f, salary: e.target.value }))} />
      </div>

      {/* Batch Assignment */}
      <div>
        <label className="flbl">Assigned Batches (Optional)</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {BATCHES.map(b => {
            const isAssigned = form.batchIds.includes(b.id);
            return (
              <button key={b.id} onClick={() => {
                setForm(f => ({
                  ...f, batchIds: isAssigned ? f.batchIds.filter(id => id !== b.id) : [...f.batchIds, b.id]
                }));
              }} style={{
                padding: "6px 12px", borderRadius: 8, fontSize: 11.5, fontWeight: 600, cursor: "pointer",
                border: `1.5px solid ${isAssigned ? b.color : "var(--ln)"}`,
                background: isAssigned ? b.colorL : "#fff",
                color: isAssigned ? b.color : "var(--ink3)",
                transition: "all 150ms"
              }}>
                {isAssigned ? "✓ " : ""}{b.label}
              </button>
            )
          })}
        </div>
        <div className="fhint" style={{ marginTop: 6 }}>Multiple teachers can be assigned to the same batch. Select all batches this teacher is responsible for.</div>
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
          {form.salary && (
            <div style={{ marginLeft: "auto", fontSize: 12, fontWeight: 700, color: "var(--ink)", fontFamily: "var(--font-mono)" }}>
              LKR {parseInt(form.salary).toLocaleString()}/mo
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <PageShell>
      <Topbar
        title="Teachers"
        subtitle={`Staff directory · ${currentMonth}`}
        right={
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ position: "relative" }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="var(--ink3)" strokeWidth="1.5"
                style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }}>
                <circle cx="6" cy="6" r="4.5"/><path d="M9.5 9.5L13 13"/>
              </svg>
              <input
                placeholder="Search teacher, subject…"
                style={{ width: 200, paddingLeft: 30 }}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <button className="btn btn-p btn-sm" onClick={openAdd}>+ Add teacher</button>
          </div>
        }
      />
      <div className="pb fi">
        {/* KPI Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 18 }}>
          {[
            { label: "Total Teachers", val: teachers.length, sub: `${totalClassesPerWeek} classes scheduled per week`, color: "#2a5fa8", icon: "👩‍🏫" },
            { label: "Monthly Payroll", val: `${(totalPayroll / 1000).toFixed(0)}K`, sub: `LKR ${totalPayroll.toLocaleString()}`, color: "#6b3ea8", icon: "💰" },
            { label: `Settled (${monthShort})`, val: settledThisMonth, sub: `LKR ${settledAmount.toLocaleString()}`, color: "#1a5040", icon: "✓" },
            { label: `Pending (${monthShort})`, val: pendingThisMonth, sub: `LKR ${pendingAmount.toLocaleString()}`, color: pendingThisMonth > 0 ? "#c07b1a" : "#1a5040", icon: pendingThisMonth > 0 ? "⏳" : "✓" },
          ].map(kpi => (
            <div key={kpi.label} style={{
              background: "#fff",
              border: `1.5px solid ${kpi.color}22`,
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

        {/* Settlement progress bar */}
        <div style={{ background: "#fff", border: "1.5px solid var(--ln)", borderRadius: 12, padding: "14px 16px", marginBottom: 18, boxShadow: "0 1px 3px rgba(28,25,23,.05)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 8 }}>
            <span style={{ fontWeight: 700, color: "var(--ink)" }}>Salary settlement — {currentMonth}</span>
            <span style={{ fontFamily: "var(--font-mono)", color: "var(--ink3)" }}>{settledThisMonth}/{teachers.length} teachers</span>
          </div>
          <div style={{ height: 8, background: "var(--ln)", borderRadius: 99, overflow: "hidden" }}>
            <div style={{
              height: "100%",
              width: `${Math.round(settledThisMonth / Math.max(teachers.length, 1) * 100)}%`,
              background: "linear-gradient(to right,#2d7a5a,#478f6e)",
              borderRadius: 99, transition: "width 400ms cubic-bezier(.16,1,.3,1)",
            }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: "var(--ink3)", marginTop: 5 }}>
            <span style={{ color: "#1a5040", fontWeight: 600 }}>LKR {settledAmount.toLocaleString()} settled</span>
            <span style={{ color: pendingAmount > 0 ? "#c07b1a" : "#1a5040", fontWeight: 600 }}>
              {pendingAmount > 0 ? `LKR ${pendingAmount.toLocaleString()} pending` : "All settled ✓"}
            </span>
          </div>
        </div>

        {/* Teachers Table with Pagination */}
        <DataTable<Teacher>
          columns={columns}
          data={filteredTeachers}
          rowKey={t => t.id}
          defaultPerPage={10}
          onRowClick={t => router.push(`/teachers/${t.id}`)}
          rowBg={t => getTeacherCurrentStatus(t) === "overdue" ? "#fffbeb" : undefined}
          emptyMessage={search ? `No teachers match "${search}"` : "No teachers added yet"}
          title={`${filteredTeachers.length} teacher${filteredTeachers.length !== 1 ? "s" : ""}`}
        />
      </div>

      {/* Add / Edit Teacher modal */}
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

      {/* Record Payment modal */}
      <Modal
        open={!!payTarget}
        onClose={() => setPayTarget(null)}
        title="Record salary payment"
        footer={
          <>
            <button className="btn btn-s btn-sm" onClick={() => setPayTarget(null)}>Cancel</button>
            <button className="btn btn-ok btn-sm" onClick={confirmPayment}>Confirm payment</button>
          </>
        }
      >
        {payTarget && payTeacher && (
          <div className="form-gap">
            <div style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--cr)", borderRadius: 10, padding: "10px 13px" }}>
              <div className="ava" style={{ background: payTeacher.bg, color: payTeacher.fg }}>{payTeacher.initials}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>{payTeacher.name}</div>
                <div style={{ fontSize: 11, color: "var(--ink3)" }}>{payTeacher.subject}</div>
              </div>
              <div style={{ marginLeft: "auto", textAlign: "right" }}>
                <div style={{ fontSize: 11, color: "var(--ink3)" }}>{payTarget.month}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)", fontFamily: "var(--font-mono)" }}>
                  LKR {payTeacher.monthlySalary.toLocaleString()}
                </div>
              </div>
            </div>
            <div className="field-row">
              <div>
                <label className="flbl">Payment method</label>
                <select value={payForm.method} onChange={e => setPayForm(f => ({ ...f, method: e.target.value }))}>
                  {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="flbl">Date paid</label>
                <input type="date" value={payForm.date} onChange={e => setPayForm(f => ({ ...f, date: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="flbl">Reference / transaction #</label>
              <input placeholder="e.g. SAL-104-26" value={payForm.referenceNo} onChange={e => setPayForm(f => ({ ...f, referenceNo: e.target.value }))} />
              <div className="fhint">Saved for payroll records and audit</div>
            </div>
            <div style={{ background: "var(--tc-l)", border: "1px solid #b8ddd0", borderRadius: 10, padding: "9px 12px", fontSize: 11.5, color: "var(--tc-d)" }}>
              Payment of LKR {payTeacher.monthlySalary.toLocaleString()} to {payTeacher.name} will be marked as settled for {payTarget.month}.
            </div>
          </div>
        )}
      </Modal>
    </PageShell>
  );
}
