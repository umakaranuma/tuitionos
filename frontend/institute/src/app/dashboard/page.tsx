"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Topbar } from "@/components/layout/Topbar";
import { PageShell } from "@/components/layout/PageShell";
import { SearchSelect } from "@/components/ui/SearchSelect";
import { api } from "@/lib/api";

type DayRate = { label: string; rate: number | null };
type BatchAttendance = { batch: string; days: DayRate[]; overall_rate: number | null };
type Alert = { type: string; name: string; sub: string; time: string; channel: string; delivered: boolean };

type Stats = {
  total_students: number; active_batches: number;
  fees: { total: number; paid: number; pending: number; outstanding: number };
  attendance: { present_today: number; absent_today: number; date: string | null; is_today: boolean; by_batch: BatchAttendance[] };
  payroll: { month: string; teacher_count: number; paid_count: number; paid_amount: number; total_amount: number };
  recent_alerts: Alert[];
  institute: { name: string; plan: string; status: string; trial_ends_at: string | null; created_at: string };
};

const PLAN_LABELS: Record<string, string> = { solo: "Solo", institute: "Institute", institute_pro: "Institute Pro" };
const STATUS_LABELS: Record<string, string> = {
  pending: "Pending", trial: "Trial", active: "Active",
  paused: "Paused", suspended: "Suspended", deactivated: "Deactivated",
};

function relativeTime(iso: string) {
  const then = new Date(iso).getTime();
  const diffMin = Math.round((Date.now() - then) / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay === 1) return "Yesterday";
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState<string>(new Date().getFullYear().toString());
  const [month, setMonth] = useState<string>((new Date().getMonth() + 1).toString());

  useEffect(() => {
    setLoading(true);
    api.get(`/api/dashboard?year=${year}&month=${month}`)
      .then(r => setStats(r.data))
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, [year, month]);

  const totalPayableCount = stats?.fees.total ?? 0;
  const paidCount = stats?.fees.paid ?? 0;
  const feesDueStudentsCount = stats?.fees.pending ?? 0;
  const outstandingLKR = stats?.fees.outstanding ?? 0;
  const collectedPercentage = totalPayableCount > 0 ? Math.round((paidCount / totalPayableCount) * 100) : 0;

  const attendanceRows = stats?.attendance.by_batch ?? [];
  const dayLabels = attendanceRows[0]?.days.map(d => d.label) ?? [];

  const payroll = stats?.payroll;
  const payrollPaidPercentage = payroll && payroll.total_amount > 0
    ? Math.round((payroll.paid_amount / payroll.total_amount) * 100) : 0;

  const alerts = stats?.recent_alerts ?? [];
  const institute = stats?.institute;

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
          </div>
        }
      />

      <div className="pb fi">
        {/* Plan banner — real institute subscription state, no fabricated dates */}
        {institute && (
          <div className="plan-banner">
            <div className="plan-banner-left">
              <span className="plan-banner-tag">TUITIONOS {PLAN_LABELS[institute.plan]?.toUpperCase() || institute.plan.toUpperCase()}</span>
              <span>
                Status: <strong>{STATUS_LABELS[institute.status] || institute.status}</strong>
                {institute.status === "trial" && institute.trial_ends_at && (
                  <> · Trial ends <strong>{new Date(institute.trial_ends_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</strong></>
                )}
                {institute.status !== "trial" && (
                  <> · Member since <strong>{new Date(institute.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</strong></>
                )}
              </span>
            </div>
            <div className="plan-banner-right">
              <Link href="/settings" className="btn btn-s btn-sm">Manage billing →</Link>
            </div>
          </div>
        )}

        {/* Every KPI below is scoped to whichever year the "Academic year"
            switcher (top of the sidebar) is set to — not just this period
            filter. A genuinely empty year (nothing created or copied into it
            yet) reads as a wall of unexplained zeros, which is easy to mistake
            for a bug. Say so plainly instead of leaving it silent. */}
        {!loading && stats && stats.active_batches === 0 && (
          <div className="card" style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "14px 18px", marginBottom: 14, gap: 12, flexWrap: "wrap",
            borderLeft: "4px solid var(--sf)",
          }}>
            <div style={{ fontSize: 13, color: "var(--ink2)" }}>
              <strong>No batches set up yet for the selected academic year</strong> — that's why the stats below are at zero, not a data problem.
            </div>
            <Link href="/batches" className="btn btn-p btn-sm">Copy from previous year →</Link>
          </div>
        )}

        <div className="g4" style={{ marginBottom: 18 }}>
          <div className="kpi" style={{ "--kc": "var(--tc)" } as any}>
            <div className="kpi-lbl">Total Students</div>
            <div className="kpi-val">{loading ? "…" : stats?.total_students ?? 0}</div>
            <div className="kpi-tr up">
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 7.5l3.5-3.5 3.5 3.5"/></svg>
              Across all batches
            </div>
          </div>
          <div className="kpi" style={{ "--kc": "var(--sp)" } as any}>
            <div className="kpi-lbl">Active Batches</div>
            <div className="kpi-val">{loading ? "…" : stats?.active_batches ?? 0}</div>
            <div className="kpi-tr nt">Actively scheduled</div>
          </div>
          <div className="kpi" style={{ "--kc": "var(--sf)" } as any}>
            <div className="kpi-lbl">Fees Due</div>
            <div className="kpi-val">{loading ? "…" : feesDueStudentsCount}</div>
            <div className="kpi-tr nt">Students this period</div>
          </div>
          <div className="kpi" style={{ "--kc": "var(--rb)" } as any}>
            <div className="kpi-lbl">{stats && !stats.attendance.is_today ? "Absent (latest)" : "Absent Today"}</div>
            <div className="kpi-val">{loading ? "…" : stats?.attendance.absent_today ?? 0}</div>
            <div className="kpi-tr dn">
              {stats?.attendance.date
                ? (stats.attendance.is_today ? "Marked today" : `As of ${new Date(stats.attendance.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`)
                : "No attendance yet"}
            </div>
          </div>
        </div>

        <div className="g2">
          <div>
            <div className="sec-hdr">
              <span className="sec-title">Fee collection</span>
              <a href="/fees"><button className="btn btn-g btn-sm">View ledger →</button></a>
            </div>
            <div className="card" style={{ marginBottom: 14 }}>
              <div className="prog-w">
                <div className="prog-hdr"><span className="prog-lbl">Students Collected</span><span className="prog-val">{paidCount} / {totalPayableCount}</span></div>
                <div className="prog-tr"><div className="prog-fi" style={{ width: `${totalPayableCount > 0 ? Math.max(5, collectedPercentage) : 0}%`, background: "var(--tc)" }} /></div>
              </div>
              <div className="prog-w" style={{ marginBottom: 0 }}>
                <div className="prog-hdr"><span className="prog-lbl">Outstanding Value (LKR)</span><span className="prog-val">{outstandingLKR.toLocaleString()}</span></div>
                <div className="prog-tr"><div className="prog-fi" style={{ width: `${totalPayableCount > 0 ? Math.max(5, 100 - collectedPercentage) : 0}%`, background: "var(--sf)" }} /></div>
              </div>
            </div>

            <div className="sec-hdr">
              <span className="sec-title">Attendance by batch</span>
              <a href="/attendance"><button className="btn btn-g btn-sm">Mark today →</button></a>
            </div>
            <div className="tw">
              <table>
                <thead>
                  <tr>
                    <th>Batch</th>
                    {dayLabels.map(l => <th key={l}>{l}</th>)}
                    <th>Overall</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceRows.length === 0 ? (
                    <tr><td colSpan={2 + dayLabels.length} style={{ textAlign: "center", color: "var(--ink3)", padding: 20 }}>
                      {loading ? "Loading…" : "No attendance recorded yet."}
                    </td></tr>
                  ) : attendanceRows.map((row) => (
                    <tr key={row.batch}>
                      <td style={{ fontWeight: 600, color: "var(--ink2)" }}>{row.batch}</td>
                      {row.days.map((d, i) => (
                        <td key={i}>
                          {d.rate === null
                            ? <span style={{ color: "var(--ink3)" }}>—</span>
                            : <span className={`bdg ${d.rate >= 85 ? "b-present" : "b-absent"}`}>{d.rate}%</span>}
                        </td>
                      ))}
                      <td className="mono" style={{ color: row.overall_rate !== null && row.overall_rate >= 85 ? "var(--tc)" : "var(--sf)", fontWeight: 700 }}>
                        {row.overall_rate === null ? "—" : `${row.overall_rate}%`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <div className="sec-hdr"><span className="sec-title">Recent alerts sent</span></div>
            <div className="card" style={{ padding: 6 }}>
              {loading ? (
                <div style={{ padding: 32, textAlign: "center", color: "var(--ink3)", fontSize: 13 }}>Loading…</div>
              ) : alerts.length === 0 ? (
                <div style={{ padding: 32, textAlign: "center", color: "var(--ink3)", fontSize: 13 }}>
                  No alerts sent yet.
                </div>
              ) : alerts.map((a, i) => (
                <div key={i} className="notif-row">
                  <span className="notif-row-ic" style={{ background: a.delivered ? "var(--ac-l)" : "var(--rb-l)" }}>
                    {a.delivered ? (
                      <svg width="14" height="14" viewBox="0 0 15 15" fill="none" stroke="var(--ac)" strokeWidth="1.75">
                        <path d="M2 8l4 4 7-7"/>
                      </svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 15 15" fill="none" stroke="var(--rb)" strokeWidth="1.75">
                        <circle cx="7.5" cy="7.5" r="6"/><path d="M7.5 4.5v4M7.5 10.5h.01"/>
                      </svg>
                    )}
                  </span>
                  <span className="notif-row-body">
                    <span className="notif-row-title">{a.name} · {a.type.replace(/_/g, " ")}</span>
                    <span className="notif-row-sub">{a.sub || "—"} · {relativeTime(a.time)}</span>
                  </span>
                  <div className="notif-row-side">
                    <span className="bdg" style={{ background: a.channel === "WA" ? "#dcfce7" : "var(--tc-l)", color: a.channel === "WA" ? "#15803d" : "var(--tc-d)" }}>
                      {a.channel}
                    </span>
                    <span className="notif-row-time">{a.delivered ? "Sent" : "Failed"}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Teacher Payroll — half-width column under the main grid ── */}
        <div style={{ marginTop: 24 }}>
          <div className="sec-hdr">
            <span className="sec-title">Teacher payroll — {payroll?.month || ""}</span>
            <a href="/teachers/salary"><button className="btn btn-g btn-sm">Payouts →</button></a>
          </div>
          <div className="card" style={{ maxWidth: 560, marginBottom: 0 }}>
            <div className="prog-w">
              <div className="prog-hdr"><span className="prog-lbl">Salaries cleared</span><span className="prog-val">{payroll?.paid_count ?? 0} / {payroll?.teacher_count ?? 0}</span></div>
              <div className="prog-tr"><div className="prog-fi" style={{ width: `${payroll && payroll.teacher_count > 0 ? Math.max(5, (payroll.paid_count / payroll.teacher_count) * 100) : 0}%`, background: "var(--tc)" }} /></div>
            </div>
            <div className="prog-w" style={{ marginBottom: 0 }}>
              <div className="prog-hdr"><span className="prog-lbl">Disbursed (LKR)</span><span className="prog-val">{(payroll?.paid_amount ?? 0).toLocaleString()} / {(payroll?.total_amount ?? 0).toLocaleString()}</span></div>
              <div className="prog-tr"><div className="prog-fi" style={{ width: `${payroll && payroll.total_amount > 0 ? Math.max(5, payrollPaidPercentage) : 0}%`, background: "var(--tc)" }} /></div>
            </div>
          </div>
        </div>

      </div>
    </PageShell>
  );
}
