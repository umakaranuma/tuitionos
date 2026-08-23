type Props = {
  src?: string | null;
  name: string;
  size?: number;
  bg?: string;
  fg?: string;
  radius?: number;
  className?: string;
  /** When given (and there's a real photo), the image becomes clickable —
      e.g. to open it in a full-size lightbox. Initials-only fallbacks are
      never clickable, since there's nothing to expand. */
  onClick?: () => void;
};

const initialsOf = (n: string) =>
  (n || "?").trim().split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase() || "?";

/**
 * Shows the uploaded photo when there is one, otherwise falls back to a
 * colored initials circle — the same fallback every list in the app used
 * before any entity actually had a photo field.
 */
export function Avatar({ src, name, size = 32, bg = "var(--tc-l)", fg = "var(--tc-d)", radius, className, onClick }: Props) {
  const style = {
    width: size, height: size, borderRadius: radius ?? size * 0.28,
    flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: size * 0.4, fontWeight: 700, overflow: "hidden",
  };
  if (src) {
    return (
      <div
        className={className}
        onClick={onClick}
        style={{ ...style, background: "var(--cr-d)", cursor: onClick ? "zoom-in" : undefined }}
      >
        <img src={src} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
    );
  }
  return (
    <div className={className} style={{ ...style, background: bg, color: fg }}>
      {initialsOf(name)}
    </div>
  );
}
