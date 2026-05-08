"use client";
import { useState, useEffect } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { PageShell } from "@/components/layout/PageShell";
import { api } from "@/lib/api";

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/api/me").then(r => { setUser(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  return (
    <PageShell>
      <Topbar title="Settings" subtitle="Institute configuration" />
      <div className="pb fi">
        {loading ? <div style={{ textAlign: "center", padding: 40, color: "var(--ink3)" }}>Loading...</div> : user ? (
          <div className="g2">
            <div>
              <div className="sb-settings">
                <div className="sb-settings-t">Institute Profile</div>
                <div className="sb-settings-d">Your institute details</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {[
                    { label: "Name", val: user.institute?.name || "—" },
                    { label: "Subdomain", val: user.institute?.subdomain || "—" },
                    { label: "Plan", val: user.institute?.plan || "—" },
                    { label: "Status", val: user.institute?.status || "—" },
                  ].map(r => (
                    <div key={r.label} style={{ padding: "8px 10px", background: "var(--cr)", borderRadius: 8 }}>
                      <div style={{ fontSize: 9.5, color: "var(--ink3)", fontWeight: 600, letterSpacing: ".05em", textTransform: "uppercase", marginBottom: 1 }}>{r.label}</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>{r.val}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <div className="sb-settings">
                <div className="sb-settings-t">Account</div>
                <div className="sb-settings-d">Admin user info</div>
                <div style={{ display: "grid", gap: 8 }}>
                  {[
                    { label: "Email", val: user.email || "—" },
                    { label: "Name", val: `${user.first_name || ""} ${user.last_name || ""}`.trim() || "—" },
                    { label: "Role", val: user.role || "admin" },
                  ].map(r => (
                    <div key={r.label} style={{ padding: "8px 10px", background: "var(--cr)", borderRadius: 8 }}>
                      <div style={{ fontSize: 9.5, color: "var(--ink3)", fontWeight: 600, letterSpacing: ".05em", textTransform: "uppercase", marginBottom: 1 }}>{r.label}</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>{r.val}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : <div className="card" style={{ textAlign: "center", color: "var(--ink3)", padding: 24 }}>Could not load settings</div>}
      </div>
    </PageShell>
  );
}
