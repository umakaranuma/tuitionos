"use client";
import { useState, useEffect } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { PageShell } from "@/components/layout/PageShell";
import { api } from "@/lib/api";

const featureFlags = [
  { key: "student_cap", label: "Basic: 200 student cap", sub: "Enforced at enrollment" },
  { key: "sms_premium", label: "SMS alerts — Premium only", sub: "Block notifications on Basic plan" },
  { key: "open_reg", label: "New registrations open", sub: "Allow public institute signups" },
];

const techStack = [
  { k: "Backend", v: "Django 5 · Railway" },
  { k: "Frontend", v: "Next.js 14 · Vercel" },
  { k: "Database", v: "MySQL 8 · PlanetScale" },
  { k: "Storage", v: "Supabase S3" },
  { k: "Queue", v: "Celery + Redis" },
  { k: "PDF", v: "WeasyPrint" },
  { k: "Payments", v: "Stripe" },
  { k: "Infra cost", v: "~USD 10–15/mo", highlight: true },
];

export default function SettingsPage() {
  const [toggles, setToggles] = useState<Record<string, boolean>>({
    student_cap: true, sms_premium: true, open_reg: true,
  });
  
  const [settingsId, setSettingsId] = useState<number | null>(null);
  const [monthlyFeeSolo, setMonthlyFeeSolo] = useState("");
  const [monthlyFeeInstitute, setMonthlyFeeInstitute] = useState("");
  const [monthlyFeePro, setMonthlyFeePro] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Note: This endpoint is currently unauthenticated in the backend plan for ease of access, 
    // it should be restricted to admin in production.
    api.get("/api/institutes/settings").then(r => {
      const data = Array.isArray(r.data) ? r.data : r.data.results;
      if (data && data.length > 0) {
        const s = data[0];
        setSettingsId(s.id);
        setMonthlyFeeSolo(s.monthly_fee_solo);
        setMonthlyFeeInstitute(s.monthly_fee_institute);
        setMonthlyFeePro(s.monthly_fee_institute_pro);
      }
    });
  }, []);

  const handleSave = async () => {
    if (!settingsId) return;
    setSaving(true);
    try {
      await api.patch(`/api/institutes/settings/${settingsId}`, {
        monthly_fee_solo: monthlyFeeSolo,
        monthly_fee_institute: monthlyFeeInstitute,
        monthly_fee_institute_pro: monthlyFeePro,
      });
      alert("Settings saved successfully");
    } catch (e) {
      alert("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell>
      <Topbar
        title="Settings"
        subtitle="Platform configuration"
        right={<button className="btn btn-p btn-sm" onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save changes"}</button>}
      />
      <div className="pb fi">
        <div className="g2">
          <div>

            <div className="sb-settings">
              <div className="sb-settings-t">Subscription Billing Amounts</div>
              <div className="sb-settings-d">Monthly fees charged to institutes (LKR)</div>
              
              <div className="fg" style={{ marginBottom: 10 }}>
                <label>Solo Plan</label>
                <input type="number" value={monthlyFeeSolo} onChange={e => setMonthlyFeeSolo(e.target.value)} />
              </div>
              <div className="fg" style={{ marginBottom: 10 }}>
                <label>Institute Plan</label>
                <input type="number" value={monthlyFeeInstitute} onChange={e => setMonthlyFeeInstitute(e.target.value)} />
              </div>
              <div className="fg">
                <label>Institute Pro Plan</label>
                <input type="number" value={monthlyFeePro} onChange={e => setMonthlyFeePro(e.target.value)} />
              </div>
            </div>

            <div className="sb-settings" style={{ marginTop: 24 }}>
              <div className="sb-settings-t">Feature flags</div>
              <div className="sb-settings-d">Toggle features platform-wide</div>
              {featureFlags.map((f) => (
                <div key={f.key} className="tog-row">
                  <div>
                    <div className="tog-lbl">{f.label}</div>
                    <div className="tog-sub">{f.sub}</div>
                  </div>
                  <button
                    className={`toggle ${toggles[f.key] ? "on" : ""}`}
                    onClick={() => setToggles((prev) => ({ ...prev, [f.key]: !prev[f.key] }))}
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="sb-settings">
              <div className="sb-settings-t">WhatsApp / SMS gateway</div>
              <div className="sb-settings-d">Notification API credentials</div>
              <div className="fg" style={{ marginBottom: 10 }}>
                <label>Meta Cloud API token</label>
                <input type="password" defaultValue="••••••••••••••••••••" />
              </div>
              <div className="fg" style={{ marginBottom: 10 }}>
                <label>Dialog SMS API key</label>
                <input type="password" defaultValue="••••••••••••••••" />
              </div>
              <div className="fg">
                <label>WhatsApp cost per message (LKR)</label>
                <input defaultValue="2" style={{ maxWidth: 80 }} />
              </div>
            </div>

            <div className="sb-settings">
              <div className="sb-settings-t">Tech stack</div>
              <div className="sb-settings-d">Current deployment — read only</div>
              <table style={{ width: "100%", fontSize: 11.5 }}>
                <tbody>
                  {techStack.map((t) => (
                    <tr key={t.k}>
                      <td style={{ color: "var(--ink3)", padding: "4px 0" }}>{t.k}</td>
                      <td className="mono" style={t.highlight ? { color: "var(--jd)", fontWeight: 600 } : {}}>{t.v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
