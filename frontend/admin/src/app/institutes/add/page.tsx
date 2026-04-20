import { PageShell } from "@/components/layout/PageShell";
import { Topbar } from "@/components/layout/Topbar";

export default function AddInstitutePage() {
  return (
    <PageShell>
      <Topbar title="Add institute" subtitle="Manual onboarding" />
      <div className="pb">
        <div className="card" style={{ maxWidth: 620 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <div className="kpi-lbl">Institute name *</div>
              <input style={{ width: "100%" }} placeholder="e.g. St. Patrick's Academy, Jaffna" />
            </div>
            <div><div className="kpi-lbl">District</div><input style={{ width: "100%" }} placeholder="Jaffna" /></div>
            <div><div className="kpi-lbl">Mobile</div><input style={{ width: "100%" }} placeholder="+94 77 123 4567" /></div>
            <div><div className="kpi-lbl">Email</div><input style={{ width: "100%" }} placeholder="admin@institute.lk" /></div>
            <div><div className="kpi-lbl">Plan</div><input style={{ width: "100%" }} placeholder="Premium" /></div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
            <button className="btn btn-s">Cancel</button>
            <button className="btn btn-p">Create institute</button>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
