"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { Topbar } from "@/components/layout/Topbar";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/ToastProvider";
import { api } from "@/lib/api";

type Invoice = {
  id: number;
  institute: number;
  institute_name: string;
  amount: string;
  paid_amount: string;
  month: string;
  status: string;
  paid_at: string | null;
  due_date: string;
  reference_note: string | null;
  payment_slip_url: string | null;
  created_at: string;
};

type Activity = {
  id: number;
  action: string;
  action_label: string;
  detail: string;
  actor: string;
  amount_snapshot: string | null;
  created_at: string;
};

type DetailResponse = {
  invoice: Invoice;
  institute: { id: number; name: string; plan: string; subdomain: string; status: string };
  breakdown: { amount: number; paid: number; remaining: number; month: string; month_label: string; status: string };
  activities: Activity[];
};

const PLAN_LABELS: Record<string, string> = { solo: "Solo", institute: "Institute", institute_pro: "Pro" };

const statusBadge = (s: string) => {
  const map: Record<string, JSX.Element> = {
    paid: <span className="bdg b-paid">Paid</span>,
    partial: <span className="bdg" style={{ background: "#ede8fc", color: "#6b3ea8" }}>Partial</span>,
    pending: <span className="bdg b-due">Pending</span>,
    overdue: <span className="bdg b-over">Overdue</span>,
  };
  return map[s] || <span className="bdg b-due">{s}</span>;
};

const ACTION_META: Record<string, { color: string; dot: string }> = {
  created: { color: "var(--ink3)", dot: "var(--ink3)" },
  payment_recorded: { color: "var(--jd)", dot: "var(--jd)" },
  marked_paid: { color: "var(--jd)", dot: "var(--jd)" },
  reverted_pending: { color: "var(--sf)", dot: "var(--sf)" },
  status_changed: { color: "var(--ac)", dot: "var(--ac)" },
  amount_changed: { color: "var(--tc)", dot: "var(--tc)" },
  slip_uploaded: { color: "var(--sp)", dot: "var(--sp)" },
  advance_applied: { color: "var(--tc)", dot: "var(--tc)" },
};

const fmt = (n: number) => `LKR ${Math.round(n).toLocaleString()}`;

export default function InvoiceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const toast = useToast();
  const id = params.id as string;

  const [data, setData] = useState<DetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const [showPay, setShowPay] = useState(false);
  const [showPaid, setShowPaid] = useState(false);
  const [showRevert, setShowRevert] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  const [paymentAmount, setPaymentAmount] = useState("");
  const [referenceNote, setReferenceNote] = useState("");
  const [applyAdvance, setApplyAdvance] = useState(true);
  const [paymentSlip, setPaymentSlip] = useState<File | null>(null);
  const [editForm, setEditForm] = useState({ amount: "", due_date: "", reference_note: "" });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    setLoading(true);
    api.get(`/api/admin/billing/invoices/${id}/detail`)
      .then(r => { setData(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const period = () => {
    const d = new Date(data!.invoice.month);
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  };

  const openPay = () => {
    if (!data) return;
    setPaymentAmount(String(data.breakdown.remaining || data.breakdown.amount));
    setReferenceNote(data.invoice.reference_note || "");
    setApplyAdvance(true);
    setPaymentSlip(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setShowPay(true);
  };

  const openEdit = () => {
    if (!data) return;
    setEditForm({
      amount: data.invoice.amount,
      due_date: data.invoice.due_date,
      reference_note: data.invoice.reference_note || "",
    });
    setShowEdit(true);
  };

  const handleRecordPayment = async () => {
    if (!data || !paymentAmount) return;
    setUpdating(true);
    try {
      const p = period();
      const form = new FormData();
      form.append("institute", String(data.invoice.institute));
      form.append("year", String(p.year));
      form.append("month", String(p.month));
      form.append("payment_amount", paymentAmount);
      form.append("reference_note", referenceNote);
      form.append("apply_advance", applyAdvance ? "true" : "false");
      if (paymentSlip) form.append("payment_slip", paymentSlip);
      const res = await api.post("/api/admin/billing/invoices/record_payment", form);
      if ((res.data.advance_applied || []).length > 0) {
        toast.success(`Payment recorded. LKR ${res.data.overflow} applied as advance to upcoming month(s).`);
      } else {
        toast.success("Payment recorded successfully.");
      }
      setShowPay(false); load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg || "Couldn't record the payment. Please try again.");
    } finally { setUpdating(false); }
  };

  const handleMarkPaid = async () => {
    if (!data) return;
    setUpdating(true);
    try {
      await api.patch(`/api/admin/billing/invoices/${data.invoice.id}`, { status: "paid", reference_note: referenceNote });
      setShowPaid(false); setReferenceNote(""); load();
      toast.success("Invoice marked as paid.");
    } catch { toast.error("Couldn't mark the invoice as paid."); }
    finally { setUpdating(false); }
  };

  const handleRevert = async () => {
    if (!data) return;
    setUpdating(true);
    try {
      await api.patch(`/api/admin/billing/invoices/${data.invoice.id}`, { status: "pending", reference_note: "" });
      setShowRevert(false); load();
      toast.success("Invoice reverted to pending.");
    } catch { toast.error("Couldn't revert the invoice."); }
    finally { setUpdating(false); }
  };

  const handleSaveEdit = async () => {
    if (!data) return;
    setUpdating(true);
    try {
      await api.patch(`/api/admin/billing/invoices/${data.invoice.id}`, {
        amount: editForm.amount,
        due_date: editForm.due_date,
        reference_note: editForm.reference_note,
      });
      setShowEdit(false); load();
      toast.success("Invoice updated successfully.");
    } catch { toast.error("Couldn't save the invoice changes."); }
    finally { setUpdating(false); }
  };

  if (loading) return <PageShell><div style={{ padding: 60, textAlign: "center", color: "var(--ink3)" }}>Loading invoice…</div></PageShell>;
  if (!data) return <PageShell><div style={{ padding: 60, textAlign: "center", color: "var(--ink3)" }}>Invoice not found</div></PageShell>;

  const { invoice, institute, breakdown, activities } = data;
  const collectedPct = breakdown.amount ? Math.round((breakdown.paid / breakdown.amount) * 100) : 0;
  const slipIsImage = invoice.payment_slip_url && /\.(png|jpe?g|gif|webp)$/i.test(invoice.payment_slip_url);

  return (
    <PageShell>
      <Topbar
        title={`Invoice · ${breakdown.month_label}`}
        subtitle={`${institute.name} · ${institute.subdomain}.tuitionos.lk`}
        crumbs={[
          { label: "Invoices", onClick: () => router.push("/invoices") },
          { label: breakdown.month_label },
        ]}
        right={
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-s btn-sm" onClick={openEdit}>Edit invoice</button>
            {breakdown.status !== "paid" ? (
              <button className="btn btn-ok btn-sm" onClick={openPay}>Record payment</button>
            ) : (
              <button className="btn btn-s btn-sm" onClick={() => setShowRevert(true)}>Revert to pending</button>
            )}
          </div>
        }
      />
      <div className="pb fi">
        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 14, marginBottom: 14 }}>
          {/* Summary card */}
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 11, color: "var(--ink3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em" }}>Billing period</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "var(--ink)", marginTop: 2 }}>{breakdown.month_label}</div>
              </div>
              {statusBadge(breakdown.status)}
            </div>

            <div className="g3" style={{ marginBottom: 16 }}>
              {[
                { lbl: "Amount due", val: fmt(breakdown.amount), color: "var(--ink)" },
                { lbl: "Paid", val: fmt(breakdown.paid), color: "var(--jd)" },
                { lbl: "Remaining", val: fmt(breakdown.remaining), color: breakdown.remaining > 0 ? "var(--rb)" : "var(--ink3)" },
              ].map(b => (
                <div key={b.lbl} style={{ padding: "10px 12px", background: "var(--cr)", borderRadius: 10 }}>
                  <div style={{ fontSize: 9.5, color: "var(--ink3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 4 }}>{b.lbl}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "var(--font-mono)", color: b.color }}>{b.val}</div>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <span style={{ fontSize: 11.5, color: "var(--ink2)", fontWeight: 500 }}>Collection progress</span>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--jd)" }}>{collectedPct}%</span>
              </div>
              <div style={{ height: 8, background: "var(--cr-d)", borderRadius: 99, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${collectedPct}%`, background: "var(--jd)", borderRadius: 99, transition: "width .5s" }} />
              </div>
            </div>

            <hr className="dv" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[
                { label: "Plan", val: PLAN_LABELS[institute.plan] || institute.plan },
                { label: "Due date", val: invoice.due_date },
                { label: "Paid at", val: invoice.paid_at ? new Date(invoice.paid_at).toLocaleString() : "—" },
                { label: "Reference", val: invoice.reference_note || "—" },
              ].map(r => (
                <div key={r.label} style={{ padding: "8px 10px", background: "var(--cr)", borderRadius: 8 }}>
                  <div style={{ fontSize: 9.5, color: "var(--ink3)", fontWeight: 600, letterSpacing: ".05em", textTransform: "uppercase", marginBottom: 1 }}>{r.label}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)", wordBreak: "break-word" }}>{r.val}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Payment slip card */}
          <div className="card">
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink3)", letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 12 }}>Payment slip</div>
            {invoice.payment_slip_url ? (
              <div>
                {slipIsImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={invoice.payment_slip_url} alt="Payment slip" style={{ width: "100%", borderRadius: 10, border: "1px solid var(--ln)", maxHeight: 240, objectFit: "cover" }} />
                ) : (
                  <div style={{ padding: "24px", background: "var(--cr)", borderRadius: 10, textAlign: "center", color: "var(--ink3)", fontSize: 12 }}>
                    PDF / document attached
                  </div>
                )}
                <a href={invoice.payment_slip_url} target="_blank" rel="noopener noreferrer" className="btn btn-s btn-sm" style={{ marginTop: 10, width: "100%", justifyContent: "center" }}>
                  Open full slip
                </a>
              </div>
            ) : (
              <div style={{ padding: "32px 16px", background: "var(--cr)", borderRadius: 10, textAlign: "center", color: "var(--ink3)", fontSize: 12.5 }}>
                No slip uploaded yet.
                {breakdown.status !== "paid" && (
                  <div style={{ marginTop: 10 }}>
                    <button className="btn btn-ok btn-xs" onClick={openPay}>Record payment + upload</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Activity timeline */}
        <div className="card">
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink3)", letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 16 }}>
            Activity log · {activities.length} event{activities.length !== 1 ? "s" : ""}
          </div>
          {activities.length === 0 ? (
            <div style={{ textAlign: "center", color: "var(--ink3)", padding: 20, fontSize: 12.5 }}>No activity recorded yet.</div>
          ) : (
            <div style={{ position: "relative", paddingLeft: 4 }}>
              {activities.map((a, i) => {
                const meta = ACTION_META[a.action] || ACTION_META.created;
                return (
                  <div key={a.id} style={{ display: "flex", gap: 12, position: "relative", paddingBottom: i === activities.length - 1 ? 0 : 18 }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <span style={{ width: 11, height: 11, borderRadius: "50%", background: meta.dot, border: "2px solid #fff", boxShadow: `0 0 0 1px ${meta.dot}`, flexShrink: 0, marginTop: 2 }} />
                      {i !== activities.length - 1 && <span style={{ flex: 1, width: 2, background: "var(--ln)", marginTop: 3 }} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: meta.color }}>{a.action_label}</span>
                        <span style={{ fontSize: 10.5, color: "var(--ink3)", fontFamily: "var(--font-mono)" }}>
                          {new Date(a.created_at).toLocaleString()}
                        </span>
                      </div>
                      {a.detail && <div style={{ fontSize: 12, color: "var(--ink2)", marginTop: 2 }}>{a.detail}</div>}
                      <div style={{ fontSize: 10.5, color: "var(--ink3)", marginTop: 3 }}>by {a.actor}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Record payment modal */}
      <Modal open={showPay} onClose={() => setShowPay(false)} title="Record Payment" footer={
        <>
          <button className="btn btn-s btn-sm" onClick={() => setShowPay(false)} disabled={updating}>Cancel</button>
          <button className="btn btn-ok btn-sm" onClick={handleRecordPayment} disabled={updating}>{updating ? "Saving..." : "Save payment"}</button>
        </>
      }>
        <div className="form-gap">
          <div style={{ fontSize: 12, color: "var(--ink3)" }}>
            Due {fmt(breakdown.amount)} · Paid {fmt(breakdown.paid)} · Remaining {fmt(breakdown.remaining)}
          </div>
          <div>
            <label className="flbl">Payment amount (LKR)</label>
            <input type="number" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} autoFocus />
          </div>
          <div>
            <label className="flbl">Payslip / document</label>
            <input ref={fileInputRef} type="file" accept="image/*,.pdf" onChange={e => setPaymentSlip(e.target.files?.[0] || null)} />
          </div>
          <div>
            <label className="flbl">Reference note (optional)</label>
            <input value={referenceNote} onChange={e => setReferenceNote(e.target.value)} placeholder="e.g. WhatsApp Slip #123456" />
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--ink2)" }}>
            <input type="checkbox" checked={applyAdvance} onChange={e => setApplyAdvance(e.target.checked)} style={{ width: "auto" }} />
            Apply extra amount to upcoming month(s) as partial advance
          </label>
        </div>
      </Modal>

      {/* Mark paid modal */}
      <Modal open={showPaid} onClose={() => setShowPaid(false)} title="Confirm Payment" footer={
        <>
          <button className="btn btn-s btn-sm" onClick={() => setShowPaid(false)} disabled={updating}>Cancel</button>
          <button className="btn btn-ok btn-sm" onClick={handleMarkPaid} disabled={updating}>{updating ? "Saving..." : "Confirm & Mark Paid"}</button>
        </>
      }>
        <div className="form-gap">
          <div>
            <label className="flbl">Payslip Reference / Note (Optional)</label>
            <input value={referenceNote} onChange={e => setReferenceNote(e.target.value)} placeholder="e.g. WhatsApp Slip #123456" autoFocus />
          </div>
        </div>
      </Modal>

      {/* Revert modal */}
      <Modal open={showRevert} onClose={() => setShowRevert(false)} title="Revert to Pending" footer={
        <>
          <button className="btn btn-s btn-sm" onClick={() => setShowRevert(false)} disabled={updating}>Cancel</button>
          <button className="btn btn-p btn-sm" onClick={handleRevert} disabled={updating}>{updating ? "Saving..." : "Confirm & Mark Pending"}</button>
        </>
      }>
        <div style={{ fontSize: 12, color: "var(--ink3)", lineHeight: 1.5 }}>
          This will undo the paid status and remove the Platform Fee expense from the institute&apos;s Accounts ledger.
        </div>
      </Modal>

      {/* Edit modal */}
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Edit Invoice" footer={
        <>
          <button className="btn btn-s btn-sm" onClick={() => setShowEdit(false)} disabled={updating}>Cancel</button>
          <button className="btn btn-p btn-sm" onClick={handleSaveEdit} disabled={updating}>{updating ? "Saving..." : "Save changes"}</button>
        </>
      }>
        <div className="form-gap">
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
        </div>
      </Modal>
    </PageShell>
  );
}
