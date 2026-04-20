"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string;
}

const sections: { title: string; items: NavItem[] }[] = [
  {
    title: "Overview",
    items: [
      {
        label: "Dashboard", href: "/dashboard",
        icon: <svg fill="none" viewBox="0 0 14 14" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="1" width="5" height="5" rx="1"/><rect x="8" y="1" width="5" height="5" rx="1"/><rect x="1" y="8" width="5" height="5" rx="1"/><rect x="8" y="8" width="5" height="5" rx="1"/></svg>
      },
    ],
  },
  {
    title: "Institutes",
    items: [
      {
        label: "All institutes", href: "/institutes",
        icon: <svg fill="none" viewBox="0 0 14 14" stroke="currentColor" strokeWidth="1.5"><path d="M2 12V6.5L7 2l5 4.5V12"/><rect x="5" y="8" width="2.5" height="4" rx=".5"/><rect x="6.5" y="8" width="2.5" height="4" rx=".5"/></svg>
      },
      {
        label: "Add institute", href: "/institutes/add",
        icon: <svg fill="none" viewBox="0 0 14 14" stroke="currentColor" strokeWidth="1.5"><path d="M7 3v8M3 7h8"/></svg>
      },
    ],
  },
  {
    title: "Finance",
    items: [
      {
        label: "Income", href: "/income",
        icon: <svg fill="none" viewBox="0 0 14 14" stroke="currentColor" strokeWidth="1.5"><path d="M1 10l3.5-3.5 2.5 2.5 3.5-4.5L13 6.5"/><rect x="1" y="1" width="12" height="11" rx="1.5"/></svg>
      },
      {
        label: "Invoices", href: "/invoices",
        icon: <svg fill="none" viewBox="0 0 14 14" stroke="currentColor" strokeWidth="1.5"><path d="M2.5 2h9a.5.5 0 01.5.5v10l-1.5-1L9 12.5 7.5 11.5 6 12.5 4.5 11.5 3 12.5V2.5a.5.5 0 01.5-.5z"/><path d="M4.5 5h5M4.5 7.5h3.5"/></svg>
      },
    ],
  },
  {
    title: "Platform",
    items: [
      {
        label: "Alerts", href: "/alerts", badge: "3",
        icon: <svg fill="none" viewBox="0 0 14 14" stroke="currentColor" strokeWidth="1.5"><path d="M7 1.5a3.5 3.5 0 013.5 3.5v2.5l1 2H2.5l1-2V5A3.5 3.5 0 017 1.5z"/><path d="M5.5 11a1.5 1.5 0 003 0"/></svg>
      },
      {
        label: "Settings", href: "/settings",
        icon: <svg fill="none" viewBox="0 0 14 14" stroke="currentColor" strokeWidth="1.5"><circle cx="7" cy="7" r="2"/><path d="M7 1v2M7 11v2M1 7h2M11 7h2M2.93 2.93l1.41 1.41M9.66 9.66l1.41 1.41M2.93 11.07l1.41-1.41M9.66 4.34l1.41-1.41"/></svg>
      },
      {
        label: "Pricing", href: "/pricing",
        icon: <svg fill="none" viewBox="0 0 14 14" stroke="currentColor" strokeWidth="1.5"><path d="M1.5 7l5.5-5.5 5.5 5.5v5.5a.5.5 0 01-.5.5h-10a.5.5 0 01-.5-.5z"/><rect x="5" y="8" width="4" height="5" rx=".5"/></svg>
      },
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
                {item.icon}
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.badge && <span className="sb-badge">{item.badge}</span>}
              </Link>
            );
          })}
        </div>
      ))}

      <div className="sb-foot">
        <div className="sb-ava">SD</div>
        <div>
          <div className="sb-user">Solo Developer</div>
          <div className="sb-role">Super Admin</div>
        </div>
      </div>
    </aside>
  );
}
