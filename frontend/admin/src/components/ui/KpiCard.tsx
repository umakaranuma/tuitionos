"use client";
interface KpiCardProps { title: string; value: string; change?: string; changeType?: "up" | "down" | "neutral"; }
export function KpiCard({ title, value, change, changeType = "neutral" }: KpiCardProps) {
  const color: Record<string, string> = { up: "text-emerald-400", down: "text-red-400", neutral: "text-slate-400" };
  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
      <p className="text-sm text-slate-400 mb-1">{title}</p>
      <p className="text-3xl font-bold text-white">{value}</p>
      {change && <p className={`text-sm mt-1 ${color[changeType]}`}>{change}</p>}
    </div>
  );
}
