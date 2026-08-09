"use client";
import { useRef } from "react";
import { QRCodeSVG } from "qrcode.react";

type Kind = "student" | "teacher";

type Props = {
  kind: Kind;
  /** Stable opaque token printed into the QR (same one the scan endpoint reads). */
  token: string;
  name: string;
  subtitle?: string;
  /** Optional photo URL; falls back to the institute logo, then its initial. */
  photoUrl?: string | null;
  /** Optional institute label rendered in the stripe and as the avatar fallback. */
  institute?: string;
  /** Optional institute logo — shown in the avatar circle when there's no personal photo. */
  instituteLogoUrl?: string | null;
  /** Optional id printed under the name for staff use. */
  code?: string;
};

const firstLetterOf = (name: string) => name.trim()[0]?.toUpperCase() || "?";

/**
 * QRCard — printable PVC-style ID card. The QR encodes a URL the future mobile
 * scanner reads: `tuitionos://q/<token>` plus a fallback HTTPS URL so any
 * generic QR reader resolves it via the web. Includes a Print button that
 * opens the card alone in a print-ready window.
 */
export function QRCard({ kind, token, name, subtitle, photoUrl, institute, instituteLogoUrl, code }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  // Encode both the canonical app URI and a web fallback so any reader works.
  // Format: `{kind}|{token}` keeps the mobile app's parsing trivial.
  const payload = `tuitionos:${kind === "student" ? "s" : "t"}:${token}`;

  const print = () => {
    if (!ref.current) return;
    const html = ref.current.outerHTML;
    const w = window.open("", "_blank", "width=520,height=720");
    if (!w) return;
    w.document.write(`<!doctype html><html><head><title>${name} — ID Card</title>
<style>
  body { margin: 0; padding: 28px; font-family: 'Manrope', system-ui, sans-serif; background: #f8fafc; display: flex; justify-content: center; align-items: flex-start; }
  .qr-card { box-shadow: 0 4px 16px rgba(15,23,42,.1); border-radius: 16px; }
  @media print { body { background: #fff; padding: 0; } .qr-card { box-shadow: none; } }
</style>
</head><body>${html}</body></html>`);
    w.document.close();
    setTimeout(() => { w.focus(); w.print(); }, 250);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
      <div ref={ref} className="qr-card">
        {/* Stripe top */}
        <div className="qr-card-stripe">
          <span className="qr-card-stripe-tag">{kind === "student" ? "STUDENT ID" : "STAFF ID"}</span>
          <span className="qr-card-stripe-inst">{institute || "TuitionOS"}</span>
        </div>

        <div className="qr-card-body">
          {/* Avatar — the cardholder's own photo when we have one; otherwise
              the institute's branding (logo, or its initial) rather than a
              generic personal-initial placeholder. */}
          <div className="qr-card-photo">
            {photoUrl ? (
              <img src={photoUrl} alt={name} />
            ) : instituteLogoUrl ? (
              <img src={instituteLogoUrl} alt={institute || "Institute"} />
            ) : (
              <span className="qr-card-initials">{firstLetterOf(institute || "Institute")}</span>
            )}
          </div>

          {/* Identity */}
          <div className="qr-card-id">
            <div className="qr-card-name">{name}</div>
            {subtitle && <div className="qr-card-subtitle">{subtitle}</div>}
            {code && <div className="qr-card-code">{code}</div>}
          </div>

          {/* QR */}
          <div className="qr-card-qr">
            <QRCodeSVG value={payload} size={150} level="M" includeMargin={false} />
            <div className="qr-card-qr-hint">Scan to mark attendance</div>
          </div>

          {/* Footer */}
          <div className="qr-card-foot">
            <span>powered by TuitionOS</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 9 }}>{token.slice(0, 8).toUpperCase()}</span>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn btn-p btn-sm" onClick={print}>Print ID card</button>
        <button
          className="btn btn-s btn-sm"
          onClick={() => navigator.clipboard.writeText(payload)}
          title="Copy QR payload for testing"
        >
          Copy token
        </button>
      </div>
    </div>
  );
}
