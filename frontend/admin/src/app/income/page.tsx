"use client";
import { useState, useEffect, useCallback } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { PageShell } from "@/components/layout/PageShell";
import { Modal } from "@/components/ui/Modal";
import { MrrChart, TrendPoint } from "@/components/income/MrrChart";
import { BreakdownTable, PlanBucket } from "@/components/income/BreakdownTable";
import { InvoiceTable, PaymentRow } from "@/components/invoices/InvoiceTable";
import { SearchSelect } from "@/components/ui/SearchSelect";
import { useToast } from "@/components/ui/ToastProvider";
import { api } from "@/lib/api";

type Stats = {
  total_expected: number;
  collected: number;
  outstanding: number;
  paid_count: number;
  partial_count?: number;
  pending_count: number;
  institute_count: number;
};

type Analytics = {
  trend: TrendPoint[];
  plan_breakdown: PlanBucket[];
  focus_label: string;
  focus_month: number;
  summary: {
    year_expected: number;
    year_collected: number;
    year_outstanding: number;
    collection_rate: number;
    avg_mrr: number;
    active_institutes: number;
    best_month: string | null;
    best_month_collected: number;
  };
};

const MONTHS = [
  { value: "1", label: "January" }, { value: "2", label: "February" },
  { value: "3", label: "March" }, { value: "4", label: "April" },
  { value: "5", label: "May" }, { value: "6", label: "June" },
  { value: "7", label: "July" }, { value: "8", label: "August" },
  { value: "9", label: "September" }, { value: "10", label: "October" },
  { value: "11", label: "November" }, { value: "12", label: "December" },
];

const now = new Date();

export default function IncomePage() {
  const toast = useToast();
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [anLoading, setAnLoading] = useState(true);
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
  const [activeRow, setActiveRow] = useState<PaymentRow | null>(null);
  const [referenceNote, setReferenceNote] = useState("");
  const [updating, setUpdating] = useState(false);

  const yearOptions = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 1 + i);
  const selectedMonthLabel = MONTHS.find(m => m.value === month)?.label || "";

  const load = useCallback(() => {
    setLoading(true);
    api.get(`/api/admin/billing/invoices/monthly_overview?year=${year}&month=${month}&page=${page}&limit=${limit}`)
      .then(r => {
        const d = r.data;
        setRows(d.results || []);
        if (d.period?.label) setPeriodLabel(d.period.label);
        if (d.stats) setStats(d.stats);
        if (d.total_count !== undefined) setMeta({ total_count: d.total_count, total_pages: d.total_pages });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [year, month, page, limit]);

  const loadAnalytics = useCallback(() => {
    setAnLoading(true);
    api.get(`/api/admin/billing/invoices/revenue_analytics?year=${year}&month=${month}`)
      .then(r => { setAnalytics(r.data); setAnLoading(false); })
      .catch(() => setAnLoading(false));
  }, [year, month]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadAnalytics(); }, [loadAnalytics]);

  const refresh = () => { load(); loadAnalytics(); };

  const handleMarkPaid = async () => {
    if (!activeRow) return;
    setUpdating(true);
    try {
      if (activeRow.invoice_id) {
        await api.patch(`/api/admin/billing/invoices/${activeRow.invoice_id}`, { status: "paid", reference_note: referenceNote });
      } else {
        await api.post("/api/admin/billing/invoices/ensure_status", {
          institute: activeRow.institute, year: Number(year), month: Number(month),
          status: "paid", reference_note: referenceNote,
        });
      }
      setShowPayModal(false); setReferenceNote(""); setActiveRow(null); refresh();
      toast.success("Payment marked as paid.");
    } catch { toast.error("Couldn't mark the payment as paid."); }
    finally { setUpdating(false); }
  };

  const handleMarkPending = async () => {
    if (!activeRow?.invoice_id) return;
    setUpdating(true);
    try {
      await api.patch(`/api/admin/billing/invoices/${activeRow.invoice_id}`, { status: "pending", reference_note: "" });
      setShowPendingModal(false); setActiveRow(null); refresh();
      toast.success("Payment reset to pending.");
    } catch { toast.error("Couldn't reset the payment to pending."); }
    finally { setUpdating(false); }
  };

  const exportCsv = () => {
    const header = ["Institute", "Plan", "Registered", "Amount (LKR)", "Paid (LKR)", "Status", "Reference", "Month"];
    const lines = rows.map(r => [
      `"${r.institute_name}"`, r.plan,
      new Date(r.registered_at).toLocaleDateString("en-CA"),
      r.amount, r.paid_amount || "0", r.status,
      `"${r.reference_note || ""}"`, r.month,
    ].join(","));
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `income_${year}_${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const sm = analytics?.summary;

  const kpis = [
    { lbl: `Expected (${selectedMonthLabel})`, val: stats.total_expected, tr: `${stats.institute_count} institutes`, cls: "nt", color: "var(--tc)" },
    { lbl: "Collected", val: stats.collected, tr: `${stats.paid_count} paid · ${stats.partial_count ?? 0} partial`, cls: "up", color: "var(--jd)" },
    { lbl: "Outstanding", val: stats.outstanding, tr: `${stats.pending_count} unpaid`, cls: "dn", color: "var(--rb)" },
    { lbl: `YTD Collected (${year})`, val: sm?.year_collected ?? 0, tr: `${sm?.collection_rate ?? 0}% collection rate`, cls: "nt", color: "var(--ac)" },
  ];

  return (
    <PageShell>
      <Topbar
        title="Income"
        subtitle={periodLabel
          ? `${periodLabel} · ${stats.institute_count} institutes · ${stats.paid_count} paid · ${stats.partial_count ?? 0} partial · ${stats.pending_count} unpaid`
          : "Monthly institute payments"}
        right={
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ width: 96 }}>
              <SearchSelect value={year} onChange={v => { setYear(v); setPage(1); }}
                options={yearOptions.map(y => ({ value: String(y), label: String(y) }))} searchable={false} />
            </div>
            <div style={{ width: 140 }}>
              <SearchSelect value={month} onChange={v => { setMonth(v); setPage(1); }}
                options={MONTHS.map(m => ({ value: m.value, label: m.label }))} />
            </div>
            <button className="btn btn-s btn-sm" onClick={exportCsv} disabled={rows.length === 0}>Export CSV</button>
          </div>
        }
      />
      <div className="pb fi">
        <div className="g4" style={{ marginBottom: 16 }}>
          {kpis.map(k => (
            <div key={k.lbl} className="kpi" style={{ "--kc": k.color } as React.CSSProperties}>
              <div className="kpi-lbl">{k.lbl}</div>
              <div className="kpi-val">LKR {k.val.toLocaleString()}</div>
              <div className={`kpi-tr ${k.cls}`}>{k.tr}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 14, marginBottom: 16 }}>
          <MrrChart trend={analytics?.trend ?? []} loading={anLoading} focusMonth={analytics?.focus_month} />
          <BreakdownTable breakdown={analytics?.plan_breakdown ?? []} focusLabel={analytics?.focus_label} loading={anLoading} />
        </div>

        {sm && (
          <div className="g4" style={{ marginBottom: 16 }}>
            {[
              { lbl: "Avg MRR", val: `LKR ${sm.avg_mrr.toLocaleString()}` },
              { lbl: "Active institutes", val: sm.active_institutes },
              { lbl: "Best month", val: sm.best_month || "—" },
              { lbl: "YTD outstanding", val: `LKR ${sm.year_outstanding.toLocaleString()}` },
            ].map(s => (
              <div key={s.lbl} className="card" style={{ padding: "12px 16px" }}>
                <div style={{ fontSize: 10, color: "var(--ink3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em" }}>{s.lbl}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)", marginTop: 4 }}>{s.val}</div>
              </div>
            ))}
          </div>
        )}

        <div style={{ fontSize: 12, color: "var(--ink3)", marginBottom: 10, lineHeight: 1.5 }}>
          Institute payments for <strong>{selectedMonthLabel} {year}</strong>.
          Past months show institutes registered by then; current and upcoming months show all institutes.
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: "var(--ink3)" }}>Loading…</div>
        ) : (
          <>
            <InvoiceTable
              rows={rows}
              showRegistered
              emptyLabel={`No institutes for ${selectedMonthLabel} ${year}`}
              primaryLabel="Mark paid"
              resetLabel="Mark pending"
              onPrimaryAction={row => { setActiveRow(row); setReferenceNote(""); setShowPayModal(true); }}
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
            <input value={referenceNote} onChange={e => setReferenceNote(e.target.value)} placeholder="e.g. WhatsApp Slip #123456" autoFocus />
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
