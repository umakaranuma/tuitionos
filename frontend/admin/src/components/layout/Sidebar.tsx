"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/lib/auth";
import { useNotifications } from "@/lib/notifications";

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
        icon: (
          <svg fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1.6">
            <rect x="1.5" y="1.5" width="5.5" height="5.5" rx="1.2"/>
            <rect x="9" y="1.5" width="5.5" height="5.5" rx="1.2"/>
            <rect x="1.5" y="9" width="5.5" height="5.5" rx="1.2"/>
            <rect x="9" y="9" width="5.5" height="5.5" rx="1.2"/>
          </svg>
        ),
      },
    ],
  },
  {
    title: "People",
    items: [
      {
        label: "Institutes", href: "/institutes",
        icon: (
          <svg fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1.6">
            <path d="M2 14V8L8 3l6 5v6"/>
            <rect x="6" y="9.5" width="4" height="4.5" rx=".8"/>
          </svg>
        ),
      },
    ],
  },
  {
    title: "Finance",
    items: [
      {
        label: "Income", href: "/income",
        icon: (
          <svg fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1.6">
            <path d="M2 11.5l3.5-4 3 3 4-5L15 7"/>
            <path d="M2 2v12h13"/>
          </svg>
        ),
      },
      {
        label: "Invoices", href: "/invoices",
        icon: (
          <svg fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1.6">
            <path d="M3 2.5h10a.5.5 0 01.5.5v11l-1.75-1.25L10 14l-2-1.25L6 14l-1.75-1.25L2.5 14V3a.5.5 0 01.5-.5z"/>
            <path d="M5.5 6.5h5M5.5 9h3.5"/>
          </svg>
        ),
      },
    ],
  },
  {
    title: "Platform",
    items: [
      {
        // Badge is replaced at render time with the live unread count.
        label: "Alerts", href: "/alerts",
        icon: (
          <svg fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1.6">
            <path d="M8 2a4 4 0 014 4v3l1.5 2.5h-11L4 9V6a4 4 0 014-4z"/>
            <path d="M6.5 12.5a1.5 1.5 0 003 0"/>
          </svg>
        ),
      },
      {
        label: "Settings", href: "/settings",
        icon: (
          <svg fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1.6">
            <circle cx="8" cy="8" r="2.5"/>
            <path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4"/>
          </svg>
        ),
      },
      {
        label: "Pricing", href: "/pricing",
        icon: (
          <svg fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1.6">
            <path d="M2 8.5l6-6.5 6 6.5V14a.5.5 0 01-.5.5h-11A.5.5 0 012 14z"/>
            <rect x="5.5" y="9" width="5" height="5.5" rx=".8"/>
          </svg>
        ),
      },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { unreadCount } = useNotifications();
  const badgeFor = (href: string): string | undefined => {
    if (href === "/alerts" && unreadCount > 0) return unreadCount > 9 ? "9+" : String(unreadCount);
    return undefined;
  };

  return (
    <aside className="sb">
      <div className="sb-logo">
        <div className="sb-logo-top">
          <span className="sb-logo-badge">ADMIN</span>
          <span className="sb-logo-name">TuitionOS</span>
        </div>
        <div className="sb-logo-url">admin.tuitionos.lk</div>
      </div>

      <nav style={{ flex: 1, padding: "8px 0" }}>
        {sections.map((section) => (
          <div key={section.title}>
            <div className="sb-sec">{section.title}</div>
            {section.items.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/institutes/add" && pathname.startsWith(`${item.href}/`));
              const liveBadge = badgeFor(item.href) ?? item.badge;
              return (
                <Link key={item.href} href={item.href} className={`sb-item ${isActive ? "on" : ""}`}>
                  {item.icon}
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {liveBadge && <span className="sb-badge">{liveBadge}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="sb-foot">
        <Link href="/profile" className="sb-foot-user" title="View profile">
          <div className="sb-ava">SD</div>
          <div style={{ minWidth: 0 }}>
            <div className="sb-user">Solo Developer</div>
            <div className="sb-role">Super Admin</div>
          </div>
        </Link>
        <button className="sb-logout" onClick={() => logout()} title="Sign out" aria-label="Sign out">
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 16 16">
            <path d="M6 14H3a1 1 0 01-1-1V3a1 1 0 011-1h3"/>
            <path d="M10.5 11L14 7.5 10.5 4M14 7.5H6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </aside>
  );
}
