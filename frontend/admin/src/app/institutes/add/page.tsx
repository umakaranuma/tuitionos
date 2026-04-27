"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Topbar } from "@/components/layout/Topbar";
import { PageShell } from "@/components/layout/PageShell";

const districts = ["Jaffna", "Colombo", "Kandy", "Gampaha", "Vavuniya", "Kurunegala", "Matara", "Anuradhapura", "Southern", "Other"];
const RESERVED = ["admin", "api", "www", "mail", "static", "media", "app", "login", "dashboard", "support"];

function generateSubdomain(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 30);
}

function generatePassword(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
  let pw = "";
  for (let i = 0; i < 10; i++) pw += chars[Math.floor(Math.random() * chars.length)];
  return pw;
}

export default function AddInstitutePage() {
  const router = useRouter();
  const [step, setStep] = useState<"form" | "review" | "success">("form");
  const [form, setForm] = useState({
    name: "", district: "Jaffna", mobile: "", email: "",
    adminName: "", plan: "basic" as "basic" | "premium" | "trial",
    subdomain: "",
  });
  const [subdomainEdited, setSubdomainEdited] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (field: string, value: string) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      // Auto-generate subdomain from name if not manually edited
      if (field === "name" && !subdomainEdited) {
        next.subdomain = generateSubdomain(value);
      }
      return next;
    });
  };

  const subdomainError = (() => {
    const s = form.subdomain;
    if (!s) return "";
    if (s.length < 3) return "Minimum 3 characters";
    if (RESERVED.includes(s)) return "This subdomain is reserved";
    if (/^-|-$/.test(s)) return "Cannot start or end with a hyphen";
    return "";
  })();

  const canSubmit = form.name.trim() && form.email.trim() && form.adminName.trim()
    && form.subdomain.length >= 3 && !subdomainError;

  const planInfo = {
    basic: { label: "Basic", price: "LKR 3,000/mo", features: "Max 200 students · 10 batches · Attendance + fees" },
    premium: { label: "Premium", price: "LKR 6,000/mo", features: "Unlimited students · Notifications · Timetable" },
    trial: { label: "14-day Trial", price: "Free for 14 days", features: "Full Premium features during trial period" },
  };

  return (
    <PageShell>
      <Topbar
        title="Add institute"
        subtitle="Manual onboarding"
        right={
          <button className="btn btn-g btn-sm" onClick={() => router.back()}>← Back</button>
        }
      />

      {step === "success" ? (
        <div className="pb fi">
          <div style={{ maxWidth: 560, margin: "0 auto" }}>
            {/* Success card */}
            <div className="card" style={{ textAlign: "center", padding: "30px 24px" }}>
              <div style={{
                width: 56, height: 56, borderRadius: "50%", background: "#d4ede3",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 16px",
              }}>
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="#1a5040" strokeWidth="2.5">
                  <path d="M6 14l6 6 10-10"/>
                </svg>
              </div>
              <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 22, color: "var(--ink)", marginBottom: 6 }}>
                Institute created successfully
              </h2>
              <p style={{ fontSize: 13, color: "var(--ink3)", marginBottom: 20 }}>
                The institute portal is live and a welcome email has been sent.
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, textAlign: "left", marginBottom: 20 }}>
                {[
                  { label: "Institute", val: form.name },
                  { label: "Admin", val: form.adminName },
                  { label: "Portal URL", val: `https://app.tuitionos.lk/login`, mono: true },
                  { label: "Plan", val: planInfo[form.plan].label },
                  { label: "Email", val: form.email },
                  { label: "Authentication", val: "Secure Email Link Sent", mono: true },
                ].map(row => (
                  <div key={row.label} style={{ padding: "10px 12px", background: "var(--cr)", borderRadius: 9 }}>
                    <div style={{ fontSize: 10, color: "var(--ink3)", fontWeight: 600, letterSpacing: ".04em", textTransform: "uppercase", marginBottom: 2 }}>{row.label}</div>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink)", fontFamily: row.mono ? "var(--font-mono)" : undefined, wordBreak: "break-all" }}>{row.val}</div>
                  </div>
                ))}
              </div>

              {/* Email preview */}
              <div style={{
                background: "#f0fdf8", border: "1px solid #b8ddd0", borderRadius: 12,
                padding: "14px 16px", textAlign: "left", fontSize: 12, color: "#1a5040",
                marginBottom: 20,
              }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>📧 Welcome email sent to {form.email}</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, lineHeight: 1.6, opacity: .85 }}>
                  Subject: Welcome to TuitionOS - {form.name}<br/>
                  Plan: {planInfo[form.plan].label} ({planInfo[form.plan].price})<br/>
                  Action: Secure link provided to set password and log in.
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                <button className="btn btn-s" onClick={() => router.push("/institutes")}>
                  View all institutes
                </button>
                <button className="btn btn-p" onClick={() => { setStep("form"); setForm({ name: "", district: "Jaffna", mobile: "", email: "", adminName: "", plan: "basic", subdomain: "" }); setSubdomainEdited(false); }}>
                  + Add another
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : step === "review" ? (
        <div className="pb fi">
          <div style={{ maxWidth: 560, margin: "0 auto" }}>
            <div className="card">
              <div style={{ fontFamily: "var(--font-serif)", fontSize: 18, marginBottom: 4 }}>Review before creating</div>
              <div style={{ fontSize: 11, color: "var(--ink3)", marginBottom: 14 }}>
                Please verify all details. A welcome email will be sent to the institute admin.
              </div>
              <hr className="dv" />

              {error && <div style={{ color: "red", fontSize: 12, marginBottom: 10 }}>{error}</div>}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
                {[
                  { label: "Institute name", val: form.name },
                  { label: "District", val: form.district },
                  { label: "Admin name", val: form.adminName },
                  { label: "Contact email", val: form.email },
                  { label: "WhatsApp mobile", val: form.mobile || "—" },
                  { label: "Plan", val: `${planInfo[form.plan].label} (${planInfo[form.plan].price})` },
                ].map(row => (
                  <div key={row.label} style={{ padding: "10px 12px", background: "var(--cr)", borderRadius: 9 }}>
                    <div style={{ fontSize: 10, color: "var(--ink3)", fontWeight: 600, letterSpacing: ".04em", textTransform: "uppercase", marginBottom: 2 }}>{row.label}</div>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink)" }}>{row.val}</div>
                  </div>
                ))}
              </div>

              <div style={{
                background: "var(--tc-l)", border: "1px solid #b8ddd0", borderRadius: 10,
                padding: "10px 14px", fontSize: 12, color: "var(--tc-d)", marginBottom: 18,
              }}>
                Portal URL: <strong>https://app.tuitionos.lk/login</strong>
                <br/>
                <span style={{ fontSize: 11 }}>Secure login link will be emailed to {form.email}.</span>
              </div>

              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button className="btn btn-s" onClick={() => setStep("form")}>← Edit</button>
                <button className="btn btn-p" disabled={loading} onClick={async () => {
                  setLoading(true);
                  setError("");
                  try {
                    const res = await fetch("http://localhost:8000/api/institutes", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(form)
                    });
                    
                    if (res.ok) {
                      setStep("success");
                    } else {
                      const data = await res.json();
                      setError(data.error || "Failed to create institute");
                    }
                  } catch (err) {
                    setError("Network error. Make sure the Django backend is running.");
                  } finally {
                    setLoading(false);
                  }
                }}>
                  {loading ? "Creating..." : "Confirm & create institute"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="pb fi">
          <div className="card" style={{ maxWidth: 600 }}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontFamily: "var(--font-serif)", fontSize: 16, marginBottom: 4 }}>New institute setup</div>
              <div style={{ fontSize: 11, color: "var(--ink3)" }}>
                The institute admin will receive a welcome email with their portal URL and temporary password.
              </div>
            </div>
            <hr className="dv" />

            {/* Section: Institute details */}
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--ink3)", letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 10 }}>
              Institute details
            </div>
            <div className="fgrid" style={{ marginBottom: 18 }}>
              <div className="fg fg-full">
                <label>Institute name *</label>
                <input
                  placeholder="e.g. St. Patrick's Academy, Jaffna"
                  value={form.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  autoFocus
                />
              </div>
              <div className="fg">
                <label>District *</label>
                <select value={form.district} onChange={(e) => handleChange("district", e.target.value)}>
                  {districts.map((d) => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div className="fg">
                <label>Subscription plan *</label>
                <select value={form.plan} onChange={(e) => handleChange("plan", e.target.value)}>
                  <option value="basic">Basic — LKR 3,000/mo</option>
                  <option value="premium">Premium — LKR 6,000/mo</option>
                  <option value="trial">14-day free trial</option>
                </select>
                <div className="hint">{planInfo[form.plan].features}</div>
              </div>
            </div>

            {/* Section: Admin contact */}
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--ink3)", letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 10 }}>
              Admin contact
            </div>
            <div className="fgrid" style={{ marginBottom: 18 }}>
              <div className="fg">
                <label>Admin name *</label>
                <input placeholder="e.g. Sundar Kumar" value={form.adminName} onChange={(e) => handleChange("adminName", e.target.value)} />
                <div className="hint">The person who will log in to the institute app</div>
              </div>
              <div className="fg">
                <label>Contact email *</label>
                <input type="email" placeholder="admin@institute.lk" value={form.email} onChange={(e) => handleChange("email", e.target.value)} />
              </div>
              <div className="fg fg-full">
                <label>WhatsApp mobile</label>
                <input placeholder="+94 77 123 4567" value={form.mobile} onChange={(e) => handleChange("mobile", e.target.value)} />
                <div className="hint">Used for billing reminders and support</div>
              </div>
            </div>

            {/* Subdomain is generated automatically for internal use, hidden from UI */}

            {/* Preview */}
            {form.name && (
              <div style={{
                background: "var(--tc-l)", border: "1px solid #b8ddd0", borderRadius: "var(--r)",
                padding: "10px 14px", marginBottom: 14, fontSize: 11.5, color: "var(--tc-d)"
              }}>
                Portal URL: <strong>https://app.tuitionos.lk/login</strong>
                {form.email && <> · Welcome email → <strong>{form.email}</strong></>}
                {form.plan === "trial" && <> · Trial ends in <strong>14 days</strong></>}
              </div>
            )}

            <hr className="dv" />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className="btn btn-s" onClick={() => router.back()}>Cancel</button>
              <button
                className="btn btn-p"
                onClick={() => setStep("review")}
                disabled={!canSubmit}
                style={{ opacity: canSubmit ? 1 : .5 }}
              >
                Review & create →
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
