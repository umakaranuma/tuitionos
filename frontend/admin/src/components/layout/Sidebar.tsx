"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const sections = [
  { title: "Overview", items: [{ label: "Dashboard", href: "/dashboard" }] },
  {
    title: "Institutes",
    items: [
      { label: "All institutes", href: "/institutes" },
      { label: "Add institute", href: "/institutes/add" },
    ],
  },
  {
    title: "Finance",
    items: [
      { label: "Income", href: "/income" },
      { label: "Invoices", href: "/invoices" },
    ],
  },
  {
    title: "Platform",
    items: [
      { label: "Alerts", href: "/alerts" },
      { label: "Settings", href: "/settings" },
      { label: "Pricing", href: "/pricing" },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sb">
      <div className="sb-logo">
        <div className="sb-logo-top">
          <span className="sb-logo-badge">ADMIN</span>
          <span className="sb-logo-name">TuitionOS</span>
        </div>
        <div className="sb-logo-url">admin.tuitionos.lk</div>
      </div>

      {sections.map((section) => (
        <div key={section.title}>
          <div className="sb-sec">{section.title}</div>
          {section.items.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link key={item.href} href={item.href} className={`sb-item ${isActive ? "on" : ""}`}>
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}

      <div className="sb-foot">
        <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.65)", fontWeight: 500 }}>Solo Developer</div>
        <div style={{ fontSize: 9.5, color: "rgba(255,255,255,.28)" }}>Super Admin</div>
      </div>
    </aside>
  );
}
