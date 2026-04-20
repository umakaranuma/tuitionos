"use client";
import { useEffect } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  wide?: boolean;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function Modal({ open, onClose, title, wide, children, footer }: ModalProps) {
  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className={`modal-box${wide ? " wide" : ""}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-hdr">
          <span className="modal-title">{title}</span>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        {/* Body */}
        <div className="modal-body">{children}</div>

        {/* Footer */}
        {footer && <div className="modal-ftr">{footer}</div>}
      </div>
    </div>
  );
}
