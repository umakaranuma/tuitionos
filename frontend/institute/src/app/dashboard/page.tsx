import { Topbar } from "@/components/layout/Topbar";
import { PageShell } from "@/components/layout/PageShell";

const attendanceWeek = [
  { batch: "Grade 7 — A", mon: { v: "96%", ok: true }, tue: { v: "94%", ok: true }, wed: { v: "98%", ok: true }, rate: "96%", rateOk: true },
  { batch: "Grade 10 — O/L", mon: { v: "91%", ok: true }, tue: { v: "78%", ok: false }, wed: { v: "89%", ok: true }, rate: "86%", rateOk: false },
  { batch: "Grade 11 — A/L Sci", mon: { v: "95%", ok: true }, tue: { v: "93%", ok: true }, wed: { v: "97%", ok: true }, rate: "95%", rateOk: true },
];

const recentAlerts = [
  { type: "absent", name: "Aarav Kumar", sub: "Physics · Grade 10 O/L", time: "Today · 6:00 PM", channel: "WA", cost: "LKR 2" },
  { type: "absent", name: "Priya Selvan", sub: "Chemistry + Maths · Grade 10 O/L", time: "Today · 6:00 PM · batched", channel: "WA", cost: "LKR 2" },
  { type: "paid", name: "Fee paid — Dinesh Raj", sub: "LKR 6,000 · April 2026", time: "Yesterday · 3:12 PM", channel: "WA", cost: "LKR 2" },
];

export default function DashboardPage() {
  return (
    <PageShell>
      <Topbar
        title="Dashboard"
        subtitle="St. Patrick's Institute · April 2026"
        right={<button className="btn btn-s btn-sm">Download report</button>}
      />
      <div className="pb fi">
        <div className="g4" style={{ marginBottom: 18 }}>
          <div className="kpi" style={{ "--kc": "var(--tc)" } as any}>
            <div className="kpi-lbl">Total Students</div>
            <div className="kpi-val">312</div>
            <div className="kpi-tr up">
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 7.5l3.5-3.5 3.5 3.5"/></svg>
              +18 this month
            </div>
          </div>
          <div className="kpi" style={{ "--kc": "var(--sp)" } as any}>
            <div className="kpi-lbl">Active Batches</div>
            <div className="kpi-val">8</div>
            <div className="kpi-tr nt">4 subjects each</div>
          </div>
          <div className="kpi" style={{ "--kc": "var(--sf)" } as any}>
            <div className="kpi-lbl">Fees Due</div>
            <div className="kpi-val">47</div>
            <div className="kpi-tr nt">Students this month</div>
          </div>
          <div className="kpi" style={{ "--kc": "var(--rb)" } as any}>
            <div className="kpi-lbl">Absent Today</div>
            <div className="kpi-val">23</div>
            <div className="kpi-tr dn">Parents notified</div>
          </div>
        </div>

        <div className="g2">
          <div>
            <div className="sec-hdr">
              <span className="sec-title">Fee collection — April</span>
              <a href="/fees"><button className="btn btn-g btn-sm">View all →</button></a>
            </div>
            <div className="card" style={{ marginBottom: 14 }}>
              <div className="prog-w">
                <div className="prog-hdr"><span className="prog-lbl">Collected</span><span className="prog-val">265 / 312</span></div>
                <div className="prog-tr"><div className="prog-fi" style={{ width: "85%", background: "var(--tc)" }} /></div>
              </div>
              <div className="prog-w" style={{ marginBottom: 0 }}>
                <div className="prog-hdr"><span className="prog-lbl">Outstanding (LKR)</span><span className="prog-val">141,000</span></div>
                <div className="prog-tr"><div className="prog-fi" style={{ width: "15%", background: "var(--rb)" }} /></div>
              </div>
            </div>

            <div className="sec-hdr">
              <span className="sec-title">Attendance this week</span>
              <a href="/attendance"><button className="btn btn-g btn-sm">Mark today →</button></a>
            </div>
            <div className="tw">
              <table>
                <thead><tr><th>Batch</th><th>Mon</th><th>Tue</th><th>Wed</th><th>Rate</th></tr></thead>
                <tbody>
                  {attendanceWeek.map((row) => (
                    <tr key={row.batch}>
                      <td>{row.batch}</td>
                      <td><span className={`bdg ${row.mon.ok ? "b-present" : "b-absent"}`}>{row.mon.v}</span></td>
                      <td><span className={`bdg ${row.tue.ok ? "b-present" : "b-absent"}`}>{row.tue.v}</span></td>
                      <td><span className={`bdg ${row.wed.ok ? "b-present" : "b-absent"}`}>{row.wed.v}</span></td>
                      <td className="mono" style={{ color: row.rateOk ? "var(--tc)" : "var(--sf)" }}>{row.rate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <div className="sec-hdr"><span className="sec-title">Recent absent alerts sent</span></div>
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              {recentAlerts.map((a, i) => (
                <div key={i} className="notif-r">
                  <div className="notif-ic" style={{ background: a.type === "absent" ? "var(--rb-l)" : "var(--tc-l)" }}>
                    {a.type === "absent" ? (
                      <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="var(--rb)" strokeWidth="1.75">
                        <circle cx="7.5" cy="7.5" r="6"/><path d="M7.5 4.5v4M7.5 10.5h.01"/>
                      </svg>
                    ) : (
                      <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="var(--tc-d)" strokeWidth="1.75">
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
        </div>
      </div>
    </PageShell>
  );
}
