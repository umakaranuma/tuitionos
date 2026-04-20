"use client";
export function ProgressBar({ value, max = 100, label }: { value: number; max?: number; label?: string }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div>
      {label && <div className="flex justify-between text-xs text-slate-400 mb-1"><span>{label}</span><span>{Math.round(pct)}%</span></div>}
      <div className="h-2 bg-slate-700 rounded-full">
        <div className="h-2 bg-indigo-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
