"use client";
import React from "react";
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
}
export function Button({ variant = "primary", size = "md", className = "", children, ...props }: ButtonProps) {
  const v: Record<string, string> = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700",
    secondary: "bg-slate-700 text-white hover:bg-slate-600",
    danger: "bg-red-600 text-white hover:bg-red-700",
    ghost: "text-slate-300 hover:bg-slate-800",
  };
  const s: Record<string, string> = { sm: "px-3 py-1.5 text-sm", md: "px-4 py-2 text-sm", lg: "px-6 py-3 text-base" };
  return (
    <button className={`inline-flex items-center justify-center rounded-lg font-medium transition-colors ${v[variant]} ${s[size]} ${className}`} {...props}>
      {children}
    </button>
  );
}
