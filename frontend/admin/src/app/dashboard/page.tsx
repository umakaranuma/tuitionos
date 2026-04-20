"use client";
import { useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { PageShell } from "@/components/layout/PageShell";

const insts = [
  { n: "St. Patrick's", d: "Jaffna", plan: "premium", s: 312, bill: "May 1", st: "paid", bg: "var(--tc-l)", fg: "var(--tc-d)" },
  { n: "Alpha Lanka", d: "Colombo", plan: "basic", s: 87, bill: "May 1", st: "trial", bg: "var(--sp-l)", fg: "var(--sp)" },
  { n: "Bright Minds", d: "Kandy", plan: "basic", s: 145, bill: "Apr 10", st: "due", bg: "var(--sf-l)", fg: "var(--sf)" },
  { n: "Nova Science", d: "Gampaha", plan: "premium", s: 203, bill: "May 1", st: "paid", bg: "var(--jd-l)", fg: "var(--jd)" },
  { n: "Edu Leaders", d: "Vavuniya", plan: "basic", s: 68, bill: "Mar 10", st: "overdue", bg: "var(--rb-l)", fg: "var(--rb)" },
  { n: "Vision Academy", d: "Colombo", plan: "premium", s: 280, bill: "May 1", st: "paid", bg: "var(--tc-l)", fg: "var(--tc-d)" },
  { n: "Mathura Edu", d: "Jaffna", plan: "basic", s: 110, bill: "May 1", st: "paid", bg: "var(--sp-l)", fg: "var(--sp)" },
  { n: "Sunrise Tutors", d: "Kandy", plan: "basic", s: 55, bill: "May 1", st: "paid", bg: "var(--jd-l)", fg: "var(--jd)" },
];

const months = ["Jan", "Feb", "Mar", "Apr"];
const basic = [96, 111, 126, 135];
const prem = [90, 108, 120, 138];
const mx = 280;

const planBadge = (p: string) =>
  p === "premium" ? <span className="bdg b-prem">Premium</span> : <span className="bdg b-basic">Basic</span>;

const statusBadge = (s: string) => {
  const map: Record<string, JSX.Element> = {
    paid: <span className="bdg b-paid">Paid</span>,
    due: <span className="bdg b-due">Due</span>,
    overdue: <span className="bdg b-over">Overdue</span>,
    trial: <span className="bdg b-trial">Trial</span>,
  };
  return map[s] || <span>{s}</span>;
};

const initials = (n: string) => n.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();

export default function DashboardPage() {
  return (
    <PageShell>
      <Topbar
        title="Dashboard"
        subtitle="April 2026 · Platform overview"
        right={
          <>
            <button className="btn btn-s btn-sm">Export report</button>
            <a href="/institutes/add"><button className="btn btn-p btn-sm">+ Add institute</button></a>
          </>
        }
      />
      <div className="pb fi">
        {/* KPIs */}
        <div className="g4" style={{ marginBottom: 18 }}>
          <div className="kpi" style={{ "--kc": "var(--tc)" } as any}>
            <div className="kpi-lbl">Total MRR</div>
            <div className="kpi-val">387K</div>
            <div className="kpi-tr up">
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 7.5l3.5-3.5 3.5 3.5"/></svg>
              +12% vs Mar
            </div>
          </div>
          <div className="kpi" style={{ "--kc": "var(--jd)" } as any}>
            <div className="kpi-lbl">Active Institutes</div>
            <div className="kpi-val">68</div>
            <div className="kpi-tr up">
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 7.5l3.5-3.5 3.5 3.5"/></svg>
              +5 this month
            </div>
          </div>
          <div className="kpi" style={{ "--kc": "var(--rb)" } as any}>
            <div className="kpi-lbl">Overdue</div>
            <div className="kpi-val">7</div>
            <div className="kpi-tr dn">
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3.5l3.5 3.5 3.5-3.5"/></svg>
              Action needed
            </div>
          </div>
          <div className="kpi" style={{ "--kc": "var(--sf)" } as any}>
            <div className="kpi-lbl">Trials Expiring</div>
            <div className="kpi-val">4</div>
            <div className="kpi-tr nt">Next 7 days</div>
          </div>
        </div>

        <div className="g2">
          {/* Left column */}
          <div>
            <div className="sec-hdr">
              <span className="sec-title">Recent activity</span>
              <a href="/institutes"><button className="btn btn-g btn-sm">View all →</button></a>
            </div>
            <div className="tw" style={{ marginBottom: 14 }}>
              <table>
                <thead><tr><th>Institute</th><th>Plan</th><th>Status</th><th>Date</th></tr></thead>
                <tbody>
                  {insts.slice(0, 5).map((i) => (
                    <tr key={i.n}>
                      <td>
                        <div className="td-nm">
                          <div className="ava" style={{ background: i.bg, color: i.fg }}>{initials(i.n)}</div>
                          {i.n}
                        </div>
                      </td>
                      <td>{planBadge(i.plan)}</td>
                      <td>{statusBadge(i.st)}</td>
                      <td className="mono">Apr {17 - insts.indexOf(i)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="sec-hdr"><span className="sec-title">USD goal tracker</span></div>
            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
                <div>
                  <div style={{ fontFamily: "var(--font-serif)", fontSize: 22, color: "var(--ink)" }}>$1,248</div>
                  <div style={{ fontSize: 10.5, color: "var(--ink3)" }}>Current MRR</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 10.5, color: "var(--ink3)" }}>Goal</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>$2,000/mo</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: "var(--font-serif)", fontSize: 22, color: "var(--rb)" }}>$752</div>
                  <div style={{ fontSize: 10.5, color: "var(--ink3)" }}>Remaining</div>
                </div>
              </div>
              <div className="prog-tr" style={{ height: 8 }}>
                <div className="prog-fi" style={{ width: "62%", background: "var(--tc)" }} />
              </div>
              <div style={{ fontSize: 10.5, color: "var(--ink3)", marginTop: 6, textAlign: "center" }}>
                62% of target · Need ~18 more Premium institutes
              </div>
            </div>
          </div>

          {/* Right column */}
          <div>
            <div className="sec-hdr"><span className="sec-title">Monthly MRR (2026)</span></div>
            <div className="card" style={{ padding: 16, marginBottom: 14 }}>
              <div className="bar-ch">
                {months.map((m, i) => (
                  <div key={m} className="bar-col">
                    <div style={{ display: "flex", gap: 2, alignItems: "flex-end", height: 90 }}>
                      <div className="bar" style={{ height: Math.round(basic[i] / mx * 85), background: "var(--tc)", width: 16, opacity: .75 }} />
                      <div className="bar" style={{ height: Math.round(prem[i] / mx * 85), background: "var(--jd)", width: 16 }} />
                    </div>
                    <div className="bar-lbl">{m}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10.5, color: "var(--ink3)" }}>
                  <span style={{ width: 9, height: 9, borderRadius: 2, background: "var(--tc)", display: "inline-block", opacity: .75 }} />Basic
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10.5, color: "var(--ink3)" }}>
                  <span style={{ width: 9, height: 9, borderRadius: 2, background: "var(--jd)", display: "inline-block" }} />Premium
                </span>
              </div>
            </div>

            <div className="sec-hdr"><span className="sec-title">Revenue breakdown</span></div>
            <div className="card" style={{ padding: 16 }}>
              <div className="prog-w">
                <div className="prog-hdr"><span className="prog-lbl">Premium collected (23)</span><span className="prog-val">LKR 138K</span></div>
                <div className="prog-tr"><div className="prog-fi" style={{ width: "43%", background: "var(--tc)" }} /></div>
              </div>
              <div className="prog-w">
                <div className="prog-hdr"><span className="prog-lbl">Basic collected (45)</span><span className="prog-val">LKR 183K</span></div>
                <div className="prog-tr"><div className="prog-fi" style={{ width: "57%", background: "var(--jd)" }} /></div>
              </div>
              <div className="prog-w" style={{ marginBottom: 0 }}>
                <div className="prog-hdr"><span className="prog-lbl">Outstanding (7)</span><span className="prog-val">LKR 66K</span></div>
                <div className="prog-tr"><div className="prog-fi" style={{ width: "17%", background: "var(--rb)" }} /></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
