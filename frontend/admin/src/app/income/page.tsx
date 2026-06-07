"use client";
import { useState, useEffect } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { PageShell } from "@/components/layout/PageShell";
import { Modal } from "@/components/ui/Modal";
import { api } from "@/lib/api";

type MonthlyPayment = {
  institute: number;
  institute_name: string;
  plan: string;
  registered_at: string;
  invoice_id: number | null;
  amount: string;
  month: string;
  status: string;
  paid_at: string | null;
  reference_note?: string | null;
  has_invoice: boolean;
};

type Invoice = {
  id: number;
  institute: number;
  institute_name: string;
  amount: string;
  month: string;
  status: string;
  paid_at: string | null;
  reference_note?: string | null;
};

type Stats = {
  total_expected?: number;
  collected: number;
  outstanding: number;
  paid_count?: number;
  pending_count?: number;
  institute_count?: number;
  total_mrr?: number;
};

const PLAN_LABELS: Record<string, string> = {
  solo: "Solo",
  institute: "Institute",
  institute_pro: "Pro",
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
  const map: Record<string, JSX.Element> = {
    paid: <span className="bdg b-paid">Paid</span>,
    pending: <span className="bdg b-due">Pending</span>,
    overdue: <span className="bdg b-over">Overdue</span>,
  };
  return map[s] || <span className="bdg b-due">{s}</span>;
};

export default function IncomePage() {
  const [monthlyRows, setMonthlyRows] = useState<MonthlyPayment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState("all");
  const [month, setMonth] = useState("all");
  const [stats, setStats] = useState<Stats>({ collected: 0, outstanding: 0 });
  const [periodLabel, setPeriodLabel] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [meta, setMeta] = useState({ total_count: 0, total_pages: 1 });
  const [showPayModal, setShowPayModal] = useState(false);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [activeRow, setActiveRow] = useState<MonthlyPayment | null>(null);
  const [activeInvoice, setActiveInvoice] = useState<Invoice | null>(null);
  const [referenceNote, setReferenceNote] = useState("");
  const [updating, setUpdating] = useState(false);

  const isYearView = year !== "all";
  const isYearlyView = isYearView && month === "all";

  const load = () => {
    setLoading(true);
    const url = isYearView
      ? `/api/admin/billing/invoices/monthly_overview?year=${year}&month=${month}&page=${page}&limit=${limit}`
      : `/api/admin/billing/invoices?page=${page}&limit=${limit}&year=${year}&month=${month}`;

    api.get(url).then(r => {
      const d = r.data;
      if (isYearView) {
        setMonthlyRows(d.results || []);
        setInvoices([]);
        if (d.period?.label) setPeriodLabel(d.period.label);
        if (d.stats) {
          setStats({
            total_expected: d.stats.total_expected,
            collected: d.stats.collected,
            outstanding: d.stats.outstanding,
            paid_count: d.stats.paid_count,
            pending_count: d.stats.pending_count,
            institute_count: d.stats.institute_count,
          });
        }
      } else {
        setInvoices(Array.isArray(d) ? d : d.results || []);
        setMonthlyRows([]);
        setPeriodLabel("");
        if (d.stats) {
          setStats({
            total_mrr: d.stats.total_mrr,
            collected: d.stats.collected,
            outstanding: d.stats.outstanding,
          });
        }
      }
      if (d.total_count !== undefined) {
        setMeta({ total_count: d.total_count, total_pages: d.total_pages });
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(load, [page, limit, year, month, isYearView]);

  const billingPeriodFromRow = (row: MonthlyPayment) => {
    const d = new Date(row.month);
    return {
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      label: d.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    };
  };

  const handleMarkPaid = async () => {
    setUpdating(true);
    try {
      if (isYearView && activeRow) {
        if (activeRow.invoice_id) {
          await api.patch(`/api/admin/billing/invoices/${activeRow.invoice_id}`, {
            status: "paid",
            reference_note: referenceNote,
          });
        } else {
          const period = billingPeriodFromRow(activeRow);
          await api.post("/api/admin/billing/invoices/ensure_status", {
            institute: activeRow.institute,
            year: period.year,
            month: period.month,
            status: "paid",
            reference_note: referenceNote,
          });
        }
      } else if (activeInvoice) {
        await api.patch(`/api/admin/billing/invoices/${activeInvoice.id}`, {
          status: "paid",
          reference_note: referenceNote,
        });
      }
      setShowPayModal(false);
      setReferenceNote("");
      setActiveRow(null);
      setActiveInvoice(null);
      load();
    } catch {
      alert("Error marking payment as paid");
    } finally {
      setUpdating(false);
    }
  };

  const handleMarkPending = async () => {
    const invoiceId = isYearView ? activeRow?.invoice_id : activeInvoice?.id;
    if (!invoiceId) return;
    setUpdating(true);
    try {
      await api.patch(`/api/admin/billing/invoices/${invoiceId}`, {
        status: "pending",
        reference_note: "",
      });
      setShowPendingModal(false);
      setActiveRow(null);
      setActiveInvoice(null);
      load();
    } catch {
      alert("Error reverting payment to pending");
    } finally {
      setUpdating(false);
    }
  };

  const openPayModalMonthly = (row: MonthlyPayment) => {
    setActiveRow(row);
    setActiveInvoice(null);
    setReferenceNote("");
    setShowPayModal(true);
  };

  const openPendingModalMonthly = (row: MonthlyPayment) => {
    setActiveRow(row);
    setActiveInvoice(null);
    setShowPendingModal(true);
  };

  const openPayModalInvoice = (inv: Invoice) => {
    setActiveInvoice(inv);
    setActiveRow(null);
    setReferenceNote("");
    setShowPayModal(true);
  };

  const openPendingModalInvoice = (inv: Invoice) => {
    setActiveInvoice(inv);
    setActiveRow(null);
    setShowPendingModal(true);
  };

  const selectedMonthLabel = MONTHS.find(m => m.value === month)?.label || "";
  const filterLabel = year === "all"
    ? "All time"
    : month === "all"
      ? String(year)
      : `${selectedMonthLabel} ${year}`;

  const subtitle = isYearView && periodLabel
    ? `${periodLabel} · ${stats.institute_count ?? 0} institutes · ${stats.paid_count ?? 0} paid · ${stats.pending_count ?? 0} unpaid`
    : `${meta.total_count || invoices.length} invoices`;

  const modalInstitute = activeRow?.institute_name || activeInvoice?.institute_name;
  const modalAmount = activeRow?.amount || activeInvoice?.amount;
  const modalMonth = activeRow
    ? billingPeriodFromRow(activeRow).label
    : activeInvoice
      ? new Date(activeInvoice.month).toLocaleDateString("en-US", { month: "long", year: "numeric" })
      : "";

  return (
    <PageShell>
      <Topbar
        title="Income"
        subtitle={subtitle}
        right={
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <select
              value={year}
              onChange={e => {
                const nextYear = e.target.value;
                setYear(nextYear);
                if (nextYear === "all") setMonth("all");
                setPage(1);
              }}
              style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid var(--ln)", outline: "none", fontSize: 13 }}
            >
              <option value="all">All Years</option>
              {[0, 1, 2, 3].map(offset => {
                const y = now.getFullYear() + offset;
                return <option key={y} value={String(y)}>{y}</option>;
              })}
            </select>
            <select
              value={month}
              onChange={e => { setMonth(e.target.value); setPage(1); }}
              style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid var(--ln)", outline: "none", fontSize: 13 }}
              disabled={year === "all"}
            >
              <option value="all">All Months</option>
              {MONTHS.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
            <button className="btn btn-s btn-sm">Export CSV</button>
          </div>
        }
      />
      <div className="pb fi">
        {loading ? <div style={{ textAlign: "center", padding: 40, color: "var(--ink3)" }}>Loading...</div> : (
          <>
            <div style={{ fontSize: 12, color: "var(--ink3)", marginBottom: 14, lineHeight: 1.5 }}>
              {isYearView ? (
                <>
                  Showing institute payments for <strong>{filterLabel}</strong>.
                  Past months include only institutes registered by then; current and upcoming months include all institutes.
                </>
              ) : (
                <>
                  Showing all invoice records for <strong>{filterLabel}</strong>.
                  Select a year to view institute payment status by billing period.
                </>
              )}
            </div>

            <div className="g4" style={{ marginBottom: 18 }}>
              <div className="kpi" style={{ "--kc": "var(--tc)" } as React.CSSProperties}>
                <div className="kpi-lbl">{isYearView ? `Expected (${filterLabel})` : "Total MRR"}</div>
                <div className="kpi-val">
                  LKR {(isYearView ? stats.total_expected ?? 0 : stats.total_mrr ?? 0).toLocaleString()}
                </div>
                <div className="kpi-tr nt">
                  {isYearView ? `${stats.institute_count ?? 0} institutes` : "overall expected"}
                </div>
              </div>
              <div className="kpi" style={{ "--kc": "var(--jd)" } as React.CSSProperties}>
                <div className="kpi-lbl">Collected</div>
                <div className="kpi-val">LKR {stats.collected.toLocaleString()}</div>
                <div className="kpi-tr up">
                  {isYearView ? `${stats.paid_count ?? 0} paid` : "revenue"}
                </div>
              </div>
              <div className="kpi" style={{ "--kc": "var(--rb)" } as React.CSSProperties}>
                <div className="kpi-lbl">Outstanding</div>
                <div className="kpi-val">LKR {stats.outstanding.toLocaleString()}</div>
                <div className="kpi-tr dn">
                  {isYearView ? `${stats.pending_count ?? 0} unpaid` : "pending collection"}
                </div>
              </div>
            </div>

            <div className="tw">
              {isYearView ? (
                <table>
                  <thead>
                    <tr>
                      <th>Institute</th>
                      {isYearlyView && <th>Month</th>}
                      <th>Plan</th>
                      <th>Registered</th>
                      <th>Amount (LKR)</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyRows.map(row => (
                      <tr key={`${row.institute}-${row.month}`}>
                        <td style={{ fontWeight: 600 }}>{row.institute_name}</td>
                        {isYearlyView && (
                          <td className="mono">
                            {new Date(row.month).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                          </td>
                        )}
                        <td>
                          <span className="bdg" style={{ fontSize: 10.5, background: "#f1f5f9", color: "#475569" }}>
                            {PLAN_LABELS[row.plan] || row.plan}
                          </span>
                        </td>
                        <td className="mono" style={{ color: "var(--ink3)" }}>
                          {new Date(row.registered_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </td>
                        <td className="mono">{Number(row.amount).toLocaleString()}</td>
                        <td>
                          {statusBadge(row.status)}
                          {row.reference_note && (
                            <div style={{ fontSize: 10, color: "var(--ink3)", marginTop: 4 }}>Ref: {row.reference_note}</div>
                          )}
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: 4 }}>
                            {row.status !== "paid" ? (
                              <button className="btn btn-xs btn-ok" onClick={() => openPayModalMonthly(row)}>Mark paid</button>
                            ) : (
                              <button
                                className="btn btn-xs btn-s"
                                onClick={() => openPendingModalMonthly(row)}
                                disabled={!row.invoice_id}
                              >
                                Mark pending
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {monthlyRows.length === 0 && (
                      <tr>
                        <td colSpan={isYearlyView ? 7 : 6} style={{ textAlign: "center", color: "var(--ink3)", padding: 24 }}>
                          No institute payments found for {filterLabel}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Invoice #</th>
                      <th>Institute</th>
                      <th>Month</th>
                      <th>Amount (LKR)</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map(inv => (
                      <tr key={inv.id}>
                        <td className="mono">#{String(inv.id).padStart(4, "0")}</td>
                        <td style={{ fontWeight: 600 }}>{inv.institute_name}</td>
                        <td className="mono">
                          {new Date(inv.month).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                        </td>
                        <td className="mono">{Number(inv.amount).toLocaleString()}</td>
                        <td>
                          {statusBadge(inv.status)}
                          {inv.reference_note && (
                            <div style={{ fontSize: 10, color: "var(--ink3)", marginTop: 4 }}>Ref: {inv.reference_note}</div>
                          )}
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: 4 }}>
                            {inv.status !== "paid" ? (
                              <button className="btn btn-xs btn-ok" onClick={() => openPayModalInvoice(inv)}>Mark paid</button>
                            ) : (
                              <button className="btn btn-xs btn-s" onClick={() => openPendingModalInvoice(inv)}>Mark pending</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {invoices.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ textAlign: "center", color: "var(--ink3)", padding: 24 }}>
                          No invoices found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderTop: "1px solid var(--ln)", background: "#fff", borderBottomLeftRadius: 12, borderBottomRightRadius: 12 }}>
                <div style={{ fontSize: 12, color: "var(--ink3)" }}>
                  Showing {(isYearView ? monthlyRows : invoices).length} of {meta.total_count} {isYearView ? "entries" : "invoices"}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button className="btn btn-s btn-xs" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</button>
                  <button className="btn btn-s btn-xs" disabled={page === meta.total_pages || meta.total_pages === 0} onClick={() => setPage(p => p + 1)}>Next</button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <Modal open={showPayModal} onClose={() => setShowPayModal(false)} title="Confirm Payment" footer={
        <>
          <button className="btn btn-s btn-sm" onClick={() => setShowPayModal(false)} disabled={updating}>Cancel</button>
          <button className="btn btn-ok btn-sm" onClick={handleMarkPaid} disabled={updating}>
            {updating ? "Saving..." : "Confirm & Mark Paid"}
          </button>
        </>
      }>
        <div className="form-gap">
          {modalInstitute && (
            <div style={{ fontSize: 13, color: "var(--ink2)", marginBottom: 4 }}>
              <strong>{modalInstitute}</strong> — {modalMonth} — LKR {Number(modalAmount).toLocaleString()}
            </div>
          )}
          <div>
            <label className="flbl">Payslip Reference / Note (Optional)</label>
            <input
              value={referenceNote}
              onChange={e => setReferenceNote(e.target.value)}
              placeholder="e.g. WhatsApp Slip #123456"
              autoFocus
            />
          </div>
          <div style={{ fontSize: 12, color: "var(--ink3)", lineHeight: 1.5 }}>
            {isYearView && activeRow && !activeRow.has_invoice
              ? "No invoice exists yet for this month — one will be created automatically when you confirm."
              : "Marking this as paid will record a Platform Fee expense in the institute's Accounts ledger."}
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
        <div className="form-gap">
          {modalInstitute && (
            <div style={{ fontSize: 13, color: "var(--ink2)", marginBottom: 4 }}>
              <strong>{modalInstitute}</strong> — {modalMonth} — LKR {Number(modalAmount).toLocaleString()}
            </div>
          )}
          <div style={{ fontSize: 12, color: "var(--ink3)", lineHeight: 1.5 }}>
            This will undo the paid status and remove the Platform Fee expense from the institute&apos;s Accounts ledger.
          </div>
        </div>
      </Modal>
    </PageShell>
  );
}
