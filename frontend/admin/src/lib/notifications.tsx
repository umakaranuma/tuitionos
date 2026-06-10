"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";

export type AlertType = "error" | "warn" | "upgrade" | "downgrade" | "info";

export type AlertItem = {
  id: number;
  color: string;
  bg: string;
  stroke: string;
  type: AlertType;
  title: string;
  sub: string;
  /** Absolute ISO timestamp — used for grouping by date + showing a relative label. */
  createdAt: string;
  read: boolean;
  actions: { label: string; cls: string }[];
};

// Build seed timestamps relative to "now" so the demo data feels live.
const hAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();
const dAgo = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString();

const SEED: AlertItem[] = [
  {
    id: 1, color: "var(--rb)", bg: "var(--rb-l)", stroke: "var(--rb)", type: "error",
    title: "Edu Leaders — 14 days overdue",
    sub: "LKR 3,000 · Basic · +94 771 234 567",
    createdAt: hAgo(2), read: false,
    actions: [{ label: "Mark paid", cls: "btn-ok" }, { label: "Suspend", cls: "btn-d" }],
  },
  {
    id: 2, color: "var(--sf)", bg: "var(--sf-l)", stroke: "var(--sf)", type: "warn",
    title: "Bright Minds — due today",
    sub: "LKR 3,000 · Basic · #INV-0079",
    createdAt: hAgo(5), read: false,
    actions: [{ label: "Mark paid", cls: "btn-ok" }, { label: "Send reminder", cls: "btn-s" }],
  },
  {
    id: 5, color: "var(--ac)", bg: "var(--ac-l)", stroke: "var(--ac)", type: "upgrade",
    title: "Mathura Edu — upgrade request",
    sub: "Basic → Premium · LKR 3,000 → 6,000/mo · Requested 2h ago",
    createdAt: hAgo(2), read: false,
    actions: [{ label: "Approve upgrade", cls: "btn-ok" }, { label: "Contact institute", cls: "btn-s" }],
  },
  {
    id: 6, color: "var(--sp)", bg: "var(--sp-l)", stroke: "var(--sp)", type: "downgrade",
    title: "Vision Academy — downgrade request",
    sub: "Premium → Basic · Effective May 1, 2026 · 280 students (over Basic limit)",
    createdAt: dAgo(1), read: false,
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
    createdAt: dAgo(1), read: false,
    actions: [{ label: "Send upgrade nudge", cls: "btn-p" }, { label: "End trial", cls: "btn-d" }],
  },
  {
    id: 4, color: "var(--rb)", bg: "var(--rb-l)", stroke: "var(--rb)", type: "error",
    title: "Glow Institute — 7 days overdue",
    sub: "LKR 3,000 · Basic · +94 778 876 543",
    createdAt: dAgo(2), read: false,
    actions: [{ label: "Mark paid", cls: "btn-ok" }, { label: "Suspend", cls: "btn-d" }],
  },
];

type StoreApi = {
  alerts: AlertItem[];
  unreadCount: number;
  markRead: (id: number) => void;
  markAllRead: () => void;
  dismiss: (id: number) => void;
  /** Human-friendly relative label ("2h ago", "yesterday", "Mon, 12 May"). */
  relative: (iso: string) => string;
};

const NotificationsContext = createContext<StoreApi | null>(null);

const LS_READ = "tos.notif.read";
const LS_DISMISSED = "tos.notif.dismissed";

function readIdSet(key: string): Set<number> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return new Set();
    return new Set((JSON.parse(raw) as number[]).filter(n => typeof n === "number"));
  } catch { return new Set(); }
}
function writeIdSet(key: string, set: Set<number>) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(key, JSON.stringify(Array.from(set))); } catch {}
}

export function relativeTime(iso: string): string {
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  // Hydrate after mount so server/client render the same first paint, then load
  // the persisted read/dismissed state from localStorage.
  const [hydrated, setHydrated] = useState(false);
  const [readIds, setReadIds] = useState<Set<number>>(new Set());
  const [dismissedIds, setDismissedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    setReadIds(readIdSet(LS_READ));
    setDismissedIds(readIdSet(LS_DISMISSED));
    setHydrated(true);
  }, []);

  const alerts = useMemo(() => {
    return SEED
      .filter(a => !dismissedIds.has(a.id))
      .map(a => ({ ...a, read: readIds.has(a.id) }))
      // Newest first.
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [readIds, dismissedIds]);

  const markRead = useCallback((id: number) => {
    setReadIds(prev => {
      if (prev.has(id)) return prev;
      const next = new Set(prev); next.add(id); writeIdSet(LS_READ, next); return next;
    });
  }, []);
  const markAllRead = useCallback(() => {
    const all = new Set<number>(SEED.map(a => a.id));
    setReadIds(all); writeIdSet(LS_READ, all);
  }, []);
  const dismiss = useCallback((id: number) => {
    setDismissedIds(prev => {
      const next = new Set(prev); next.add(id); writeIdSet(LS_DISMISSED, next); return next;
    });
  }, []);

  // Unread count is zero until hydration completes — avoids hydration mismatch.
  const unreadCount = useMemo(
    () => (hydrated ? alerts.filter(a => !a.read).length : 0),
    [alerts, hydrated],
  );

  const value: StoreApi = { alerts, unreadCount, markRead, markAllRead, dismiss, relative: relativeTime };
  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications(): StoreApi {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    return {
      alerts: SEED, unreadCount: 0,
      markRead: () => {}, markAllRead: () => {}, dismiss: () => {},
      relative: relativeTime,
    };
  }
  return ctx;
}

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

/** Group alerts into Today / Yesterday / This week / older (by exact date). */
export function groupByDate(items: AlertItem[]): { label: string; items: AlertItem[] }[] {
  const groups = new Map<string, AlertItem[]>();
  const labelFor = (iso: string): string => {
    const t = new Date(iso);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const d = new Date(t); d.setHours(0, 0, 0, 0);
    const diffDays = Math.round((today.getTime() - d.getTime()) / 86_400_000);
    if (diffDays <= 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return "Earlier this week";
    return t.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
  };
  for (const a of items) {
    const k = labelFor(a.createdAt);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(a);
  }
  return Array.from(groups.entries()).map(([label, items]) => ({ label, items }));
}
