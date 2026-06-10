"use client";
import { useEffect, useState, useRef } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { PageShell } from "@/components/layout/PageShell";
import { Modal } from "@/components/ui/Modal";
import { SearchSelect } from "@/components/ui/SearchSelect";
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
  payment_slip_url?: string | null;
  is_prorated?: boolean;
  has_invoice: boolean;
};

type Stats = {
  total_expected: number;
  collected: number;
  outstanding: number;
  paid_count: number;
  partial_count?: number;
  pending_count: number;
};

const MONTHS = [
  { value: "", label: "All months" },
  ...Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1),
    label: new Date(2000, i, 1).toLocaleString("en", { month: "long" }),
  })),
];

const now = new Date();
const fmt = (n: number) => `LKR ${Math.round(n).toLocaleString()}`;

const statusBadge = (s: string) => {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    paid: { bg: "#dcfce7", color: "#15803d", label: "Paid" },
    partial: { bg: "#ede8fc", color: "#6b3ea8", label: "Partial" },
    pending: { bg: "var(--sf-l)", color: "var(--sf)", label: "Pending" },
    overdue: { bg: "var(--rb-l)", color: "var(--rb)", label: "Overdue" },
  };
  const st = map[s] || map.pending;
  return (
    <span className="bdg" style={{ background: st.bg, color: st.color }}>{st.label}</span>
  );
};

export default function InstituteBillingPage() {
  const toast = useToast();
  const [rows, setRows] = useState<BillingRow[]>([]);
  const [stats, setStats] = useState<Stats>({ total_expected: 0, collected: 0, outstanding: 0, paid_count: 0, partial_count: 0, pending_count: 0 });
  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState("");
  const [loading, setLoading] = useState(true);
  const [periodLabel, setPeriodLabel] = useState("");

  const [showSlip, setShowSlip] = useState(false);
  const [activeRow, setActiveRow] = useState<BillingRow | null>(null);
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [refNote, setRefNote] = useState("");
  const [saving, setSaving] = useState(false);
  const slipInputRef = useRef<HTMLInputElement>(null);

  const yearOptions = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 1 + i);

  const load = () => {
    setLoading(true);
    const q = month ? `?year=${year}&month=${month}` : `?year=${year}`;
    api.get(`/api/billing/invoices/my_billing${q}`)
      .then(r => {
        setRows(r.data.results || []);
        if (r.data.stats) setStats(r.data.stats);
        if (r.data.period?.label) setPeriodLabel(r.data.period.label);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(load, [year, month]);

  const remaining = (r: BillingRow) =>
    Math.max(Number(r.amount) - Number(r.paid_amount || 0), 0);

  const openUpload = (r: BillingRow) => {
    setActiveRow(r);
    setSlipFile(null);
    setRefNote("");
    if (slipInputRef.current) slipInputRef.current.value = "";
    setShowSlip(true);
  };

  // Institute admin uploads a payment slip / records a transfer against their
  // own invoice. The backend (record_payment) will mark partial/paid/overflow
  // and the admin portal sees it immediately since they share the same data.
  const submitSlip = async () => {
    if (!activeRow || !slipFile) {
      toast.error("Please attach the bank slip before uploading.");
      return;
    }
    setSaving(true);
    try {
      const [y, m] = activeRow.month.split("-").map(s => parseInt(s, 10));
      const form = new FormData();
      form.append("institute", String(activeRow.institute));
      form.append("year", String(y));
      form.append("month", String(m));
      form.append("payment_amount", String(remaining(activeRow) || activeRow.amount));
      form.append("reference_note", refNote);
      form.append("apply_advance", "false");
      form.append("payment_slip", slipFile);
      await api.post("/api/billing/invoices/record_payment", form);
      toast.success("Payment slip uploaded. We'll confirm shortly.");
      setShowSlip(false);
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg || "Couldn't upload the slip. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell>
      <Topbar
        title="Billing"
        subtitle={periodLabel ? `Platform invoices · ${periodLabel}` : "Your platform invoices and payments"}
        right={
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ width: 96 }}>
              <SearchSelect value={year} onChange={setYear} searchable={false}
                options={yearOptions.map(y => ({ value: String(y), label: String(y) }))} />
            </div>
            <div style={{ width: 140 }}>
              <SearchSelect value={month} onChange={setMonth}
                options={MONTHS} />
            </div>
          </div>
        }
      />
      <div className="pb fi">
        <div className="g4" style={{ marginBottom: 18 }}>
          <div className="kpi" style={{ "--kc": "var(--tc)" } as React.CSSProperties}>
            <div className="kpi-lbl">Expected</div>
            <div className="kpi-val">{fmt(stats.total_expected)}</div>
            <div className="kpi-tr nt">{rows.length} invoice{rows.length !== 1 ? "s" : ""}</div>
          </div>
          <div className="kpi" style={{ "--kc": "var(--jd)" } as React.CSSProperties}>
            <div className="kpi-lbl">Paid</div>
            <div className="kpi-val">{fmt(stats.collected)}</div>
            <div className="kpi-tr up">{stats.paid_count} paid · {stats.partial_count ?? 0} partial</div>
          </div>
          <div className="kpi" style={{ "--kc": "var(--rb)" } as React.CSSProperties}>
            <div className="kpi-lbl">Outstanding</div>
            <div className="kpi-val">{fmt(stats.outstanding)}</div>
            <div className="kpi-tr dn">{stats.pending_count} unpaid</div>
          </div>
          <div className="kpi" style={{ "--kc": "var(--ac)" } as React.CSSProperties}>
            <div className="kpi-lbl">Collection rate</div>
            <div className="kpi-val">
              {stats.total_expected ? Math.round((stats.collected / stats.total_expected) * 100) : 0}%
            </div>
            <div className="kpi-tr nt">{year}</div>
          </div>
        </div>

        {loading ? (
          <div className="card" style={{ textAlign: "center", color: "var(--ink3)", padding: 36 }}>Loading…</div>
        ) : rows.length === 0 ? (
          <div className="card" style={{ textAlign: "center", color: "var(--ink3)", padding: 36 }}>
            No invoices for this period.
          </div>
        ) : (
          <div className="tw">
            <table>
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Amount</th>
                  <th>Paid / Balance</th>
                  <th>Due date</th>
                  <th>Status</th>
                  <th>Slip</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => {
                  const rem = remaining(r);
                  return (
                    <tr key={r.month}>
                      <td style={{ fontWeight: 700 }}>
                        {new Date(r.month).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                        {r.is_prorated && <span className="bdg b-trial" style={{ marginLeft: 6, fontSize: 9.5 }}>prorated</span>}
                      </td>
                      <td className="mono">{fmt(Number(r.amount))}</td>
                      <td className="mono" style={{ color: rem > 0 ? "var(--rb)" : "var(--ink3)" }}>
                        {fmt(Number(r.paid_amount || 0))}
                        {rem > 0 && <span style={{ marginLeft: 8, fontSize: 11.5 }}>· {fmt(rem)} due</span>}
                      </td>
                      <td className="mono" style={{ color: "var(--ink3)", fontSize: 12.5 }}>{r.due_date}</td>
                      <td>{statusBadge(r.status)}</td>
                      <td>
                        {r.payment_slip_url ? (
                          <a href={r.payment_slip_url} target="_blank" rel="noopener noreferrer" className="btn btn-xs btn-s">View</a>
                        ) : (
                          <span style={{ fontSize: 11.5, color: "var(--ink3)" }}>—</span>
                        )}
                      </td>
                      <td>
                        {r.status !== "paid" && (
                          <button className="btn btn-xs btn-p" onClick={() => openUpload(r)}>
                            Upload slip
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

        <div style={{ marginTop: 16, fontSize: 12, color: "var(--ink3)", lineHeight: 1.6 }}>
          Need help? Send your payment slip via WhatsApp and contact{" "}
          <a href="mailto:support@tuitionos.lk" style={{ color: "var(--tc)" }}>support@tuitionos.lk</a> — the admin will confirm your payment within 24 hours.
        </div>
      </div>

      <Modal
        open={showSlip}
        onClose={() => setShowSlip(false)}
        title={activeRow ? `Pay ${new Date(activeRow.month).toLocaleDateString("en-US", { month: "long", year: "numeric" })}` : "Upload payment slip"}
        footer={
          <>
            <button className="btn btn-s btn-sm" onClick={() => setShowSlip(false)} disabled={saving}>Cancel</button>
            <button className="btn btn-p btn-sm" onClick={submitSlip} disabled={saving}>
              {saving ? "Uploading…" : "Upload slip"}
            </button>
          </>
        }
      >
        <div className="form-gap">
          {activeRow && (
            <div style={{ background: "var(--cr)", borderRadius: 10, padding: "10px 12px", fontSize: 12.5 }}>
              <div style={{ color: "var(--ink3)", marginBottom: 4 }}>Outstanding for this month</div>
              <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 16 }}>
                {fmt(remaining(activeRow) || Number(activeRow.amount))}
              </div>
            </div>
          )}
          <div>
            <label className="flbl">Bank slip / payment receipt *</label>
            <input ref={slipInputRef} type="file" accept="image/*,.pdf" onChange={e => setSlipFile(e.target.files?.[0] || null)} />
          </div>
          <div>
            <label className="flbl">Reference note (optional)</label>
            <input value={refNote} onChange={e => setRefNote(e.target.value)} placeholder="e.g. Bank transfer ref #889201" />
          </div>
          <div style={{ fontSize: 11.5, color: "var(--ink3)", lineHeight: 1.6 }}>
            Once uploaded, the platform admin will verify and confirm your payment. You'll see the status update here automatically.
          </div>
        </div>
      </Modal>
    </PageShell>
  );
}
