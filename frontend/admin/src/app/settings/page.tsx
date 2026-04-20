import { PageShell } from "@/components/layout/PageShell";
import { Topbar } from "@/components/layout/Topbar";

export default function SettingsPage() {
  return (
    <PageShell>
      <Topbar title="Settings" subtitle="Platform configuration" actions={<button className="btn btn-p">Save changes</button>} />
      <div className="pb">
        <div className="g2">
          <div className="card"><div className="kpi-lbl">Pricing</div><p>Basic: LKR 3,000/mo</p><p>Premium: LKR 6,000/mo</p></div>
          <div className="card"><div className="kpi-lbl">Feature flags</div><p>Basic cap, SMS tiering, open registrations.</p></div>
          <div className="card"><div className="kpi-lbl">Gateway credentials</div><p>Meta Cloud API, Dialog SMS API.</p></div>
          <div className="card"><div className="kpi-lbl">Tech stack</div><p>Django + Next.js + MySQL + Redis</p></div>
        </div>
      </div>
    </PageShell>
  );
}
