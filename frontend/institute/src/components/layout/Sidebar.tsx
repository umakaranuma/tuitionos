"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { getStoredUser, logout } from "@/lib/auth";
import { PLAN_DEFINITIONS } from "@/lib/planConfig";
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
        icon: (
          <svg fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1.6">
            <rect x="1.5" y="1.5" width="5.5" height="5.5" rx="1.2"/>
            <rect x="9" y="1.5" width="5.5" height="5.5" rx="1.2"/>
            <rect x="1.5" y="9" width="5.5" height="5.5" rx="1.2"/>
            <rect x="9" y="9" width="5.5" height="5.5" rx="1.2"/>
          </svg>
        ),
      },
      {
        label: "Accounts", href: "/accounts",
        icon: (
          <svg fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1.6">
            <path d="M1.5 4h13v8h-13z"/>
            <path d="M4 8h8"/>
          </svg>
        ),
      },
    ],
  },
  {
    title: "Academic setup",
    items: [
      {
        label: "Subjects", href: "/subjects",
        icon: (
          <svg fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1.6">
            <rect x="2" y="2" width="12" height="12" rx="1.5"/>
            <path d="M6 8h4M8 6v4"/>
          </svg>
        ),
      },
      {
        label: "Teachers", href: "/teachers",
        icon: (
          <svg fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1.6">
            <circle cx="8" cy="5" r="3"/>
            <path d="M2.5 14a5.5 5.5 0 0111 0"/>
          </svg>
        ),
      },
      {
        label: "Batches", href: "/batches",
        icon: (
          <svg fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1.6">
            <rect x="1.5" y="3.5" width="13" height="9" rx="1.5"/>
            <path d="M5 3.5V2M11 3.5V2M1.5 7h13"/>
          </svg>
        ),
      },
    ],
  },
  {
    title: "Students",
    items: [
      {
        label: "Students", href: "/students",
        icon: (
          <svg fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1.6">
            <circle cx="6" cy="5" r="3"/>
            <path d="M1 13a5 5 0 0110 0"/>
            <path d="M11.5 7L13.5 9l-2 2M11 8h3.5"/>
          </svg>
        ),
      },
      {
        label: "Attendance", href: "/attendance",
        icon: (
          <svg fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1.6">
            <path d="M2.5 8l3 3 7-7"/>
            <rect x="1.5" y="1.5" width="13" height="13" rx="1.5"/>
          </svg>
        ),
      },
      {
        label: "Exams", href: "/exams",
        icon: (
          <svg fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1.6">
            <rect x="2.5" y="1.5" width="11" height="13" rx="1.5"/>
            <path d="M5.5 5.5h5M5.5 8.5h5M5.5 11.5h3"/>
          </svg>
        ),
      },
      {
        label: "Fee tracking", href: "/fees",
        icon: (
          <svg fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1.6">
            <path d="M3 2.5h10a.5.5 0 01.5.5v11l-1.75-1.25L10 14l-2-1.25L6 14l-1.75-1.25L2.5 14V3a.5.5 0 01.5-.5z"/>
            <path d="M5.5 6.5h5M5.5 9h3.5"/>
          </svg>
        ),
      },
      {
        label: "Teacher salary", href: "/teachers/salary",
        icon: (
          <svg fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1.6">
            <path d="M8 1.5v13M5 4h4a1.7 1.7 0 010 3.4H5.5a1.7 1.7 0 000 3.4H10"/>
          </svg>
        ),
      },
    ],
  },
  {
    title: "Operations",
    items: [
      {
        label: "Notifications", href: "/notifications", premium: true,
        icon: (
          <svg fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1.6">
            <path d="M8 2a4 4 0 014 4v3l1.5 2.5h-11L4 9V6a4 4 0 014-4z"/>
            <path d="M6.5 12.5a1.5 1.5 0 003 0"/>
          </svg>
        ),
      },
      {
        label: "Timetable", href: "/timetable", premium: true,
        icon: (
          <svg fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1.6">
            <rect x="1.5" y="2.5" width="13" height="11" rx="1.5"/>
            <path d="M1.5 6h13M5.5 2.5v-1M10.5 2.5v-1"/>
          </svg>
        ),
      },
      {
        label: "Year-end promotion", href: "/promotion", premium: true,
        icon: (
          <svg fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1.6">
            <path d="M8 12.5V3M4 7l4-4 4 4"/>
            <path d="M3 12.5h10"/>
          </svg>
        ),
      },
    ],
  },
  {
    title: "Account",
    items: [
      {
        label: "Billing", href: "/billing",
        icon: (
          <svg fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1.6">
            <rect x="1.5" y="3" width="13" height="10" rx="1.5"/>
            <path d="M1.5 6.5h13"/>
            <path d="M4 10h2"/>
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
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [user, setUser] = useState<{ name?: string; role?: string; institute?: { name?: string; subdomain?: string; plan?: string } } | null>(null);
  const [lockedFeatureModal, setLockedFeatureModal] = useState<{ open: boolean; feature: string }>({ open: false, feature: "" });

  useEffect(() => {
    const handleStorageChange = () => setUser(getStoredUser());
    handleStorageChange();
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const planKey = user?.institute?.plan || "institute";
  const planDef = PLAN_DEFINITIONS[planKey];
  const isRestricted = (item: NavItem) => !!item.premium && planKey !== "institute_pro";

  const initials = (n?: string) =>
    (n || "User").split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();

  return (
    <aside className="sb">
      <div className="sb-logo">
        <div className="sb-logo-top">
          <span className="sb-logo-badge">INSTITUTE</span>
          <span className="sb-logo-name">{user?.institute?.name || "Institute"}</span>
        </div>
        <div className="sb-logo-url">
          {user?.institute?.subdomain ? `${user.institute.subdomain}.tuitionos.lk` : "—"}
        </div>
      </div>

      {/* Plan chip — clicking jumps to the Billing / plan section */}
      <Link href="/settings" className="sb-plan-pill" style={{ background: planDef?.colorLight }}>
        <span style={{ color: planDef?.color, fontWeight: 700 }}>{planDef?.label || "Institute"}</span>
        <span className="sb-plan-pill-meta">manage</span>
      </Link>

      <nav style={{ flex: 1, padding: "8px 0" }}>
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
                  className={`sb-item ${isActive ? "on" : ""}`}
                  onClick={(e) => {
                    if (locked) {
                      e.preventDefault();
                      setLockedFeatureModal({ open: true, feature: item.label });
                    }
                  }}
                  style={locked ? { opacity: 0.65 } : undefined}
                >
                  {item.icon}
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.badge && <span className="sb-badge">{item.badge}</span>}
                  {locked && !item.badge && <span className="sb-pro-tag">PRO</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="sb-foot">
        <Link href="/settings" className="sb-foot-user" title="View profile">
          <div className="sb-ava">{initials(user?.name)}</div>
          <div style={{ minWidth: 0 }}>
            <div className="sb-user">{user?.name || "Admin"}</div>
            <div className="sb-role">{user?.role === "admin" ? "Institute Admin" : "Staff"}</div>
          </div>
        </Link>
        <button className="sb-logout" onClick={() => logout()} title="Sign out" aria-label="Sign out">
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 16 16">
            <path d="M6 14H3a1 1 0 01-1-1V3a1 1 0 011-1h3"/>
            <path d="M10.5 11L14 7.5 10.5 4M14 7.5H6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      <Modal
        open={lockedFeatureModal.open}
        onClose={() => setLockedFeatureModal({ open: false, feature: "" })}
        title="Pro feature locked"
        footer={
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button className="btn btn-s btn-sm" onClick={() => setLockedFeatureModal({ open: false, feature: "" })}>Close</button>
            <Link href="/settings" className="btn btn-p btn-sm" onClick={() => setLockedFeatureModal({ open: false, feature: "" })}>
              Upgrade package
            </Link>
          </div>
        }
      >
        <div style={{ padding: "4px 0 8px", lineHeight: 1.5, color: "var(--ink2)", fontSize: 13 }}>
          <strong>{lockedFeatureModal.feature}</strong> is available on the <strong>Institute Pro</strong> plan.
          Upgrade in Settings to unlock automated WhatsApp notifications, timetable management, and year-end promotion tools.
        </div>
      </Modal>
    </aside>
  );
}
