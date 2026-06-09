"use client";
import Link from "next/link";

export type PaymentRow = {
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

const PLAN_LABELS: Record<string, string> = {
  solo: "Solo",
  institute: "Institute",
  institute_pro: "Pro",
};

const AVA_COLORS = ["#4f46e5", "#2563eb", "#0ea5e9", "#f59e0b", "#f97316", "#10b981"];

const avaColor = (name: string) => AVA_COLORS[name.charCodeAt(0) % AVA_COLORS.length];
const initials = (name: string) =>
  name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();

const statusBadge = (s: string) => {
  const map: Record<string, JSX.Element> = {
    paid: <span className="bdg b-paid">Paid</span>,
    partial: <span className="bdg" style={{ background: "#ede8fc", color: "#6b3ea8" }}>Partial</span>,
    pending: <span className="bdg b-due">Pending</span>,
    overdue: <span className="bdg b-over">Overdue</span>,
  };
  return map[s] || <span className="bdg b-due">{s}</span>;
};

type Props = {
  rows: PaymentRow[];
  showRegistered?: boolean;
  emptyLabel?: string;
  onPrimaryAction: (row: PaymentRow) => void;
  primaryLabel?: string;
  onResetAction: (row: PaymentRow) => void;
  resetLabel?: string;
};

export function InvoiceTable({
  rows, showRegistered = true, emptyLabel = "No institutes for this period",
  onPrimaryAction, primaryLabel = "Mark paid",
  onResetAction, resetLabel = "Mark pending",
}: Props) {
  const colSpan = showRegistered ? 8 : 7;

  return (
    <div className="tw">
      <table>
        <thead>
          <tr>
            <th>Institute</th>
            <th>Plan</th>
            {showRegistered && <th>Registered</th>}
            <th>Amount (LKR)</th>
            <th>Paid (LKR)</th>
            <th>Status</th>
            <th>Document</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => {
            const remaining = Math.max(Number(row.amount) - Number(row.paid_amount || 0), 0);
            return (
              <tr key={row.institute}>
                <td>
                  <div className="td-nm">
                    <span className="ava" style={{ background: `${avaColor(row.institute_name)}1a`, color: avaColor(row.institute_name) }}>
                      {initials(row.institute_name)}
                    </span>
                    {row.invoice_id ? (
                      <Link href={`/invoices/${row.invoice_id}`} style={{ fontWeight: 600, color: "var(--tc)" }}>
                        {row.institute_name}
                      </Link>
                    ) : (
                      <span style={{ fontWeight: 600 }}>{row.institute_name}</span>
                    )}
                  </div>
                </td>
                <td>
                  <span className="bdg" style={{ fontSize: 10.5, background: "#f1f5f9", color: "#475569" }}>
                    {PLAN_LABELS[row.plan] || row.plan}
                  </span>
                </td>
                {showRegistered && (
                  <td className="mono" style={{ color: "var(--ink3)" }}>
                    {new Date(row.registered_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                )}
                <td className="mono">{Number(row.amount).toLocaleString()}</td>
                <td className="mono" style={{ color: Number(row.paid_amount) > 0 ? "var(--jd)" : "var(--ink3)" }}>
                  {Number(row.paid_amount || 0).toLocaleString()}
                  {row.status === "partial" && remaining > 0 && (
                    <div style={{ fontSize: 10, color: "var(--rb)", marginTop: 2 }}>−{remaining.toLocaleString()} left</div>
                  )}
                </td>
                <td>
                  {statusBadge(row.status)}
                  {row.reference_note && (
                    <div style={{ fontSize: 10, color: "var(--ink3)", marginTop: 4 }}>Ref: {row.reference_note}</div>
                  )}
                </td>
                <td>
                  {row.payment_slip_url ? (
                    <a href={row.payment_slip_url} target="_blank" rel="noopener noreferrer" className="btn btn-xs btn-s">
                      View slip
                    </a>
                  ) : (
                    <span style={{ fontSize: 11, color: "var(--ink3)" }}>—</span>
                  )}
                </td>
                <td>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {row.status !== "paid" ? (
                      <button className="btn btn-xs btn-ok" onClick={() => onPrimaryAction(row)}>
                        {primaryLabel}
                      </button>
                    ) : (
                      <button
                        className="btn btn-xs btn-s"
                        onClick={() => onResetAction(row)}
                        disabled={!row.invoice_id}
                      >
                        {resetLabel}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr>
              <td colSpan={colSpan} style={{ textAlign: "center", color: "var(--ink3)", padding: 24 }}>
                {emptyLabel}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
