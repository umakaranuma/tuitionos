"use client";
type V = "info" | "success" | "warning" | "error";
export function Alert({ message, variant = "info" }: { message: string; variant?: V }) {
  const v: Record<V, string> = {
    info: "bg-blue-900/30 border-blue-700 text-blue-300",
    success: "bg-emerald-900/30 border-emerald-700 text-emerald-300",
    warning: "bg-amber-900/30 border-amber-700 text-amber-300",
    error: "bg-red-900/30 border-red-700 text-red-300",
  };
  return <div className={`border rounded-lg px-4 py-3 text-sm ${v[variant]}`}>{message}</div>;
}
