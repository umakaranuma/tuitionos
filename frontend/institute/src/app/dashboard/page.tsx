"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Topbar } from "@/components/layout/Topbar";
import { PageShell } from "@/components/layout/PageShell";
import { SearchSelect } from "@/components/ui/SearchSelect";
import { BATCHES, ALL_STUDENTS, INIT_FEE_STATE, TEACHERS, INIT_TEACHER_PAYMENTS } from "@/lib/batchData";
import { api } from "@/lib/api";

type Stats = {
  total_students: number; active_batches: number;
  fees: { total: number; paid: number; pending: number; outstanding: number };
  attendance: { present_today: number; absent_today: number };
};

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [year, setYear] = useState<string>(new Date().getFullYear().toString());
  const [month, setMonth] = useState<string>((new Date().getMonth() + 1).toString());

  useEffect(() => {
    api.get(`/api/dashboard?year=${year}&month=${month}`).then(r => setStats(r.data)).catch(console.error);
  }, [year, month]);

  // ── CORE DATA COMPUTATION (Real API + Fallbacks) ── //
  const totalStudents = stats?.total_students ?? ALL_STUDENTS.length;
  const activeBatches = stats?.active_batches ?? BATCHES.length;

  const totalPayableCount = stats?.fees.total ?? ALL_STUDENTS.filter(s => !s.isFree).length;
  const paidCount = stats?.fees.paid ?? ALL_STUDENTS.filter(s => !s.isFree && INIT_FEE_STATE[s.id]?.status === "paid").length;
  const feesDueStudentsCount = stats?.fees.pending ?? (totalPayableCount - paidCount);

  const outstandingLKR = stats?.fees.outstanding ?? ALL_STUDENTS.filter(s => !s.isFree && INIT_FEE_STATE[s.id]?.status !== "paid").reduce((sum, s) => sum + s.feeAmount, 0);
  const collectedPercentage = totalPayableCount > 0 
    ? Math.round((paidCount / totalPayableCount) * 100) 
    : 0;

  const presentToday = stats?.attendance.present_today ?? 0;
  const absentToday = stats?.attendance.absent_today ?? Math.round(totalStudents * 0.08);

  // ── ATTENDANCE ALGORITHM (MAPPED) ── //
  const dynamicAttendance = BATCHES.slice(0, 4).map((b, i) => {
    // Generate pseudo-deterministic rates based on array index so it remains stable but realistic
    const monR = 90 + (i * 2) % 10;
    const tueR = 80 + (i * 5) % 18;
    const wedR = 92 + (i * 3) % 8;
    const rate = Math.round((monR + tueR + wedR) / 3);
    return {
      batch: b.name,
      mon: { v: `${monR}%`, ok: monR >= 85 },
      tue: { v: `${tueR}%`, ok: tueR >= 85 },
      wed: { v: `${wedR}%`, ok: wedR >= 85 },
      rate: `${rate}%`,
      rateOk: rate >= 85
    };
  });

  // ── TEACHER PAYROLL ENGINE ── //
  const teacherCount = TEACHERS.length;
  const currentMonthPayments = INIT_TEACHER_PAYMENTS.filter(p => p.month === "April 2026");
  const payrollPaidAmount = currentMonthPayments.filter(p => p.status === "paid").reduce((sum, p) => sum + p.amount, 0);
  const payrollTotalAmount = currentMonthPayments.reduce((sum, p) => sum + p.amount, 0);
  const payrollPaidPercentage = payrollTotalAmount > 0 ? Math.round((payrollPaidAmount / payrollTotalAmount) * 100) : 0;
  const payrollPaidCount = currentMonthPayments.filter(p => p.status === "paid").length;

  // ── RECENT ALERTS GENERATOR ── //
  const dueStudentsList = ALL_STUDENTS.filter(s => !s.isFree && INIT_FEE_STATE[s.id]?.status !== "paid");
  const activeOverdue = dueStudentsList.filter(s => INIT_FEE_STATE[s.id]?.status === "overdue").slice(0, 2);
  const recentAlerts = activeOverdue.map(s => {
    const batchObj = BATCHES.find(b => b.id === s.batch);
    return {
      type: "fee",
      name: `Fee overdue alert — ${s.name}`,
      sub: `LKR ${s.feeAmount.toLocaleString()} · ${batchObj?.name || s.batch}`,
      time: "Yesterday",
      channel: "WA",
      cost: "LKR 2"
    };
  });

  const absentAlerts = ALL_STUDENTS.slice(10, 12).map(s => {
    const batchObj = BATCHES.find(b => b.id === s.batch);
    return {
      type: "absent",
      name: s.name,
      sub: `${batchObj?.subjects[0] || "General"} · ${batchObj?.name}`,
      time: "Today · 6:00 PM",
      channel: "SMS",
      cost: "LKR 1"
    };
  });

  const alerts = [...recentAlerts, ...absentAlerts];

  return (
    <PageShell>
      <Topbar
        title="Dashboard"
        subtitle="Institute Operational Overview"
        right={
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ width: 110 }}>
              <SearchSelect
                value={year}
                onChange={setYear}
                searchable={false}
                options={[
                  { value: "all", label: "All years" },
                  { value: "2026", label: "2026" },
                  { value: "2025", label: "2025" },
                  { value: "2024", label: "2024" },
                ]}
              />
            </div>
            <div style={{ width: 140 }}>
              <SearchSelect
                value={month}
                onChange={setMonth}
                disabled={year === "all"}
                options={[
                  { value: "all", label: "All months" },
                  ...["January","February","March","April","May","June","July","August","September","October","November","December"].map((m, i) => ({ value: String(i + 1), label: m })),
                ]}
              />
            </div>
            <button className="btn btn-s btn-sm">Download report</button>
          </div>
        }
      />

      <div className="pb fi">
        {/* Plan banner — proper card-style with spacing, matches the system look */}
        <div className="plan-banner">
          <div className="plan-banner-left">
            <span className="plan-banner-tag">TUITION-OS PRO</span>
            <span>Package activated on <strong>March 1, 2026</strong>. Custom fee engines enabled.</span>
          </div>
          <div className="plan-banner-right">
            <span style={{ color: "var(--ink3)" }}>Renews <strong style={{ color: "var(--ink)" }}>May 1, 2026</strong></span>
            <Link href="/settings" className="btn btn-s btn-sm">Manage billing →</Link>
          </div>
        </div>
        <div className="g4" style={{ marginBottom: 18 }}>
          <div className="kpi" style={{ "--kc": "var(--tc)" } as any}>
            <div className="kpi-lbl">Total Students</div>
            <div className="kpi-val">{totalStudents}</div>
            <div className="kpi-tr up">
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 7.5l3.5-3.5 3.5 3.5"/></svg>
              Across all batches
            </div>
          </div>
          <div className="kpi" style={{ "--kc": "var(--sp)" } as any}>
            <div className="kpi-lbl">Active Batches</div>
            <div className="kpi-val">{activeBatches}</div>
            <div className="kpi-tr nt">Actively scheduled</div>
          </div>
          <div className="kpi" style={{ "--kc": "var(--sf)" } as any}>
            <div className="kpi-lbl">Fees Due</div>
            <div className="kpi-val">{feesDueStudentsCount}</div>
            <div className="kpi-tr nt">Students this month</div>
          </div>
          <div className="kpi" style={{ "--kc": "var(--rb)" } as any}>
            <div className="kpi-lbl">Absent Today</div>
            <div className="kpi-val">{absentToday}</div>
            <div className="kpi-tr dn">Parents notified</div>
          </div>
        </div>

        <div className="g2">
          <div>
            <div className="sec-hdr">
              <span className="sec-title">Fee collection engine</span>
              <a href="/fees"><button className="btn btn-g btn-sm">View ledger →</button></a>
            </div>
            <div className="card" style={{ marginBottom: 14 }}>
              <div className="prog-w">
                <div className="prog-hdr"><span className="prog-lbl">Students Collected</span><span className="prog-val">{paidCount} / {totalPayableCount}</span></div>
                <div className="prog-tr"><div className="prog-fi" style={{ width: `${Math.max(5, collectedPercentage)}%`, background: "var(--tc)" }} /></div>
              </div>
              <div className="prog-w" style={{ marginBottom: 0 }}>
                <div className="prog-hdr"><span className="prog-lbl">Outstanding Value (LKR)</span><span className="prog-val">{outstandingLKR.toLocaleString()}</span></div>
                <div className="prog-tr"><div className="prog-fi" style={{ width: `${Math.max(5, 100 - collectedPercentage)}%`, background: "var(--sf)" }} /></div>
              </div>
            </div>

            <div className="sec-hdr">
              <span className="sec-title">Attendance projection</span>
              <a href="/attendance"><button className="btn btn-g btn-sm">Mark today →</button></a>
            </div>
            <div className="tw">
              <table>
                <thead><tr><th>Batch Cluster</th><th>Mon</th><th>Tue</th><th>Wed</th><th>Rate</th></tr></thead>
                <tbody>
                  {dynamicAttendance.map((row) => (
                    <tr key={row.batch}>
                      <td style={{ fontWeight: 600, color: "var(--ink2)" }}>{row.batch}</td>
                      <td><span className={`bdg ${row.mon.ok ? "b-present" : "b-absent"}`}>{row.mon.v}</span></td>
                      <td><span className={`bdg ${row.tue.ok ? "b-present" : "b-absent"}`}>{row.tue.v}</span></td>
                      <td><span className={`bdg ${row.wed.ok ? "b-present" : "b-absent"}`}>{row.wed.v}</span></td>
                      <td className="mono" style={{ color: row.rateOk ? "var(--tc)" : "var(--sf)", fontWeight: 700 }}>{row.rate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <div className="sec-hdr"><span className="sec-title">Recent automated alerts</span></div>
            <div className="card" style={{ padding: 6 }}>
              {alerts.length === 0 ? (
                <div style={{ padding: 32, textAlign: "center", color: "var(--ink3)", fontSize: 13 }}>
                  No alerts sent today.
                </div>
              ) : alerts.map((a, i) => (
                <div key={i} className="notif-row">
                  <span className="notif-row-ic" style={{ background: a.type === "absent" ? "var(--rb-l)" : "var(--ac-l)" }}>
                    {a.type === "absent" ? (
                      <svg width="14" height="14" viewBox="0 0 15 15" fill="none" stroke="var(--rb)" strokeWidth="1.75">
                        <circle cx="7.5" cy="7.5" r="6"/><path d="M7.5 4.5v4M7.5 10.5h.01"/>
                      </svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 15 15" fill="none" stroke="var(--ac)" strokeWidth="1.75">
                        <path d="M2 8l4 4 7-7"/>
                      </svg>
                    )}
                  </span>
                  <span className="notif-row-body">
                    <span className="notif-row-title">{a.name}</span>
                    <span className="notif-row-sub">{a.sub} · {a.time}</span>
                  </span>
                  <div className="notif-row-side">
                    <span className="bdg" style={{ background: a.channel === "WA" ? "#dcfce7" : "var(--tc-l)", color: a.channel === "WA" ? "#15803d" : "var(--tc-d)" }}>
                      {a.channel}
                    </span>
                    <span className="notif-row-time">{a.cost}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Teacher Payroll — half-width column under the main grid ── */}
        <div style={{ marginTop: 24 }}>
          <div className="sec-hdr">
            <span className="sec-title">Teacher payroll engine</span>
            <a href="/teachers/salary"><button className="btn btn-g btn-sm">Payouts →</button></a>
          </div>
          <div className="card" style={{ maxWidth: 560, marginBottom: 0 }}>
            <div className="prog-w">
              <div className="prog-hdr"><span className="prog-lbl">Salaries cleared</span><span className="prog-val">{payrollPaidCount} / {teacherCount}</span></div>
              <div className="prog-tr"><div className="prog-fi" style={{ width: `${Math.max(5, (payrollPaidCount / Math.max(1, teacherCount)) * 100)}%`, background: "var(--tc)" }} /></div>
            </div>
            <div className="prog-w" style={{ marginBottom: 0 }}>
              <div className="prog-hdr"><span className="prog-lbl">Capital Disbursed (LKR)</span><span className="prog-val">{payrollPaidAmount.toLocaleString()} / {payrollTotalAmount.toLocaleString()}</span></div>
              <div className="prog-tr"><div className="prog-fi" style={{ width: `${Math.max(5, payrollPaidPercentage)}%`, background: "var(--tc)" }} /></div>
            </div>
          </div>
        </div>

      </div>
    </PageShell>
  );
}

