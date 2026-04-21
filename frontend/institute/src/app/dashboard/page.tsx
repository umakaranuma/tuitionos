import { Topbar } from "@/components/layout/Topbar";
import { PageShell } from "@/components/layout/PageShell";
import { BATCHES, ALL_STUDENTS, INIT_FEE_STATE, TEACHERS, INIT_TEACHER_PAYMENTS } from "@/lib/batchData";

export default function DashboardPage() {
  // ── CORE DATA COMPUTATION ── //
  const totalStudents = ALL_STUDENTS.length;
  const activeBatches = BATCHES.length;

  const payableStudents = ALL_STUDENTS.filter(s => !s.isFree);
  const totalPayableCount = payableStudents.length;
  const paidCount = payableStudents.filter(s => INIT_FEE_STATE[s.id]?.status === "paid").length;
  
  const dueStudents = payableStudents.filter(s => INIT_FEE_STATE[s.id]?.status !== "paid");
  const feesDueStudentsCount = dueStudents.length;

  const outstandingLKR = dueStudents.reduce((sum, s) => sum + s.feeAmount, 0);
  const collectedPercentage = totalPayableCount > 0 
    ? Math.round((paidCount / totalPayableCount) * 100) 
    : 0;

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

  // Calculate static "Absent Today" simulated number based on rates
  const absentToday = Math.round(totalStudents * 0.08); // Approx 8% typical absent pool

  // ── TEACHER PAYROLL ENGINE ── //
  const teacherCount = TEACHERS.length;
  const currentMonthPayments = INIT_TEACHER_PAYMENTS.filter(p => p.month === "April 2026");
  const payrollPaidAmount = currentMonthPayments.filter(p => p.status === "paid").reduce((sum, p) => sum + p.amount, 0);
  const payrollTotalAmount = currentMonthPayments.reduce((sum, p) => sum + p.amount, 0);
  const payrollPaidPercentage = payrollTotalAmount > 0 ? Math.round((payrollPaidAmount / payrollTotalAmount) * 100) : 0;
  const payrollPaidCount = currentMonthPayments.filter(p => p.status === "paid").length;

  // ── RECENT ALERTS GENERATOR ── //
  const activeOverdue = dueStudents.filter(s => INIT_FEE_STATE[s.id]?.status === "overdue").slice(0, 2);
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
        right={<button className="btn btn-s btn-sm">Download report</button>}
      />
      <div style={{ background: "linear-gradient(90deg, #1a5040, #133a2e)", color: "#fff", padding: "10px 24px", fontSize: 12.5, display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 10, fontWeight: 800, background: "#2d7a5a", padding: "2px 8px", borderRadius: 4, letterSpacing: ".05em" }}>TUITION-OS PRO</span>
          <span>Package automatically activated on <strong>March 1, 2026</strong>. Custom fee engines enabled.</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span>Next scheduled renewal: <strong style={{ color: "#d4ede3" }}>May 1, 2026</strong></span>
          <button style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", padding: "4px 10px", borderRadius: 4, fontSize: 11, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>Manage Billing →</button>
        </div>
      </div>
      <div className="pb fi">
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
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              {alerts.length === 0 ? (
                <div style={{ padding: 30, textAlign: "center", color: "var(--ink3)", fontSize: 13 }}>No alerts sent today.</div>
              ) : alerts.map((a, i) => (
                <div key={i} className="notif-r">
                  <div className="notif-ic" style={{ background: a.type === "absent" ? "var(--rb-l)" : "#fff0db" }}>
                    {a.type === "absent" ? (
                      <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="var(--rb)" strokeWidth="1.75">
                        <circle cx="7.5" cy="7.5" r="6"/><path d="M7.5 4.5v4M7.5 10.5h.01"/>
                      </svg>
                    ) : (
                      <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="#c07b1a" strokeWidth="1.75">
                        <path d="M2 8l4 4 7-7"/>
                      </svg>
                    )}
                  </div>
                  <div>
                    <div className="notif-tl">{a.name}</div>
                    <div className="notif-sb">{a.sub}</div>
                    <div className="notif-time">{a.time}</div>
                  </div>
                  <div className="notif-cost">
                    <span className="bdg b-wa">{a.channel}</span>
                    <div style={{ marginTop: 3 }}>{a.cost}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="sec-hdr" style={{ marginTop: 24 }}>
              <span className="sec-title">Teacher payroll engine</span>
              <a href="/teachers/salary"><button className="btn btn-g btn-sm">Payouts →</button></a>
            </div>
            <div className="card" style={{ marginBottom: 0 }}>
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
      </div>
    </PageShell>
  );
}
