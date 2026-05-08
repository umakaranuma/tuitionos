"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Topbar } from "@/components/layout/Topbar";
import { PageShell } from "@/components/layout/PageShell";
import { api } from "@/lib/api";

type Stats = {
  total_students: number; active_batches: number;
  fees: { total: number; paid: number; pending: number; outstanding: number };
  attendance: { present_today: number; absent_today: number };
};
type Batch = { id: number; name: string; subject_name: string; student_count: number; monthly_fee: string; color: string; color_light: string };
type Student = { id: number; name: string; grade: string };

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/api/dashboard").then(r => r.data).catch(() => null),
      api.get("/api/academics/batches").then(r => { const d = r.data; return Array.isArray(d) ? d : d.results || []; }).catch(() => []),
      api.get("/api/students/students").then(r => { const d = r.data; return Array.isArray(d) ? d : d.results || []; }).catch(() => []),
    ]).then(([s, b, st]) => {
      setStats(s); setBatches(b); setStudents(st); setLoading(false);
    });
  }, []);

  const totalStudents = stats?.total_students ?? students.length;
  const activeBatches = stats?.active_batches ?? batches.length;
  const feesPaid = stats?.fees.paid ?? 0;
  const feesPending = stats?.fees.pending ?? 0;
  const outstanding = stats?.fees.outstanding ?? 0;
  const collectedPct = stats?.fees.total ? Math.round((feesPaid / stats.fees.total) * 100) : 0;
  const presentToday = stats?.attendance.present_today ?? 0;
  const absentToday = stats?.attendance.absent_today ?? 0;
  const attendanceRate = (presentToday + absentToday) > 0 ? Math.round((presentToday / (presentToday + absentToday)) * 100) : 0;

  return (
    <PageShell>
      <Topbar
        title="Dashboard"
        subtitle="Institute overview"
        right={
          <>
            <button className="btn btn-s btn-sm">Export report</button>
            <Link href="/students"><button className="btn btn-p btn-sm">+ Add student</button></Link>
          </>
        }
      />
      <div className="pb fi">
        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: "var(--ink3)" }}>Loading dashboard...</div>
        ) : (
          <>
            {/* KPIs */}
            <div className="g4" style={{ marginBottom: 18 }}>
              <div className="kpi" style={{ "--kc": "var(--tc)" } as any}>
                <div className="kpi-lbl">Total Students</div>
                <div className="kpi-val">{totalStudents}</div>
                <div className="kpi-tr up">Active enrollments</div>
              </div>
              <div className="kpi" style={{ "--kc": "var(--jd)" } as any}>
                <div className="kpi-lbl">Fee Collection</div>
                <div className="kpi-val">{collectedPct}%</div>
                <div className="kpi-tr up">{feesPaid} of {feesPaid + feesPending} paid</div>
              </div>
              <div className="kpi" style={{ "--kc": "var(--rb)" } as any}>
                <div className="kpi-lbl">Outstanding</div>
                <div className="kpi-val">{outstanding > 0 ? `${Math.round(outstanding / 1000)}K` : "0"}</div>
                <div className="kpi-tr dn">{feesPending} students due</div>
              </div>
              <div className="kpi" style={{ "--kc": "var(--sf)" } as any}>
                <div className="kpi-lbl">Today&apos;s Attendance</div>
                <div className="kpi-val">{attendanceRate}%</div>
                <div className="kpi-tr nt">{presentToday} present · {absentToday} absent</div>
              </div>
            </div>

            <div className="g2">
              {/* Left column */}
              <div>
                <div className="sec-hdr">
                  <span className="sec-title">Active Batches</span>
                  <Link href="/batches"><button className="btn btn-g btn-sm">View all →</button></Link>
                </div>
                <div className="tw" style={{ marginBottom: 14 }}>
                  <table>
                    <thead><tr><th>Batch</th><th>Subject</th><th>Students</th><th>Fee</th></tr></thead>
                    <tbody>
                      {batches.slice(0, 5).map(b => (
                        <tr key={b.id}>
                          <td>
                            <div className="td-nm">
                              <div className="ava" style={{ background: b.color_light || "var(--tc-l)", color: b.color || "var(--tc)" }}>
                                {b.name.substring(0, 2).toUpperCase()}
                              </div>
                              {b.name}
                            </div>
                          </td>
                          <td style={{ color: "var(--ink3)" }}>{b.subject_name}</td>
                          <td className="mono">{b.student_count}</td>
                          <td className="mono">{Number(b.monthly_fee).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Right column */}
              <div>
                <div className="sec-hdr"><span className="sec-title">Quick stats</span></div>
                <div className="card" style={{ padding: 16, marginBottom: 14 }}>
                  <div className="prog-w">
                    <div className="prog-hdr">
                      <span className="prog-lbl">Fees collected ({feesPaid})</span>
                      <span className="prog-val">{collectedPct}%</span>
                    </div>
                    <div className="prog-tr"><div className="prog-fi" style={{ width: `${collectedPct}%`, background: "var(--tc)" }} /></div>
                  </div>
                  <div className="prog-w">
                    <div className="prog-hdr">
                      <span className="prog-lbl">Attendance today</span>
                      <span className="prog-val">{attendanceRate}%</span>
                    </div>
                    <div className="prog-tr"><div className="prog-fi" style={{ width: `${attendanceRate}%`, background: attendanceRate >= 85 ? "var(--jd)" : "var(--sf)" }} /></div>
                  </div>
                  <div className="prog-w" style={{ marginBottom: 0 }}>
                    <div className="prog-hdr">
                      <span className="prog-lbl">Outstanding</span>
                      <span className="prog-val">LKR {outstanding.toLocaleString()}</span>
                    </div>
                    <div className="prog-tr"><div className="prog-fi" style={{ width: `${feesPending > 0 ? Math.round((feesPending / (feesPaid + feesPending)) * 100) : 0}%`, background: "var(--rb)" }} /></div>
                  </div>
                </div>

                <div className="sec-hdr"><span className="sec-title">Recent students</span></div>
                <div className="card" style={{ padding: 16 }}>
                  {students.slice(0, 5).map(s => (
                    <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: "1px solid var(--ln)" }}>
                      <div className="ava" style={{ background: "var(--tc-l)", color: "var(--tc-d)", width: 28, height: 28, fontSize: 10 }}>
                        {s.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>{s.name}</div>
                        <div style={{ fontSize: 10, color: "var(--ink3)" }}>{s.grade}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </PageShell>
  );
}
