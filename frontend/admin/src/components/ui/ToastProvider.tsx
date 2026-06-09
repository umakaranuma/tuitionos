"use client";
import { createContext, useCallback, useContext, useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";

type ToastType = "success" | "error" | "info";
type ToastItem = { id: number; message: string; type: ToastType };

type ToastApi = {
  show: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

const ACCENT: Record<ToastType, string> = {
  success: "var(--jd)",
  error: "var(--rb)",
  info: "var(--tc)",
};

const TITLE: Record<ToastType, string> = {
  success: "Success",
  error: "Something went wrong",
  info: "Heads up",
};

function Icon({ type }: { type: ToastType }) {
  const color = ACCENT[type];
  if (type === "success") {
    return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>;
  }
  if (type === "error") {
    return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>;
  }
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12.01" y2="8" /><line x1="11" y1="12" x2="12" y2="12" /><line x1="12" y1="12" x2="12" y2="16" /></svg>;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [mounted, setMounted] = useState(false);
  const idRef = useRef(0);

  useEffect(() => { setMounted(true); }, []);

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const show = useCallback((message: string, type: ToastType = "info") => {
    const id = ++idRef.current;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => dismiss(id), 4000);
  }, [dismiss]);

  const api: ToastApi = {
    show,
    success: (m: string) => show(m, "success"),
    error: (m: string) => show(m, "error"),
    info: (m: string) => show(m, "info"),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      {mounted && createPortal(
        <div style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 99999,
          display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-end",
          pointerEvents: "none",
        }}>
          {toasts.map(t => (
            <div key={t.id} style={{
              pointerEvents: "auto",
              background: "#fff", borderRadius: 12, padding: "13px 16px",
              boxShadow: "0 12px 32px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.06)",
              display: "flex", alignItems: "flex-start", gap: 12, minWidth: 300, maxWidth: 420,
              border: "1px solid var(--ln)", borderLeft: `4px solid ${ACCENT[t.type]}`,
              animation: "toast-in 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
            }}>
              <div style={{ marginTop: 1 }}><Icon type={t.type} /></div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)", marginBottom: 1 }}>{TITLE[t.type]}</div>
                <div style={{ fontSize: 12.5, fontWeight: 500, color: "var(--ink2)", lineHeight: 1.4 }}>{t.message}</div>
              </div>
              <button onClick={() => dismiss(t.id)} aria-label="Dismiss" style={{
                background: "none", border: "none", cursor: "pointer", color: "var(--ink3)",
                fontSize: 18, lineHeight: 1, padding: 0, marginTop: -1,
              }}>×</button>
            </div>
          ))}
          <style>{`@keyframes toast-in { from { transform: translateX(110%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Fail soft if provider missing — avoids crashes, logs instead.
    return {
      show: (m: string) => console.warn("[toast]", m),
      success: (m: string) => console.warn("[toast:success]", m),
      error: (m: string) => console.warn("[toast:error]", m),
      info: (m: string) => console.warn("[toast:info]", m),
    };
  }
  return ctx;
}
