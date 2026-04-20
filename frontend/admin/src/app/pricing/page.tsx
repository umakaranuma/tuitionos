import { Topbar } from "@/components/layout/Topbar";
import { PageShell } from "@/components/layout/PageShell";

const milestones = [
  { name: "Q1 — Launch", basic: 5, premium: 2, lkr: "27,000", usd: "~$87" },
  { name: "Q2 — Growth", basic: 20, premium: 8, lkr: "108,000", usd: "~$348" },
  { name: "Q3 — Scale", basic: 45, premium: 20, lkr: "255,000", usd: "~$823" },
  { name: "Q4 — Target", basic: 55, premium: 20, lkr: "285,000", usd: "~$919" },
  { name: "$2,000 goal ✓", basic: 80, premium: 30, lkr: "420,000", usd: "~$1,355", goal: true },
];

const CheckIcon = ({ color }: { color?: string }) => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke={color || "var(--jd)"} strokeWidth="2">
    <path d="M2 7l3 3 7-7"/>
  </svg>
);

const CrossIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="var(--ln)" strokeWidth="2">
    <path d="M3 3l8 8M11 3l-8 8"/>
  </svg>
);

export default function PricingPage() {
  return (
    <PageShell>
      <Topbar title="Pricing" subtitle="Tier comparison · Revenue milestones" />
      <div className="pb fi">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, maxWidth: 660, marginBottom: 28 }}>
          {/* Basic */}
          <div className="tier-c">
            <div className="tier-nm">Basic</div>
            <div style={{ margin: "10px 0 16px" }}>
              <div className="tier-pr"><sup>LKR</sup>3,000<sub>/mo</sub></div>
            </div>
            <div className="tier-feat"><CheckIcon />Up to 200 students</div>
            <div className="tier-feat"><CheckIcon />Up to 10 batches · 1 GB storage</div>
            <div className="tier-feat"><CheckIcon />Attendance + fee tracking</div>
            <div className="tier-feat"><CheckIcon />Attendance PDF reports</div>
            <div className="tier-feat"><CrossIcon /><span style={{ color: "var(--ink3)" }}>No WhatsApp notifications</span></div>
            <div className="tier-feat"><CrossIcon /><span style={{ color: "var(--ink3)" }}>No annual PDF blast</span></div>
            <div style={{ marginTop: 16 }}>
              <button className="btn btn-s" style={{ width: "100%" }}>Email support 72h</button>
            </div>
          </div>

          {/* Premium */}
          <div className="tier-c feat">
            <div className="tier-nm">Premium</div>
            <div style={{ margin: "10px 0 16px" }}>
              <div className="tier-pr"><sup>LKR</sup>6,000<sub>/mo</sub></div>
            </div>
            <div className="tier-feat"><CheckIcon />Unlimited students + batches</div>
            <div className="tier-feat"><CheckIcon />5 GB storage · All PDF reports</div>
            <div className="tier-feat"><CheckIcon />All 5 WhatsApp notifications</div>
            <div className="tier-feat"><CheckIcon />Annual timetable PDF blast</div>
            <div className="tier-feat"><CheckIcon />Year-end auto promotion + notify</div>
            <div className="tier-feat"><CheckIcon />WhatsApp + email 24h support</div>
            <div style={{ marginTop: 16 }}>
              <button className="btn btn-p" style={{ width: "100%" }}>Recommended</button>
            </div>
          </div>
        </div>

        <div className="sec-hdr"><span className="sec-title">Revenue milestones to $2,000 USD/mo</span></div>
        <div className="tw" style={{ maxWidth: 660 }}>
          <table>
            <thead>
              <tr><th>Milestone</th><th>Basic</th><th>Premium</th><th>MRR (LKR)</th><th>MRR (USD)</th></tr>
            </thead>
            <tbody>
              {milestones.map((m) => (
                <tr key={m.name} style={m.goal ? { background: "var(--tc-l)" } : {}}>
                  <td style={m.goal ? { fontWeight: 700 } : {}}>{m.name}</td>
                  <td className="mono" style={m.goal ? { fontWeight: 700 } : {}}>{m.basic}</td>
                  <td className="mono" style={m.goal ? { fontWeight: 700 } : {}}>{m.premium}</td>
                  <td className="mono" style={m.goal ? { fontWeight: 700 } : {}}>{m.lkr}</td>
                  <td className="mono" style={m.goal ? { fontWeight: 700, color: "var(--tc-d)" } : {}}>{m.usd}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PageShell>
  );
}
