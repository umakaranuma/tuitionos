"use client";
import { useState, useEffect, useRef } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { PageShell } from "@/components/layout/PageShell";
import { Modal } from "@/components/ui/Modal";
import { InvoiceTable } from "@/components/invoices/InvoiceTable";
import { useToast } from "@/components/ui/ToastProvider";
import { api } from "@/lib/api";

type MonthlyPayment = {
  institute: number;
  institute_name: string;
  plan: string;
  registered_at: string;
  invoice_id: number | null;
  amount: string;
  paid_amount: string;
  month: string;
  status: string;
  paid_at: string | null;
  reference_note?: string | null;
  payment_slip_url?: string | null;
  has_invoice: boolean;
};

type Stats = {
  total_expected: number;
  collected: number;
  outstanding: number;
  paid_count: number;
  partial_count?: number;
  pending_count: number;
  institute_count: number;
};

const MONTHS = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

const now = new Date();

type InstituteOpt = { id: number; name: string; plan: string };

const PLAN_FEES: Record<string, number> = {
  solo: 1500,
  institute: 3000,
  institute_pro: 6000,
};

export default function InvoicesPage() {
  const toast = useToast();
  const [rows, setRows] = useState<MonthlyPayment[]>([]);
  const [institutes, setInstitutes] = useState<InstituteOpt[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    institute: "",
    year: String(now.getFullYear()),
    month: String(now.getMonth() + 1),
    amount: "",
    transfer: "",
    dueDate: "",
    reference: "",
    applyAdvance: true,
  });
  const [addSlip, setAddSlip] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const addFileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [stats, setStats] = useState<Stats>({
    total_expected: 0, collected: 0, outstanding: 0,
    paid_count: 0, pending_count: 0, institute_count: 0,
  });
  const [periodLabel, setPeriodLabel] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [meta, setMeta] = useState({ total_count: 0, total_pages: 1 });
  const [generating, setGenerating] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [activeRow, setActiveRow] = useState<MonthlyPayment | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [referenceNote, setReferenceNote] = useState("");
  const [applyAdvance, setApplyAdvance] = useState(true);
  const [paymentSlip, setPaymentSlip] = useState<File | null>(null);
  const [updating, setUpdating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const yearOptions = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 1 + i);
  const selectedMonthLabel = MONTHS.find(m => m.value === month)?.label || "";

  const load = () => {
    setLoading(true);
    api.get(`/api/admin/billing/invoices/monthly_overview?year=${year}&month=${month}&page=${page}&limit=${limit}`)
      .then(r => {
        const d = r.data;
        setRows(d.results || []);
        if (d.period?.label) setPeriodLabel(d.period.label);
        if (d.stats) setStats(d.stats);
        if (d.total_count !== undefined) {
          setMeta({ total_count: d.total_count, total_pages: d.total_pages });
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(load, [page, limit, year, month]);

  // Load the institute list once for the "Add invoice" institute picker.
  useEffect(() => {
    api.get("/api/institutes/")
      .then(r => {
        const d = r.data;
        const list: InstituteOpt[] = (Array.isArray(d) ? d : d.results || [])
          .map((i: { id: number; name: string; plan: string }) => ({ id: i.id, name: i.name, plan: i.plan }));
        setInstitutes(list);
      })
      .catch(() => { /* non-blocking */ });
  }, []);

  const openAddInvoice = () => {
    setAddForm({
      institute: "",
      year, month,
      amount: "",
      transfer: "",
      dueDate: "",
      reference: "",
      applyAdvance: true,
    });
    setAddSlip(null);
    if (addFileRef.current) addFileRef.current.value = "";
    setShowAddModal(true);
  };

  // When an institute is picked, prefill amount + transfer from its plan fee,
  // and set a sensible balance-due date (7th of the billing month).
  const onPickInstitute = (id: string) => {
    const inst = institutes.find(i => String(i.id) === id);
    const fee = inst ? PLAN_FEES[inst.plan] ?? 3000 : 3000;
    const dd = new Date(Number(addForm.year), Number(addForm.month) - 1, 7);
    setAddForm(f => ({
      ...f,
      institute: id,
      amount: String(fee),
      transfer: String(fee),
      dueDate: dd.toISOString().slice(0, 10),
    }));
  };

  const addRemaining = Math.max(Number(addForm.amount || 0) - Number(addForm.transfer || 0), 0);

  const handleAddInvoice = async () => {
    if (!addForm.institute) { toast.error("Please choose an institute."); return; }
    if (!addForm.amount || Number(addForm.amount) <= 0) { toast.error("Enter the invoice amount."); return; }
    if (!addForm.transfer || Number(addForm.transfer) <= 0) { toast.error("Enter the transferred amount."); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("institute", addForm.institute);
      fd.append("year", addForm.year);
      fd.append("month", addForm.month);
      fd.append("amount", addForm.amount);
      fd.append("payment_amount", addForm.transfer);
      if (addForm.dueDate) fd.append("due_date", addForm.dueDate);
      fd.append("reference_note", addForm.reference);
      fd.append("apply_advance", addForm.applyAdvance ? "true" : "false");
      if (addSlip) fd.append("payment_slip", addSlip);

      const res = await api.post("/api/admin/billing/invoices/record_payment", fd);
      const advance = res.data.advance_applied || [];
      if (Number(addForm.transfer) < Number(addForm.amount)) {
        toast.success(`Invoice added. Partial — LKR ${addRemaining.toLocaleString()} balance due by ${addForm.dueDate || "due date"}.`);
      } else if (advance.length > 0) {
        toast.success(`Invoice paid. LKR ${res.data.overflow} carried to upcoming month(s) as advance.`);
      } else {
        toast.success("Invoice added and marked paid.");
      }
      setShowAddModal(false);
      setAddSlip(null);
      // Jump the view to the invoice's period so it's visible, then reload.
      setYear(addForm.year);
      setMonth(addForm.month);
      setPage(1);
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg || "Couldn't add the invoice. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const remainingDue = (row: MonthlyPayment) =>
    Math.max(Number(row.amount) - Number(row.paid_amount || 0), 0);

  const openRecordPayment = (row: MonthlyPayment) => {
    setActiveRow(row);
    setPaymentAmount(String(remainingDue(row) || Number(row.amount)));
    setReferenceNote(row.reference_note || "");
    setApplyAdvance(true);
    setPaymentSlip(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setShowPayModal(true);
  };

  const handleGenerateMonthly = async () => {
    setGenerating(true);
    try {
      const res = await api.post("/api/admin/billing/invoices/generate_monthly");
      toast.success(res.data.message || "Monthly invoices generated.");
      load();
    } catch {
      toast.error("Couldn't generate monthly invoices. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const handleRecordPayment = async () => {
    if (!activeRow || !paymentAmount) return;
    setUpdating(true);
    try {
      const form = new FormData();
      form.append("institute", String(activeRow.institute));
      form.append("year", year);
      form.append("month", month);
      form.append("payment_amount", paymentAmount);
      form.append("reference_note", referenceNote);
      form.append("apply_advance", applyAdvance ? "true" : "false");
      if (paymentSlip) form.append("payment_slip", paymentSlip);

      const res = await api.post("/api/admin/billing/invoices/record_payment", form);
      const advance = res.data.advance_applied || [];
      if (advance.length > 0) {
        toast.success(`Payment recorded. LKR ${res.data.overflow} applied as advance to upcoming month(s).`);
      } else {
        toast.success("Payment recorded successfully.");
      }
      setShowPayModal(false);
      setActiveRow(null);
      setPaymentSlip(null);
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg || "Couldn't record the payment. Please try again.");
    } finally {
      setUpdating(false);
    }
  };

  const handleMarkPending = async () => {
    if (!activeRow?.invoice_id) return;
    setUpdating(true);
    try {
      await api.patch(`/api/admin/billing/invoices/${activeRow.invoice_id}`, {
        status: "pending",
        reference_note: "",
      });
      setShowPendingModal(false);
      setActiveRow(null);
      load();
      toast.success("Payment reset to pending.");
    } catch {
      toast.error("Couldn't reset the payment to pending.");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <PageShell>
      <Topbar
        title="Invoices & Billing"
        subtitle={periodLabel
          ? `${periodLabel} · ${stats.institute_count} institutes · ${stats.paid_count} paid · ${stats.partial_count ?? 0} partial · ${stats.pending_count} unpaid`
          : "Monthly institute billing"}
        right={
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <select
              className="sel-f"
              value={year}
              onChange={e => { setYear(e.target.value); setPage(1); }}
            >
              {yearOptions.map(y => (
                <option key={y} value={String(y)}>{y}</option>
              ))}
            </select>
            <select
              className="sel-f"
              value={month}
              onChange={e => { setMonth(e.target.value); setPage(1); }}
            >
              {MONTHS.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
            <button className="btn btn-s btn-sm" onClick={handleGenerateMonthly} disabled={generating}>
              {generating ? "Generating..." : "Generate monthly"}
            </button>
            <button className="btn btn-p btn-sm" onClick={openAddInvoice}>+ Add invoice</button>
          </div>
        }
      />
      <div className="pb fi">
        {loading ? <div style={{ textAlign: "center", padding: 40, color: "var(--ink3)" }}>Loading...</div> : (
          <>
            <div style={{ fontSize: 12, color: "var(--ink3)", marginBottom: 14, lineHeight: 1.5 }}>
              Record payments with payslip uploads. Overpayments can auto-apply to upcoming months as <strong>partial</strong> advance.
            </div>

            <div className="g4" style={{ marginBottom: 18 }}>
              <div className="kpi" style={{ "--kc": "var(--tc)" } as React.CSSProperties}>
                <div className="kpi-lbl">Expected ({selectedMonthLabel})</div>
                <div className="kpi-val">LKR {stats.total_expected.toLocaleString()}</div>
                <div className="kpi-tr nt">{stats.institute_count} institutes</div>
              </div>
              <div className="kpi" style={{ "--kc": "var(--jd)" } as React.CSSProperties}>
                <div className="kpi-lbl">Collected</div>
                <div className="kpi-val">LKR {stats.collected.toLocaleString()}</div>
                <div className="kpi-tr up">{stats.paid_count} paid · {stats.partial_count ?? 0} partial</div>
              </div>
              <div className="kpi" style={{ "--kc": "var(--rb)" } as React.CSSProperties}>
                <div className="kpi-lbl">Outstanding</div>
                <div className="kpi-val">LKR {stats.outstanding.toLocaleString()}</div>
                <div className="kpi-tr dn">{stats.pending_count} unpaid</div>
              </div>
            </div>

            <InvoiceTable
              rows={rows}
              showRegistered={false}
              emptyLabel={`No institutes for ${selectedMonthLabel} ${year}`}
              primaryLabel="Record payment"
              resetLabel="Reset"
              onPrimaryAction={openRecordPayment}
              onResetAction={row => { setActiveRow(row); setShowPendingModal(true); }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 4px", marginTop: 4 }}>
              <span className="pg-info">Showing {rows.length} of {meta.total_count} institutes</span>
              <div className="pagination">
                <button className="pg-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 14 14"><path d="M8.5 3L4.5 7l4 4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
                {Array.from({ length: Math.min(meta.total_pages, 5) }, (_, i) => i + 1).map(p => (
                  <button key={p} className={`pg-btn ${page === p ? "on" : ""}`} onClick={() => setPage(p)}>{p}</button>
                ))}
                <button className="pg-btn" disabled={page === meta.total_pages || meta.total_pages === 0} onClick={() => setPage(p => p + 1)}>
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 14 14"><path d="M5.5 3l4 4-4 4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <Modal open={showPayModal} onClose={() => setShowPayModal(false)} title="Record Payment" footer={
        <>
          <button className="btn btn-s btn-sm" onClick={() => setShowPayModal(false)} disabled={updating}>Cancel</button>
          <button className="btn btn-ok btn-sm" onClick={handleRecordPayment} disabled={updating}>
            {updating ? "Saving..." : "Save payment"}
          </button>
        </>
      }>
        <div className="form-gap">
          {activeRow && (
            <div style={{ fontSize: 13, color: "var(--ink2)", marginBottom: 4 }}>
              <strong>{activeRow.institute_name}</strong> — {selectedMonthLabel} {year}
              <div style={{ fontSize: 12, color: "var(--ink3)", marginTop: 4 }}>
                Due: LKR {Number(activeRow.amount).toLocaleString()} · Already paid: LKR {Number(activeRow.paid_amount || 0).toLocaleString()} · Remaining: LKR {remainingDue(activeRow).toLocaleString()}
              </div>
            </div>
          )}
          <div>
            <label className="flbl">Payment amount (LKR)</label>
            <input
              type="number"
              value={paymentAmount}
              onChange={e => setPaymentAmount(e.target.value)}
              placeholder="e.g. 7500"
              autoFocus
            />
          </div>
          <div>
            <label className="flbl">Payslip / document</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              onChange={e => setPaymentSlip(e.target.files?.[0] || null)}
            />
          </div>
          <div>
            <label className="flbl">Reference note (optional)</label>
            <input
              value={referenceNote}
              onChange={e => setReferenceNote(e.target.value)}
              placeholder="e.g. WhatsApp Slip #123456"
            />
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--ink2)" }}>
            <input type="checkbox" checked={applyAdvance} onChange={e => setApplyAdvance(e.target.checked)} />
            Apply extra amount to upcoming month(s) as partial advance
          </label>
          <div style={{ fontSize: 12, color: "var(--ink3)", lineHeight: 1.5 }}>
            Example: due LKR 6,000 but paid LKR 7,500 — marks this month paid and applies LKR 1,500 to the next month as partial.
            Income page updates automatically since both share the same billing data.
          </div>
        </div>
      </Modal>

      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Add invoice" footer={
        <>
          <button className="btn btn-s btn-sm" onClick={() => setShowAddModal(false)} disabled={saving}>Cancel</button>
          <button className="btn btn-p btn-sm" onClick={handleAddInvoice} disabled={saving}>
            {saving ? "Saving..." : "Add invoice"}
          </button>
        </>
      }>
        <div className="form-gap">
          <div>
            <label className="flbl">Institute *</label>
            <select value={addForm.institute} onChange={e => onPickInstitute(e.target.value)} autoFocus>
              <option value="">Select an institute…</option>
              {institutes.map(i => (
                <option key={i.id} value={String(i.id)}>{i.name}</option>
              ))}
            </select>
          </div>

          <div className="field-row">
            <div>
              <label className="flbl">Billing year *</label>
              <select value={addForm.year} onChange={e => setAddForm(f => ({ ...f, year: e.target.value }))}>
                {yearOptions.map(y => <option key={y} value={String(y)}>{y}</option>)}
              </select>
            </div>
            <div>
              <label className="flbl">Billing month *</label>
              <select value={addForm.month} onChange={e => setAddForm(f => ({ ...f, month: e.target.value }))}>
                {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
          </div>

          <div className="field-row">
            <div>
              <label className="flbl">Invoice amount (LKR) *</label>
              <input type="number" value={addForm.amount} placeholder="e.g. 3000"
                onChange={e => setAddForm(f => ({ ...f, amount: e.target.value }))} />
            </div>
            <div>
              <label className="flbl">Transferred amount (LKR) *</label>
              <input type="number" value={addForm.transfer} placeholder="e.g. 3000"
                onChange={e => setAddForm(f => ({ ...f, transfer: e.target.value }))} />
            </div>
          </div>

          {/* Partial-payment helper: shows the balance and lets you set its deadline. */}
          {addRemaining > 0 && (
            <div style={{
              background: "var(--sf-l)", border: "1px solid #f3d3b3", borderRadius: 10,
              padding: "10px 12px", fontSize: 12, color: "#9a5b14", lineHeight: 1.5,
            }}>
              Partial payment — <strong>LKR {addRemaining.toLocaleString()}</strong> balance remains.
              Mark the date this balance must be settled by:
              <div style={{ marginTop: 8 }}>
                <input type="date" value={addForm.dueDate}
                  onChange={e => setAddForm(f => ({ ...f, dueDate: e.target.value }))} />
              </div>
            </div>
          )}

          <div>
            <label className="flbl">Transfer document / payslip</label>
            <input ref={addFileRef} type="file" accept="image/*,.pdf"
              onChange={e => setAddSlip(e.target.files?.[0] || null)} />
          </div>

          <div>
            <label className="flbl">Reference note (optional)</label>
            <input value={addForm.reference} placeholder="e.g. Bank transfer ref #889201"
              onChange={e => setAddForm(f => ({ ...f, reference: e.target.value }))} />
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--ink2)" }}>
            <input type="checkbox" checked={addForm.applyAdvance}
              onChange={e => setAddForm(f => ({ ...f, applyAdvance: e.target.checked }))} />
            If they paid extra, carry the surplus to upcoming month(s) as advance
          </label>

          <div style={{ fontSize: 11.5, color: "var(--ink3)", lineHeight: 1.5 }}>
            Full payment marks the month <strong>paid</strong>; less than the invoice amount marks it{" "}
            <strong>partial</strong> with the balance due by the date above. This updates the Income
            dashboard automatically since both screens share the same billing data.
          </div>
        </div>
      </Modal>

      <Modal open={showPendingModal} onClose={() => setShowPendingModal(false)} title="Reset Payment" footer={
        <>
          <button className="btn btn-s btn-sm" onClick={() => setShowPendingModal(false)} disabled={updating}>Cancel</button>
          <button className="btn btn-p btn-sm" onClick={handleMarkPending} disabled={updating}>
            {updating ? "Saving..." : "Reset to pending"}
          </button>
        </>
      }>
        <div className="form-gap">
          {activeRow && (
            <div style={{ fontSize: 13, color: "var(--ink2)", marginBottom: 4 }}>
              <strong>{activeRow.institute_name}</strong> — {selectedMonthLabel} {year}
            </div>
          )}
          <div style={{ fontSize: 12, color: "var(--ink3)", lineHeight: 1.5 }}>
            Clears paid/partial status for this month. The uploaded slip is kept for reference.
          </div>
        </div>
      </Modal>
    </PageShell>
  );
}
