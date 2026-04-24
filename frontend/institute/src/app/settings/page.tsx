"use client";
import { useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { PageShell } from "@/components/layout/PageShell";
import { Modal } from "@/components/ui/Modal";
import {
  PLAN_DEFINITIONS, PLAN_FEATURES, PLAN_LIMITS,
  CATEGORY_LABELS, formatPriceShort, formatPrice,
  type PlanFeature,
} from "@/lib/planConfig";

type PlanKey = "basic" | "premium";

// Adapter: map shared config to legacy shape for existing template code
const PLANS: Record<PlanKey, {
  label: string; price: string; priceNum: number; features: string[];
  limits: { students: string; batches: string; storage: string };
  color: string; colorL: string;
}> = {
  basic: {
    label: PLAN_DEFINITIONS.basic.label,
    price: `${formatPrice(PLAN_DEFINITIONS.basic.priceLKR)}/mo`,
    priceNum: PLAN_DEFINITIONS.basic.priceLKR,
    features: PLAN_FEATURES.filter(f => f.basic).map(f => f.label),
    limits: {
      students: PLAN_LIMITS.find(l => l.id === "students")!.basic,
      batches: PLAN_LIMITS.find(l => l.id === "batches")!.basic,
      storage: PLAN_LIMITS.find(l => l.id === "storage")!.basic,
    },
    color: PLAN_DEFINITIONS.basic.color,
    colorL: PLAN_DEFINITIONS.basic.colorLight,
  },
  premium: {
    label: PLAN_DEFINITIONS.premium.label,
    price: `${formatPrice(PLAN_DEFINITIONS.premium.priceLKR)}/mo`,
    priceNum: PLAN_DEFINITIONS.premium.priceLKR,
    features: PLAN_FEATURES.filter(f => f.premium).map(f => f.label),
    limits: {
      students: PLAN_LIMITS.find(l => l.id === "students")!.premium,
      batches: PLAN_LIMITS.find(l => l.id === "batches")!.premium,
      storage: PLAN_LIMITS.find(l => l.id === "storage")!.premium,
    },
    color: PLAN_DEFINITIONS.premium.color,
    colorL: PLAN_DEFINITIONS.premium.colorLight,
  },
};

// Shared feature/limit references for the feature matrix
const sharedFeatures = PLAN_FEATURES;
const sharedLimits = PLAN_LIMITS;
const sharedCategories = ["core", "notifications", "scheduling", "advanced"] as const;

const INVOICES = [
  { month: "April 2026", amount: 6000, status: "paid", paidAt: "2026-04-03", method: "Bank transfer" },
  { month: "March 2026", amount: 6000, status: "paid", paidAt: "2026-03-02", method: "Bank transfer" },
  { month: "February 2026", amount: 6000, status: "paid", paidAt: "2026-02-05", method: "Cash" },
  { month: "January 2026", amount: 6000, status: "paid", paidAt: "2026-01-04", method: "Bank transfer" },
  { month: "December 2025", amount: 6000, status: "paid", paidAt: "2025-12-03", method: "Bank transfer" },
  { month: "November 2025", amount: 6000, status: "paid", paidAt: "2025-11-05", method: "Cash" },
];

export default function SettingsPage() {
  const [currentPlan, setCurrentPlan] = useState<PlanKey>("premium");
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showDowngrade, setShowDowngrade] = useState(false);
  const [upgradeRequested, setUpgradeRequested] = useState(false);
  const [downgradeRequested, setDowngradeRequested] = useState(false);

  const plan = PLANS[currentPlan];
  const otherPlan = currentPlan === "basic" ? "premium" : "basic";
  const otherPlanInfo = PLANS[otherPlan];

  // Institute info
  const institute = {
    name: "St. Patrick's Institute",
    subdomain: "stpatricks",
    district: "Jaffna",
    email: "admin@stpatricks.lk",
    mobile: "+94 77 234 5678",
    adminName: "Sundar Kumar",
    joinedAt: "June 15, 2025",
    status: "active" as const,
    students: 312,
    storage: 2.4,
  };

  return (
    <PageShell>
      <Topbar
        title="Settings & billing"
        subtitle={`${institute.name} · ${plan.label} plan`}
      />
      <div className="pb fi">

        {/* ── PLAN STATUS BANNER ── */}
        <div style={{
          background: "#fff", border: `1.5px solid ${plan.color}22`,
          borderTop: `4px solid ${plan.color}`,
          borderRadius: 14, padding: "18px 22px", marginBottom: 18,
          boxShadow: "0 1px 3px rgba(28,25,23,.06)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <span style={{
                  fontSize: 10, fontWeight: 800, padding: "3px 10px", borderRadius: 99,
                  background: plan.colorL, color: plan.color, letterSpacing: ".06em",
                }}>
                  {plan.label.toUpperCase()} PLAN
                </span>
                <span style={{
                  fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 99,
                  background: "#d4ede3", color: "#1a5040",
                }}>
                  Active
                </span>
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: "var(--ink)", fontFamily: "var(--font-mono)", lineHeight: 1 }}>
                {plan.price}
              </div>
              <div style={{ fontSize: 12, color: "var(--ink3)", marginTop: 6 }}>
                Next billing: <strong>May 1, 2026</strong> · Auto-renewed monthly
              </div>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              {currentPlan === "basic" ? (
                <button className="btn btn-p" onClick={() => setShowUpgrade(true)} style={{ background: "#9b5e35" }}>
                  ↑ Upgrade to Premium
                </button>
              ) : (
                <button className="btn btn-s btn-sm" onClick={() => setShowDowngrade(true)}>
                  Downgrade to Basic
                </button>
              )}
            </div>
          </div>

          {/* Limits bar */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginTop: 16 }}>
            {[
              { label: "Students", used: `${institute.students}`, limit: plan.limits.students, pct: currentPlan === "basic" ? Math.round((institute.students / 200) * 100) : 31 },
              { label: "Batches", used: "5", limit: plan.limits.batches, pct: currentPlan === "basic" ? 50 : 5 },
              { label: "Storage", used: `${institute.storage} GB`, limit: plan.limits.storage, pct: Math.round((institute.storage / (currentPlan === "basic" ? 5 : 10)) * 100) },
            ].map(item => (
              <div key={item.label} style={{ padding: "10px 14px", background: "var(--cr)", borderRadius: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, color: "var(--ink2)" }}>{item.label}</span>
                  <span style={{ fontFamily: "var(--font-mono)", color: "var(--ink3)" }}>{item.used} / {item.limit}</span>
                </div>
                <div style={{ height: 5, background: "var(--ln)", borderRadius: 99, overflow: "hidden" }}>
                  <div style={{
                    height: "100%", width: `${Math.min(item.pct, 100)}%`,
                    background: item.pct > 80 ? "var(--rb)" : item.pct > 60 ? "var(--sf)" : plan.color,
                    borderRadius: 99, transition: "width 300ms",
                  }} />
                </div>
              </div>
            ))}
          </div>

          {/* Upgrade nudge for basic */}
          {currentPlan === "basic" && (
            <div style={{
              marginTop: 14, background: "#f0ddd0", border: "1px solid #e0c0a8",
              borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#9b5e35",
              display: "flex", alignItems: "center", gap: 10,
            }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75">
                <path d="M8 1l2 5h5l-4 3 1.5 5L8 11l-4.5 3L5 9 1 6h5L8 1z"/>
              </svg>
              <div>
                <strong>Unlock Premium features</strong> — WhatsApp notifications, timetable management, and unlimited students for just LKR 3,000 more/month.
              </div>
              <button
                className="btn btn-sm"
                style={{ background: "#9b5e35", color: "#fff", border: "none", flexShrink: 0 }}
                onClick={() => setShowUpgrade(true)}
              >
                Upgrade →
              </button>
            </div>
          )}
        </div>

        {/* ── PLAN COMPARISON ── */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink3)", letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 16, textAlign: "center" }}>
            Compare plans
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24, maxWidth: 760, margin: "0 auto" }}>
            {(["basic", "premium"] as const).map(pk => {
              const p = PLAN_DEFINITIONS[pk];
              const included = PLAN_FEATURES.filter(f => pk === "basic" ? f.basic : f.premium);
              const excluded = PLAN_FEATURES.filter(f => pk === "basic" ? !f.basic : !f.premium);
              const isCurrent = currentPlan === pk;

              return (
                <div key={pk} style={{
                  background: "#fff", borderRadius: 16, padding: "28px 24px",
                  boxShadow: isCurrent ? `0 4px 24px ${p.color}20` : "0 2px 20px rgba(28,25,23,.06)",
                  border: isCurrent ? `2px solid ${p.color}` : "1px solid var(--ln)",
                  display: "flex", flexDirection: "column", alignItems: "center",
                  position: "relative",
                }}>
                  {isCurrent && (
                    <div style={{
                      position: "absolute", top: 16, right: 18, background: p.colorLight, color: p.color,
                      fontSize: 9, fontWeight: 800, padding: "4px 12px", borderRadius: 99, letterSpacing: ".06em"
                    }}>
                      CURRENT
                    </div>
                  )}

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
                  {isCurrent ? (
                    <div style={{
                      width: "100%", padding: "12px 0", borderRadius: 99,
                      background: p.colorLight, color: p.color, fontSize: 13, fontWeight: 700,
                      textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    }}>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7.5l2.5 2.5 5.5-5.5"/></svg>
                      Current plan
                    </div>
                  ) : (
                    <button onClick={() => pk === "basic" ? setShowDowngrade(true) : setShowUpgrade(true)} style={{
                      width: "100%", padding: "12px 0", borderRadius: 99, border: "none",
                      background: `linear-gradient(135deg, ${p.color}, ${p.color}cc)`,
                      color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer",
                      boxShadow: `0 4px 14px ${p.color}40`, transition: "transform 150ms, box-shadow 150ms",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    }}>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                        {pk === "premium" ? <path d="M7 1v12M3 5l4-4 4 4" /> : <path d="M7 13V1M3 9l4 4 4-4" />}
                      </svg>
                      {pk === "premium" ? "Upgrade to Premium" : "Downgrade to Basic"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── INSTITUTE PROFILE ── */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink3)", letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 10 }}>
            Institute profile
          </div>
          <div className="card">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
              {[
                { label: "Institute", val: institute.name },
                { label: "Subdomain", val: `${institute.subdomain}.tuitionos.lk`, mono: true },
                { label: "Admin", val: institute.adminName },
                { label: "Email", val: institute.email },
                { label: "WhatsApp", val: institute.mobile },
                { label: "District", val: institute.district },
                { label: "Member since", val: institute.joinedAt },
                { label: "Status", val: "Active", badge: true },
              ].map(row => (
                <div key={row.label} style={{ padding: "9px 11px", background: "var(--cr)", borderRadius: 8 }}>
                  <div style={{ fontSize: 9.5, color: "var(--ink3)", fontWeight: 600, letterSpacing: ".05em", textTransform: "uppercase", marginBottom: 2 }}>
                    {row.label}
                  </div>
                  {row.badge ? (
                    <span style={{ fontSize: 10.5, fontWeight: 600, padding: "2px 8px", borderRadius: 99, background: "#d4ede3", color: "#1a5040" }}>
                      Active
                    </span>
                  ) : (
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)", fontFamily: row.mono ? "var(--font-mono)" : undefined, wordBreak: "break-all" }}>
                      {row.val}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div style={{ fontSize: 11, color: "var(--ink3)", marginTop: 12 }}>
              To update your institute profile or contact details, please contact the TuitionOS admin via WhatsApp.
            </div>
          </div>
        </div>

        {/* ── INVOICE HISTORY ── */}
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink3)", letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 10 }}>
          Billing history
        </div>
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th>Month</th>
                <th>Plan</th>
                <th>Amount (LKR)</th>
                <th>Status</th>
                <th>Paid on</th>
                <th>Method</th>
              </tr>
            </thead>
            <tbody>
              {INVOICES.map((inv, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{inv.month}</td>
                  <td>
                    <span style={{
                      fontSize: 10.5, fontWeight: 600, padding: "2px 8px", borderRadius: 99,
                      background: plan.colorL, color: plan.color,
                    }}>
                      {plan.label}
                    </span>
                  </td>
                  <td className="mono">{inv.amount.toLocaleString()}</td>
                  <td>
                    <span style={{
                      fontSize: 10.5, fontWeight: 600, padding: "2px 8px", borderRadius: 99,
                      background: inv.status === "paid" ? "#d4ede3" : "#fef3d7",
                      color: inv.status === "paid" ? "#1a5040" : "#c07b1a",
                    }}>
                      {inv.status === "paid" ? "Paid" : "Due"}
                    </span>
                  </td>
                  <td className="mono" style={{ color: "var(--ink3)" }}>{inv.paidAt}</td>
                  <td style={{ color: "var(--ink3)" }}>{inv.method}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── UPGRADE MODAL ── */}
      <Modal
        open={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        title="Upgrade to Premium"
        wide
        footer={
          upgradeRequested ? (
            <button className="btn btn-s btn-sm" onClick={() => { setShowUpgrade(false); setUpgradeRequested(false); }}>Close</button>
          ) : (
            <>
              <button className="btn btn-s btn-sm" onClick={() => setShowUpgrade(false)}>Cancel</button>
              <button
                className="btn btn-sm"
                style={{ background: "#9b5e35", color: "#fff", border: "none" }}
                onClick={() => setUpgradeRequested(true)}
              >
                Request upgrade
              </button>
            </>
          )
        }
      >
        {upgradeRequested ? (
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <div style={{
              width: 48, height: 48, borderRadius: "50%", background: "#d4ede3",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 14px",
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1a5040" strokeWidth="2.5">
                <path d="M5 12l5 5 9-9"/>
              </svg>
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)", marginBottom: 6 }}>
              Upgrade request sent!
            </div>
            <div style={{ fontSize: 13, color: "var(--ink3)", maxWidth: 340, margin: "0 auto", lineHeight: 1.6 }}>
              The TuitionOS admin has been notified. Your plan will be upgraded within 24 hours. You&apos;ll receive a WhatsApp confirmation.
            </div>
            <div style={{
              marginTop: 14, background: "#f0ddd0", border: "1px solid #e0c0a8",
              borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#9b5e35", textAlign: "left",
            }}>
              New monthly rate: <strong>LKR 6,000/mo</strong> · Starts from next billing cycle
            </div>
          </div>
        ) : (
          <div>
            {/* Side by side comparison */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              {(["basic", "premium"] as const).map(p => {
                const info = PLANS[p];
                const isCurrent = p === currentPlan;
                return (
                  <div key={p} style={{
                    border: `2px solid ${isCurrent ? "var(--ln)" : info.color}`,
                    borderRadius: 14, padding: "16px", position: "relative",
                    background: isCurrent ? "var(--cr)" : `${info.color}08`,
                  }}>
                    {!isCurrent && (
                      <div style={{
                        position: "absolute", top: -1, right: 16,
                        background: info.color, color: "#fff",
                        fontSize: 9, fontWeight: 700, padding: "3px 10px",
                        borderRadius: "0 0 8px 8px", letterSpacing: ".06em",
                      }}>
                        RECOMMENDED
                      </div>
                    )}
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)", marginBottom: 2 }}>{info.label}</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: info.color, fontFamily: "var(--font-mono)", marginBottom: 10 }}>
                      {info.price}
                    </div>
                    {info.features.map((f, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 0", fontSize: 11.5, color: "var(--ink2)" }}>
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke={info.color} strokeWidth="2"><path d="M2 6l3 3 5-5"/></svg>
                        {f}
                      </div>
                    ))}
                    {isCurrent && (
                      <div style={{ marginTop: 10, fontSize: 11, color: "var(--ink3)", fontWeight: 600 }}>
                        ← Your current plan
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{
              background: "var(--tc-l)", border: "1px solid #b8ddd0", borderRadius: 10,
              padding: "10px 14px", fontSize: 12, color: "var(--tc-d)",
            }}>
              Upgrading will unlock <strong>WhatsApp notifications</strong>, <strong>timetable management</strong>, and <strong>unlimited students</strong>.
              The price difference (LKR 3,000) will be applied to your next billing cycle.
            </div>
          </div>
        )}
      </Modal>

      {/* ── DOWNGRADE MODAL ── */}
      <Modal
        open={showDowngrade}
        onClose={() => setShowDowngrade(false)}
        title="Downgrade to Basic"
        footer={
          downgradeRequested ? (
            <button className="btn btn-s btn-sm" onClick={() => { setShowDowngrade(false); setDowngradeRequested(false); }}>Close</button>
          ) : (
            <>
              <button className="btn btn-s btn-sm" onClick={() => setShowDowngrade(false)}>Cancel</button>
              <button className="btn btn-d btn-sm" onClick={() => setDowngradeRequested(true)}>
                Confirm downgrade
              </button>
            </>
          )
        }
      >
        {downgradeRequested ? (
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <div style={{
              width: 48, height: 48, borderRadius: "50%", background: "#fef3d7",
              display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px",
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#c07b1a" strokeWidth="2.5">
                <path d="M5 12l5 5 9-9"/>
              </svg>
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)", marginBottom: 6 }}>
              Downgrade request sent
            </div>
            <div style={{ fontSize: 13, color: "var(--ink3)", lineHeight: 1.6 }}>
              Your plan will change to Basic at the end of your current billing cycle (May 1, 2026).
              You&apos;ll keep Premium features until then.
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{
              background: "#fef3d7", border: "1px solid #fde68a", borderRadius: 10,
              padding: "10px 14px", fontSize: 12, color: "#92400e",
            }}>
              <strong>Warning:</strong> Downgrading will disable these features at the end of your current billing cycle:
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {[
                "WhatsApp notifications (fee reminders, absent alerts)",
                "Timetable management & PDF sharing",
                "Automated year-end promotion notifications",
                "Student limit reduced to 200 (you have 312 currently)",
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--ink2)" }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="var(--rb)" strokeWidth="1.75">
                    <path d="M4 4l6 6M10 4l-6 6"/>
                  </svg>
                  {item}
                </div>
              ))}
            </div>
            <div style={{
              background: "var(--rb-l)", border: "1px solid #f5c5c5", borderRadius: 10,
              padding: "10px 14px", fontSize: 12, color: "var(--rb)",
            }}>
              <strong>⚠ You currently have 312 students.</strong> Basic plan allows max 200. You won&apos;t be able to enroll new students until you&apos;re under the limit.
            </div>
          </div>
        )}
      </Modal>
    </PageShell>
  );
}
