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
        <div className="toast-stack">
          {toasts.map(t => (
            <div key={t.id} className="toast-item" style={{ borderLeft: `4px solid ${ACCENT[t.type]}` }}>
              <div style={{ marginTop: 2 }}><Icon type={t.type} /></div>
              <div style={{ flex: 1 }}>
                <div className="toast-title">{TITLE[t.type]}</div>
                <div className="toast-msg">{t.message}</div>
              </div>
              <button onClick={() => dismiss(t.id)} aria-label="Dismiss" style={{
                background: "none", border: "none", cursor: "pointer", color: "var(--ink3)",
                fontSize: 18, lineHeight: 1, padding: 0, marginTop: -2, flexShrink: 0,
              }}>×</button>
            </div>
          ))}
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
