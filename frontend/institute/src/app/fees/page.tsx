"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Topbar } from "@/components/layout/Topbar";
import { PageShell } from "@/components/layout/PageShell";
import { SearchSelect } from "@/components/ui/SearchSelect";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/ToastProvider";
import { Avatar } from "@/components/ui/Avatar";
import { api } from "@/lib/api";

type Fee = {
  id: number; student: number; batch: number; month: string;
  amount: string; status: string; paid_at: string | null; collected_by: string;
  method?: string; reference_no?: string; notes?: string;
};
type Batch = { id: number; name: string; display_name?: string; grade?: string; academic_year?: number; monthly_fee: string };
type Student = { id: number; name: string; image?: string | null; parent_name?: string; parent_mobile?: string; is_free?: boolean };

const MONTHS = [
  { value: "01", label: "January" }, { value: "02", label: "February" },
  { value: "03", label: "March" }, { value: "04", label: "April" },
  { value: "05", label: "May" }, { value: "06", label: "June" },
  { value: "07", label: "July" }, { value: "08", label: "August" },
  { value: "09", label: "September" }, { value: "10", label: "October" },
  { value: "11", label: "November" }, { value: "12", label: "December" },
];

const AV_COLORS: [string, string][] = [
  ["#e0e7ff", "#4338ca"], ["#dcfce7", "#15803d"], ["#fef3c7", "#92400e"],
  ["#fee2e2", "#b91c1c"], ["#dbeafe", "#1e40af"],
];

const PAYMENT_METHODS = ["Cash", "Bank transfer", "Online", "Cheque", "Other"];

export default function FeesPage() {
  const toast = useToast();
  const now = new Date();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState("");
  const [selectedYear, setSelectedYear] = useState(String(now.getFullYear()));
  const [selectedMonth, setSelectedMonth] = useState(String(now.getMonth() + 1).padStart(2, "0"));
  const [students, setStudents] = useState<Student[]>([]);
  const [fees, setFees] = useState<Fee[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyIds, setBusyIds] = useState<Set<number>>(new Set());
  const [payModal, setPayModal] = useState<Student | null>(null);
  const [payForm, setPayForm] = useState({ amount: "", method: PAYMENT_METHODS[0], reference_no: "", notes: "" });
  const [paySaving, setPaySaving] = useState(false);

  const monthIso = `${selectedYear}-${selectedMonth}-01`;

  // Load batches once.
  useEffect(() => {
    api.get("/api/academics/batches")
      .then(r => {
        const list: Batch[] = Array.isArray(r.data) ? r.data : r.data.results || [];
        setBatches(list);
        if (list.length > 0 && !selectedBatch) setSelectedBatch(String(list[0].id));
      })
      .catch(() => { /* ignore */ });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload students + fees when the selection changes.
  const load = useCallback(() => {
    if (!selectedBatch) { setStudents([]); setFees([]); setLoading(false); return; }
    setLoading(true);
    Promise.all([
      api.get(`/api/students/students`, { params: { batch: selectedBatch, student_status: "active" } })
        .then(r => (Array.isArray(r.data) ? r.data : r.data.results || []) as Student[])
        .catch(() => []),
      api.get(`/api/fees/`, { params: { batch: selectedBatch, month: monthIso } })
        .then(r => (Array.isArray(r.data) ? r.data : r.data.results || []) as Fee[])
        .catch(() => []),
    ]).then(([st, f]) => {
      setStudents(st);
      setFees(f);
      setLoading(false);
    });
  }, [selectedBatch, monthIso]);

  useEffect(() => { load(); }, [load]);

  const batch = batches.find(b => String(b.id) === selectedBatch);
  const monthLabel = MONTHS.find(m => m.value === selectedMonth)?.label || "";
  const monthlyFee = batch ? Number(batch.monthly_fee || 0) : 0;

  // Map: studentId → fee row for the selected month (if any).
  const feeByStudent: Record<number, Fee> = {};
  fees.forEach(f => { feeByStudent[f.student] = f; });

  // Stats derived from the rendered list.
  const paidCount = students.filter(s => feeByStudent[s.id]?.status === "paid").length;
  const dueCount = students.filter(s => !s.is_free && feeByStudent[s.id]?.status !== "paid").length;
  const totalCollected = students.reduce((sum, s) => {
    const f = feeByStudent[s.id];
    return sum + (f?.status === "paid" ? Number(f.amount) : 0);
  }, 0);
  const totalOutstanding = students.reduce((sum, s) => {
    if (s.is_free) return sum;
    const f = feeByStudent[s.id];
    if (f && f.status === "paid") return sum;
    return sum + (f ? Number(f.amount) : monthlyFee);
  }, 0);

  const openPayModal = (student: Student) => {
    if (student.is_free) {
      toast.info?.("This student is marked free — no fee to record.");
      return;
    }
    const existing = feeByStudent[student.id];
    setPayForm({
      amount: existing ? existing.amount : String(monthlyFee),
      method: existing?.method || PAYMENT_METHODS[0],
      reference_no: existing?.reference_no || "",
      notes: existing?.notes || "",
    });
    setPayModal(student);
  };

  const submitPayment = async () => {
    if (!payModal || !selectedBatch) return;
    setPaySaving(true);
    try {
      await api.post(`/api/fees/quick_mark`, {
        student: payModal.id,
        batch: Number(selectedBatch),
        month: monthIso,
        paid: true,
        amount: payForm.amount || undefined,
        method: payForm.method,
        reference_no: payForm.reference_no,
        notes: payForm.notes,
      });
      toast.success(`${payModal.name} marked paid.`);
      setPayModal(null);
      load();
    } catch {
      toast.error("Couldn't record payment.");
    } finally {
      setPaySaving(false);
    }
  };

  const unmark = async (student: Student) => {
    if (!selectedBatch) return;
    setBusyIds(prev => new Set(prev).add(student.id));
    try {
      await api.post(`/api/fees/quick_mark`, {
        student: student.id,
        batch: Number(selectedBatch),
        month: monthIso,
        paid: false,
      });
      toast.success(`${student.name} reverted to pending.`);
      load();
    } catch {
      toast.error("Couldn't update fee status.");
    } finally {
      setBusyIds(prev => { const n = new Set(prev); n.delete(student.id); return n; });
    }
  };

  const yearOptions = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);

  return (
    <PageShell>
      <Topbar
        title="Fee Tracking"
        subtitle={batch
          ? `${batch.grade || batch.display_name || batch.name} · ${monthLabel} ${selectedYear} · ${paidCount}/${students.length} paid`
          : "Select a batch to see students"}
        right={
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ width: 110 }}>
              <SearchSelect
                value={selectedYear}
                onChange={setSelectedYear}
                searchable={false}
                options={yearOptions.map(y => ({ value: String(y), label: String(y) }))}
              />
            </div>
            <div style={{ width: 130 }}>
              <SearchSelect
                value={selectedMonth}
                onChange={setSelectedMonth}
                options={MONTHS}
              />
            </div>
            <div style={{ width: 200 }}>
              <SearchSelect
                value={selectedBatch}
                onChange={setSelectedBatch}
                placeholder="Pick a batch"
                options={batches.map(b => ({
                  value: String(b.id),
                  label: b.grade || b.display_name || b.name,
                  sub: b.academic_year ? `${b.academic_year}` : undefined,
                }))}
              />
            </div>
          </div>
        }
      />

      <div className="pb fi">
        {/* Persistent "what am I marking?" banner so users always know which
            batch + month a Mark paid click will affect. */}
        {batch && (
          <div className="card" style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "14px 18px", marginBottom: 14, gap: 12, flexWrap: "wrap",
            borderLeft: "4px solid var(--tc)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
              <span style={{
                fontSize: 10.5, fontWeight: 800, color: "var(--tc-d)",
                background: "var(--tc-l)", padding: "3px 9px", borderRadius: 99,
                letterSpacing: ".08em",
              }}>MARKING FEES FOR</span>
              <span style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 800, color: "var(--ink)", letterSpacing: "-.02em" }}>
                {batch.grade || batch.display_name || batch.name}
              </span>
              <span style={{ fontSize: 13, color: "var(--ink3)" }}>·</span>
              <span style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 800, color: "var(--ink)", letterSpacing: "-.02em" }}>
                {monthLabel} {selectedYear}
              </span>
            </div>
            <span style={{ fontSize: 12, color: "var(--ink3)" }}>
              Click <strong>Record payment</strong> on any student to record this month's payment, or <strong>Unmark</strong> to revert.
            </span>
          </div>
        )}

        <div className="g4" style={{ marginBottom: 18 }}>
          <div className="kpi" style={{ "--kc": "var(--tc)" } as React.CSSProperties}>
            <div className="kpi-lbl">Students</div>
            <div className="kpi-val">{students.length}</div>
            <div className="kpi-tr nt">{batch?.grade || batch?.name || "—"}</div>
          </div>
          <div className="kpi" style={{ "--kc": "var(--jd)" } as React.CSSProperties}>
            <div className="kpi-lbl">Collected</div>
            <div className="kpi-val">LKR {totalCollected.toLocaleString()}</div>
            <div className="kpi-tr up">{paidCount} paid</div>
          </div>
          <div className="kpi" style={{ "--kc": "var(--rb)" } as React.CSSProperties}>
            <div className="kpi-lbl">Outstanding</div>
            <div className="kpi-val">LKR {totalOutstanding.toLocaleString()}</div>
            <div className="kpi-tr dn">{dueCount} due</div>
          </div>
          <div className="kpi" style={{ "--kc": "var(--sf)" } as React.CSSProperties}>
            <div className="kpi-lbl">Monthly fee</div>
            <div className="kpi-val">LKR {monthlyFee.toLocaleString()}</div>
            <div className="kpi-tr nt">{monthLabel} {selectedYear}</div>
          </div>
        </div>

        {!selectedBatch ? (
          <div className="card" style={{ textAlign: "center", padding: "40px 20px", color: "var(--ink3)" }}>
            Choose a batch from the top right to start tracking fees.
          </div>
        ) : loading ? (
          <div style={{ textAlign: "center", padding: 40, color: "var(--ink3)" }}>Loading…</div>
        ) : students.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "40px 20px" }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>👥</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)", marginBottom: 6 }}>
              No active students in {batch?.grade || batch?.name}
            </div>
            <div style={{ fontSize: 13, color: "var(--ink3)", lineHeight: 1.5 }}>
              Enroll students into this batch from the <strong>Attendance</strong> screen or the Students list — then refresh.
            </div>
          </div>
        ) : (
          <div className="tw">
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Parent</th>
                  <th>Amount (LKR)</th>
                  <th>Status</th>
                  <th>Paid at</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {students.map((s, i) => {
                  const f = feeByStudent[s.id];
                  const paid = f?.status === "paid";
                  const amount = f ? Number(f.amount) : monthlyFee;
                  const busy = busyIds.has(s.id);
                  const [bg, fg] = AV_COLORS[i % AV_COLORS.length];
                  return (
                    <tr key={s.id}>
                      <td>
                        <Link href={`/students/${s.id}`} className="td-nm" style={{ textDecoration: "none", color: "inherit" }}>
                          <Avatar src={s.image} name={s.name} size={32} radius={8} bg={bg} fg={fg} />
                          <div>
                            <div className="td-nm-main" style={{ color: "var(--tc-d)" }}>{s.name}</div>
                            <div className="td-nm-sub" style={{ color: "var(--ink3)" }}>
                              {s.is_free ? "Free student" : "View full payment history →"}
                            </div>
                          </div>
                        </Link>
                      </td>
                      <td style={{ fontSize: 12.5, color: "var(--ink3)" }}>
                        {s.parent_name || "—"}
                        {s.parent_mobile && <div style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>{s.parent_mobile}</div>}
                      </td>
                      <td className="mono">{amount.toLocaleString()}</td>
                      <td>
                        {s.is_free
                          ? <span className="bdg b-trial">Free</span>
                          : paid
                            ? <span className="bdg b-paid">Paid</span>
                            : <span className="bdg b-due">Pending</span>}
                      </td>
                      <td className="mono" style={{ color: "var(--ink3)", fontSize: 11 }}>
                        {f?.paid_at ? new Date(f.paid_at).toLocaleDateString() : "—"}
                      </td>
                      <td>
                        {s.is_free ? (
                          <span style={{ fontSize: 11, color: "var(--ink3)" }}>—</span>
                        ) : paid ? (
                          <button className="btn btn-xs btn-s" onClick={() => unmark(s)} disabled={busy}>
                            {busy ? "…" : "Unmark"}
                          </button>
                        ) : (
                          <button className="btn btn-xs btn-ok" onClick={() => openPayModal(s)} disabled={busy}>
                            {busy ? "…" : "Record payment"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={!!payModal}
        onClose={() => setPayModal(null)}
        title={`Record payment — ${payModal?.name || ""}`}
        footer={<>
          <button className="btn btn-s btn-sm" onClick={() => setPayModal(null)} disabled={paySaving}>Cancel</button>
          <button className="btn btn-p btn-sm" onClick={submitPayment} disabled={paySaving}>
            {paySaving ? "Saving…" : "Confirm payment"}
          </button>
        </>}
      >
        {payModal && (
          <div className="form-gap">
            <div style={{ fontSize: 12.5, color: "var(--ink3)", marginBottom: 2 }}>
              {monthLabel} {selectedYear} · {batch?.grade || batch?.display_name || batch?.name}
            </div>
            <div className="field-row">
              <div className="fg">
                <label className="flbl">Amount (LKR)</label>
                <input
                  type="number"
                  value={payForm.amount}
                  onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder={String(monthlyFee)}
                />
              </div>
              <div className="fg">
                <label className="flbl">Payment method</label>
                <select value={payForm.method} onChange={e => setPayForm(f => ({ ...f, method: e.target.value }))}>
                  {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="flbl">Reference no. (optional)</label>
              <input
                type="text"
                value={payForm.reference_no}
                onChange={e => setPayForm(f => ({ ...f, reference_no: e.target.value }))}
                placeholder="Cheque no. / transaction ID"
              />
            </div>
            <div>
              <label className="flbl">Notes (optional)</label>
              <input
                type="text"
                value={payForm.notes}
                onChange={e => setPayForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="e.g. partial payment, discount applied"
              />
            </div>
          </div>
        )}
      </Modal>
    </PageShell>
  );
}
