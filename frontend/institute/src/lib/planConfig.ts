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
  solo: boolean;
  institute: boolean;
  institute_pro: boolean;
}

export interface PlanLimit {
  id: string;
  label: string;
  solo: string;
  institute: string;
  institute_pro: string;
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
  solo: {
    key: "solo",
    label: "Solo",
    tagline: "For individual teachers",
    priceLKR: 1500,
    icon: "user",
    color: "#475569",
    colorLight: "#f1f5f9",
    supportLevel: "Email support — 72h response",
  },
  institute: {
    key: "institute",
    label: "Institute",
    tagline: "For growing institutes",
    priceLKR: 3000,
    icon: "grid",
    color: "#2a5fa8",
    colorLight: "#d8e6fa",
    supportLevel: "Email support — 48h response",
  },
  institute_pro: {
    key: "institute_pro",
    label: "Institute Pro",
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
  { id: "enrollment",     label: "Student enrollment & management",     category: "core",          solo: true, institute: true,  institute_pro: true },
  { id: "subjects",       label: "Subject & teacher management",        category: "core",          solo: false, institute: true,  institute_pro: true },
  { id: "batches",        label: "Batch creation & scheduling",         category: "core",          solo: true, institute: true,  institute_pro: true },
  { id: "attendance",     label: "Attendance tracking (per-subject)",   category: "core",          solo: true, institute: true,  institute_pro: true },
  { id: "fees",           label: "Fee collection, receipts & ledger",   category: "core",          solo: true, institute: true,  institute_pro: true },
  { id: "salary",         label: "Teacher salary management",           category: "core",          solo: false, institute: true,  institute_pro: true },
  { id: "accounts",       label: "Financial accounts dashboard",        category: "core",          solo: false, institute: true,  institute_pro: true },
  { id: "dashboard",      label: "Dashboard with KPIs & analytics",     category: "core",          solo: true, institute: true,  institute_pro: true },
  // Notifications
  { id: "wa_notif",       label: "WhatsApp notifications (automated)",  category: "notifications", solo: false, institute: false, institute_pro: true },
  { id: "fee_remind",     label: "Fee due reminders (1st of month)",    category: "notifications", solo: false, institute: false, institute_pro: true },
  { id: "absent_digest",  label: "Daily absent digest (6:00 PM)",       category: "notifications", solo: false, institute: false, institute_pro: true },
  { id: "fee_confirm",    label: "Fee paid confirmation alerts",        category: "notifications", solo: false, institute: false, institute_pro: true },
  // Scheduling
  { id: "timetable",      label: "Timetable management & editing",     category: "scheduling",    solo: false, institute: false, institute_pro: true },
  { id: "tt_pdf",         label: "Timetable PDF generation",           category: "scheduling",    solo: false, institute: false, institute_pro: true },
  { id: "tt_blast",       label: "Annual timetable PDF blast",         category: "scheduling",    solo: false, institute: false, institute_pro: true },
  // Advanced
  { id: "promo_auto",     label: "Year-end promotion (automated)",     category: "advanced",      solo: false, institute: false, institute_pro: true },
  { id: "promo_notif",    label: "Promotion notifications to parents", category: "advanced",      solo: false, institute: false, institute_pro: true },
  { id: "priority_sup",   label: "Priority WhatsApp support",          category: "advanced",      solo: false, institute: false, institute_pro: true },
];

// ── PLAN LIMITS ── //
export const PLAN_LIMITS: PlanLimit[] = [
  { id: "students", label: "Students",     solo: "75", institute: "200",       institute_pro: "Unlimited" },
  { id: "batches",  label: "Batches",      solo: "3", institute: "10",        institute_pro: "Unlimited" },
  { id: "storage",  label: "Storage",      solo: "1 GB", institute: "5 GB",      institute_pro: "10 GB" },
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
