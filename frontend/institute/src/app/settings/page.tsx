"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Topbar } from "@/components/layout/Topbar";
import { PageShell } from "@/components/layout/PageShell";
import { Modal } from "@/components/ui/Modal";
import { Toast } from "@/components/ui/Toast";
import { CroppableImageInput } from "@/components/ui/CroppableImageInput";
import { api } from "@/lib/api";
import { PLAN_DEFINITIONS, PLAN_FEATURES, PLAN_LIMITS } from "@/lib/planConfig";

type ActivityEntry = { id: number; action: string; description: string; user: string; created_at: string };

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isChangingPlan, setIsChangingPlan] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; planKey: string; planLabel: string } | null>(null);
  const [alertModal, setAlertModal] = useState<{ open: boolean; title: string; message: string; type: "success" | "error" } | null>(null);

  // Institute profile edit
  const [instName, setInstName] = useState("");
  const [instLogoFile, setInstLogoFile] = useState<File | null>(null);
  const [instLogoPreview, setInstLogoPreview] = useState<string | null>(null);
  const [savingInst, setSavingInst] = useState(false);

  // Own profile edit
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  // Activity log
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);

  const loadActivity = () => {
    setActivityLoading(true);
    api.get("/api/me/activity-log").then(r => setActivity(r.data)).catch(() => {}).finally(() => setActivityLoading(false));
  };

  useEffect(() => {
    api.get("/api/me").then(r => {
      setUser(r.data);
      setInstName(r.data.institute?.name || "");
      setInstLogoPreview(r.data.institute?.logo || null);
      setFirstName(r.data.first_name || "");
      setLastName(r.data.last_name || "");
      setAvatarPreview(r.data.avatar || null);
      // Self-heal the local storage session with live data
      localStorage.setItem("user", JSON.stringify(r.data));
      window.dispatchEvent(new Event("storage"));
      setLoading(false);
    }).catch(() => setLoading(false));
    loadActivity();
  }, []);

  const onInstLogoCropped = (f: File) => {
    setInstLogoFile(f);
    setInstLogoPreview(URL.createObjectURL(f));
  };

  const onAvatarCropped = (f: File) => {
    setAvatarFile(f);
    setAvatarPreview(URL.createObjectURL(f));
  };

  const saveInstitute = async () => {
    setSavingInst(true);
    try {
      const fd = new FormData();
      fd.append("name", instName);
      if (instLogoFile) fd.append("logo", instLogoFile);
      const r = await api.patch("/api/me/institute", fd);
      const updatedUser = { ...user, institute: { ...user.institute, name: r.data.name, logo: r.data.logo } };
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      window.dispatchEvent(new Event("storage"));
      setAlertModal({ open: true, title: "Institute Updated", message: "Institute profile saved successfully.", type: "success" });
      loadActivity();
    } catch {
      setAlertModal({ open: true, title: "Update Failed", message: "Couldn't save institute profile. Please try again.", type: "error" });
    } finally {
      setSavingInst(false);
    }
  };

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      const fd = new FormData();
      fd.append("first_name", firstName);
      fd.append("last_name", lastName);
      if (avatarFile) fd.append("avatar", avatarFile);
      const r = await api.patch("/api/me", fd);
      const updatedUser = { ...user, first_name: r.data.first_name, last_name: r.data.last_name, name: r.data.name, avatar: r.data.avatar };
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      window.dispatchEvent(new Event("storage"));
      setAlertModal({ open: true, title: "Profile Updated", message: "Your profile was saved successfully.", type: "success" });
      loadActivity();
    } catch {
      setAlertModal({ open: true, title: "Update Failed", message: "Couldn't save your profile. Please try again.", type: "error" });
    } finally {
      setSavingProfile(false);
    }
  };

  const confirmChangePlan = (planKey: string, planLabel: string) => {
    setConfirmModal({ open: true, planKey, planLabel });
  };

  const changePlan = async (planKey: string, planLabel: string) => {
    setConfirmModal(null);
    setIsChangingPlan(true);
    try {
      await api.post("/api/me/plan", { plan: planKey });
      const updatedUser = { ...user, institute: { ...user.institute, plan: planKey } };
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      window.dispatchEvent(new Event("storage"));
      
      setAlertModal({ 
        open: true, 
        title: "Package Upgraded", 
        message: `Successfully upgraded to the ${planLabel} package. Your features and access limits have been instantly updated.`,
        type: "success"
      });
    } catch (err) {
      setAlertModal({ 
        open: true, 
        title: "Update Failed", 
        message: "Failed to update plan. Please try again.",
        type: "error"
      });
    } finally {
      setIsChangingPlan(false);
    }
  };

  return (
    <PageShell>
      <Topbar title="Settings" subtitle="Institute configuration" />
      <div className="pb fi">
        {loading ? <div style={{ textAlign: "center", padding: 40, color: "var(--ink3)" }}>Loading...</div> : user ? (
          <div>
            <div className="g2">
              <div>
                <div className="sb-settings">
                  <div className="sb-settings-t">Institute Profile</div>
                  <div className="sb-settings-d">Your institute details</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
                    <CroppableImageInput
                      variant="circle" round={false} size={56}
                      value={instLogoPreview} name={instName || "Institute"}
                      onChange={onInstLogoCropped}
                    />
                    <div style={{ flex: 1 }}>
                      <label className="flbl">Institute name</label>
                      <input value={instName} onChange={e => setInstName(e.target.value)} />
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
                    {[
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
                  <button className="btn btn-p btn-sm" onClick={saveInstitute} disabled={savingInst}>
                    {savingInst ? "Saving..." : "Save institute profile"}
                  </button>
                </div>
              </div>

              <div>
                <div className="sb-settings">
                  <div className="sb-settings-t">Account</div>
                  <div className="sb-settings-d">Your profile</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
                    <CroppableImageInput
                      variant="circle" round={true} size={56}
                      value={avatarPreview} name={firstName || user.username || "User"}
                      onChange={onAvatarCropped}
                    />
                    <div style={{ flex: 1, display: "flex", gap: 8 }}>
                      <div style={{ flex: 1 }}>
                        <label className="flbl">First name</label>
                        <input value={firstName} onChange={e => setFirstName(e.target.value)} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label className="flbl">Last name</label>
                        <input value={lastName} onChange={e => setLastName(e.target.value)} />
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "grid", gap: 8, marginBottom: 14 }}>
                    {[
                      { label: "Email", val: user.email || "—" },
                      { label: "Role", val: user.role || "admin" },
                    ].map(r => (
                      <div key={r.label} style={{ padding: "8px 10px", background: "var(--cr)", borderRadius: 8 }}>
                        <div style={{ fontSize: 9.5, color: "var(--ink3)", fontWeight: 600, letterSpacing: ".05em", textTransform: "uppercase", marginBottom: 1 }}>{r.label}</div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>{r.val}</div>
                      </div>
                    ))}
                  </div>
                  <button className="btn btn-p btn-sm" onClick={saveProfile} disabled={savingProfile}>
                    {savingProfile ? "Saving..." : "Save profile"}
                  </button>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 24 }}>
              <div className="sb-settings" style={{ padding: 24 }}>
                <div className="sb-settings-t" style={{ fontSize: 18, marginBottom: 4 }}>Subscription & Plans</div>
                <div className="sb-settings-d" style={{ marginBottom: 20 }}>Manage your institute's package and view available features</div>
                
                <div style={{ 
                  display: "grid", 
                  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", 
                  gap: 20
                }}>
                  {Object.values(PLAN_DEFINITIONS).map(plan => {
                    const isCurrent = plan.key === user.institute?.plan;
                    return (
                      <div key={plan.key} style={{ 
                        border: `2px solid ${isCurrent ? plan.color : "var(--ln)"}`, 
                        borderRadius: 14, 
                        padding: 24, 
                        background: "var(--w)",
                        position: "relative",
                        display: "flex",
                        flexDirection: "column",
                        boxShadow: isCurrent ? `0 4px 20px ${plan.color}20` : "none",
                      }}>
                        {isCurrent && (
                          <div style={{ 
                            position: "absolute", top: -12, right: 20, 
                            background: plan.color, color: "#fff", 
                            padding: "4px 10px", borderRadius: 12, fontSize: 10, fontWeight: 700, letterSpacing: ".05em" 
                          }}>CURRENT PACKAGE</div>
                        )}
                        <h4 style={{ fontSize: 20, fontWeight: 700, color: "var(--ink)", margin: "0 0 6px 0" }}>{plan.label}</h4>
                        <div style={{ fontSize: 13, color: "var(--ink3)", marginBottom: 16 }}>{plan.tagline}</div>
                        <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "var(--font-serif)", color: "var(--ink)", marginBottom: 24 }}>
                          LKR {plan.priceLKR.toLocaleString()} <span style={{ fontSize: 14, fontFamily: "var(--font-sans)", color: "var(--ink3)", fontWeight: 500 }}>/ mo</span>
                        </div>

                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 12 }}>Plan Limits</div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
                            {PLAN_LIMITS.map(limit => (
                              <div key={limit.id} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "var(--ink2)" }}>
                                <span style={{ color: "var(--sp)" }}>✓</span>
                                {limit.label}: <strong style={{ color: "var(--ink)" }}>{(limit as any)[plan.key]}</strong>
                              </div>
                            ))}
                          </div>
                          
                          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 12 }}>Included Features</div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            {PLAN_FEATURES.filter(f => (f as any)[plan.key]).map(feature => (
                              <div key={feature.id} style={{ display: "flex", alignItems: "start", gap: 10, fontSize: 13, color: "var(--ink2)", lineHeight: 1.4 }}>
                                <span style={{ color: "var(--tc)", marginTop: 1 }}>✓</span>
                                {feature.label}
                              </div>
                            ))}
                          </div>
                        </div>

                        <div style={{ marginTop: 32 }}>
                          {isCurrent ? (
                            <button className="btn" disabled style={{ width: "100%", background: plan.colorLight, color: plan.color, opacity: 1, border: "none", fontWeight: 600 }}>Active Package</button>
                          ) : (
                            <button className="btn" disabled={isChangingPlan} style={{ width: "100%", border: "1px solid var(--ln)", background: "transparent", color: "var(--ink)", fontWeight: 600, opacity: isChangingPlan ? 0.5 : 1 }} onClick={() => confirmChangePlan(plan.key, plan.label)}>
                              {isChangingPlan ? "Updating..." : `Choose ${plan.label}`}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div style={{ marginTop: 24 }}>
              <div className="sb-settings" style={{ padding: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div className="sb-settings-t" style={{ fontSize: 18, marginBottom: 4 }}>Activity Log</div>
                    <div className="sb-settings-d" style={{ marginBottom: 16 }}>Recent changes to your institute and account — who did what, and when</div>
                  </div>
                  <Link href="/activity" className="btn btn-s btn-sm" style={{ flexShrink: 0 }}>View all</Link>
                </div>
                {activityLoading ? (
                  <div style={{ textAlign: "center", padding: 24, color: "var(--ink3)" }}>Loading...</div>
                ) : activity.length === 0 ? (
                  <div style={{ textAlign: "center", padding: 24, color: "var(--ink3)" }}>No activity recorded yet.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    {activity.map(a => (
                      <div key={a.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--ln)" }}>
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: "var(--tc-l)", color: "var(--tc-d)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                          {a.user[0]?.toUpperCase() || "?"}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, color: "var(--ink)" }}>{a.description}</div>
                          <div style={{ fontSize: 11, color: "var(--ink3)", marginTop: 2 }}>{a.user} · {new Date(a.created_at).toLocaleString()}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : <div className="card" style={{ textAlign: "center", color: "var(--ink3)", padding: 24 }}>Could not load settings</div>}
      </div>

      <Modal
        open={!!confirmModal?.open}
        onClose={() => setConfirmModal(null)}
        title="Confirm Upgrade"
        footer={
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button className="btn btn-s" onClick={() => setConfirmModal(null)}>Cancel</button>
            <button className="btn btn-p" onClick={() => confirmModal && changePlan(confirmModal.planKey, confirmModal.planLabel)}>Confirm Change</button>
          </div>
        }
      >
        <div style={{ color: "var(--ink2)", lineHeight: 1.5 }}>
          Are you sure you want to change your package to <strong>{confirmModal?.planLabel}</strong>?
        </div>
      </Modal>

      <Toast 
        open={!!alertModal?.open} 
        message={alertModal?.message || ""} 
        type={alertModal?.type || "success"} 
        onClose={() => setAlertModal(null)} 
      />
    </PageShell>
  );
}
