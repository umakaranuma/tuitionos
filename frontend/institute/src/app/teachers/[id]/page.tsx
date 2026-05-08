"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Topbar } from "@/components/layout/Topbar";
import { PageShell } from "@/components/layout/PageShell";
import { api } from "@/lib/api";

type Teacher = { id: number; name: string; mobile: string; email: string; subject: string; monthly_salary: string; is_active: boolean };
type Payment = { id: number; month: string; amount: string; status: string; paid_date: string | null; method: string };

export default function TeacherDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

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
      <Topbar title={teacher.name} subtitle={teacher.subject}
        right={<button className="btn btn-g btn-sm" onClick={() => router.back()}>← Back</button>} />
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
    </PageShell>
  );
}
