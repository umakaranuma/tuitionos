/**
 * TuitionOS — Shared Plan Configuration
 * 
 * This is the single source of truth for plan definitions.
 * In production, this data will come from the admin's `platform_settings` API.
 * For now, both admin and institute apps consume this mock data.
 */

export interface PlanFeature {
  id: string;
  label: string;
  category: "core" | "notifications" | "scheduling" | "advanced";
  basic: boolean;
  premium: boolean;
}

export interface PlanLimit {
  id: string;
  label: string;
  basic: string;
  premium: string;
}

export interface PlanDefinition {
  key: string;
  label: string;
  tagline: string;
  priceLKR: number;
  icon: string;          // emoji or icon id
  color: string;
  colorLight: string;
  supportLevel: string;
}

// ── PLAN DEFINITIONS ── //
export const PLAN_DEFINITIONS: Record<string, PlanDefinition> = {
  basic: {
    key: "basic",
    label: "Basic",
    tagline: "For getting started",
    priceLKR: 3000,
    icon: "grid",
    color: "#2a5fa8",
    colorLight: "#d8e6fa",
    supportLevel: "Email support — 72h response",
  },
  premium: {
    key: "premium",
    label: "Premium",
    tagline: "Full-powered management",
    priceLKR: 6000,
    icon: "star",
    color: "#9b5e35",
    colorLight: "#f0ddd0",
    supportLevel: "WhatsApp + email — 24h response",
  },
};

// ── PLAN FEATURES ── //
export const PLAN_FEATURES: PlanFeature[] = [
  // Core
  { id: "enrollment",     label: "Student enrollment & management",     category: "core",          basic: true,  premium: true },
  { id: "subjects",       label: "Subject & teacher management",        category: "core",          basic: true,  premium: true },
  { id: "batches",        label: "Batch creation & scheduling",         category: "core",          basic: true,  premium: true },
  { id: "attendance",     label: "Attendance tracking (per-subject)",   category: "core",          basic: true,  premium: true },
  { id: "fees",           label: "Fee collection, receipts & ledger",   category: "core",          basic: true,  premium: true },
  { id: "salary",         label: "Teacher salary management",           category: "core",          basic: true,  premium: true },
  { id: "accounts",       label: "Financial accounts dashboard",        category: "core",          basic: true,  premium: true },
  { id: "dashboard",      label: "Dashboard with KPIs & analytics",     category: "core",          basic: true,  premium: true },
  // Notifications
  { id: "wa_notif",       label: "WhatsApp notifications (automated)",  category: "notifications", basic: false, premium: true },
  { id: "fee_remind",     label: "Fee due reminders (1st of month)",    category: "notifications", basic: false, premium: true },
  { id: "absent_digest",  label: "Daily absent digest (6:00 PM)",       category: "notifications", basic: false, premium: true },
  { id: "fee_confirm",    label: "Fee paid confirmation alerts",        category: "notifications", basic: false, premium: true },
  // Scheduling
  { id: "timetable",      label: "Timetable management & editing",     category: "scheduling",    basic: false, premium: true },
  { id: "tt_pdf",         label: "Timetable PDF generation",           category: "scheduling",    basic: false, premium: true },
  { id: "tt_blast",       label: "Annual timetable PDF blast",         category: "scheduling",    basic: false, premium: true },
  // Advanced
  { id: "promo_auto",     label: "Year-end promotion (automated)",     category: "advanced",      basic: false, premium: true },
  { id: "promo_notif",    label: "Promotion notifications to parents", category: "advanced",      basic: false, premium: true },
  { id: "priority_sup",   label: "Priority WhatsApp support",          category: "advanced",      basic: false, premium: true },
];

// ── PLAN LIMITS ── //
export const PLAN_LIMITS: PlanLimit[] = [
  { id: "students", label: "Students",     basic: "200",       premium: "Unlimited" },
  { id: "batches",  label: "Batches",      basic: "10",        premium: "Unlimited" },
  { id: "storage",  label: "Storage",      basic: "5 GB",      premium: "10 GB" },
];

// ── TRIAL CONFIG ── //
export const TRIAL_DAYS = 14;

// ── CATEGORY LABELS ── //
export const CATEGORY_LABELS: Record<string, string> = {
  core: "Core",
  notifications: "Notifications",
  scheduling: "Scheduling",
  advanced: "Advanced",
  limits: "Limits",
};

// ── HELPERS ── //
export function formatPrice(lkr: number): string {
  return `LKR ${lkr.toLocaleString()}`;
}

export function formatPriceShort(lkr: number): string {
  return lkr.toLocaleString();
}
