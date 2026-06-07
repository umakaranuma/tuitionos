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

type Stats = {
  total_expected: number;
  collected: number;
  outstanding: number;
  paid_count: number;
  pending_count: number;
  institute_count: number;
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
  const [rows, setRows] = useState<MonthlyPayment[]>([]);
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
  const [showPayModal, setShowPayModal] = useState(false);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [activeRow, setActiveRow] = useState<MonthlyPayment | null>(null);
  const [referenceNote, setReferenceNote] = useState("");
  const [updating, setUpdating] = useState(false);

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

  const handleMarkPaid = async () => {
    if (!activeRow) return;
    setUpdating(true);
    try {
      if (activeRow.invoice_id) {
        await api.patch(`/api/admin/billing/invoices/${activeRow.invoice_id}`, {
          status: "paid",
          reference_note: referenceNote,
        });
      } else {
        await api.post("/api/admin/billing/invoices/ensure_status", {
          institute: activeRow.institute,
          year: Number(year),
          month: Number(month),
          status: "paid",
          reference_note: referenceNote,
        });
      }
      setShowPayModal(false);
      setReferenceNote("");
      setActiveRow(null);
      load();
    } catch {
      alert("Error marking payment as paid");
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
    } catch {
      alert("Error reverting payment to pending");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <PageShell>
      <Topbar
        title="Income"
        subtitle={periodLabel
          ? `${periodLabel} · ${stats.institute_count} institutes · ${stats.paid_count} paid · ${stats.pending_count} unpaid`
          : "Monthly institute payments"}
        right={
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <select
              value={year}
              onChange={e => { setYear(e.target.value); setPage(1); }}
              style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid var(--ln)", outline: "none", fontSize: 13 }}
            >
              {yearOptions.map(y => (
                <option key={y} value={String(y)}>{y}</option>
              ))}
            </select>
            <select
              value={month}
              onChange={e => { setMonth(e.target.value); setPage(1); }}
              style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid var(--ln)", outline: "none", fontSize: 13 }}
            >
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
              Institute payments for <strong>{selectedMonthLabel} {year}</strong>.
              Past months show institutes registered by then; current and upcoming months show all institutes.
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
                <div className="kpi-tr up">{stats.paid_count} paid</div>
              </div>
              <div className="kpi" style={{ "--kc": "var(--rb)" } as React.CSSProperties}>
                <div className="kpi-lbl">Outstanding</div>
                <div className="kpi-val">LKR {stats.outstanding.toLocaleString()}</div>
                <div className="kpi-tr dn">{stats.pending_count} unpaid</div>
              </div>
            </div>

            <div className="tw">
              <table>
                <thead>
                  <tr>
                    <th>Institute</th>
                    <th>Plan</th>
                    <th>Registered</th>
                    <th>Amount (LKR)</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => (
                    <tr key={row.institute}>
                      <td style={{ fontWeight: 600 }}>{row.institute_name}</td>
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
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center", color: "var(--ink3)", padding: 24 }}>
                        No institutes for {selectedMonthLabel} {year}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderTop: "1px solid var(--ln)", background: "#fff", borderBottomLeftRadius: 12, borderBottomRightRadius: 12 }}>
                <div style={{ fontSize: 12, color: "var(--ink3)" }}>
                  Showing {rows.length} of {meta.total_count} institutes
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
          {activeRow && (
            <div style={{ fontSize: 13, color: "var(--ink2)", marginBottom: 4 }}>
              <strong>{activeRow.institute_name}</strong> — {selectedMonthLabel} {year} — LKR {Number(activeRow.amount).toLocaleString()}
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
            {activeRow && !activeRow.has_invoice
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
          {activeRow && (
            <div style={{ fontSize: 13, color: "var(--ink2)", marginBottom: 4 }}>
              <strong>{activeRow.institute_name}</strong> — {selectedMonthLabel} {year} — LKR {Number(activeRow.amount).toLocaleString()}
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
