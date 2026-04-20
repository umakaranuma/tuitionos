"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const sections = [
  { title: "Overview", items: [{ label: "Dashboard", href: "/dashboard" }] },
  {
    title: "Academic setup",
    items: [
      { label: "Subjects", href: "/subjects" },
      { label: "Teachers", href: "/teachers" },
      { label: "Batches", href: "/batches" },
    ],
  },
  {
    title: "Students",
    items: [
      { label: "Students", href: "/students" },
      { label: "Attendance", href: "/attendance" },
      { label: "Fee tracking", href: "/fees" },
    ],
  },
  {
    title: "Operations",
    items: [
      { label: "Notifications", href: "/notifications", premium: true },
      { label: "Timetable", href: "/timetable", premium: true },
      { label: "Year-end promotion", href: "/promotion", premium: true },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sb">
      <div className="sb-logo">
        <div style={{ fontSize: 9, fontWeight: 700, color: "#fff", background: "var(--tc)", width: "fit-content", padding: "2px 7px", borderRadius: 99, marginBottom: 6 }}>
          INSTITUTE
        </div>
        <div className="sb-logo-name">St. Patrick&apos;s Institute</div>
        <div className="sb-logo-url">stpatricks.tuitionos.lk</div>
      </div>

      {sections.map((section) => (
        <div key={section.title}>
          <div className="sb-sec">{section.title}</div>
          {section.items.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link key={item.href} href={item.href} className={`sb-item ${isActive ? "on" : ""}`}>
                <span>{item.label}</span>
                {item.premium ? (
                  <span style={{ fontSize: 9, background: "var(--ac-l)", color: "var(--ac)", padding: "1px 6px", borderRadius: 99, fontWeight: 700 }}>
                    PRO
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      ))}
    </aside>
  );
}
