"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/ToastProvider";
import { api } from "@/lib/api";

type BillingRow = {
  institute: number;
  invoice_id: number | null;
  amount: string;
  paid_amount?: string;
  month: string;
  status: string;
  paid_at: string | null;
  reference_note?: string | null;
  due_date: string;
  payment_count?: number;
  has_invoice: boolean;
};

type BillingStats = {
  total_expected: number;
  collected: number;
  outstanding: number;
  paid_count: number;
  pending_count: number;
  month_count: number;
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

const statusBadge = (s: string) => {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    paid: { bg: "#d4ede3", color: "#1a5040", label: "Paid" },
    partial: { bg: "#ede8fc", color: "#6b3ea8", label: "Partial" },
    pending: { bg: "#fef3d7", color: "#c07b1a", label: "Pending" },
    overdue: { bg: "#fceaea", color: "#b83030", label: "Overdue" },
  };
  const st = map[s] || map.pending;
  return (
    <span style={{ fontSize: 10.5, fontWeight: 600, padding: "2px 8px", borderRadius: 99, background: st.bg, color: st.color }}>
      {st.label}
    </span>
  );
};

type Props = {
  instituteId: string;
  onBillingChange?: () => void;
};

export function InstituteBillingSection({ instituteId, onBillingChange }: Props) {
  const toast = useToast();
  const [rows, setRows] = useState<BillingRow[]>([]);
  const [stats, setStats] = useState<BillingStats>({
    total_expected: 0, collected: 0, outstanding: 0,
    paid_count: 0, pending_count: 0, month_count: 0,
  });
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [periodLabel, setPeriodLabel] = useState("");
  const [updating, setUpdating] = useState(false);

  const [showPayModal, setShowPayModal] = useState(false);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeRow, setActiveRow] = useState<BillingRow | null>(null);
  const [referenceNote, setReferenceNote] = useState("");
  const [editForm, setEditForm] = useState({ amount: "", due_date: "", reference_note: "" });
  const [manualInvoice, setManualInvoice] = useState({ month: "", amount: "", transfer: "", due_date: "", reference: "", applyAdvance: true });
  const [manualSlip, setManualSlip] = useState<File | null>(null);

  // Editable partial-payment records for the Edit modal.
  type EditPayment = { id: number; amount: string; reference_note: string; is_advance: boolean; created_at: string; slip_url: string | null; _removed?: boolean };
  const [editPayments, setEditPayments] = useState<EditPayment[]>([]);
  const [origPayments, setOrigPayments] = useState<EditPayment[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);

  const yearOptions = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 1 + i);
  const selectedMonthLabel = MONTHS.find(m => m.value === month)?.label || "";

  const load = () => {
    setLoading(true);
    const params = `institute=${instituteId}&year=${year}&month=${month}&view=monthly`;
    api.get(`/api/admin/billing/invoices/institute_billing?${params}`)
      .then(r => {
        setRows(r.data.results || []);
        if (r.data.stats) setStats(r.data.stats);
        if (r.data.period?.label) setPeriodLabel(r.data.period.label);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(load, [instituteId, year, month]);

  const billingPeriod = (row: BillingRow) => {
    const d = new Date(row.month);
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  };

  const refreshAll = () => {
    load();
    onBillingChange?.();
  };

  const handleMarkPaid = async () => {
    if (!activeRow) return;
    setUpdating(true);
    try {
      const period = billingPeriod(activeRow);
      if (activeRow.invoice_id) {
        await api.patch(`/api/admin/billing/invoices/${activeRow.invoice_id}`, {
          status: "paid",
          reference_note: referenceNote,
        });
      } else {
        await api.post("/api/admin/billing/invoices/ensure_status", {
          institute: instituteId,
          year: period.year,
          month: period.month,
          status: "paid",
          reference_note: referenceNote,
        });
      }
      setShowPayModal(false);
      setReferenceNote("");
      setActiveRow(null);
      refreshAll();
      toast.success("Invoice marked as paid.");
    } catch {
      toast.error("Couldn't mark the invoice as paid.");
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
      refreshAll();
      toast.success("Invoice reverted to pending.");
    } catch {
      toast.error("Couldn't revert the invoice to pending.");
    } finally {
      setUpdating(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!activeRow) return;
    setUpdating(true);
    try {
      const period = billingPeriod(activeRow);
      let invoiceId = activeRow.invoice_id;

      if (!invoiceId) {
        const created = await api.post("/api/admin/billing/invoices/ensure_status", {
          institute: instituteId,
          year: period.year,
          month: period.month,
          status: "pending",
        });
        invoiceId = created.data.id;
      }

      await api.patch(`/api/admin/billing/invoices/${invoiceId}`, {
        amount: editForm.amount,
        due_date: editForm.due_date,
        reference_note: editForm.reference_note,
      });

      // Apply edits/removals to the individual partial-payment records last, so
      // the invoice's paid total + status recompute against the updated amount.
      for (const p of editPayments) {
        const orig = origPayments.find(o => o.id === p.id);
        if (p._removed) {
          await api.delete(`/api/admin/billing/invoices/${invoiceId}/payments/${p.id}`);
        } else if (orig && (orig.amount !== p.amount || orig.reference_note !== p.reference_note)) {
          await api.patch(`/api/admin/billing/invoices/${invoiceId}/payments/${p.id}`, {
            amount: p.amount,
            reference_note: p.reference_note,
          });
        }
      }

      setShowEditModal(false);
      setActiveRow(null);
      setEditPayments([]);
      setOrigPayments([]);
      refreshAll();
      toast.success("Invoice updated successfully.");
    } catch {
      toast.error("Couldn't save the invoice changes.");
    } finally {
      setUpdating(false);
    }
  };

  const manualRemaining = Math.max(Number(manualInvoice.amount || 0) - Number(manualInvoice.transfer || 0), 0);

  const handleCreateInvoice = async () => {
    if (!manualInvoice.month || !manualInvoice.amount) {
      toast.error("Please choose a month and enter the invoice amount.");
      return;
    }
    const [y, m] = manualInvoice.month.split("-");
    setUpdating(true);
    try {
      const transfer = Number(manualInvoice.transfer || 0);
      if (transfer > 0) {
        // Same unified flow as the Invoices screen: record the transfer (with
        // document) so partial/paid/advance is handled consistently.
        const fd = new FormData();
        fd.append("institute", instituteId);
        fd.append("year", y);
        fd.append("month", String(Number(m)));
        fd.append("amount", manualInvoice.amount);
        fd.append("payment_amount", manualInvoice.transfer);
        if (manualInvoice.due_date) fd.append("due_date", manualInvoice.due_date);
        fd.append("reference_note", manualInvoice.reference);
        fd.append("apply_advance", manualInvoice.applyAdvance ? "true" : "false");
        if (manualSlip) fd.append("payment_slip", manualSlip);
        await api.post("/api/admin/billing/invoices/record_payment", fd);
        toast.success(manualRemaining > 0
          ? `Invoice added. Partial — LKR ${manualRemaining.toLocaleString()} balance due by ${manualInvoice.due_date || "due date"}.`
          : "Invoice added and marked paid.");
      } else {
        // No transfer yet — create a pending invoice for the month.
        await api.post("/api/admin/billing/invoices", {
          institute: instituteId,
          month: `${manualInvoice.month}-01`,
          amount: manualInvoice.amount,
          due_date: manualInvoice.due_date || undefined,
          status: "pending",
        });
        toast.success("Pending invoice created.");
      }
      setShowAddModal(false);
      setManualInvoice({ month: "", amount: "", transfer: "", due_date: "", reference: "", applyAdvance: true });
      setManualSlip(null);
      refreshAll();
    } catch {
      toast.error("Couldn't create the invoice. Please try again.");
    } finally {
      setUpdating(false);
    }
  };

  const openEdit = (row: BillingRow) => {
    setActiveRow(row);
    setEditForm({
      amount: row.amount,
      due_date: row.due_date,
      reference_note: row.reference_note || "",
    });
    setEditPayments([]);
    setOrigPayments([]);
    setShowEditModal(true);
    // Load the recorded transfers so already-paid (partial) details are editable.
    if (row.invoice_id) {
      setLoadingPayments(true);
      api.get(`/api/admin/billing/invoices/${row.invoice_id}/payments`)
        .then(r => {
          const list: EditPayment[] = (r.data.results || []).map((p: EditPayment) => ({
            id: p.id, amount: String(p.amount), reference_note: p.reference_note || "",
            is_advance: p.is_advance, created_at: p.created_at, slip_url: p.slip_url,
          }));
          setEditPayments(list);
          setOrigPayments(list.map(p => ({ ...p })));
          setLoadingPayments(false);
        })
        .catch(() => setLoadingPayments(false));
    }
  };

  const updateEditPayment = (id: number, field: "amount" | "reference_note", value: string) =>
    setEditPayments(prev => prev.map(p => (p.id === id ? { ...p, [field]: value } : p)));

  const toggleRemovePayment = (id: number) =>
    setEditPayments(prev => prev.map(p => (p.id === id ? { ...p, _removed: !p._removed } : p)));

  const editPaidTotal = editPayments
    .filter(p => !p._removed)
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const rowMonthLabel = (row: BillingRow) =>
    new Date(row.month).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink3)", letterSpacing: ".06em", textTransform: "uppercase" }}>
          Billing &amp; Invoices
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <select className="sel-f" value={year} onChange={e => setYear(e.target.value)}>
            {yearOptions.map(y => <option key={y} value={String(y)}>{y}</option>)}
          </select>
          <select className="sel-f" value={month} onChange={e => setMonth(e.target.value)}>
            {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <button className="btn btn-s btn-sm" onClick={() => setShowAddModal(true)}>+ Add invoice</button>
        </div>
      </div>

      <div style={{ fontSize: 12, color: "var(--ink3)", marginBottom: 12 }}>
        Payment status for <strong>{selectedMonthLabel} {year}</strong>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 14 }}>
        {[
          { label: "Expected", val: stats.total_expected, sub: periodLabel, color: "var(--tc)" },
          { label: "Collected", val: stats.collected, sub: `${stats.paid_count} paid`, color: "var(--jd)" },
          { label: "Outstanding", val: stats.outstanding, sub: `${stats.pending_count} unpaid`, color: "var(--rb)" },
        ].map(k => (
          <div key={k.label} className="card" style={{ padding: "12px 14px", borderTop: `3px solid ${k.color}` }}>
            <div style={{ fontSize: 10, color: "var(--ink3)", fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>{k.label}</div>
            <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "var(--font-mono)", color: k.color }}>
              LKR {k.val.toLocaleString()}
            </div>
            <div style={{ fontSize: 10, color: "var(--ink3)", marginTop: 2 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="card" style={{ textAlign: "center", color: "var(--ink3)", padding: 24 }}>Loading billing...</div>
      ) : rows.length > 0 ? (
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th>Month</th>
                <th>Amount (LKR)</th>
                <th>Due date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.month}>
                  <td style={{ fontWeight: 600 }}>{rowMonthLabel(row)}</td>
                  <td className="mono">{Number(row.amount).toLocaleString()}</td>
                  <td className="mono" style={{ color: "var(--ink3)" }}>{row.due_date}</td>
                  <td>
                    {statusBadge(row.status)}
                    {row.status === "partial" && (
                      <div style={{ fontSize: 10, color: "#9a5b14", marginTop: 4 }}>
                        Paid LKR {Number(row.paid_amount || 0).toLocaleString()} ·
                        Bal LKR {Math.max(Number(row.amount) - Number(row.paid_amount || 0), 0).toLocaleString()}
                      </div>
                    )}
                    {(row.payment_count ?? 0) > 0 && (
                      <div style={{ fontSize: 10, color: "var(--ink3)", marginTop: 3 }}>
                        {row.payment_count} payment{(row.payment_count ?? 0) !== 1 ? "s" : ""} recorded
                      </div>
                    )}
                    {row.reference_note && (
                      <div style={{ fontSize: 10, color: "var(--ink3)", marginTop: 4 }}>Ref: {row.reference_note}</div>
                    )}
                    {row.paid_at && (
                      <div style={{ fontSize: 10, color: "var(--ink3)", marginTop: 4 }}>
                        Paid {new Date(row.paid_at).toLocaleDateString()}
                      </div>
                    )}
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {row.invoice_id && (
                        <Link href={`/invoices/${row.invoice_id}`} className="btn btn-xs btn-s">Details</Link>
                      )}
                      <button className="btn btn-xs btn-s" onClick={() => openEdit(row)}>Edit</button>
                      {row.status !== "paid" ? (
                        <button className="btn btn-xs btn-ok" onClick={() => { setActiveRow(row); setReferenceNote(""); setShowPayModal(true); }}>
                          Mark paid
                        </button>
                      ) : (
                        <button
                          className="btn btn-xs btn-s"
                          onClick={() => { setActiveRow(row); setShowPendingModal(true); }}
                          disabled={!row.invoice_id}
                        >
                          Mark pending
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card" style={{ textAlign: "center", color: "var(--ink3)", padding: 24 }}>
          No billing records for this period
        </div>
      )}

      <Modal open={showPayModal} onClose={() => setShowPayModal(false)} title="Confirm Payment" footer={
        <>
          <button className="btn btn-s btn-sm" onClick={() => setShowPayModal(false)} disabled={updating}>Cancel</button>
          <button className="btn btn-ok btn-sm" onClick={handleMarkPaid} disabled={updating}>
            {updating ? "Saving..." : "Confirm & Mark Paid"}
          </button>
        </>
      }>
        <div className="form-gap">
          {activeRow && (
            <div style={{ fontSize: 13, color: "var(--ink2)", marginBottom: 4 }}>
              {rowMonthLabel(activeRow)} — LKR {Number(activeRow.amount).toLocaleString()}
            </div>
          )}
          <div>
            <label className="flbl">Payslip Reference / Note (Optional)</label>
            <input value={referenceNote} onChange={e => setReferenceNote(e.target.value)} placeholder="e.g. WhatsApp Slip #123456" autoFocus />
          </div>
        </div>
      </Modal>

      <Modal open={showPendingModal} onClose={() => setShowPendingModal(false)} title="Revert to Pending" footer={
        <>
          <button className="btn btn-s btn-sm" onClick={() => setShowPendingModal(false)} disabled={updating}>Cancel</button>
          <button className="btn btn-p btn-sm" onClick={handleMarkPending} disabled={updating}>
            {updating ? "Saving..." : "Confirm & Mark Pending"}
          </button>
        </>
      }>
        <div style={{ fontSize: 12, color: "var(--ink3)", lineHeight: 1.5 }}>
          This will undo the paid status and remove the Platform Fee from the institute&apos;s Accounts ledger.
        </div>
      </Modal>

      <Modal open={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Invoice" footer={
        <>
          <button className="btn btn-s btn-sm" onClick={() => setShowEditModal(false)} disabled={updating}>Cancel</button>
          <button className="btn btn-p btn-sm" onClick={handleSaveEdit} disabled={updating}>
            {updating ? "Saving..." : "Save changes"}
          </button>
        </>
      }>
        <div className="form-gap">
          {activeRow && (
            <div style={{ fontSize: 13, color: "var(--ink2)", marginBottom: 4 }}>
              <strong>{rowMonthLabel(activeRow)}</strong>
              {!activeRow.has_invoice && (
                <span style={{ fontSize: 11, color: "var(--ink3)", marginLeft: 8 }}>— invoice will be created on save</span>
              )}
            </div>
          )}
          <div>
            <label className="flbl">Amount (LKR)</label>
            <input type="number" value={editForm.amount} onChange={e => setEditForm({ ...editForm, amount: e.target.value })} />
          </div>
          <div>
            <label className="flbl">Due date</label>
            <input type="date" value={editForm.due_date} onChange={e => setEditForm({ ...editForm, due_date: e.target.value })} />
          </div>
          <div>
            <label className="flbl">Reference note</label>
            <input value={editForm.reference_note} onChange={e => setEditForm({ ...editForm, reference_note: e.target.value })} placeholder="Optional payment reference" />
          </div>

          {/* Editable partial-payment records */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <label className="flbl" style={{ marginBottom: 0 }}>Recorded payments</label>
              {editPayments.filter(p => !p._removed).length > 0 && (
                <span style={{ fontSize: 11, color: "var(--ink3)" }}>
                  Paid LKR {editPaidTotal.toLocaleString()} of LKR {Number(editForm.amount || 0).toLocaleString()}
                </span>
              )}
            </div>

            {loadingPayments ? (
              <div style={{ fontSize: 12, color: "var(--ink3)", padding: "8px 0" }}>Loading payments…</div>
            ) : editPayments.length === 0 ? (
              <div style={{ fontSize: 12, color: "var(--ink3)", background: "var(--cr)", borderRadius: 8, padding: "10px 12px" }}>
                No payments recorded for this month yet.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {editPayments.map((p, idx) => (
                  <div key={p.id} style={{
                    display: "flex", gap: 8, alignItems: "center",
                    padding: "8px 10px", borderRadius: 8,
                    border: "1px solid var(--ln)",
                    background: p._removed ? "var(--rb-l)" : "#fff",
                    opacity: p._removed ? 0.6 : 1,
                  }}>
                    <span style={{ fontSize: 11, color: "var(--ink3)", fontWeight: 600, width: 16 }}>{idx + 1}</span>
                    <div style={{ width: 120 }}>
                      <input type="number" value={p.amount} disabled={p._removed}
                        onChange={e => updateEditPayment(p.id, "amount", e.target.value)}
                        style={{ height: 32, fontSize: 12.5 }} placeholder="Amount" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <input value={p.reference_note} disabled={p._removed}
                        onChange={e => updateEditPayment(p.id, "reference_note", e.target.value)}
                        style={{ height: 32, fontSize: 12.5 }} placeholder="Reference" />
                    </div>
                    {p.is_advance && <span className="bdg b-trial">adv</span>}
                    {p.slip_url && (
                      <a href={p.slip_url} target="_blank" rel="noopener noreferrer" className="btn btn-xs btn-s" style={{ textDecoration: "none" }}>Doc</a>
                    )}
                    <button type="button" className={`btn btn-xs ${p._removed ? "btn-s" : "btn-d"}`}
                      onClick={() => toggleRemovePayment(p.id)}>
                      {p._removed ? "Undo" : "Remove"}
                    </button>
                  </div>
                ))}
                <div style={{ fontSize: 11, color: "var(--ink3)", lineHeight: 1.5 }}>
                  Editing amounts recomputes the paid total and status (partial / paid) automatically.
                  Removing a record reduces the paid amount.
                </div>
              </div>
            )}
          </div>
        </div>
      </Modal>

      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Add invoice" footer={
        <>
          <button className="btn btn-s btn-sm" onClick={() => setShowAddModal(false)} disabled={updating}>Cancel</button>
          <button className="btn btn-p btn-sm" onClick={handleCreateInvoice} disabled={updating}>
            {updating ? "Saving..." : "Add invoice"}
          </button>
        </>
      }>
        <div className="form-gap">
          <div className="field-row">
            <div>
              <label className="flbl">Billing month *</label>
              <input type="month" value={manualInvoice.month} onChange={e => setManualInvoice({ ...manualInvoice, month: e.target.value })} autoFocus />
            </div>
            <div>
              <label className="flbl">Invoice amount (LKR) *</label>
              <input type="number" value={manualInvoice.amount} onChange={e => setManualInvoice({ ...manualInvoice, amount: e.target.value })} placeholder="e.g. 3000" />
            </div>
          </div>
          <div>
            <label className="flbl">Transferred amount (LKR)</label>
            <input type="number" value={manualInvoice.transfer} onChange={e => setManualInvoice({ ...manualInvoice, transfer: e.target.value })} placeholder="Leave blank to create a pending invoice" />
          </div>

          {manualRemaining > 0 && Number(manualInvoice.transfer || 0) > 0 && (
            <div style={{
              background: "var(--sf-l)", border: "1px solid #f3d3b3", borderRadius: 10,
              padding: "10px 12px", fontSize: 12, color: "#9a5b14", lineHeight: 1.5,
            }}>
              Partial payment — <strong>LKR {manualRemaining.toLocaleString()}</strong> balance remains.
              Set the date this balance must be settled by:
              <div style={{ marginTop: 8 }}>
                <input type="date" value={manualInvoice.due_date} onChange={e => setManualInvoice({ ...manualInvoice, due_date: e.target.value })} />
              </div>
            </div>
          )}

          {!(manualRemaining > 0 && Number(manualInvoice.transfer || 0) > 0) && (
            <div>
              <label className="flbl">Due date</label>
              <input type="date" value={manualInvoice.due_date} onChange={e => setManualInvoice({ ...manualInvoice, due_date: e.target.value })} />
            </div>
          )}

          <div>
            <label className="flbl">Transfer document / payslip</label>
            <input type="file" accept="image/*,.pdf" onChange={e => setManualSlip(e.target.files?.[0] || null)} />
          </div>
          <div>
            <label className="flbl">Reference note (optional)</label>
            <input value={manualInvoice.reference} onChange={e => setManualInvoice({ ...manualInvoice, reference: e.target.value })} placeholder="e.g. Bank transfer ref #889201" />
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--ink2)" }}>
            <input type="checkbox" checked={manualInvoice.applyAdvance} onChange={e => setManualInvoice({ ...manualInvoice, applyAdvance: e.target.checked })} />
            If they paid extra, carry the surplus to upcoming month(s) as advance
          </label>
        </div>
      </Modal>
    </div>
  );
}
