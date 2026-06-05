"use client";
import { useState, useEffect } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { PageShell } from "@/components/layout/PageShell";
import { Modal } from "@/components/ui/Modal";
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
  const [generating, setGenerating] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [payInvId, setPayInvId] = useState<number | null>(null);
  const [referenceNote, setReferenceNote] = useState("");

  const fetchInvoices = () => {
    setLoading(true);
    api.get("/api/admin/billing/invoices").then(r => {
      const d = r.data;
      setInvoices(Array.isArray(d) ? d : d.results || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleGenerateMonthly = async () => {
    setGenerating(true);
    try {
      const res = await api.post("/api/admin/billing/invoices/generate_monthly");
      alert(res.data.message);
      fetchInvoices();
    } catch (e) {
      alert("Error generating invoices");
    } finally {
      setGenerating(false);
    }
  };

  const handleMarkPaid = async () => {
    if (!payInvId) return;
    try {
      await api.patch(`/api/admin/billing/invoices/${payInvId}`, { 
        status: "paid",
        reference_note: referenceNote
      });
      fetchInvoices();
      setShowPayModal(false);
      setReferenceNote("");
      setPayInvId(null);
    } catch (e) {
      alert("Error marking paid");
    }
  };

  const paidCount = invoices.filter(i => i.status === "paid").length;
  const pendingCount = invoices.filter(i => i.status !== "paid").length;
  
  const totalCollected = invoices.filter(i => i.status === "paid").reduce((acc, i) => acc + Number(i.amount), 0);
  const expectedRevenue = invoices.filter(i => i.status !== "paid").reduce((acc, i) => acc + Number(i.amount), 0);

  return (
    <PageShell>
      <Topbar
        title="Invoices & Billing"
        subtitle={`${invoices.length} total · ${paidCount} paid · ${pendingCount} pending`}
        right={
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-p btn-sm" onClick={handleGenerateMonthly} disabled={generating}>
              {generating ? "Generating..." : "Generate Monthly Invoices"}
            </button>
            <button className="btn btn-s btn-sm">+ Manual invoice</button>
          </div>
        }
      />
      <div className="pb fi">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
          <div className="card" style={{ padding: "16px 20px" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 4 }}>Total Collected (All Time)</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "var(--tc)", fontFamily: "var(--font-mono)" }}>LKR {totalCollected.toLocaleString()}</div>
          </div>
          <div className="card" style={{ padding: "16px 20px" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 4 }}>Pending Expected</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#c07b1a", fontFamily: "var(--font-mono)" }}>LKR {expectedRevenue.toLocaleString()}</div>
          </div>
        </div>

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
                    <td>
                      {statusBadge(inv.status)}
                      {(inv as any).reference_note && (
                        <div style={{ fontSize: 10, color: "var(--ink3)", marginTop: 4 }}>Ref: {(inv as any).reference_note}</div>
                      )}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 4 }}>
                        {inv.status !== "paid" && <button className="btn btn-xs btn-ok" onClick={() => { setPayInvId(inv.id); setShowPayModal(true); }}>Mark paid</button>}
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

      <Modal open={showPayModal} onClose={() => setShowPayModal(false)} title="Confirm Payment" footer={
        <>
          <button className="btn btn-s btn-sm" onClick={() => setShowPayModal(false)}>Cancel</button>
          <button className="btn btn-ok btn-sm" onClick={handleMarkPaid}>Confirm & Mark Paid</button>
        </>
      }>
        <div className="form-gap">
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
            Marking this as paid will automatically record a Platform Fee expense in the institute's Accounts ledger.
          </div>
        </div>
      </Modal>
    </PageShell>
  );
}
