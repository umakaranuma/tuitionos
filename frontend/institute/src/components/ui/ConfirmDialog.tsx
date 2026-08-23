"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type ConfirmOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
};

type ConfirmApi = (options: ConfirmOptions | string) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmApi | null>(null);

function WarnIcon({ danger }: { danger?: boolean }) {
  const color = danger ? "var(--rb)" : "var(--tc)";
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      {danger ? (
        <>
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
          <path d="M10.29 3.86 1.82 18a1.5 1.5 0 0 0 1.29 2.25h17.78A1.5 1.5 0 0 0 22.18 18L13.71 3.86a1.5 1.5 0 0 0-2.58 0Z" />
        </>
      ) : (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v4" />
          <path d="M12 16h.01" />
        </>
      )}
    </svg>
  );
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [state, setState] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!state) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") settle(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const settle = useCallback((result: boolean) => {
    resolver.current?.(result);
    resolver.current = null;
    setState(null);
  }, []);

  const confirm = useCallback<ConfirmApi>((options) => {
    const opts = typeof options === "string" ? { message: options } : options;
    setState(opts);
    return new Promise<boolean>((resolve) => { resolver.current = resolve; });
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {mounted && state && createPortal(
        <div className="modal-backdrop" style={{ zIndex: 10000 }} onClick={() => settle(false)}>
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: "#fff", border: "1px solid var(--ln)", borderRadius: 20,
              width: 380, maxWidth: "calc(100vw - 32px)",
              boxShadow: "0 24px 64px -12px rgba(0,0,0,.16)",
              animation: "modalIn 200ms cubic-bezier(.16,1,.3,1)",
              padding: "28px 28px 24px",
              display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 6,
            }}
          >
            <div style={{
              width: 44, height: 44, borderRadius: "50%",
              background: state.danger ? "var(--rb-l)" : "var(--tc-l)",
              display: "flex", alignItems: "center", justifyContent: "center",
              marginBottom: 6,
            }}>
              <WarnIcon danger={state.danger} />
            </div>

            <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 17, letterSpacing: "-.02em", color: "var(--ink)" }}>
              {state.title || "Are you sure?"}
            </div>
            <div style={{ fontSize: 13.5, lineHeight: 1.55, color: "var(--ink3)", padding: "2px 4px 4px" }}>
              {state.message}
            </div>

            <div style={{ display: "flex", gap: 10, width: "100%", marginTop: 18 }}>
              <button className="btn btn-s btn-sm" style={{ flex: 1 }} onClick={() => settle(false)}>
                {state.cancelLabel || "Cancel"}
              </button>
              <button className={`btn btn-sm ${state.danger ? "btn-d" : "btn-p"}`} style={{ flex: 1 }} onClick={() => settle(true)} autoFocus>
                {state.confirmLabel || "Confirm"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmApi {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    // Fail soft if provider missing — behaves like a no-op cancel rather than crashing.
    return async () => { console.warn("[confirm] ConfirmProvider missing"); return false; };
  }
  return ctx;
}
