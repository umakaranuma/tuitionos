"use client";
import { useState, useEffect } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { PageShell } from "@/components/layout/PageShell";
import { api } from "@/lib/api";

type Settings = {
  monthly_fee_basic: number;
  monthly_fee_premium: number;
  trial_days: number;
  suspension_grace_days: number;
};

export default function PricingPage() {
  const [settings, setSettings] = useState<Settings>({
    monthly_fee_basic: 0,
    monthly_fee_premium: 0,
    trial_days: 0,
    suspension_grace_days: 0,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/api/admin/settings").then(r => {
      setSettings(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put("/api/admin/settings", settings);
      alert("Settings saved successfully");
    } catch (err) {
      alert("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell>
      <Topbar title="Pricing & Plans" subtitle="Global SaaS configuration" right={
        <button className="btn btn-p btn-sm" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save changes"}
        </button>
      } />
      <div className="pb fi">
        {loading ? <div style={{ textAlign: "center", padding: 40, color: "var(--ink3)" }}>Loading...</div> : (
          <div className="g2">
            <div>
              <div className="sec-hdr"><span className="sec-title">Subscription tiers</span></div>
              <div className="card" style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", marginBottom: 10 }}>Basic Plan</div>
                <div className="form-gap">
                  <div>
                    <label className="flbl">Monthly fee (LKR)</label>
                    <input 
                      type="number" 
                      value={settings.monthly_fee_basic} 
                      onChange={e => setSettings({...settings, monthly_fee_basic: Number(e.target.value)})} 
                    />
                  </div>
                  <div style={{ fontSize: 12, color: "var(--ink3)" }}>Includes up to 100 students and 3 teacher accounts. Basic support.</div>
                </div>
              </div>

              <div className="card">
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", marginBottom: 10 }}>Premium Plan</div>
                <div className="form-gap">
                  <div>
                    <label className="flbl">Monthly fee (LKR)</label>
                    <input 
                      type="number" 
                      value={settings.monthly_fee_premium} 
                      onChange={e => setSettings({...settings, monthly_fee_premium: Number(e.target.value)})} 
                    />
                  </div>
                  <div style={{ fontSize: 12, color: "var(--ink3)" }}>Unlimited students and teachers. White-labeling, custom domain, priority support.</div>
                </div>
              </div>
            </div>

            <div>
              <div className="sec-hdr"><span className="sec-title">Billing rules</span></div>
              <div className="card" style={{ marginBottom: 14 }}>
                <div className="form-gap">
                  <div>
                    <label className="flbl">Trial duration (days)</label>
                    <input 
                      type="number" 
                      value={settings.trial_days} 
                      onChange={e => setSettings({...settings, trial_days: Number(e.target.value)})} 
                    />
                  </div>
                  <div>
                    <label className="flbl">Suspension grace period (days)</label>
                    <input 
                      type="number" 
                      value={settings.suspension_grace_days} 
                      onChange={e => setSettings({...settings, suspension_grace_days: Number(e.target.value)})} 
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}
