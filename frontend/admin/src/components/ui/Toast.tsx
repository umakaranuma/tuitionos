import { useEffect } from "react";
import { createPortal } from "react-dom";

export function Toast({ open, message, type, onClose }: { open: boolean, message: string, type: "success"|"error", onClose: () => void }) {
  useEffect(() => {
    if (open) {
      const timer = setTimeout(onClose, 4000);
      return () => clearTimeout(timer);
    }
  }, [open, onClose]);

  if (!open) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 99999,
      background: "#fff", borderRadius: 12, padding: "16px 20px",
      boxShadow: "0 12px 32px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.06)",
      display: "flex", alignItems: "center", gap: 12, minWidth: 280,
      border: `1px solid ${type === "error" ? "var(--rb)" : "var(--ln)"}`,
      borderLeft: `4px solid ${type === "error" ? "var(--rb)" : "var(--tc)"}`,
      animation: "toast-in 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
    }}>
      {type === "success" ? (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--tc)" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
      ) : (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--rb)" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      )}
      <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{message}</div>
      <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink3)", fontSize: 18, lineHeight: 1 }}>×</button>
      <style>{`
        @keyframes toast-in {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>,
    document.body
  );
}
