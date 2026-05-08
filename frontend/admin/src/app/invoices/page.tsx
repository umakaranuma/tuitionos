"use client";
import { useState, useEffect } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { PageShell } from "@/components/layout/PageShell";
import { api } from "@/lib/api";

type Invoice = {
  id: number; institute: number; institute_name: string;
  amount: string; month: string; status: string;
  paid_at: string | null; due_date: string; created_at: string;
};

const statusBadge = (s: string) => {
  const map: Record<string, JSX.Element> = {
    paid: <span className="bdg b-paid">Paid</span>,
    pending: <span className="bdg b-due">Pending</span>,
    overdue: <span className="bdg b-over">Overdue</span>,
  };
  return map[s] || <span>{s}</span>;
};

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/api/admin/billing/invoices").then(r => {
      const d = r.data;
      setInvoices(Array.isArray(d) ? d : d.results || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const paidCount = invoices.filter(i => i.status === "paid").length;
  const pendingCount = invoices.filter(i => i.status !== "paid").length;

  return (
    <PageShell>
      <Topbar
        title="Invoices"
        subtitle={`${invoices.length} total · ${paidCount} paid · ${pendingCount} pending`}
        right={<button className="btn btn-p btn-sm">+ Manual invoice</button>}
      />
      <div className="pb fi">
        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: "var(--ink3)" }}>Loading invoices...</div>
        ) : (
          <div className="tw">
            <table>
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Institute</th>
                  <th>Amount (LKR)</th>
                  <th>Month</th>
                  <th>Due</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td className="mono">#{String(inv.id).padStart(4, "0")}</td>
                    <td>{inv.institute_name}</td>
                    <td className="mono">{Number(inv.amount).toLocaleString()}</td>
                    <td className="mono">{new Date(inv.month).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</td>
                    <td className="mono" style={{ color: "var(--ink3)" }}>{inv.due_date}</td>
                    <td>{statusBadge(inv.status)}</td>
                    <td>
                      <div style={{ display: "flex", gap: 4 }}>
                        {inv.status !== "paid" && <button className="btn btn-xs btn-ok">Mark paid</button>}
                        <button className="btn btn-xs btn-s">PDF</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {invoices.length === 0 && (
                  <tr><td colSpan={7} style={{ textAlign: "center", color: "var(--ink3)", padding: 24 }}>No invoices found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PageShell>
  );
}
