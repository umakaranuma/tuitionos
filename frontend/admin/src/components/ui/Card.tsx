"use client";
export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-slate-800 rounded-xl border border-slate-700 p-6 ${className}`}>{children}</div>;
}
