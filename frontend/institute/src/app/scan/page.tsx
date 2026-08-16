"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import jsQR from "jsqr";
import { api } from "@/lib/api";
import { getStoredUser } from "@/lib/auth";

type StudentResult = {
  kind: "student"; id: number; name: string; batch_code: string;
  parent_name: string; parent_mobile: string; is_active: boolean;
  attendance: { window_days: number; present: number; total: number; rate_pct: number };
  fees: { year: number; paid_total: number; pending_total: number; pending_count: number; status: string };
};
type TeacherResult = {
  kind: "teacher"; id: number; name: string; subject: string;
  mobile: string; email: string; monthly_salary: number; is_active: boolean;
  payments: { window_days: number; paid_total: number; pending_total: number; pending_count: number; status: string };
};
type ScanResult = StudentResult | TeacherResult;
type Phase = "starting" | "scanning" | "loading" | "result" | "error";

const fmt = (n: number) => `LKR ${Number(n).toLocaleString()}`;

// The printed ID card encodes "tuitionos:s:<token>" / "tuitionos:t:<token>"
// (see QRCard.tsx) — the scan endpoint auto-detects kind server-side either
// way, so a bare token (from an older card or a generic reader) works too.
const extractToken = (raw: string): string | null => {
  const m = raw.match(/^tuitionos:[st]:(.+)$/);
  if (m) return m[1];
  return raw.length >= 16 && !raw.includes(" ") ? raw : null;
};

export default function ScanPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const busyRef = useRef(false);

  const [phase, setPhase] = useState<Phase>("starting");
  const [errorMsg, setErrorMsg] = useState("");
  const [result, setResult] = useState<ScanResult | null>(null);
  const user = getStoredUser();

  const stopCamera = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  };

  const lookup = async (token: string) => {
    busyRef.current = true;
    stopCamera();
    setPhase("loading");
    try {
      const r = await api.get(`/api/qr/${token}`);
      setResult(r.data);
      setPhase("result");
    } catch (e: any) {
      setErrorMsg(
        e?.response?.status === 404
          ? "This QR code isn't recognized — it may belong to a different institute."
          : "Couldn't look up this code. Check your connection and try again."
      );
      setPhase("error");
    }
  };

  const tick = () => {
    if (busyRef.current) return;
    const video = videoRef.current, canvas = canvasRef.current;
    if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(frame.data, frame.width, frame.height, { inversionAttempts: "dontInvert" });
        if (code?.data) {
          const token = extractToken(code.data);
          if (token) {
            lookup(token);
            return;
          }
        }
      }
    }
    rafRef.current = requestAnimationFrame(tick);
  };

  const startCamera = async () => {
    setPhase("starting");
    setErrorMsg("");
    setResult(null);
    busyRef.current = false;
    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorMsg("This browser doesn't support camera access. Try Chrome or Safari.");
      setPhase("error");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setPhase("scanning");
      rafRef.current = requestAnimationFrame(tick);
    } catch (e: any) {
      setErrorMsg(
        e?.name === "NotAllowedError"
          ? "Camera access was denied. Allow camera access in your browser settings and reload."
          : e?.name === "NotFoundError"
          ? "No camera was found on this device."
          : "Couldn't access the camera — make sure you're on a secure (https) connection."
      );
      setPhase("error");
    }
  };

  useEffect(() => {
    startCamera();
    return stopCamera;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "var(--cr)", display: "flex", flexDirection: "column" }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 16px", background: "#fff", borderBottom: "1px solid var(--ln)",
      }}>
        <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "var(--ink2)" }}>
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 14 14">
            <path d="M8.5 3L4.5 7l4 4" />
          </svg>
          Dashboard
        </Link>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>{user?.institute?.name || "QR Scanner"}</div>
      </div>

      <div style={{ flex: 1, width: "100%", maxWidth: 480, margin: "0 auto", padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
        {(phase === "starting" || phase === "scanning") && (
          <div style={{ position: "relative", borderRadius: 16, overflow: "hidden", background: "#000", aspectRatio: "3 / 4" }}>
            <video ref={videoRef} playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            <div style={{
              position: "absolute", inset: "14% 10%", border: "3px solid rgba(255,255,255,.9)", borderRadius: 20,
              boxShadow: "0 0 0 999px rgba(0,0,0,.4)",
            }} />
            {phase === "starting" && (
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 13 }}>
                Starting camera…
              </div>
            )}
            {phase === "scanning" && (
              <div style={{ position: "absolute", bottom: 16, left: 0, right: 0, textAlign: "center", color: "#fff", fontSize: 12.5, fontWeight: 600, textShadow: "0 1px 3px rgba(0,0,0,.5)" }}>
                Point the camera at a student or teacher ID card
              </div>
            )}
          </div>
        )}
        <canvas ref={canvasRef} style={{ display: "none" }} />

        {phase === "loading" && (
          <div className="card" style={{ textAlign: "center", padding: 40, color: "var(--ink3)" }}>Looking up…</div>
        )}

        {phase === "error" && (
          <div className="card" style={{ textAlign: "center", padding: 32 }}>
            <div style={{ color: "var(--rb)", fontSize: 13.5, marginBottom: 16, lineHeight: 1.5 }}>{errorMsg}</div>
            <button className="btn btn-p btn-sm" onClick={startCamera}>Try again</button>
          </div>
        )}

        {phase === "result" && result && <ResultCard result={result} onRescan={startCamera} />}
      </div>
    </div>
  );
}

function ResultCard({ result, onRescan }: { result: ScanResult; onRescan: () => void }) {
  const initials = (n: string) => n.trim().split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ padding: "20px 20px 16px", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid var(--ln)" }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12, background: "var(--tc-l)", color: "var(--tc-d)",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, flexShrink: 0,
        }}>
          {initials(result.name)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)" }}>{result.name}</div>
          <div style={{ fontSize: 12.5, color: "var(--ink3)" }}>
            {result.kind === "student" ? result.batch_code : result.subject || "Teacher"}
            {!result.is_active && <span className="bdg b-over" style={{ marginLeft: 6 }}>Inactive</span>}
          </div>
        </div>
        <Link href={result.kind === "student" ? `/students/${result.id}` : `/teachers/${result.id}`} className="btn btn-s btn-xs">
          Full profile
        </Link>
      </div>

      <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
        {result.kind === "student" ? (
          <>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 8 }}>
                Attendance — last {result.attendance.window_days} days
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span style={{ fontSize: 26, fontWeight: 800, color: "var(--ink)" }}>{result.attendance.rate_pct}%</span>
                <span style={{ fontSize: 12.5, color: "var(--ink3)" }}>{result.attendance.present} / {result.attendance.total} present</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 8 }}>
                Fees — {result.fees.year}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, marginBottom: 4 }}>
                <span style={{ color: "var(--ink3)" }}>Paid</span>
                <span style={{ fontWeight: 700, color: "var(--ink)" }}>{fmt(result.fees.paid_total)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, marginBottom: 8 }}>
                <span style={{ color: "var(--ink3)" }}>Pending ({result.fees.pending_count})</span>
                <span style={{ fontWeight: 700, color: result.fees.pending_total > 0 ? "var(--rb)" : "var(--ink)" }}>{fmt(result.fees.pending_total)}</span>
              </div>
              {result.fees.status === "cleared"
                ? <span className="bdg b-paid">Fees cleared</span>
                : <span className="bdg b-over">Has dues</span>}
            </div>
            <div style={{ fontSize: 12.5, color: "var(--ink3)", paddingTop: 4, borderTop: "1px solid var(--ln)" }}>
              Parent: {result.parent_name || "—"} · {result.parent_mobile || "—"}
            </div>
          </>
        ) : (
          <>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 8 }}>
                Salary — last {result.payments.window_days} days
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, marginBottom: 4 }}>
                <span style={{ color: "var(--ink3)" }}>Paid</span>
                <span style={{ fontWeight: 700, color: "var(--ink)" }}>{fmt(result.payments.paid_total)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, marginBottom: 8 }}>
                <span style={{ color: "var(--ink3)" }}>Pending ({result.payments.pending_count})</span>
                <span style={{ fontWeight: 700, color: result.payments.pending_total > 0 ? "var(--rb)" : "var(--ink)" }}>{fmt(result.payments.pending_total)}</span>
              </div>
              {result.payments.status === "cleared"
                ? <span className="bdg b-paid">Fully paid</span>
                : <span className="bdg b-over">Has dues</span>}
            </div>
            <div style={{ fontSize: 13.5, color: "var(--ink2)" }}>
              Monthly salary: <strong>{fmt(result.monthly_salary)}</strong>
            </div>
            <div style={{ fontSize: 12.5, color: "var(--ink3)", paddingTop: 4, borderTop: "1px solid var(--ln)" }}>
              {result.mobile || "—"} {result.email && `· ${result.email}`}
            </div>
          </>
        )}
      </div>

      <div style={{ padding: "0 20px 20px" }}>
        <button className="btn btn-p btn-sm" style={{ width: "100%" }} onClick={onRescan}>Scan another</button>
      </div>
    </div>
  );
}
