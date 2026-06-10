"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { api } from "@/lib/api";

export type AlertType = "error" | "warn" | "upgrade" | "downgrade" | "info" | "success";

export type AlertItem = {
  id: number;
  kind: string;
  severity: AlertType;
  title: string;
  sub: string;
  /** Absolute ISO timestamp from the server. */
  createdAt: string;
  read: boolean;
  // Derived visual tokens (kept for compatibility with the existing icon + card UI).
  color: string;
  bg: string;
  stroke: string;
  type: AlertType;
  time: string; // legacy
  actions: { label: string; cls: string }[];
};

type ApiNotification = {
  id: number;
  kind: string;
  severity: AlertType;
  title: string;
  sub: string;
  institute_id: number | null;
  payload: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
};

type RecentResponse = {
  results: ApiNotification[];
  unread_count: number;
  has_older: boolean;
  older_count: number;
  recent_days: number;
};

type OlderResponse = {
  results: ApiNotification[];
  page: number;
  total_pages: number;
  total_count: number;
  has_next: boolean;
};

// Map server severity to the existing color tokens.
const TOKENS: Record<AlertType, { color: string; bg: string; stroke: string; type: AlertType }> = {
  error:     { color: "var(--rb)", bg: "var(--rb-l)", stroke: "var(--rb)", type: "error" },
  warn:      { color: "var(--sf)", bg: "var(--sf-l)", stroke: "var(--sf)", type: "warn" },
  upgrade:   { color: "var(--ac)", bg: "var(--ac-l)", stroke: "var(--ac)", type: "upgrade" },
  downgrade: { color: "var(--sp)", bg: "var(--sp-l)", stroke: "var(--sp)", type: "downgrade" },
  info:      { color: "var(--sp)", bg: "var(--sp-l)", stroke: "var(--sp)", type: "info" },
  success:   { color: "var(--jd)", bg: "var(--jd-l)", stroke: "var(--jd)", type: "success" },
};

function adapt(n: ApiNotification): AlertItem {
  const tk = TOKENS[n.severity] || TOKENS.info;
  return {
    id: n.id,
    kind: n.kind,
    severity: n.severity,
    title: n.title,
    sub: n.sub,
    createdAt: n.created_at,
    read: n.is_read,
    ...tk,
    time: relativeTime(n.created_at),
    actions: [],
  };
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

/** Absolute, human-friendly date label per card. */
export function absoluteDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

/** Used by the recent-section grouping (Today / Yesterday / Last week / Earlier). */
function dayBucket(iso: string): "today" | "yesterday" | "last_week" | "earlier" {
  const t = new Date(iso); t.setHours(0, 0, 0, 0);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const days = Math.round((today.getTime() - t.getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days <= 7) return "last_week";
  return "earlier";
}

export function groupRecentByBucket(items: AlertItem[]): { label: string; items: AlertItem[] }[] {
  const order = ["today", "yesterday", "last_week", "earlier"] as const;
  const labels = { today: "Today", yesterday: "Yesterday", last_week: "Last week", earlier: "Earlier" };
  const grouped = new Map<string, AlertItem[]>();
  for (const a of items) {
    const k = dayBucket(a.createdAt);
    if (!grouped.has(k)) grouped.set(k, []);
    grouped.get(k)!.push(a);
  }
  return order
    .filter(k => grouped.has(k))
    .map(k => ({ label: labels[k], items: grouped.get(k)! }));
}

/** Older entries — group by exact calendar date (newest first). */
export function groupOlderByDate(items: AlertItem[]): { label: string; items: AlertItem[] }[] {
  const groups = new Map<string, AlertItem[]>();
  for (const a of items) {
    const d = new Date(a.createdAt);
    const key = d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" });
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(a);
  }
  return Array.from(groups.entries()).map(([label, items]) => ({ label, items }));
}

type StoreApi = {
  alerts: AlertItem[];      // recent items only (≤14d)
  olderAlerts: AlertItem[]; // loaded older history (paginated)
  unreadCount: number;
  hasOlder: boolean;
  olderTotal: number;
  loading: boolean;
  loadingOlder: boolean;
  hasMoreOlder: boolean;
  loadOlder: () => Promise<void>;
  refresh: () => Promise<void>;
  markRead: (id: number) => Promise<void>;
  markAllRead: () => Promise<void>;
  dismiss: (id: number) => Promise<void>;
  relative: (iso: string) => string;
  absolute: (iso: string) => string;
};

const NotificationsContext = createContext<StoreApi | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [olderAlerts, setOlderAlerts] = useState<AlertItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasOlder, setHasOlder] = useState(false);
  const [olderTotal, setOlderTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [olderPage, setOlderPage] = useState(0);
  const [olderTotalPages, setOlderTotalPages] = useState(0);

  // Load only the recent window (last 14d) on mount.
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get<RecentResponse>("/api/admin/notifications/recent");
      setAlerts(r.data.results.map(adapt));
      setUnreadCount(r.data.unread_count);
      setHasOlder(r.data.has_older);
      setOlderTotal(r.data.older_count);
    } catch { /* leave empty */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const loadOlder = useCallback(async () => {
    if (loadingOlder) return;
    const nextPage = olderPage + 1;
    if (olderTotalPages > 0 && nextPage > olderTotalPages) return;
    setLoadingOlder(true);
    try {
      const r = await api.get<OlderResponse>(`/api/admin/notifications/older?page=${nextPage}&limit=20`);
      setOlderAlerts(prev => [...prev, ...r.data.results.map(adapt)]);
      setOlderPage(r.data.page);
      setOlderTotalPages(r.data.total_pages);
    } catch { /* keep current page */ }
    finally { setLoadingOlder(false); }
  }, [olderPage, olderTotalPages, loadingOlder]);

  const hasMoreOlder = useMemo(() => {
    if (olderPage === 0) return hasOlder;
    return olderPage < olderTotalPages;
  }, [olderPage, olderTotalPages, hasOlder]);

  const markRead = useCallback(async (id: number) => {
    try { await api.post(`/api/admin/notifications/${id}/read`); } catch {}
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, read: true } : a));
    setOlderAlerts(prev => prev.map(a => a.id === id ? { ...a, read: true } : a));
    setUnreadCount(c => Math.max(0, c - 1));
  }, []);

  const markAllRead = useCallback(async () => {
    try { await api.post(`/api/admin/notifications/mark_all_read`); } catch {}
    setAlerts(prev => prev.map(a => ({ ...a, read: true })));
    setOlderAlerts(prev => prev.map(a => ({ ...a, read: true })));
    setUnreadCount(0);
  }, []);

  const dismiss = useCallback(async (id: number) => {
    try { await api.post(`/api/admin/notifications/${id}/dismiss`); } catch {}
    setAlerts(prev => prev.filter(a => a.id !== id));
    setOlderAlerts(prev => prev.filter(a => a.id !== id));
  }, []);

  const value: StoreApi = {
    alerts, olderAlerts, unreadCount, hasOlder, olderTotal,
    loading, loadingOlder, hasMoreOlder, loadOlder, refresh,
    markRead, markAllRead, dismiss,
    relative: relativeTime, absolute: absoluteDate,
  };
  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications(): StoreApi {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    // Safe defaults — no-ops when used outside the provider.
    return {
      alerts: [], olderAlerts: [], unreadCount: 0, hasOlder: false, olderTotal: 0,
      loading: false, loadingOlder: false, hasMoreOlder: false,
      loadOlder: async () => {}, refresh: async () => {},
      markRead: async () => {}, markAllRead: async () => {}, dismiss: async () => {},
      relative: relativeTime, absolute: absoluteDate,
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
  if (type === "upgrade" || type === "success") return (
    <svg {...common}><path d="M7.5 11V4M4.5 7l3-3 3 3"/><circle cx="7.5" cy="7.5" r="6"/></svg>
  );
  if (type === "downgrade") return (
    <svg {...common}><path d="M7.5 4v7M4.5 8l3 3 3-3"/><circle cx="7.5" cy="7.5" r="6"/></svg>
  );
  return (
    <svg {...common}><circle cx="7.5" cy="7.5" r="6"/><path d="M7.5 6.5v4M7.5 5h.01"/></svg>
  );
}
