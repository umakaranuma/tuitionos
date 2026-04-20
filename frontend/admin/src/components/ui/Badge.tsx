"use client";
type V = "default" | "success" | "warning" | "danger";
export function Badge({ label, variant = "default" }: { label: string; variant?: V }) {
  const v: Record<V, string> = {
    default: "bg-slate-700 text-slate-300",
    success: "bg-emerald-900/50 text-emerald-400",
    warning: "bg-amber-900/50 text-amber-400",
    danger: "bg-red-900/50 text-red-400",
  };
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${v[variant]}`}>{label}</span>;
}
