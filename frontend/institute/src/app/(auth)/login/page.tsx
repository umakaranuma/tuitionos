"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"login" | "change-password" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Change password state
  const [newPw, setNewPw] = useState("");
  const [showNewPw, setShowNewPw] = useState(false);
  const [confirmPw, setConfirmPw] = useState("");
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);

  // Mock: detect if first login (temporary password)
  const isFirstLogin = password === "Xk9#mP2qL";

  const handleLogin = async () => {
    setError("");
    if (!email.trim() || !password.trim()) { setError("Please enter your email and password."); return; }
    setLoading(true);
    
    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.error || "Invalid credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = () => {
    if (!newPw || newPw.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (newPw !== confirmPw) { setError("Passwords do not match."); return; }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      router.push("/dashboard");
    }, 600);
  };

  const handleForgot = async () => {
    if (!forgotEmail.trim()) return;
    setLoading(true);
    setError("");
    
    try {
      const response = await fetch("http://localhost:8000/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail }),
      });
      
      if (response.ok) {
        setForgotSent(true);
      } else {
        const data = await response.json();
        setError(data.error || "Failed to send reset link.");
      }
    } catch (err) {
      setError("Network error. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(135deg, #0d2b20 0%, #133a2e 40%, #1a5040 100%)",
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      {/* Background pattern */}
      <div style={{ position: "fixed", inset: 0, opacity: .04, pointerEvents: "none",
        backgroundImage: "radial-gradient(circle at 20% 50%, #fff 1px, transparent 1px), radial-gradient(circle at 80% 50%, #fff 1px, transparent 1px)",
        backgroundSize: "60px 60px", backgroundPosition: "0 0, 30px 30px",
      }} />

      <div style={{ width: "100%", maxWidth: 420, padding: "0 20px", position: "relative", zIndex: 1 }}>
        {/* Logo / Branding */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "rgba(45,122,90,.3)", border: "1px solid rgba(45,122,90,.5)",
            borderRadius: 99, padding: "4px 14px", marginBottom: 14,
          }}>
            <span style={{ fontSize: 9, fontWeight: 800, color: "#d4ede3", letterSpacing: ".08em" }}>TUITION-OS</span>
          </div>
          <h1 style={{
            fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 26,
            color: "#fff", marginBottom: 4, lineHeight: 1.2,
          }}>
            Institute Portal
          </h1>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,.45)", fontFamily: "'JetBrains Mono', monospace" }}>
            app.tuitionos.lk
          </div>
        </div>

        {/* Login card */}
        <div style={{
          background: "#fff", borderRadius: 18, padding: 0,
          boxShadow: "0 24px 64px rgba(0,0,0,.25), 0 4px 12px rgba(0,0,0,.1)",
          overflow: "hidden",
        }}>
          {/* Card header */}
          <div style={{ padding: "22px 26px 0" }}>
            <h2 style={{
              fontFamily: "'Instrument Serif', Georgia, serif",
              fontSize: 20, color: "#1c1917", marginBottom: 4,
            }}>
              {step === "login" ? "Sign in to your portal" :
               step === "change-password" ? "Set your new password" :
               "Reset your password"}
            </h2>
            <p style={{ fontSize: 12.5, color: "#78716c", marginBottom: 0 }}>
              {step === "login" ? "Enter your credentials to access the institute dashboard." :
               step === "change-password" ? "Your temporary password must be changed before proceeding." :
               "We'll send a password reset link to your email address."}
            </p>
          </div>

          <hr style={{ border: "none", borderTop: "1px solid #e8e3db", margin: "16px 0 0" }} />

          {/* Card body */}
          <div style={{ padding: "20px 26px 24px" }}>
            {error && (
              <div style={{
                background: "#fceaea", border: "1px solid #f5c5c5", borderRadius: 10,
                padding: "9px 13px", fontSize: 12, color: "#b83030", marginBottom: 14,
                display: "flex", alignItems: "center", gap: 8,
              }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <circle cx="7" cy="7" r="6"/><path d="M7 4.5v3M7 9.5h.01"/>
                </svg>
                {error}
              </div>
            )}

            {step === "login" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={{ fontSize: 11.5, fontWeight: 600, color: "#44403c", marginBottom: 4, display: "block" }}>
                    Email address
                  </label>
                  <input
                    type="email" placeholder="admin@your-institute.com" value={email}
                    onChange={e => setEmail(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleLogin()}
                    autoFocus
                    style={{
                      fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, color: "#1c1917",
                      background: "#faf8f4", border: "1.5px solid #e8e3db", borderRadius: 8,
                      padding: "10px 13px", outline: "none", width: "100%", transition: "border-color 120ms",
                    }}
                    onFocus={e => e.currentTarget.style.borderColor = "#2d7a5a"}
                    onBlur={e => e.currentTarget.style.borderColor = "#e8e3db"}
                  />
                </div>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <label style={{ fontSize: 11.5, fontWeight: 600, color: "#44403c" }}>Password</label>
                    <button
                      onClick={() => { setStep("forgot"); setError(""); }}
                      style={{ background: "none", border: "none", color: "#2d7a5a", fontSize: 11, fontWeight: 600, cursor: "pointer" }}
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showPassword ? "text" : "password"} placeholder="Enter your password" value={password}
                      onChange={e => setPassword(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && handleLogin()}
                      style={{
                        fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, color: "#1c1917",
                        background: "#faf8f4", border: "1.5px solid #e8e3db", borderRadius: 8,
                        padding: "10px 40px 10px 13px", outline: "none", width: "100%", transition: "border-color 120ms",
                      }}
                      onFocus={e => e.currentTarget.style.borderColor = "#2d7a5a"}
                      onBlur={e => e.currentTarget.style.borderColor = "#e8e3db"}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#78716c", display: "flex", padding: 4 }}>
                      {showPassword ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg> : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
                    </button>
                  </div>
                </div>

                {/* Remember me */}
                <label style={{
                  display: "flex", alignItems: "center", gap: 8,
                  fontSize: 12, color: "#44403c", cursor: "pointer", userSelect: "none",
                }}>
                  <input
                    type="checkbox" checked={remember}
                    onChange={e => setRemember(e.target.checked)}
                    style={{ width: 15, height: 15, accentColor: "#2d7a5a", cursor: "pointer" }}
                  />
                  Remember me for 30 days
                </label>

                <button
                  onClick={handleLogin} disabled={loading}
                  style={{
                    background: loading ? "#478f6e" : "#2d7a5a", color: "#fff", border: "none",
                    borderRadius: 10, padding: "11px 0", fontSize: 13, fontWeight: 600,
                    cursor: loading ? "wait" : "pointer", transition: "all 120ms", width: "100%",
                    opacity: loading ? .8 : 1,
                  }}
                >
                  {loading ? "Signing in…" : "Sign in"}
                </button>
              </div>
            )}

            {step === "change-password" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {/* Security notice */}
                <div style={{
                  background: "#fef3d7", border: "1px solid #fde68a", borderRadius: 10,
                  padding: "10px 13px", fontSize: 12, color: "#92400e",
                  display: "flex", alignItems: "center", gap: 8,
                }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.75">
                    <path d="M7 1L1 12h12L7 1z"/><path d="M7 5.5v3M7 10.5h.01"/>
                  </svg>
                  You are using a temporary password. Please set a new one now.
                </div>

                <div>
                  <label style={{ fontSize: 11.5, fontWeight: 600, color: "#44403c", marginBottom: 4, display: "block" }}>
                    New password <span style={{ color: "#b83030" }}>*</span>
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showNewPw ? "text" : "password"} placeholder="Minimum 8 characters" value={newPw}
                      onChange={e => setNewPw(e.target.value)} autoFocus
                      style={{
                        fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, color: "#1c1917",
                        background: "#faf8f4", border: "1.5px solid #e8e3db", borderRadius: 8,
                        padding: "10px 40px 10px 13px", outline: "none", width: "100%",
                      }}
                    />
                    <button type="button" onClick={() => setShowNewPw(!showNewPw)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#78716c", display: "flex", padding: 4 }}>
                      {showNewPw ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg> : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
                    </button>
                  </div>
                  {/* Strength indicator */}
                  {newPw && (
                    <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
                      {[1,2,3,4].map(i => (
                        <div key={i} style={{
                          flex: 1, height: 3, borderRadius: 99,
                          background: newPw.length >= i * 3 ? (newPw.length >= 12 ? "#2d7a5a" : newPw.length >= 8 ? "#c07b1a" : "#b83030") : "#e8e3db",
                          transition: "background 200ms",
                        }} />
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ fontSize: 11.5, fontWeight: 600, color: "#44403c", marginBottom: 4, display: "block" }}>
                    Confirm new password <span style={{ color: "#b83030" }}>*</span>
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showConfirmPw ? "text" : "password"} placeholder="Re-enter your new password" value={confirmPw}
                      onChange={e => setConfirmPw(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && handleChangePassword()}
                      style={{
                        fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, color: "#1c1917",
                        background: "#faf8f4", border: "1.5px solid #e8e3db", borderRadius: 8,
                        padding: "10px 40px 10px 13px", outline: "none", width: "100%",
                      }}
                    />
                    <button type="button" onClick={() => setShowConfirmPw(!showConfirmPw)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#78716c", display: "flex", padding: 4 }}>
                      {showConfirmPw ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg> : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
                    </button>
                  </div>
                  {confirmPw && newPw && confirmPw !== newPw && (
                    <div style={{ fontSize: 11, color: "#b83030", marginTop: 4 }}>Passwords do not match</div>
                  )}
                </div>

                <button
                  onClick={handleChangePassword} disabled={loading}
                  style={{
                    background: loading ? "#478f6e" : "#2d7a5a", color: "#fff", border: "none",
                    borderRadius: 10, padding: "11px 0", fontSize: 13, fontWeight: 600,
                    cursor: loading ? "wait" : "pointer", width: "100%",
                  }}
                >
                  {loading ? "Saving…" : "Set password & continue"}
                </button>
              </div>
            )}

            {step === "forgot" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {forgotSent ? (
                  <div style={{
                    background: "#d4ede3", border: "1px solid #b8ddd0", borderRadius: 10,
                    padding: "14px", textAlign: "center",
                  }}>
                    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="#1a5040" strokeWidth="2" style={{ margin: "0 auto 8px", display: "block" }}>
                      <circle cx="14" cy="14" r="12"/><path d="M8 14l4 4 8-8"/>
                    </svg>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#1a5040", marginBottom: 4 }}>Reset link sent!</div>
                    <div style={{ fontSize: 12, color: "#1a5040" }}>
                      Check <strong>{forgotEmail}</strong> for the password reset link. It expires in 1 hour.
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                      <label style={{ fontSize: 11.5, fontWeight: 600, color: "#44403c", marginBottom: 4, display: "block" }}>
                        Email address
                      </label>
                      <input
                        type="email" placeholder="admin@your-institute.com" value={forgotEmail}
                        onChange={e => setForgotEmail(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && handleForgot()} autoFocus
                        style={{
                          fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, color: "#1c1917",
                          background: "#faf8f4", border: "1.5px solid #e8e3db", borderRadius: 8,
                          padding: "10px 13px", outline: "none", width: "100%",
                        }}
                      />
                    </div>
                    <button
                      onClick={handleForgot} disabled={loading || !forgotEmail.trim()}
                      style={{
                        background: loading ? "#478f6e" : "#2d7a5a", color: "#fff", border: "none",
                        borderRadius: 10, padding: "11px 0", fontSize: 13, fontWeight: 600,
                        cursor: loading ? "wait" : "pointer", width: "100%",
                      }}
                    >
                      {loading ? "Sending…" : "Send reset link"}
                    </button>
                  </>
                )}
                <button
                  onClick={() => { setStep("login"); setError(""); setForgotSent(false); }}
                  style={{
                    background: "none", border: "none", color: "#2d7a5a",
                    fontSize: 12, fontWeight: 600, cursor: "pointer", textAlign: "center",
                  }}
                >
                  ← Back to sign in
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center", marginTop: 20, fontSize: 11, color: "rgba(255,255,255,.3)" }}>
          Powered by TuitionOS · For support: WhatsApp +94 77 XXX XXXX
        </div>
      </div>
    </main>
  );
}
