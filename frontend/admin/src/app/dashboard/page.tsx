"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Topbar } from "@/components/layout/Topbar";
import { PageShell } from "@/components/layout/PageShell";
import { api } from "@/lib/api";

type Inst = { id: number; name: string; subdomain: string; plan: string; status: string; owner_name: string; owner_email: string; created_at: string; student_count: number; };
type Stats = { total_institutes: number; premium_count: number; basic_count: number; solo_count: number; trial_count: number; trials_expiring: number; overdue_invoices: number; total_revenue: number; total_students: number; revenue_premium: number; revenue_basic: number; revenue_solo: number; };

const planBadge = (p: string) =>
  p === "institute_pro" ? <span className="bdg b-prem">Institute Pro</span> : (p === "solo" ? <span className="bdg b-basic">Solo</span> : <span className="bdg b-basic">Institute</span>);

const statusBadge = (s: string) => {
  const map: Record<string, JSX.Element> = {
    active: <span className="bdg b-paid">Active</span>,
    trial: <span className="bdg b-trial">Trial</span>,
    suspended: <span className="bdg b-over">Suspended</span>,
  };
  return map[s] || <span>{s}</span>;
};

const initials = (n: string) => n.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();

const P: [string, string][] = [["var(--tc-l)","var(--tc-d)"],["var(--sp-l)","var(--sp)"],["var(--sf-l)","var(--sf)"],["var(--jd-l)","var(--jd)"],["var(--rb-l)","var(--rb)"],["var(--pr-l)","var(--pr)"]];

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [insts, setInsts] = useState<Inst[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState<string>("all");
  const [month, setMonth] = useState<string>("all");

  useEffect(() => {
    Promise.all([
      api.get(`/api/admin/dashboard?year=${year}&month=${month}`).then(r => r.data).catch(() => null),
      api.get("/api/institutes/").then(r => {
        const d = r.data; return Array.isArray(d) ? d : d.results || [];
      }).catch(() => []),
    ]).then(([s, i]) => {
      setStats(s); setInsts(i); setLoading(false);
    });
  }, [year, month]);

  const totalMRR = stats ? Math.round(stats.total_revenue / 1000) : 0;
  
  const currentMonthYear = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <PageShell>
      <Topbar
        title="Dashboard"
        subtitle={`${currentMonthYear} · Platform overview`}
        right={
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <select 
              value={year} 
              onChange={e => setYear(e.target.value)}
              style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid var(--ln)", outline: "none", fontSize: 13 }}
            >
              <option value="all">All Years</option>
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
            </select>
            <select 
              value={month} 
              onChange={e => setMonth(e.target.value)}
              style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid var(--ln)", outline: "none", fontSize: 13 }}
              disabled={year === "all"}
            >
              <option value="all">All Months</option>
              <option value="1">January</option>
              <option value="2">February</option>
              <option value="3">March</option>
              <option value="4">April</option>
              <option value="5">May</option>
              <option value="6">June</option>
              <option value="7">July</option>
              <option value="8">August</option>
              <option value="9">September</option>
              <option value="10">October</option>
              <option value="11">November</option>
              <option value="12">December</option>
            </select>
            <button className="btn btn-s btn-sm">Export report</button>
            <Link href="/institutes/add"><button className="btn btn-p btn-sm">+ Add institute</button></Link>
          </div>
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
                <div className="kpi-lbl">Total MRR</div>
                <div className="kpi-val">{totalMRR > 0 ? `${totalMRR}K` : "—"}</div>
                <div className="kpi-tr up">
                  <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 7.5l3.5-3.5 3.5 3.5"/></svg>
                  Platform revenue
                </div>
              </div>
              <div className="kpi" style={{ "--kc": "var(--jd)" } as any}>
                <div className="kpi-lbl">Active Institutes</div>
                <div className="kpi-val">{stats?.total_institutes ?? 0}</div>
                <div className="kpi-tr up">
                  <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 7.5l3.5-3.5 3.5 3.5"/></svg>
                  {stats?.premium_count ?? 0} pro · {stats?.basic_count ?? 0} inst · {stats?.solo_count ?? 0} solo
                </div>
              </div>
              <div className="kpi" style={{ "--kc": "var(--rb)" } as any}>
                <div className="kpi-lbl">Overdue</div>
                <div className="kpi-val">{stats?.overdue_invoices ?? 0}</div>
                <div className="kpi-tr dn">Action needed</div>
              </div>
              <div className="kpi" style={{ "--kc": "var(--sf)" } as any}>
                <div className="kpi-lbl">Trials Expiring</div>
                <div className="kpi-val">{stats?.trials_expiring ?? 0}</div>
                <div className="kpi-tr nt">Next 7 days</div>
              </div>
            </div>

            <div className="g2">
              {/* Left column */}
              <div>
                <div className="sec-hdr">
                  <span className="sec-title">Recent institutes</span>
                  <Link href="/institutes"><button className="btn btn-g btn-sm">View all →</button></Link>
                </div>
                <div className="tw" style={{ marginBottom: 14 }}>
                  <table>
                    <thead><tr><th>Institute</th><th>Plan</th><th>Status</th><th>Students</th></tr></thead>
                    <tbody>
                      {insts.slice(0, 6).map((inst, idx) => {
                        const [bg, fg] = P[idx % P.length];
                        return (
                          <tr key={inst.id}>
                            <td>
                              <div className="td-nm">
                                <div className="ava" style={{ background: bg, color: fg }}>{initials(inst.name)}</div>
                                {inst.name}
                              </div>
                            </td>
                            <td>{planBadge(inst.plan)}</td>
                            <td>{statusBadge(inst.status)}</td>
                            <td className="mono">{inst.student_count ?? "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Right column */}
              <div>
                <div className="sec-hdr"><span className="sec-title">Revenue breakdown</span></div>
                <div className="card" style={{ padding: 16 }}>
                  <div className="prog-w">
                    <div className="prog-hdr"><span className="prog-lbl">Institute Pro ({stats?.premium_count ?? 0})</span><span className="prog-val">LKR {((stats?.revenue_premium ?? 0) / 1000).toFixed(0)}K</span></div>
                    <div className="prog-tr"><div className="prog-fi" style={{ width: `${stats?.total_institutes ? Math.round((stats.premium_count / stats.total_institutes) * 100) : 0}%`, background: "var(--tc)" }} /></div>
                  </div>
                  <div className="prog-w">
                    <div className="prog-hdr"><span className="prog-lbl">Institutes ({stats?.basic_count ?? 0})</span><span className="prog-val">LKR {((stats?.revenue_basic ?? 0) / 1000).toFixed(0)}K</span></div>
                    <div className="prog-tr"><div className="prog-fi" style={{ width: `${stats?.total_institutes ? Math.round((stats.basic_count / stats.total_institutes) * 100) : 0}%`, background: "var(--jd)" }} /></div>
                  </div>
                  <div className="prog-w">
                    <div className="prog-hdr"><span className="prog-lbl">Solo ({stats?.solo_count ?? 0})</span><span className="prog-val">LKR {((stats?.revenue_solo ?? 0) / 1000).toFixed(0)}K</span></div>
                    <div className="prog-tr"><div className="prog-fi" style={{ width: `${stats?.total_institutes ? Math.round((stats.solo_count / stats.total_institutes) * 100) : 0}%`, background: "var(--sp)" }} /></div>
                  </div>
                  <div className="prog-w" style={{ marginBottom: 0 }}>
                    <div className="prog-hdr"><span className="prog-lbl">Trials ({stats?.trial_count ?? 0})</span><span className="prog-val">Free</span></div>
                    <div className="prog-tr"><div className="prog-fi" style={{ width: `${stats?.total_institutes ? Math.round((stats.trial_count / stats.total_institutes) * 100) : 0}%`, background: "var(--sf)" }} /></div>
                  </div>
                </div>

                <div className="sec-hdr" style={{ marginTop: 14 }}><span className="sec-title">Quick stats</span></div>
                <div className="card" style={{ padding: 16 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
                    <div style={{ padding: "10px 12px", background: "var(--cr)", borderRadius: 9 }}>
                      <div style={{ fontSize: 10, color: "var(--ink3)", fontWeight: 600, letterSpacing: ".04em", textTransform: "uppercase", marginBottom: 2 }}>Pending invoices</div>
                      <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "var(--font-serif)", color: "var(--sf)" }}>{(stats?.overdue_invoices ?? 0) + (stats?.trials_expiring ?? 0)}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </PageShell>
  );
}
