"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { getStoredUser } from "@/lib/auth";
import { PLAN_DEFINITIONS, PLAN_LIMITS } from "@/lib/planConfig";
import { Modal } from "@/components/ui/Modal";

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
        label: "Exams", href: "/exams",
        icon: <svg fill="none" viewBox="0 0 14 14" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="1.5" width="10" height="11" rx="1.5"/><path d="M5 5h4M5 7.5h4M5 10h2"/></svg>
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
  {
    title: "Account",
    items: [
      {
        label: "Settings & Billing", href: "/settings",
        icon: <svg fill="none" viewBox="0 0 14 14" stroke="currentColor" strokeWidth="1.5"><circle cx="7" cy="7" r="2.5"/><path d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M2.8 2.8l1.1 1.1M10.1 10.1l1.1 1.1M11.2 2.8l-1.1 1.1M3.9 10.1L2.8 11.2"/></svg>
      },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [lockedFeatureModal, setLockedFeatureModal] = useState<{ open: boolean; feature: string }>({ open: false, feature: "" });

  useEffect(() => {
    const handleStorageChange = () => setUser(getStoredUser());
    handleStorageChange();
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const planKey = user?.institute?.plan || "institute";
  const planDef = PLAN_DEFINITIONS[planKey];
  const maxStudents = PLAN_LIMITS.find(l => l.id === "students") as any;
  const isRestricted = (item: NavItem) => item.premium && planKey !== "institute_pro";

  return (
    <aside className="sb">
      <div className="sb-logo">
        <div className="sb-logo-badge">INSTITUTE</div>
        <div className="sb-logo-name">{user?.institute?.name || "Institute"}</div>
        <div className="sb-logo-url">{user?.institute?.subdomain ? `${user.institute.subdomain}.tuitionos.lk` : "—"}</div>
      </div>

      <Link href="/settings" className="sb-plan" style={{ textDecoration: "none", display: "block", cursor: "pointer", transition: "all 120ms" }}>
        <div className="sb-plan-t" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {planDef?.label || "Institute"}
          <span style={{ fontSize: 8, opacity: .5 }}>MANAGE →</span>
        </div>
        {user?.institute?.subdomain || "Local"} · {maxStudents ? maxStudents[planKey] : "Unknown"} students
      </Link>

      {sections.map((section) => (
        <div key={section.title}>
          <div className="sb-sec">{section.title}</div>
          {section.items.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const locked = isRestricted(item);
            return (
              <Link 
                key={item.href} 
                href={locked ? "#" : item.href} 
                className={`sb-item ${isActive ? "on" : ""} ${locked ? "locked" : ""}`}
                onClick={(e) => {
                  if (locked) {
                    e.preventDefault();
                    setLockedFeatureModal({ open: true, feature: item.label });
                  }
                }}
              >
                {item.icon}
                <span style={{ flex: 1, opacity: locked ? 0.6 : 1 }}>{item.label}</span>
                {item.badge && <span className="sb-badge">{item.badge}</span>}
                {locked && !item.badge && <span className="sb-prem-lock" style={{ background: "var(--ln)", color: "var(--ink2)" }}>PRO</span>}
              </Link>
            );
          })}
        </div>
      ))}

      <div className="sb-foot">
        <div className="sb-ava">{user ? user.name?.split(" ").map((w: string) => w[0]).join("").substring(0, 2).toUpperCase() : "AD"}</div>
        <div style={{ flex: 1 }}>
          <div className="sb-user">{user?.name || "Admin"}</div>
          <div className="sb-role">{user?.role === "admin" ? "Institute Admin" : "Staff"}</div>
        </div>
        <button
          onClick={() => { if (typeof window !== "undefined") window.location.href = "/login"; }}
          title="Sign out"
          style={{
            width: 26, height: 26, borderRadius: 6, border: "1px solid rgba(255,255,255,.1)",
            background: "rgba(255,255,255,.05)", color: "rgba(255,255,255,.4)", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            transition: "all 120ms",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(184,48,48,.3)"; e.currentTarget.style.borderColor = "rgba(184,48,48,.5)"; e.currentTarget.style.color = "#fca5a5"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,.05)"; e.currentTarget.style.borderColor = "rgba(255,255,255,.1)"; e.currentTarget.style.color = "rgba(255,255,255,.4)"; }}
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M5 1.5H2.5a1 1 0 00-1 1v8a1 1 0 001 1H5M8.5 9.5l3-3-3-3M11 6.5H5"/>
          </svg>
        </button>
      </div>

      <Modal
        open={lockedFeatureModal.open}
        onClose={() => setLockedFeatureModal({ open: false, feature: "" })}
        title="PRO Feature Locked"
        footer={
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button className="btn btn-s" onClick={() => setLockedFeatureModal({ open: false, feature: "" })}>Close</button>
            <Link href="/settings" className="btn btn-p" onClick={() => setLockedFeatureModal({ open: false, feature: "" })}>
              Upgrade Package
            </Link>
          </div>
        }
      >
        <div style={{ padding: "12px 0", lineHeight: 1.5, color: "var(--ink2)" }}>
          The <strong>{lockedFeatureModal.feature}</strong> capability is exclusively available on the <strong>Institute Pro</strong> package.
          <br /><br />
          To access advanced automation and tools, please upgrade your package in your institute settings.
        </div>
      </Modal>
    </aside>
  );
}
