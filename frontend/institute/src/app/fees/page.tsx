import { Topbar } from "@/components/layout/Topbar";
import { PageShell } from "@/components/layout/PageShell";

const feeData = [
  { initials: "AK", name: "Aarav Kumar", batch: "Grade 10 O/L", amount: "5,500", status: "paid", due: "Apr 5", bg: "var(--tc-l)", fg: "var(--tc-d)" },
  { initials: "PS", name: "Priya Selvan", batch: "Grade 10 O/L", amount: "5,500", status: "due", due: "Apr 10", bg: "var(--sp-l)", fg: "var(--sp)" },
  { initials: "ST", name: "Surya T.", batch: "Grade 10 O/L", amount: "5,500", status: "due", due: "Apr 10", bg: "var(--rb-l)", fg: "var(--rb)" },
  { initials: "KM", name: "Kavitha M.", batch: "Grade 7 A", amount: "3,000", status: "paid", due: "Apr 4", bg: "var(--sf-l)", fg: "var(--sf)" },
  { initials: "DR", name: "Dinesh Raj", batch: "Grade 11 A/L", amount: "7,000", status: "paid", due: "Apr 3", bg: "var(--pr-l)", fg: "var(--pr)" },
  { initials: "NV", name: "Nithya V.", batch: "Grade 7 A", amount: "3,000", status: "paid", due: "Apr 4", bg: "var(--tc-l)", fg: "var(--tc-d)" },
  { initials: "MJ", name: "Meena J.", batch: "Grade 10 O/L", amount: "5,500", status: "overdue", due: "Mar 10", bg: "var(--sf-l)", fg: "var(--sf)" },
  { initials: "RP", name: "Rajan P.", batch: "Grade 11 A/L", amount: "7,000", status: "paid", due: "Apr 3", bg: "var(--sp-l)", fg: "var(--sp)" },
];

const statusBadge = (s: string) => {
  if (s === "paid") return <span className="bdg b-paid">Paid</span>;
  if (s === "due") return <span className="bdg b-due">Due</span>;
  return <span style={{ background: "var(--rb-l)", color: "var(--rb)", fontSize: 10.5, fontWeight: 600, padding: "2px 8px", borderRadius: 99, display: "inline-flex" }}>Overdue</span>;
};

const FeeActions = ({ status }: { status: string }) => {
  if (status === "paid") return <button className="btn btn-xs btn-s">Receipt</button>;
  return (
    <div style={{ display: "flex", gap: 4 }}>
      <button className="btn btn-xs btn-ok">Mark paid</button>
      <button className="btn btn-xs btn-s">Remind</button>
    </div>
  );
};

export default function FeesPage() {
  return (
    <PageShell>
      <Topbar
        title="Fee tracking"
        subtitle="April 2026"
        right={
          <>
            <button className="btn btn-s btn-sm">Export PDF</button>
            <button className="btn btn-p btn-sm">Send reminders</button>
          </>
        }
      />
      <div className="pb fi">
        <div className="g4" style={{ marginBottom: 18 }}>
          <div className="kpi" style={{ "--kc": "var(--tc)" } as any}>
            <div className="kpi-lbl">Collected</div>
            <div className="kpi-val">265</div>
            <div className="kpi-tr up">85% students</div>
          </div>
          <div className="kpi" style={{ "--kc": "var(--sf)" } as any}>
            <div className="kpi-lbl">Outstanding</div>
            <div className="kpi-val">47</div>
            <div className="kpi-tr nt">LKR 141,000</div>
          </div>
          <div className="kpi" style={{ "--kc": "var(--sp)" } as any}>
            <div className="kpi-lbl">Total revenue</div>
            <div className="kpi-val">936K</div>
            <div className="kpi-tr nt">This month</div>
          </div>
          <div className="kpi" style={{ "--kc": "var(--rb)" } as any}>
            <div className="kpi-lbl">Overdue 10+ days</div>
            <div className="kpi-val">12</div>
            <div className="kpi-tr dn">Need follow-up</div>
          </div>
        </div>

        <div className="tw">
          <table>
            <thead>
              <tr>
                <th>Student</th><th>Batch</th><th>Amount (LKR)</th>
                <th>Status</th><th>Due date</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {feeData.map((f) => (
                <tr key={f.name}>
                  <td>
                    <div className="td-nm">
                      <div className="ava" style={{ background: f.bg, color: f.fg }}>{f.initials}</div>
                      {f.name}
                    </div>
                  </td>
                  <td style={{ color: "var(--ink3)" }}>{f.batch}</td>
                  <td className="mono">{f.amount}</td>
                  <td>{statusBadge(f.status)}</td>
                  <td className="mono">{f.due}</td>
                  <td><FeeActions status={f.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PageShell>
  );
}
