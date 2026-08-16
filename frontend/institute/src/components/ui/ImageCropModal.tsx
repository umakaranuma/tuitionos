"use client";
import { useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import Cropper, { Area } from "react-easy-crop";
import { cropImageToFile } from "@/lib/cropImage";

type Props = {
  file: File | null;
  aspect?: number;
  round?: boolean;
  onCancel: () => void;
  onConfirm: (croppedFile: File) => void;
};

/** WhatsApp-style crop-before-you-send step: pick a photo, drag/pinch to
 * frame it, confirm — never uploads the raw, unframed original. Boxed as a
 * contained dialog (not a full-screen takeover) so it reads as part of the
 * form flow it belongs to. */
export function ImageCropModal({ file, aspect = 1, round = false, onCancel, onConfirm }: Props) {
  const [mounted, setMounted] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!file) { setImageUrl(null); return; }
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const onCropComplete = useCallback((_area: Area, pixels: Area) => setCroppedAreaPixels(pixels), []);

  const confirm = async () => {
    if (!file || !imageUrl || !croppedAreaPixels) return;
    setBusy(true);
    try {
      const cropped = await cropImageToFile(imageUrl, croppedAreaPixels, file.name);
      onConfirm(cropped);
    } finally {
      setBusy(false);
    }
  };

  if (!mounted || !file || !imageUrl) return null;

  return createPortal(
    <div className="modal-backdrop" style={{ zIndex: 10001 }} onClick={onCancel}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 400, maxWidth: "calc(100vw - 32px)", background: "#1c1c1e",
          borderRadius: 20, overflow: "hidden", boxShadow: "0 24px 64px -12px rgba(0,0,0,.45)",
          animation: "modalIn 200ms cubic-bezier(.16,1,.3,1)",
        }}
      >
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 14px", flexShrink: 0,
        }}>
          <button
            onClick={onCancel}
            style={{ background: "none", border: "none", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", padding: 6 }}
          >
            Cancel
          </button>
          <span style={{ color: "#fff", fontSize: 13, fontWeight: 700, opacity: 0.85 }}>Adjust photo</span>
          <button
            onClick={confirm}
            disabled={busy}
            style={{ background: "var(--tc)", border: "none", color: "#fff", fontSize: 13, fontWeight: 700, cursor: busy ? "default" : "pointer", padding: "6px 16px", borderRadius: 20, opacity: busy ? 0.6 : 1 }}
          >
            {busy ? "…" : "Done"}
          </button>
        </div>

        <div style={{ position: "relative", width: "100%", height: 340, background: "#000" }}>
          <Cropper
            image={imageUrl}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            cropShape={round ? "round" : "rect"}
            showGrid={!round}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        <div style={{ padding: "16px 22px 22px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="1.5" style={{ opacity: 0.6, flexShrink: 0 }}>
            <circle cx="7" cy="7" r="5.5" /><path d="M11 11l3.5 3.5" strokeLinecap="round" />
          </svg>
          <input
            type="range" min={1} max={3} step={0.01} value={zoom}
            onChange={e => setZoom(Number(e.target.value))}
            style={{ flex: 1, accentColor: "var(--tc)" }}
          />
          <svg width="17" height="17" viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="1.5" style={{ opacity: 0.9, flexShrink: 0 }}>
            <circle cx="7" cy="7" r="5.5" /><path d="M11 11l3.5 3.5" strokeLinecap="round" /><path d="M7 4.5v5M4.5 7h5" strokeLinecap="round" />
          </svg>
        </div>
      </div>
    </div>,
    document.body
  );
}
