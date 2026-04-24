"use client";
import { useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { PageShell } from "@/components/layout/PageShell";
import { Modal } from "@/components/ui/Modal";
import {
  PLAN_DEFINITIONS, PLAN_FEATURES, PLAN_LIMITS, TRIAL_DAYS,
  CATEGORY_LABELS, formatPriceShort,
  type PlanDefinition, type PlanFeature, type PlanLimit,
} from "@/lib/planConfig";

const milestones = [
  { name: "Q1 — Launch", basic: 5, premium: 2, lkr: "27,000", usd: "~$87" },
  { name: "Q2 — Growth", basic: 20, premium: 8, lkr: "108,000", usd: "~$348" },
  { name: "Q3 — Scale", basic: 45, premium: 20, lkr: "255,000", usd: "~$823" },
  { name: "Q4 — Target", basic: 55, premium: 20, lkr: "285,000", usd: "~$919" },
  { name: "$2,000 goal ✓", basic: 80, premium: 30, lkr: "420,000", usd: "~$1,355", goal: true },
];

export default function PricingPage() {
  const [plans] = useState(PLAN_DEFINITIONS);
  const [features] = useState<PlanFeature[]>(PLAN_FEATURES);
  const [limits] = useState<PlanLimit[]>(PLAN_LIMITS);
  const [trialDays] = useState(TRIAL_DAYS);
  const [editModal, setEditModal] = useState<"basic" | "premium" | null>(null);
  const [saved, setSaved] = useState(false);

  const editPlan = editModal ? plans[editModal] : null;

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => { setSaved(false); setEditModal(null); }, 1200);
  };

  // Group features by category
  const categories = ["core", "notifications", "scheduling", "advanced"] as const;

  return (
    <PageShell>
      <Topbar
        title="Pricing & plans"
        subtitle="Manage subscription plans · Features · Revenue milestones"
        right={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ fontSize: 11, color: "var(--ink3)" }}>Trial period: <strong>{trialDays} days</strong></div>
            <button className="btn btn-p btn-sm" onClick={() => setSaved(true)}>
              {saved ? "✓ Saved" : "Save all changes"}
            </button>
          </div>
        }
      />
      <div className="pb fi">

        {/* ── Plan cards ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
          {(["basic", "premium"] as const).map(planKey => {
            const p = plans[planKey];
            return (
              <div key={planKey} style={{
                background: "#fff", border: `1.5px solid ${p.color}22`, borderTop: `4px solid ${p.color}`,
                borderRadius: 16, padding: "22px 24px", boxShadow: "0 1px 3px rgba(28,25,23,.06)",
                position: "relative",
              }}>
                {planKey === "premium" && (
                  <div style={{
                    position: "absolute", top: 10, right: -24, background: p.color, color: "#fff",
                    fontSize: 8, fontWeight: 800, padding: "3px 30px", transform: "rotate(45deg)",
                    letterSpacing: ".08em",
                  }}>
                    POPULAR
                  </div>
                )}

                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 12, background: p.colorLight,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {planKey === "basic" ? (
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke={p.color} strokeWidth="1.75">
                        <rect x="3" y="3" width="14" height="14" rx="2.5"/><path d="M8 10h4M10 8v4"/>
                      </svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke={p.color} strokeWidth="1.75">
                        <path d="M10 2l2.5 5h5l-4 3.5 1.5 5L10 12.5l-5 3L6.5 10.5 2.5 7h5L10 2z"/>
                      </svg>
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "var(--ink)" }}>{p.label}</div>
                    <div style={{ fontSize: 11.5, color: "var(--ink3)" }}>{p.tagline}</div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 4 }}>
                  <span style={{ fontSize: 14, color: p.color, fontWeight: 600 }}>LKR</span>
                  <span style={{ fontSize: 36, fontWeight: 800, color: p.color, fontFamily: "var(--font-mono)", lineHeight: 1 }}>
                    {formatPriceShort(p.priceLKR)}
                  </span>
                  <span style={{ fontSize: 13, color: "var(--ink3)" }}>/mo</span>
                </div>

                {/* Limits chips */}
                <div style={{ display: "flex", gap: 6, margin: "12px 0 14px" }}>
                  {limits.map(l => (
                    <div key={l.id} style={{
                      flex: 1, background: `${p.color}08`, border: `1px solid ${p.color}15`,
                      borderRadius: 8, padding: "8px 0", textAlign: "center",
                    }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: p.color, fontFamily: "var(--font-mono)" }}>
                        {planKey === "basic" ? l.basic : l.premium}
                      </div>
                      <div style={{ fontSize: 9, color: "var(--ink3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".04em" }}>
                        {l.label}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Feature count */}
                <div style={{ fontSize: 12, color: "var(--ink3)", marginBottom: 12 }}>
                  <strong style={{ color: "var(--ink)" }}>
                    {features.filter(f => planKey === "basic" ? f.basic : f.premium).length}
                  </strong> of {features.length} features included
                </div>

                {/* Support */}
                <div style={{
                  background: "var(--cr)", borderRadius: 8, padding: "8px 12px",
                  fontSize: 11.5, color: "var(--ink2)", marginBottom: 14,
                  display: "flex", alignItems: "center", gap: 6,
                }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="var(--ink3)" strokeWidth="1.5">
                    <path d="M7 1a6 6 0 100 12A6 6 0 007 1zM5 5.5a2 2 0 014 0c0 1-1 1.5-2 2M7 10h.01"/>
                  </svg>
                  {p.supportLevel}
                </div>

                <button
                  className="btn btn-s btn-sm"
                  style={{ width: "100%" }}
                  onClick={() => setEditModal(planKey)}
                >
                  Edit plan details
                </button>
              </div>
            );
          })}
        </div>

        {/* ── Feature matrix ── */}
        <div style={{ marginBottom: 24 }}>
          <div className="sec-hdr">
            <span className="sec-title">Feature matrix</span>
            <span style={{ fontSize: 11, color: "var(--ink3)" }}>
              This is what institutes see on their Settings & Billing page
            </span>
          </div>
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--ln)" }}>
                  <th style={{ textAlign: "left", padding: "11px 16px", fontSize: 10, fontWeight: 700, color: "var(--ink3)", letterSpacing: ".07em", textTransform: "uppercase", background: "var(--cr)" }}>
                    Feature
                  </th>
                  <th style={{ textAlign: "center", padding: "11px 16px", fontSize: 10, fontWeight: 700, color: plans.basic.color, letterSpacing: ".07em", textTransform: "uppercase", background: "var(--cr)", width: 100 }}>
                    Basic
                  </th>
                  <th style={{ textAlign: "center", padding: "11px 16px", fontSize: 10, fontWeight: 700, color: plans.premium.color, letterSpacing: ".07em", textTransform: "uppercase", background: "var(--cr)", width: 100 }}>
                    Premium
                  </th>
                </tr>
              </thead>
              <tbody>
                {categories.map(cat => (
                  <>
                    <tr key={`cat-${cat}`}>
                      <td colSpan={3} style={{
                        padding: "7px 16px", fontSize: 9.5, fontWeight: 700,
                        color: "var(--ink3)", letterSpacing: ".08em", textTransform: "uppercase",
                        background: "var(--cr-d)", borderBottom: "1px solid var(--ln)",
                      }}>
                        {CATEGORY_LABELS[cat]}
                      </td>
                    </tr>
                    {features.filter(f => f.category === cat).map(f => (
                      <tr key={f.id} style={{ borderBottom: "1px solid var(--ln)" }}>
                        <td style={{ padding: "8px 16px", color: "var(--ink)" }}>{f.label}</td>
                        <td style={{ textAlign: "center", padding: "8px 16px" }}>
                          {f.basic ? (
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#2d7a5a" strokeWidth="2.5" style={{ display: "inline" }}>
                              <path d="M3 8l4 4 6-6"/>
                            </svg>
                          ) : (
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="var(--ink3)" strokeWidth="1.5" style={{ display: "inline", opacity: .3 }}>
                              <path d="M4 4l6 6M10 4l-6 6"/>
                            </svg>
                          )}
                        </td>
                        <td style={{ textAlign: "center", padding: "8px 16px" }}>
                          {f.premium ? (
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#2d7a5a" strokeWidth="2.5" style={{ display: "inline" }}>
                              <path d="M3 8l4 4 6-6"/>
                            </svg>
                          ) : (
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="var(--ink3)" strokeWidth="1.5" style={{ display: "inline", opacity: .3 }}>
                              <path d="M4 4l6 6M10 4l-6 6"/>
                            </svg>
                          )}
                        </td>
                      </tr>
                    ))}
                  </>
                ))}
                {/* Limits rows */}
                <tr>
                  <td colSpan={3} style={{
                    padding: "7px 16px", fontSize: 9.5, fontWeight: 700,
                    color: "var(--ink3)", letterSpacing: ".08em", textTransform: "uppercase",
                    background: "var(--cr-d)", borderBottom: "1px solid var(--ln)",
                  }}>
                    Limits
                  </td>
                </tr>
                {limits.map(l => (
                  <tr key={l.id} style={{ borderBottom: "1px solid var(--ln)" }}>
                    <td style={{ padding: "8px 16px", color: "var(--ink)" }}>{l.label}</td>
                    <td style={{ textAlign: "center", padding: "8px 16px" }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: plans.basic.color, fontFamily: "var(--font-mono)" }}>{l.basic}</span>
                    </td>
                    <td style={{ textAlign: "center", padding: "8px 16px" }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: plans.premium.color, fontFamily: "var(--font-mono)" }}>{l.premium}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Revenue milestones ── */}
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

      {/* ── Edit plan modal ── */}
      <Modal
        open={!!editModal}
        onClose={() => { setEditModal(null); setSaved(false); }}
        title={editPlan ? `Edit ${editPlan.label} plan` : ""}
        wide
        footer={
          saved ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--tc-d)", fontSize: 12, fontWeight: 600 }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 8l4 4 6-6"/></svg>
              Changes saved! Institutes will see updated plans.
            </div>
          ) : (
            <>
              <button className="btn btn-s btn-sm" onClick={() => setEditModal(null)}>Cancel</button>
              <button className="btn btn-p btn-sm" onClick={handleSave}>Save changes</button>
            </>
          )
        }
      >
        {editPlan && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{
              background: `${editPlan.color}08`, border: `1px solid ${editPlan.color}20`,
              borderRadius: 12, padding: "12px 16px", fontSize: 12, color: editPlan.color,
            }}>
              Changes to this plan will be reflected on all institutes&apos; Settings & Billing pages. Price changes apply to the next billing cycle only.
            </div>

            <div className="field-row">
              <div className="fg">
                <label className="flbl">Plan name</label>
                <input defaultValue={editPlan.label} />
              </div>
              <div className="fg">
                <label className="flbl">Monthly price (LKR)</label>
                <input defaultValue={editPlan.priceLKR} type="number" style={{ fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 700 }} />
              </div>
            </div>

            <div className="fg">
              <label className="flbl">Tagline</label>
              <input defaultValue={editPlan.tagline} />
            </div>

            <div className="fg">
              <label className="flbl">Support level</label>
              <input defaultValue={editPlan.supportLevel} />
            </div>

            <hr className="dv" />

            <div>
              <label className="flbl" style={{ marginBottom: 8 }}>Resource limits</label>
              <div className="field-row">
                {limits.map(l => (
                  <div key={l.id} className="fg">
                    <label style={{ fontSize: 10.5, color: "var(--ink3)" }}>{l.label}</label>
                    <input defaultValue={editModal === "basic" ? l.basic : l.premium} />
                  </div>
                ))}
              </div>
            </div>

            <hr className="dv" />

            <div>
              <label className="flbl" style={{ marginBottom: 8 }}>
                Features included ({features.filter(f => editModal === "basic" ? f.basic : f.premium).length} of {features.length})
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                {features.map(f => {
                  const included = editModal === "basic" ? f.basic : f.premium;
                  return (
                    <div key={f.id} style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "6px 10px", borderRadius: 8,
                      background: included ? "var(--tc-l)" : "var(--cr)",
                      border: `1px solid ${included ? "#b8ddd0" : "var(--ln)"}`,
                      fontSize: 11.5, color: included ? "var(--tc-d)" : "var(--ink3)",
                      cursor: "pointer", transition: "all 120ms",
                    }}>
                      <input
                        type="checkbox"
                        defaultChecked={included}
                        style={{ width: 14, height: 14, accentColor: "var(--tc)" }}
                      />
                      {f.label}
                    </div>
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
