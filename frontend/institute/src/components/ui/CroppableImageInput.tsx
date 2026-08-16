"use client";
import { useEffect, useRef, useState } from "react";
import { ImageCropModal } from "./ImageCropModal";

type Props = {
  /** Current image URL — the already-saved photo when editing, or null/empty for a fresh add. */
  value?: string | null;
  /** Fires once with the final, already-cropped File when the user confirms. */
  onChange: (file: File) => void;
  aspect?: number;
  /** Circular crop + circular preview (avatars/logos) vs a rounded-square crop (photos). */
  round?: boolean;
  variant?: "circle" | "dropzone";
  size?: number;
  name?: string;
  hint?: string;
};

const initialOf = (n: string) => (n.trim()[0] || "?").toUpperCase();

/**
 * One upload control used everywhere a photo gets attached to a record —
 * picking a file always routes through the crop step first (WhatsApp-style
 * frame-before-you-send), so nothing ever gets uploaded raw/unframed.
 */
export function CroppableImageInput({ value, onChange, aspect = 1, round = false, variant = "dropzone", size = 56, name = "", hint = "Click to upload a photo" }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(value ?? null);

  // Follow the parent's value when it actually changes (e.g. opening a
  // different record to edit) — local crop confirmations set `preview`
  // directly and aren't affected by this, since `value` itself doesn't
  // change until the parent saves and re-fetches.
  useEffect(() => setPreview(value ?? null), [value]);

  const pickFile = () => inputRef.current?.click();

  const onFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the exact same file later
    if (f) setPendingFile(f);
  };

  const onCropConfirm = (croppedFile: File) => {
    setPreview(URL.createObjectURL(croppedFile));
    setPendingFile(null);
    onChange(croppedFile);
  };

  return (
    <>
      <input ref={inputRef} type="file" accept="image/*" onChange={onFileSelected} style={{ display: "none" }} />

      {variant === "circle" ? (
        <div onClick={pickFile} style={{ cursor: "pointer", position: "relative", flexShrink: 0, width: size, height: size }}>
          <div style={{
            width: size, height: size, borderRadius: round ? "50%" : size * 0.22, overflow: "hidden",
            background: "var(--tc-l)", display: "flex", alignItems: "center", justifyContent: "center",
            border: "1px solid var(--ln)",
          }}>
            {preview
              ? <img src={preview} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <span style={{ fontSize: size * 0.35, fontWeight: 800, color: "var(--tc-d)" }}>{initialOf(name || "?")}</span>}
          </div>
          <div style={{
            position: "absolute", bottom: -4, right: -4, width: 20, height: 20, borderRadius: "50%",
            background: "var(--tc)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11,
          }}>✎</div>
        </div>
      ) : (
        <div
          onClick={pickFile}
          style={{
            border: "2px dashed var(--ln)", borderRadius: 12, padding: "20px",
            textAlign: "center", background: "var(--cr)", cursor: "pointer",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
          }}
        >
          {preview ? (
            <img src={preview} alt={name} style={{ width: 64, height: 64, borderRadius: round ? "50%" : 12, objectFit: "cover" }} />
          ) : (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--ink3)" strokeWidth="1.5">
              <rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="11" r="2" /><path d="M21 15l-4.5-4.5L9 18" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
          <div style={{ fontSize: 12.5, color: "var(--ink2)", fontWeight: 600 }}>{preview ? "Change photo" : hint}</div>
        </div>
      )}

      <ImageCropModal
        file={pendingFile}
        aspect={aspect}
        round={round}
        onCancel={() => setPendingFile(null)}
        onConfirm={onCropConfirm}
      />
    </>
  );
}
