// Shared notification/alert source used by both the top-bar notification
// popup and the Alerts screen so the count and contents always match.

export type AlertType = "error" | "warn" | "upgrade" | "downgrade" | "info";

export type AlertItem = {
  id: number;
  color: string;
  bg: string;
  stroke: string;
  type: AlertType;
  title: string;
  sub: string;
  time: string;
  actions: { label: string; cls: string }[];
};

export const ALERTS: AlertItem[] = [
  {
    id: 1, color: "var(--rb)", bg: "var(--rb-l)", stroke: "var(--rb)", type: "error",
    title: "Edu Leaders — 14 days overdue",
    sub: "LKR 3,000 · Basic · +94 771 234 567",
    time: "2h ago",
    actions: [
      { label: "Mark paid", cls: "btn-ok" },
      { label: "Suspend", cls: "btn-d" },
    ],
  },
  {
    id: 2, color: "var(--sf)", bg: "var(--sf-l)", stroke: "var(--sf)", type: "warn",
    title: "Bright Minds — due today",
    sub: "LKR 3,000 · Basic · #INV-0079",
    time: "5h ago",
    actions: [
      { label: "Mark paid", cls: "btn-ok" },
      { label: "Send reminder", cls: "btn-s" },
    ],
  },
  {
    id: 5, color: "var(--ac)", bg: "var(--ac-l)", stroke: "var(--ac)", type: "upgrade",
    title: "Mathura Edu — upgrade request",
    sub: "Basic → Premium · LKR 3,000 → 6,000/mo · Requested 2h ago",
    time: "2h ago",
    actions: [
      { label: "Approve upgrade", cls: "btn-ok" },
      { label: "Contact institute", cls: "btn-s" },
    ],
  },
  {
    id: 6, color: "var(--sp)", bg: "var(--sp-l)", stroke: "var(--sp)", type: "downgrade",
    title: "Vision Academy — downgrade request",
    sub: "Premium → Basic · Effective May 1, 2026 · 280 students (over Basic limit)",
    time: "1d ago",
    actions: [
      { label: "Approve downgrade", cls: "btn-s" },
      { label: "Contact institute", cls: "btn-s" },
      { label: "Reject", cls: "btn-d" },
    ],
  },
  {
    id: 3, color: "var(--sp)", bg: "var(--sp-l)", stroke: "var(--sp)", type: "info",
    title: "Alpha Lanka — trial ends in 3 days",
    sub: "Basic trial · admin@alphalanka.lk",
    time: "1d ago",
    actions: [
      { label: "Send upgrade nudge", cls: "btn-p" },
      { label: "End trial", cls: "btn-d" },
    ],
  },
  {
    id: 4, color: "var(--rb)", bg: "var(--rb-l)", stroke: "var(--rb)", type: "error",
    title: "Glow Institute — 7 days overdue",
    sub: "LKR 3,000 · Basic · +94 778 876 543",
    time: "2d ago",
    actions: [
      { label: "Mark paid", cls: "btn-ok" },
      { label: "Suspend", cls: "btn-d" },
    ],
  },
];

export function AlertIcon({ type, stroke, size = 15 }: { type: AlertType; stroke: string; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 15 15", fill: "none", stroke, strokeWidth: 1.75 };
  if (type === "error") return (
    <svg {...common}><circle cx="7.5" cy="7.5" r="6"/><path d="M7.5 4.5v4M7.5 10.5h.01"/></svg>
  );
  if (type === "warn") return (
    <svg {...common}><path d="M7.5 2L1 13h13L7.5 2zM7.5 6v4M7.5 11.5h.01"/></svg>
  );
  if (type === "upgrade") return (
    <svg {...common}><path d="M7.5 11V4M4.5 7l3-3 3 3"/><circle cx="7.5" cy="7.5" r="6"/></svg>
  );
  if (type === "downgrade") return (
    <svg {...common}><path d="M7.5 4v7M4.5 8l3 3 3-3"/><circle cx="7.5" cy="7.5" r="6"/></svg>
  );
  return (
    <svg {...common}><circle cx="7.5" cy="7.5" r="6"/><path d="M7.5 6.5v4M7.5 5h.01"/></svg>
  );
}
