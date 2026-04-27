"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const uid = searchParams.get("uid");
  const token = searchParams.get("token");

  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    setError("");
    if (!newPw || newPw.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (newPw !== confirmPw) { setError("Passwords do not match."); return; }
    
    setLoading(true);
    try {
      const response = await fetch("http://localhost:8000/api/auth/password-reset/confirm/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, token, new_password: newPw }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setSuccess(true);
        setTimeout(() => router.push("/login"), 2000);
      } else {
        setError(data.error || "Invalid or expired reset link.");
      }
    } catch (err) {
      setError("Network error. Please ensure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
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

      {success ? (
        <div style={{
          background: "#d4ede3", border: "1px solid #b8ddd0", borderRadius: 10,
          padding: "14px", textAlign: "center",
        }}>
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="#1a5040" strokeWidth="2" style={{ margin: "0 auto 8px", display: "block" }}>
            <circle cx="14" cy="14" r="12"/><path d="M8 14l4 4 8-8"/>
          </svg>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#1a5040", marginBottom: 4 }}>Password Reset Successfully!</div>
          <div style={{ fontSize: 12, color: "#1a5040" }}>
            Redirecting you to login...
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 11.5, fontWeight: 600, color: "#44403c", marginBottom: 4, display: "block" }}>
              New password <span style={{ color: "#b83030" }}>*</span>
            </label>
            <input
              type="password" placeholder="Minimum 8 characters" value={newPw}
              onChange={e => setNewPw(e.target.value)} autoFocus
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, color: "#1c1917",
                background: "#faf8f4", border: "1.5px solid #e8e3db", borderRadius: 8,
                padding: "10px 13px", outline: "none", width: "100%",
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: 11.5, fontWeight: 600, color: "#44403c", marginBottom: 4, display: "block" }}>
              Confirm new password <span style={{ color: "#b83030" }}>*</span>
            </label>
            <input
              type="password" placeholder="Re-enter your new password" value={confirmPw}
              onChange={e => setConfirmPw(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, color: "#1c1917",
                background: "#faf8f4", border: "1.5px solid #e8e3db", borderRadius: 8,
                padding: "10px 13px", outline: "none", width: "100%",
              }}
            />
          </div>

          <button
            onClick={handleSubmit} disabled={loading}
            style={{
              background: loading ? "#478f6e" : "#2d7a5a", color: "#fff", border: "none",
              borderRadius: 10, padding: "11px 0", fontSize: 13, fontWeight: 600,
              cursor: loading ? "wait" : "pointer", width: "100%",
            }}
          >
            {loading ? "Saving…" : "Set password & login"}
          </button>
        </div>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <main style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(135deg, #0d2b20 0%, #133a2e 40%, #1a5040 100%)",
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      <div style={{ width: "100%", maxWidth: 420, padding: "0 20px", position: "relative", zIndex: 1 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "rgba(45,122,90,.3)", border: "1px solid rgba(45,122,90,.5)",
            borderRadius: 99, padding: "4px 14px", marginBottom: 14,
          }}>
            <span style={{ fontSize: 9, fontWeight: 800, color: "#d4ede3", letterSpacing: ".08em" }}>TUITION-OS</span>
          </div>
          <h1 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 26, color: "#fff", marginBottom: 4 }}>
            Reset Password
          </h1>
        </div>

        <div style={{
          background: "#fff", borderRadius: 18, padding: 0,
          boxShadow: "0 24px 64px rgba(0,0,0,.25), 0 4px 12px rgba(0,0,0,.1)",
          overflow: "hidden",
        }}>
          <div style={{ padding: "22px 26px 0" }}>
            <h2 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 20, color: "#1c1917", marginBottom: 4 }}>
              Set your new password
            </h2>
            <p style={{ fontSize: 12.5, color: "#78716c", marginBottom: 0 }}>
              Enter a strong password below to reset your account access.
            </p>
          </div>
          <hr style={{ border: "none", borderTop: "1px solid #e8e3db", margin: "16px 0 0" }} />
          <Suspense fallback={<div style={{ padding: 20, textAlign: "center" }}>Loading...</div>}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
