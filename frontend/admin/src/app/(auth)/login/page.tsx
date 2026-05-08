"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { QRCodeSVG } from "qrcode.react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      const response = await fetch("http://localhost:8000/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();
      
      if (!response.ok) {
        setError(data.error || "Invalid credentials");
        setLoading(false);
        return;
      }
      
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
    } catch (err) {
      setError("Network error. Make sure the backend is running.");
      setLoading(false);
    }
  };

  const handle2FA = async () => {
    if (totpCode.length !== 6) { setError("Enter a 6-digit code from your authenticator app."); return; }
    setLoading(true);
    try {
      const response = await fetch("http://localhost:8000/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, totp_code: totpCode })
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Invalid 2FA code");
        setLoading(false);
        return;
      }
      localStorage.setItem("token", data.token);
      router.push("/dashboard");
    } catch (err) {
      setError("Network error.");
      setLoading(false);
    }
  };

  return (
    <main style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)",
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      <div style={{ width: "100%", maxWidth: 380, padding: "0 20px" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: "rgba(99,102,241,.2)", border: "1px solid rgba(99,102,241,.35)",
            borderRadius: 99, padding: "4px 12px", marginBottom: 12,
          }}>
            <span style={{ fontSize: 9, fontWeight: 800, color: "#a5b4fc", letterSpacing: ".1em" }}>TUITION-OS</span>
          </div>
          <h1 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 24, color: "#fff", marginBottom: 4 }}>
            Admin Console
          </h1>
          <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.4)", fontFamily: "'JetBrains Mono', monospace" }}>
            admin.tuitionos.lk
          </div>
        </div>

        {/* Login card */}
        <div style={{
          background: "#1e293b", border: "1px solid #334155", borderRadius: 18,
          overflow: "hidden", boxShadow: "0 24px 64px rgba(0,0,0,.4)",
        }}>
          {/* Card header */}
          <div style={{ padding: "20px 24px 0" }}>
            <h2 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 18, color: "#fff", marginBottom: 4 }}>
              {step === "creds" ? "Developer login" : "Two-factor authentication"}
            </h2>
            <p style={{ fontSize: 12, color: "#94a3b8", marginBottom: 0 }}>
              {step === "creds" ? "Access is restricted to the platform administrator." : "Enter the 6-digit code from Google Authenticator."}
            </p>
          </div>
          <hr style={{ border: "none", borderTop: "1px solid #334155", margin: "14px 0 0" }} />

          <div style={{ padding: "18px 24px 22px" }}>
            {error && (
              <div style={{
                background: "rgba(239,68,68,.15)", border: "1px solid rgba(239,68,68,.3)", borderRadius: 8,
                padding: "8px 12px", fontSize: 12, color: "#fca5a5", marginBottom: 12,
              }}>
                {error}
              </div>
            )}

            {step === "creds" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", marginBottom: 4, display: "block" }}>Email</label>
                  <input
                    type="email" placeholder="dev@tuitionos.lk" value={email}
                    onChange={e => setEmail(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleCredentials()} autoFocus
                    style={{
                      fontSize: 13, color: "#fff", background: "#0f172a", border: "1.5px solid #334155",
                      borderRadius: 8, padding: "10px 12px", outline: "none", width: "100%",
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", marginBottom: 4, display: "block" }}>Password</label>
                  <input
                    type="password" placeholder="Min 16 characters" value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleCredentials()}
                    style={{
                      fontSize: 13, color: "#fff", background: "#0f172a", border: "1.5px solid #334155",
                      borderRadius: 8, padding: "10px 12px", outline: "none", width: "100%",
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                    }}
                  />
                </div>
                <button
                  onClick={handleCredentials} disabled={loading}
                  style={{
                    background: loading ? "#4f46e5" : "#6366f1", color: "#fff", border: "none",
                    borderRadius: 8, padding: "10px 0", fontSize: 13, fontWeight: 600,
                    cursor: loading ? "wait" : "pointer", width: "100%", marginTop: 4,
                  }}
                >
                  {loading ? "Verifying…" : "Continue →"}
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{
                  background: "rgba(99,102,241,.1)", border: "1px solid rgba(99,102,241,.25)",
                  borderRadius: 10, padding: "10px 12px", fontSize: 12, color: "#a5b4fc",
                  display: "flex", alignItems: "center", gap: 8,
                }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="7" width="10" height="7" rx="1.5"/><path d="M5 7V5a3 3 0 016 0v2"/>
                  </svg>
                  2FA is mandatory for admin access
                </div>
                {setupUri && (
                  <div style={{ textAlign: "center", marginBottom: 12, background: "#fff", padding: 12, borderRadius: 8 }}>
                    <div style={{ fontSize: 12, color: "#1e293b", fontWeight: 600, marginBottom: 8 }}>Scan with Google Authenticator</div>
                    <QRCodeSVG value={setupUri} size={150} />
                  </div>
                )}
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", marginBottom: 4, display: "block" }}>
                    Authenticator code
                  </label>
                  <input
                    type="text" placeholder="000000" maxLength={6} value={totpCode}
                    onChange={e => setTotpCode(e.target.value.replace(/\D/g, ""))}
                    onKeyDown={e => e.key === "Enter" && handle2FA()} autoFocus
                    style={{
                      fontSize: 20, color: "#fff", background: "#0f172a", border: "1.5px solid #334155",
                      borderRadius: 8, padding: "12px", outline: "none", width: "100%",
                      fontFamily: "'JetBrains Mono', monospace", textAlign: "center", letterSpacing: ".3em",
                    }}
                  />
                </div>
                <button
                  onClick={handle2FA} disabled={loading}
                  style={{
                    background: loading ? "#4f46e5" : "#6366f1", color: "#fff", border: "none",
                    borderRadius: 8, padding: "10px 0", fontSize: 13, fontWeight: 600,
                    cursor: loading ? "wait" : "pointer", width: "100%",
                  }}
                >
                  {loading ? "Verifying…" : "Verify & sign in"}
                </button>
                <button
                  onClick={() => { setStep("creds"); setError(""); }}
                  style={{ background: "none", border: "none", color: "#94a3b8", fontSize: 12, cursor: "pointer" }}
                >
                  ← Back to credentials
                </button>
              </div>
            )}
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: 18, fontSize: 10.5, color: "rgba(255,255,255,.2)" }}>
          Session: 8h · JWT httpOnly · Lockout after 5 failed attempts
        </div>
      </div>
    </main>
  );
}
