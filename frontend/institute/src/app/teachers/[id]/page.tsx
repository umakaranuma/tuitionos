"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Topbar } from "@/components/layout/Topbar";
import { PageShell } from "@/components/layout/PageShell";
import { Modal } from "@/components/ui/Modal";
import { QRCard } from "@/components/ui/QRCard";
import { getStoredUser } from "@/lib/auth";
import { api } from "@/lib/api";

type Teacher = { id: number; name: string; mobile: string; email: string; subject: string; monthly_salary: string; is_active: boolean; qr_token: string };
type Payment = { id: number; month: string; amount: string; status: string; paid_date: string | null; method: string };

export default function TeacherDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showQR, setShowQR] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get(`/api/academics/teachers/${id}`).then(r => r.data).catch(() => null),
      api.get(`/api/academics/teacher-payments`, { params: { teacher: id } }).then(r => { const d = r.data; return Array.isArray(d) ? d : d.results || []; }).catch(() => []),
    ]).then(([t, p]) => { setTeacher(t); setPayments(p); setLoading(false); });
  }, [id]);

  if (loading) return <PageShell><div style={{ padding: 60, textAlign: "center", color: "var(--ink3)" }}>Loading...</div></PageShell>;
  if (!teacher) return <PageShell><div style={{ padding: 60, textAlign: "center", color: "var(--ink3)" }}>Teacher not found</div></PageShell>;

  return (
    <PageShell>
      <Topbar
        title={teacher.name}
        subtitle={teacher.subject}
        onBack={() => router.back()}
        backLabel="Back"
        right={
          <button className="btn btn-p btn-sm" onClick={() => setShowQR(true)}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.7" style={{ marginRight: 4 }}>
              <rect x="1" y="1" width="4" height="4" rx=".5"/><rect x="9" y="1" width="4" height="4" rx=".5"/>
              <rect x="1" y="9" width="4" height="4" rx=".5"/><path d="M9 9h4M9 11h2M11 13h2"/>
            </svg>
            Staff ID / QR
          </button>
        } />
      <div className="pb fi">
        <div className="card" style={{ marginBottom: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            {[
              { label: "Subject", val: teacher.subject || "—" },
              { label: "Mobile", val: teacher.mobile },
              { label: "Email", val: teacher.email || "—" },
              { label: "Monthly Salary", val: `LKR ${Number(teacher.monthly_salary).toLocaleString()}` },
              { label: "Status", val: teacher.is_active ? "Active" : "Inactive" },
            ].map(r => (
              <div key={r.label} style={{ padding: "8px 10px", background: "var(--cr)", borderRadius: 8 }}>
                <div style={{ fontSize: 9.5, color: "var(--ink3)", fontWeight: 600, letterSpacing: ".05em", textTransform: "uppercase", marginBottom: 1 }}>{r.label}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>{r.val}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink3)", letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 10 }}>Payment History</div>
        {payments.length > 0 ? (
          <div className="tw">
            <table>
              <thead><tr><th>Month</th><th>Amount (LKR)</th><th>Status</th><th>Method</th><th>Paid date</th></tr></thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>{p.month}</td>
                    <td className="mono">{Number(p.amount).toLocaleString()}</td>
                    <td>{p.status === "paid" ? <span className="bdg b-paid">Paid</span> : <span className="bdg b-due">{p.status}</span>}</td>
                    <td style={{ color: "var(--ink3)" }}>{p.method || "—"}</td>
                    <td className="mono" style={{ color: "var(--ink3)" }}>{p.paid_date || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <div className="card" style={{ textAlign: "center", color: "var(--ink3)", padding: 24 }}>No payment records</div>}
      </div>

      <Modal open={showQR} onClose={() => setShowQR(false)} title="Staff ID card">
        <div style={{ padding: "8px 0 14px", display: "flex", justifyContent: "center" }}>
          {teacher.qr_token ? (
            <QRCard
              kind="teacher"
              token={teacher.qr_token}
              name={teacher.name}
              subtitle={teacher.subject || "Teacher"}
              code={`STF-${String(teacher.id).padStart(5, "0")}`}
              institute={getStoredUser()?.institute?.name}
            />
          ) : (
            <div style={{ color: "var(--ink3)", padding: 24, fontSize: 13 }}>
              QR token not generated yet. Save this teacher record once and reopen this dialog.
            </div>
          )}
        </div>
      </Modal>
    </PageShell>
  );
}
