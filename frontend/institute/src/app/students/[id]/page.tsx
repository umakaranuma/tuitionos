"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Topbar } from "@/components/layout/Topbar";
import { PageShell } from "@/components/layout/PageShell";
import { Modal } from "@/components/ui/Modal";
import { QRCard } from "@/components/ui/QRCard";
import { getStoredUser } from "@/lib/auth";
import { api } from "@/lib/api";

type Student = { id: number; name: string; parent_name: string; parent_mobile: string; has_whatsapp: boolean; batch: string; is_free: boolean; is_active: boolean; join_date: string; qr_token: string };
type Enrollment = { id: number; batch: number; batch_name: string; academic_year: number; status: string; enrolled_at: string };
type Fee = { id: number; batch_name: string; month: string; amount: string; status: string; paid_at: string | null };

export default function StudentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [student, setStudent] = useState<Student | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [fees, setFees] = useState<Fee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showQR, setShowQR] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get(`/api/students/students/${id}`).then(r => r.data).catch(() => null),
      api.get(`/api/students/enrollments`).then(r => { const d = r.data; return (Array.isArray(d) ? d : d.results || []).filter((e: any) => String(e.student) === id); }).catch(() => []),
      api.get(`/api/fees/`, { params: { student: id } }).then(r => { const d = r.data; return Array.isArray(d) ? d : d.results || []; }).catch(() => []),
    ]).then(([s, e, f]) => { setStudent(s); setEnrollments(e); setFees(f); setLoading(false); });
  }, [id]);

  if (loading) return <PageShell><div style={{ padding: 60, textAlign: "center", color: "var(--ink3)" }}>Loading...</div></PageShell>;
  if (!student) return <PageShell><div style={{ padding: 60, textAlign: "center", color: "var(--ink3)" }}>Student not found</div></PageShell>;

  return (
    <PageShell>
      <Topbar
        title={student.name}
        subtitle={student.batch}
        onBack={() => router.back()}
        backLabel="Back"
        right={
          <button className="btn btn-p btn-sm" onClick={() => setShowQR(true)}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.7" style={{ marginRight: 4 }}>
              <rect x="1" y="1" width="4" height="4" rx=".5"/><rect x="9" y="1" width="4" height="4" rx=".5"/>
              <rect x="1" y="9" width="4" height="4" rx=".5"/><path d="M9 9h4M9 11h2M11 13h2"/>
            </svg>
            ID card / QR
          </button>
        } />
      <div className="pb fi">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
          <div className="card">
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)", marginBottom: 12 }}>{student.name}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[
                { label: "Parent", val: student.parent_name || "—" },
                { label: "Mobile", val: student.parent_mobile },
                { label: "Batch", val: student.batch },
                { label: "Joined", val: student.join_date || "—" },
                { label: "WhatsApp", val: student.has_whatsapp ? "Yes" : "No" },
                { label: "Status", val: student.is_free ? "Free" : student.is_active ? "Active" : "Inactive" },
              ].map(r => (
                <div key={r.label} style={{ padding: "8px 10px", background: "var(--cr)", borderRadius: 8 }}>
                  <div style={{ fontSize: 9.5, color: "var(--ink3)", fontWeight: 600, letterSpacing: ".05em", textTransform: "uppercase", marginBottom: 1 }}>{r.label}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>{r.val}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink3)", letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 10 }}>Enrollments</div>
            {enrollments.length > 0 ? enrollments.map(e => (
              <div key={e.id} style={{ padding: "8px 0", borderBottom: "1px solid var(--ln)", display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>{e.batch_name}</span>
                <span className="mono" style={{ fontSize: 11, color: "var(--ink3)" }}>{e.academic_year} · {e.status}</span>
              </div>
            )) : <div style={{ fontSize: 12, color: "var(--ink3)" }}>Not enrolled in any batch</div>}
          </div>
        </div>

        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink3)", letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 10 }}>Fee History</div>
        {fees.length > 0 ? (
          <div className="tw">
            <table>
              <thead><tr><th>Batch</th><th>Month</th><th>Amount (LKR)</th><th>Status</th><th>Paid</th></tr></thead>
              <tbody>
                {fees.map(f => (
                  <tr key={f.id}>
                    <td>{f.batch_name}</td>
                    <td className="mono">{f.month}</td>
                    <td className="mono">{Number(f.amount).toLocaleString()}</td>
                    <td>{f.status === "paid" ? <span className="bdg b-paid">Paid</span> : <span className="bdg b-due">{f.status}</span>}</td>
                    <td className="mono" style={{ color: "var(--ink3)" }}>{f.paid_at || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <div className="card" style={{ textAlign: "center", color: "var(--ink3)", padding: 24 }}>No fee records</div>}
      </div>

      <Modal open={showQR} onClose={() => setShowQR(false)} title="Student ID card">
        <div style={{ padding: "8px 0 14px", display: "flex", justifyContent: "center" }}>
          {student.qr_token ? (
            <QRCard
              kind="student"
              token={student.qr_token}
              name={student.name}
              subtitle={student.batch}
              code={`STU-${String(student.id).padStart(5, "0")}`}
              institute={getStoredUser()?.institute?.name}
            />
          ) : (
            <div style={{ color: "var(--ink3)", padding: 24, fontSize: 13 }}>
              QR token not generated yet. Save the student record once and reopen this dialog.
            </div>
          )}
        </div>
      </Modal>
    </PageShell>
  );
}
