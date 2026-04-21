"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string;
  premium?: boolean;
}

const sections: { title: string; items: NavItem[] }[] = [
  {
    title: "Overview",
    items: [
      {
        label: "Dashboard", href: "/dashboard",
        icon: <svg fill="none" viewBox="0 0 14 14" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="1" width="5" height="5" rx="1"/><rect x="8" y="1" width="5" height="5" rx="1"/><rect x="1" y="8" width="5" height="5" rx="1"/><rect x="8" y="8" width="5" height="5" rx="1"/></svg>
      },
      {
        label: "Accounts", href: "/accounts",
        icon: <svg fill="none" viewBox="0 0 14 14" stroke="currentColor" strokeWidth="1.5"><path d="M1 3.5h12v7H1v-7z"/><path d="M4 6.5h6"/></svg>
      },
    ],
  },
  {
    title: "Academic setup",
    items: [
      {
        label: "Subjects", href: "/subjects",
        icon: <svg fill="none" viewBox="0 0 14 14" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="2" width="10" height="10" rx="1.5"/><path d="M5 7h4M7 5v4"/></svg>
      },
      {
        label: "Teachers", href: "/teachers",
        icon: <svg fill="none" viewBox="0 0 14 14" stroke="currentColor" strokeWidth="1.5"><circle cx="7" cy="4.5" r="2.5"/><path d="M2.5 12a4.5 4.5 0 019 0"/></svg>
      },
      {
        label: "Batches", href: "/batches",
        icon: <svg fill="none" viewBox="0 0 14 14" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="3" width="12" height="8" rx="1.5"/><path d="M4 3V1.5M10 3V1.5M1 6h12"/></svg>
      },
    ],
  },
  {
    title: "Students",
    items: [
      {
        label: "Students", href: "/students",
        icon: <svg fill="none" viewBox="0 0 14 14" stroke="currentColor" strokeWidth="1.5"><circle cx="5" cy="4" r="2.5"/><path d="M1 12a4 4 0 018 0"/><path d="M10.5 6.5l2 2-2 2"/><path d="M10 5h3"/></svg>
      },
      {
        label: "Attendance", href: "/attendance", badge: "Today",
        icon: <svg fill="none" viewBox="0 0 14 14" stroke="currentColor" strokeWidth="1.5"><path d="M2 7l3 3 7-7"/><rect x="1" y="1" width="12" height="12" rx="1.5"/></svg>
      },
      {
        label: "Fee tracking", href: "/fees",
        icon: <svg fill="none" viewBox="0 0 14 14" stroke="currentColor" strokeWidth="1.5"><path d="M2.5 2h9a.5.5 0 01.5.5v10l-1.5-1L9 12.5 7.5 11.5 6 12.5 4.5 11.5 3 12.5V2.5a.5.5 0 01.5-.5z"/><path d="M4.5 5h5M4.5 7.5h3.5"/></svg>
      },
      {
        label: "Teacher salary", href: "/teachers/salary",
        icon: <svg fill="none" viewBox="0 0 14 14" stroke="currentColor" strokeWidth="1.5"><path d="M7 1v12M4.5 3.5h4a1.5 1.5 0 010 3H5a1.5 1.5 0 000 3h4.5"/></svg>
      },
    ],
  },
  {
    title: "Operations",
    items: [
      {
        label: "Notifications", href: "/notifications", premium: true,
        icon: <svg fill="none" viewBox="0 0 14 14" stroke="currentColor" strokeWidth="1.5"><path d="M7 1.5a3.5 3.5 0 013.5 3.5v2.5l1 2H2.5l1-2V5A3.5 3.5 0 017 1.5z"/><path d="M5.5 11a1.5 1.5 0 003 0"/></svg>
      },
      {
        label: "Timetable", href: "/timetable", premium: true,
        icon: <svg fill="none" viewBox="0 0 14 14" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="2" width="12" height="10" rx="1.5"/><path d="M1 5.5h12M4.5 2v2M9.5 2v2"/></svg>
      },
      {
        label: "Year-end promotion", href: "/promotion", premium: true,
        icon: <svg fill="none" viewBox="0 0 14 14" stroke="currentColor" strokeWidth="1.5"><path d="M7 11V3M4 6l3-3 3 3"/><path d="M3 11h8"/></svg>
      },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sb">
      <div className="sb-logo">
        <div className="sb-logo-badge">INSTITUTE</div>
        <div className="sb-logo-name">St. Patrick&apos;s<br />Institute</div>
        <div className="sb-logo-url">stpatricks.tuitionos.lk</div>
      </div>

      <div className="sb-plan">
        <div className="sb-plan-t">Premium plan</div>
        Jaffna · Unlimited students
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
                {item.premium && !item.badge && <span className="sb-prem-lock">PRO</span>}
              </Link>
            );
          })}
        </div>
      ))}

      <div className="sb-foot">
        <div className="sb-ava">SK</div>
        <div>
          <div className="sb-user">Sundar Kumar</div>
          <div className="sb-role">Institute Admin</div>
        </div>
      </div>
    </aside>
  );
}
