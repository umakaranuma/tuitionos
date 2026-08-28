"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { QRCodeSVG } from "qrcode.react";
import { api } from "@/lib/api";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [totpCode, setTotpCode] = useState("");
  const [step, setStep] = useState<"creds" | "2fa">("creds");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [setupUri, setSetupUri] = useState("");

  const handleCredentials = async () => {
    setError("");
    if (!email.trim() || !password.trim()) { setError("Please enter your email and password."); return; }
    setLoading(true);

    try {
      const { data } = await api.post("/api/login", { email, password });

      if (!data.user.is_fynux_admin) {
        setError("Unauthorized: You do not have admin privileges.");
        setLoading(false);
        return;
      }

      if (data.requires_2fa) {
        if (data.setup_uri) setSetupUri(data.setup_uri);
        setStep("2fa");
      } else {
        localStorage.setItem("token", data.token);
        router.push("/dashboard");
      }
      setLoading(false);
    } catch (err: any) {
      setError(err.response?.data?.error || "Invalid credentials");
      setLoading(false);
    }
  };

  const handle2FA = async () => {
    if (totpCode.length !== 6) { setError("Enter a 6-digit code from your authenticator app."); return; }
    setLoading(true);
    try {
      const { data } = await api.post("/api/login", { email, password, totp_code: totpCode });
      localStorage.setItem("token", data.token);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.error || "Invalid 2FA code");
      setLoading(false);
    }
  };

  return (
    <main style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(135deg, #eef2ff 0%, #ffffff 45%, #eef2ff 100%)",
      fontFamily: "var(--font-body)", position: "relative", overflow: "hidden",
    }}>
      {/* Decorative background glow — same soft-blob language as the marketing site */}
      <div style={{ position: "fixed", top: "-15%", left: "-10%", width: 420, height: 420, borderRadius: "50%", background: "var(--tc-l)", opacity: .5, filter: "blur(90px)", pointerEvents: "none" }} />
      <div style={{ position: "fixed", bottom: "-15%", right: "-10%", width: 420, height: 420, borderRadius: "50%", background: "var(--jd-l)", opacity: .5, filter: "blur(90px)", pointerEvents: "none" }} />
      <div style={{ position: "fixed", inset: 0, opacity: .5, pointerEvents: "none",
        backgroundImage: "radial-gradient(circle at 1px 1px, var(--ln) 1px, transparent 1px)",
        backgroundSize: "28px 28px",
      }} />

      <div style={{ width: "100%", maxWidth: 380, padding: "0 20px", position: "relative", zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: "var(--tc-l)", border: "1px solid #c7d2fe",
            borderRadius: 99, padding: "4px 12px", marginBottom: 12,
          }}>
            <span style={{ fontSize: 9, fontWeight: 800, color: "var(--tc-d)", letterSpacing: ".1em" }}>TUITION-OS</span>
          </div>
          <h1 style={{ fontFamily: "var(--font-serif)", fontWeight: 700, fontSize: 24, color: "var(--ink)", marginBottom: 4 }}>
            Admin Console
          </h1>
          <div style={{ fontSize: 11.5, color: "var(--ink3)", fontFamily: "var(--font-mono)" }}>
            admin.tuitionos.lk
          </div>
        </div>

        {/* Login card */}
        <div style={{
          background: "#fff", border: "1px solid var(--ln)", borderRadius: 18,
          overflow: "hidden", boxShadow: "0 24px 64px rgba(79,70,229,.14), 0 4px 12px rgba(15,23,42,.06)",
          position: "relative",
        }}>
          {/* Top accent bar */}
          <div style={{ height: 3, width: "100%", background: "linear-gradient(to right, var(--tc), var(--jd))" }} />

          {/* Card header */}
          <div style={{ padding: "20px 24px 0" }}>
            <h2 style={{ fontFamily: "var(--font-serif)", fontWeight: 700, fontSize: 18, color: "var(--ink)", marginBottom: 4 }}>
              {step === "creds" ? "Developer login" : "Two-factor authentication"}
            </h2>
            <p style={{ fontSize: 12, color: "var(--ink3)", marginBottom: 0 }}>
              {step === "creds" ? "Access is restricted to the platform administrator." : "Enter the 6-digit code from Google Authenticator."}
            </p>
          </div>
          <hr style={{ border: "none", borderTop: "1px solid var(--ln)", margin: "14px 0 0" }} />

          <div style={{ padding: "18px 24px 22px" }}>
            {error && (
              <div style={{
                background: "var(--rb-l)", border: "1px solid #fecaca", borderRadius: 8,
                padding: "8px 12px", fontSize: 12, color: "var(--rb)", marginBottom: 12,
              }}>
                {error}
              </div>
            )}

            {step === "creds" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "var(--ink2)", marginBottom: 4, display: "block" }}>Email</label>
                  <input
                    type="email" placeholder="dev@tuitionos.lk" value={email}
                    onChange={e => setEmail(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleCredentials()} autoFocus
                    style={{
                      fontSize: 13, color: "var(--ink)", background: "var(--cr)", border: "1.5px solid var(--ln)",
                      borderRadius: 8, padding: "10px 12px", outline: "none", width: "100%",
                      fontFamily: "var(--font-body)", transition: "border-color 120ms",
                    }}
                    onFocus={e => e.currentTarget.style.borderColor = "var(--tc)"}
                    onBlur={e => e.currentTarget.style.borderColor = "var(--ln)"}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "var(--ink2)", marginBottom: 4, display: "block" }}>Password</label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showPassword ? "text" : "password"} placeholder="Min 16 characters" value={password}
                      onChange={e => setPassword(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && handleCredentials()}
                      style={{
                        fontSize: 13, color: "var(--ink)", background: "var(--cr)", border: "1.5px solid var(--ln)",
                        borderRadius: 8, padding: "10px 40px 10px 12px", outline: "none", width: "100%",
                        fontFamily: "var(--font-body)", transition: "border-color 120ms",
                      }}
                      onFocus={e => e.currentTarget.style.borderColor = "var(--tc)"}
                      onBlur={e => e.currentTarget.style.borderColor = "var(--ln)"}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--ink3)", display: "flex", padding: 4 }}>
                      {showPassword ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg> : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
                    </button>
                  </div>
                </div>
                <button
                  onClick={handleCredentials} disabled={loading}
                  style={{
                    background: "var(--tc)", color: "#fff", border: "none",
                    borderRadius: 8, padding: "10px 0", fontSize: 13, fontWeight: 600,
                    cursor: loading ? "wait" : "pointer", width: "100%", marginTop: 4,
                    opacity: loading ? .75 : 1, boxShadow: "0 4px 12px rgba(79,70,229,.25)",
                  }}
                >
                  {loading ? "Verifying…" : "Continue →"}
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{
                  background: "var(--tc-l)", border: "1px solid #c7d2fe",
                  borderRadius: 10, padding: "10px 12px", fontSize: 12, color: "var(--tc-d)",
                  display: "flex", alignItems: "center", gap: 8,
                }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="7" width="10" height="7" rx="1.5"/><path d="M5 7V5a3 3 0 016 0v2"/>
                  </svg>
                  2FA is mandatory for admin access
                </div>
                {setupUri && (
                  <div style={{ textAlign: "center", marginBottom: 12, background: "#fff", border: "1px solid var(--ln)", padding: 12, borderRadius: 8 }}>
                    <div style={{ fontSize: 12, color: "var(--ink)", fontWeight: 600, marginBottom: 8 }}>Scan with Google Authenticator</div>
                    <QRCodeSVG value={setupUri} size={150} />
                  </div>
                )}
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "var(--ink2)", marginBottom: 4, display: "block" }}>
                    Authenticator code
                  </label>
                  <input
                    type="text" placeholder="000000" maxLength={6} value={totpCode}
                    onChange={e => setTotpCode(e.target.value.replace(/\D/g, ""))}
                    onKeyDown={e => e.key === "Enter" && handle2FA()} autoFocus
                    style={{
                      fontSize: 20, color: "var(--ink)", background: "var(--cr)", border: "1.5px solid var(--ln)",
                      borderRadius: 8, padding: "12px", outline: "none", width: "100%",
                      fontFamily: "var(--font-mono)", textAlign: "center", letterSpacing: ".3em",
                    }}
                  />
                </div>
                <button
                  onClick={handle2FA} disabled={loading}
                  style={{
                    background: "var(--tc)", color: "#fff", border: "none",
                    borderRadius: 8, padding: "10px 0", fontSize: 13, fontWeight: 600,
                    cursor: loading ? "wait" : "pointer", width: "100%",
                    opacity: loading ? .75 : 1, boxShadow: "0 4px 12px rgba(79,70,229,.25)",
                  }}
                >
                  {loading ? "Verifying…" : "Verify & sign in"}
                </button>
                <button
                  onClick={() => { setStep("creds"); setError(""); }}
                  style={{ background: "none", border: "none", color: "var(--ink3)", fontSize: 12, cursor: "pointer" }}
                >
                  ← Back to credentials
                </button>
              </div>
            )}
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: 18, fontSize: 10.5, color: "var(--ink3)" }}>
          Session: 8h · JWT httpOnly · Lockout after 5 failed attempts
        </div>
      </div>
    </main>
  );
}
