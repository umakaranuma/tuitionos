export function getSubdomain(): string {
  if (typeof window === "undefined") return "";
  const parts = window.location.hostname.split(".");
  return parts.length >= 3 ? parts[0] : "";
}
