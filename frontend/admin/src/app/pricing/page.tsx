"use client";
import { useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { PageShell } from "@/components/layout/PageShell";
import { Modal } from "@/components/ui/Modal";
import {
  PLAN_DEFINITIONS, PLAN_FEATURES, PLAN_LIMITS,
  CATEGORY_LABELS, formatPriceShort,
} from "@/lib/planConfig";

export default function PricingPage() {
  const [editPlan, setEditPlan] = useState<"basic"|"premium"|null>(null);
  const [saved, setSaved] = useState(false);
  const ep = editPlan ? PLAN_DEFINITIONS[editPlan] : null;

  return (
    <PageShell>
      <Topbar title="Pricing & plans" subtitle="Manage subscription tiers & features" right={<button className="btn btn-p btn-sm">Publish changes</button>} />
      <div className="pb fi">

        {/* ── Plan cards ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24, maxWidth: 760, margin: "0 auto 40px" }}>
          {(["basic", "premium"] as const).map(pk => {
            const p = PLAN_DEFINITIONS[pk];
            const included = PLAN_FEATURES.filter(f => pk === "basic" ? f.basic : f.premium);
            const excluded = PLAN_FEATURES.filter(f => pk === "basic" ? !f.basic : !f.premium);
            return (
              <div key={pk} style={{
                background: "#fff", borderRadius: 16, padding: "28px 24px",
                boxShadow: "0 2px 20px rgba(28,25,23,.06)", border: "1px solid var(--ln)",
                display: "flex", flexDirection: "column", alignItems: "center",
                transition: "box-shadow 200ms, transform 200ms",
              }}>
                {/* Plan name */}
                <div style={{ fontSize: 22, fontWeight: 700, color: p.color, fontFamily: "var(--font-serif)", marginBottom: 6 }}>
                  {p.label}
                </div>
                <div style={{ width: 50, height: 3, borderRadius: 99, background: p.color, marginBottom: 20 }} />

                {/* Price */}
                <div style={{ textAlign: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 48, fontWeight: 800, color: "var(--ink)", fontFamily: "var(--font-mono)", lineHeight: 1, letterSpacing: "-0.02em" }}>
                    {formatPriceShort(p.priceLKR)}
                  </span>
                  <span style={{ fontSize: 16, color: "var(--ink3)", marginLeft: 2 }}>LKR</span>
                </div>
                <div style={{ fontSize: 12.5, color: "var(--ink3)", marginBottom: 24 }}>per month / prepaid</div>

                {/* Feature list */}
                <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 0, marginBottom: 24, flex: 1 }}>
                  {included.map(f => (
                    <div key={f.id} style={{
                      display: "flex", alignItems: "flex-start", gap: 10, padding: "7px 0",
                      borderBottom: "1px solid var(--ln)", fontSize: 12, color: "var(--ink2)",
                    }}>
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
                        <circle cx="9" cy="9" r="8" fill="#d4ede3"/>
                        <path d="M5.5 9l2.5 2.5 4.5-4.5" stroke="#2d7a5a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      {f.label}
                    </div>
                  ))}
                  {excluded.map(f => (
                    <div key={f.id} style={{
                      display: "flex", alignItems: "flex-start", gap: 10, padding: "7px 0",
                      borderBottom: "1px solid var(--ln)", fontSize: 12, color: "var(--ink3)",
                    }}>
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
                        <circle cx="9" cy="9" r="8" fill="var(--rb-l)"/>
                        <path d="M6.5 6.5l5 5M11.5 6.5l-5 5" stroke="var(--rb)" strokeWidth="1.75" strokeLinecap="round"/>
                      </svg>
                      {f.label}
                    </div>
                  ))}
                  {/* Limits */}
                  {PLAN_LIMITS.map(l => (
                    <div key={l.id} style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "7px 0",
                      borderBottom: "1px solid var(--ln)", fontSize: 12, color: "var(--ink2)",
                    }}>
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0 }}>
                        <circle cx="9" cy="9" r="8" fill={`${p.color}15`}/>
                        <text x="9" y="12" textAnchor="middle" fill={p.color} fontSize="9" fontWeight="700" fontFamily="var(--font-mono)">
                          {(pk === "basic" ? l.basic : l.premium).replace(" GB","").replace("Unlimited","∞")}
                        </text>
                      </svg>
                      <span>{l.label}: <strong style={{ color: p.color }}>{pk === "basic" ? l.basic : l.premium}</strong></span>
                    </div>
                  ))}
                </div>

                {/* CTA button */}
                <button onClick={() => setEditPlan(pk)} style={{
                  width: "100%", padding: "12px 0", borderRadius: 99, border: "none",
                  background: `linear-gradient(135deg, ${p.color}, ${p.color}cc)`,
                  color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer",
                  boxShadow: `0 4px 14px ${p.color}40`, transition: "transform 150ms, box-shadow 150ms",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 1.5l3 3M2 10l6.5-6.5 3 3L5 13H2v-3z"/></svg>
                  Edit This Plan
                </button>
                <div style={{ fontSize: 10.5, color: "var(--ink3)", marginTop: 8, textAlign: "center" }}>
                  * Changes apply to all institutes on next billing cycle
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Edit plan modal ── */}
      <Modal open={!!editPlan} onClose={() => { setEditPlan(null); setSaved(false); }} title={ep ? `Edit ${ep.label} plan` : ""} wide footer={
        saved ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--jd)", fontSize: 12, fontWeight: 600 }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 8l4 4 6-6"/></svg>
            Saved! Institutes will see the update.
          </div>
        ) : (
          <>
            <button className="btn btn-s btn-sm" onClick={() => setEditPlan(null)}>Cancel</button>
            <button className="btn btn-p btn-sm" onClick={() => { setSaved(true); setTimeout(() => { setSaved(false); setEditPlan(null); }, 1200); }}>Save changes</button>
          </>
        )
      }>
        {ep && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ background: `${ep.color}08`, border: `1px solid ${ep.color}20`, borderRadius: 12, padding: "12px 16px", fontSize: 12, color: ep.color, lineHeight: 1.5 }}>
              Changes apply to all institutes on the next billing cycle.
            </div>
            <div className="field-row">
              <div className="fg"><label className="flbl">Plan name</label><input defaultValue={ep.label} /></div>
              <div className="fg"><label className="flbl">Monthly price (LKR)</label><input defaultValue={ep.priceLKR} type="number" style={{ fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 700 }} /></div>
            </div>
            <div className="field-row">
              <div className="fg"><label className="flbl">Tagline</label><input defaultValue={ep.tagline} /></div>
              <div className="fg"><label className="flbl">Support level</label><input defaultValue={ep.supportLevel} /></div>
            </div>
            <hr className="dv" />
            <div>
              <label className="flbl" style={{ marginBottom: 8 }}>Resource limits</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                {PLAN_LIMITS.map(l => (
                  <div key={l.id} className="fg"><label style={{ fontSize: 10, color: "var(--ink3)" }}>{l.label}</label><input defaultValue={editPlan === "basic" ? l.basic : l.premium} /></div>
                ))}
              </div>
            </div>
            <hr className="dv" />
            <div>
              <label className="flbl" style={{ marginBottom: 8 }}>Features ({PLAN_FEATURES.filter(f => editPlan === "basic" ? f.basic : f.premium).length} of {PLAN_FEATURES.length} enabled)</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                {PLAN_FEATURES.map(f => {
                  const on = editPlan === "basic" ? f.basic : f.premium;
                  return (
                    <label key={f.id} style={{
                      display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 8,
                      background: on ? "var(--jd-l)" : "var(--cr)", border: `1px solid ${on ? "#b8ddd0" : "var(--ln)"}`,
                      fontSize: 11.5, color: on ? "var(--jd)" : "var(--ink3)", cursor: "pointer",
                    }}>
                      <input type="checkbox" defaultChecked={on} style={{ width: 14, height: 14, accentColor: "var(--jd)" }} />
                      {f.label}
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </PageShell>
  );
}
