import React, { useState, useEffect } from "react";

interface TopbarProps {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}

export function Topbar({ title, subtitle, right }: TopbarProps) {
  const [academicYear, setAcademicYear] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("academic_year");
      if (stored) setAcademicYear(parseInt(stored, 10));
    }
  }, []);

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const year = parseInt(e.target.value, 10);
    setAcademicYear(year);
    localStorage.setItem("academic_year", year.toString());
    window.location.reload();
  };

  const years = [2024, 2025, 2026, 2027, 2028, 2029, 2030];

  return (
    <div className="topbar">
      <div>
        <div className="topbar-title">{title}</div>
        {subtitle && <div className="topbar-sub">{subtitle}</div>}
      </div>
      <div className="tb-right" style={{ display: "flex", gap: "12px", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "#f8fafc", padding: "4px 10px", borderRadius: "8px", border: "1px solid var(--ln)" }}>
          <span style={{ fontSize: "12px", color: "var(--ink2)", fontWeight: 500 }}>Academic Year</span>
          <select 
            value={academicYear} 
            onChange={handleYearChange}
            style={{ 
              background: "transparent", border: "none", outline: "none", 
              fontSize: "13px", fontWeight: 700, color: "var(--ink)", cursor: "pointer" 
            }}
          >
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        {right && <div>{right}</div>}
      </div>
    </div>
  );
}
