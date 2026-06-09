"use client";
import { useState, useEffect } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { PageShell } from "@/components/layout/PageShell";
import { useToast } from "@/components/ui/ToastProvider";
import { api } from "@/lib/api";

type Settings = {
  monthly_fee_solo: number;
  monthly_fee_institute: number;
  monthly_fee_institute_pro: number;
  trial_days: number;
  suspension_grace_days: number;
};

export default function PricingPage() {
  const toast = useToast();
  const [settings, setSettings] = useState<Settings>({
    monthly_fee_solo: 0,
    monthly_fee_institute: 0,
    monthly_fee_institute_pro: 0,
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
      toast.success("Pricing & billing rules updated successfully.");
    } catch {
      toast.error("Couldn't save pricing settings. Please try again.");
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
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", marginBottom: 10 }}>Solo Plan</div>
                <div className="form-gap">
                  <div>
                    <label className="flbl">Monthly fee (LKR)</label>
                    <input 
                      type="number" 
                      value={settings.monthly_fee_solo} 
                      onChange={e => setSettings({...settings, monthly_fee_solo: Number(e.target.value)})} 
                    />
                  </div>
                  <div style={{ fontSize: 12, color: "var(--ink3)" }}>For single teachers. Includes up to 75 students and 1 subject.</div>
                </div>
              </div>

              <div className="card" style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", marginBottom: 10 }}>Institute Plan</div>
                <div className="form-gap">
                  <div>
                    <label className="flbl">Monthly fee (LKR)</label>
                    <input 
                      type="number" 
                      value={settings.monthly_fee_institute} 
                      onChange={e => setSettings({...settings, monthly_fee_institute: Number(e.target.value)})} 
                    />
                  </div>
                  <div style={{ fontSize: 12, color: "var(--ink3)" }}>For growing institutes. Includes up to 200 students.</div>
                </div>
              </div>

              <div className="card">
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", marginBottom: 10 }}>Institute Pro Plan</div>
                <div className="form-gap">
                  <div>
                    <label className="flbl">Monthly fee (LKR)</label>
                    <input 
                      type="number" 
                      value={settings.monthly_fee_institute_pro} 
                      onChange={e => setSettings({...settings, monthly_fee_institute_pro: Number(e.target.value)})} 
                    />
                  </div>
                  <div style={{ fontSize: 12, color: "var(--ink3)" }}>Unlimited students and teachers. Notifications, timetabling, priority support.</div>
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
