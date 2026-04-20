import { Topbar } from "@/components/layout/Topbar";
import { PageShell } from "@/components/layout/PageShell";

const monthlyData = [
  { month: "Apr 2026", basic: 135000, premium: 138000, total: 387000, usd: "$1,248", status: "collecting" },
  { month: "Mar 2026", basic: 126000, premium: 120000, total: 345000, usd: "$1,113", status: "done" },
  { month: "Feb 2026", basic: 111000, premium: 108000, total: 309000, usd: "$997", status: "done" },
  { month: "Jan 2026", basic: 96000, premium: 90000, total: 276000, usd: "$890", status: "done" },
];

const statusBadge = (s: string) =>
  s === "done" ? <span className="bdg b-paid">Done</span> : <span className="bdg b-due">Collecting</span>;

export default function IncomePage() {
  return (
    <PageShell>
      <Topbar
        title="Income"
        subtitle="April 2026"
        right={<button className="btn btn-s btn-sm">Export CSV</button>}
      />
      <div className="pb fi">
        <div className="g4" style={{ marginBottom: 18 }}>
          <div className="kpi" style={{ "--kc": "var(--tc)" } as any}>
            <div className="kpi-lbl">This Month MRR</div>
            <div className="kpi-val">387K</div>
            <div className="kpi-tr nt mono">≈ USD 1,248</div>
          </div>
          <div className="kpi" style={{ "--kc": "var(--jd)" } as any}>
            <div className="kpi-lbl">Collected</div>
            <div className="kpi-val">321K</div>
            <div className="kpi-tr up">
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 7.5l3.5-3.5 3.5 3.5"/></svg>
              61 institutes
            </div>
          </div>
          <div className="kpi" style={{ "--kc": "var(--rb)" } as any}>
            <div className="kpi-lbl">Outstanding</div>
            <div className="kpi-val">66K</div>
            <div className="kpi-tr dn">7 institutes</div>
          </div>
          <div className="kpi" style={{ "--kc": "var(--sf)" } as any}>
            <div className="kpi-lbl">Notif Spend</div>
            <div className="kpi-val">18.2K</div>
            <div className="kpi-tr nt">4.7% of MRR</div>
          </div>
        </div>

        <div className="g2">
          <div>
            <div className="sec-hdr"><span className="sec-title">Monthly breakdown</span></div>
            <div className="tw">
              <table>
                <thead><tr><th>Month</th><th>Basic</th><th>Premium</th><th>Total LKR</th><th>USD</th><th>Status</th></tr></thead>
                <tbody>
                  {monthlyData.map((m) => (
                    <tr key={m.month}>
                      <td>{m.month}</td>
                      <td className="mono">{m.basic.toLocaleString()}</td>
                      <td className="mono">{m.premium.toLocaleString()}</td>
                      <td className="mono" style={{ fontWeight: 600 }}>{m.total.toLocaleString()}</td>
                      <td className="mono">{m.usd}</td>
                      <td>{statusBadge(m.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <div className="sec-hdr"><span className="sec-title">Revenue by plan</span></div>
            <div className="card" style={{ marginBottom: 14 }}>
              <div className="prog-w">
                <div className="prog-hdr"><span className="prog-lbl">Premium revenue</span><span className="prog-val">LKR 138K</span></div>
                <div className="prog-tr"><div className="prog-fi" style={{ width: "43%", background: "var(--tc)" }} /></div>
              </div>
              <div className="prog-w">
                <div className="prog-hdr"><span className="prog-lbl">Basic revenue</span><span className="prog-val">LKR 183K</span></div>
                <div className="prog-tr"><div className="prog-fi" style={{ width: "57%", background: "var(--sp)" }} /></div>
              </div>
              <div className="prog-w" style={{ marginBottom: 0 }}>
                <div className="prog-hdr"><span className="prog-lbl">Outstanding</span><span className="prog-val">LKR 66K</span></div>
                <div className="prog-tr"><div className="prog-fi" style={{ width: "17%", background: "var(--rb)" }} /></div>
              </div>
            </div>

            <div className="sec-hdr"><span className="sec-title">$2,000 goal tracker</span></div>
            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 9 }}>
                <div>
                  <div style={{ fontFamily: "var(--font-serif)", fontSize: 20 }}>$1,248</div>
                  <div style={{ fontSize: 10, color: "var(--ink3)" }}>Current MRR</div>
                </div>
                <div style={{ fontSize: 10, color: "var(--ink3)" }}>Target: $2,000</div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: "var(--font-serif)", fontSize: 20, color: "var(--rb)" }}>$752</div>
                  <div style={{ fontSize: 10, color: "var(--ink3)" }}>Remaining</div>
                </div>
              </div>
              <div className="prog-tr" style={{ height: 8 }}>
                <div className="prog-fi" style={{ width: "62%", background: "var(--tc)" }} />
              </div>
              <div style={{ fontSize: 10, color: "var(--ink3)", marginTop: 5, textAlign: "center" }}>
                62% · Need ~18 more Premium institutes
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
