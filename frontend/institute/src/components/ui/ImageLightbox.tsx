"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type Props = {
  src: string | null;
  alt?: string;
  onClose: () => void;
};

/** Click-to-expand full view of a photo — dims everything else, shows the
 * image at its natural size (capped to the viewport), closes on backdrop
 * click, the × button, or Escape. */
export function ImageLightbox({ src, alt = "", onClose }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!src) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [src, onClose]);

  if (!mounted || !src) return null;

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 10002, background: "rgba(10,10,14,.92)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 32,
        animation: "fadeIn 120ms ease-out", cursor: "zoom-out",
      }}
    >
      <button
        onClick={onClose}
        aria-label="Close"
        style={{
          position: "absolute", top: 18, right: 18, width: 36, height: 36, borderRadius: "50%",
          background: "rgba(255,255,255,.12)", border: "none", color: "#fff", fontSize: 18,
          display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
        }}
      >
        ×
      </button>
      <img
        src={src}
        alt={alt}
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: "min(90vw, 640px)", maxHeight: "85vh", borderRadius: 12, boxShadow: "0 24px 64px -12px rgba(0,0,0,.5)", cursor: "default" }}
      />
    </div>,
    document.body
  );
}
