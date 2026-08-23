"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { Topbar } from "@/components/layout/Topbar";
import { getMe, getStoredUser, logout } from "@/lib/auth";

type Me = {
  id: number;
  username?: string;
  email: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  is_fynux_admin?: boolean;
  is_staff?: boolean;
  is_superuser?: boolean;
  is_totp_enabled?: boolean;
  role?: string | null;
  date_joined?: string | null;
  last_login?: string | null;
  avatar_url?: string | null;
};

const initials = (n: string) =>
  (n || "?").split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();

const fmtDate = (v?: string | null) =>
  v ? new Date(v).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }) : "—";

const fmtDateTime = (v?: string | null) =>
  v ? new Date(v).toLocaleString("en-US", { month: "short", day: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "Never";

export default function ProfilePage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Show stored user instantly, then refresh from server.
    const stored = getStoredUser();
    if (stored) setMe(stored);
    getMe()
      .then((d) => setMe(d))
      .catch(() => { /* keep stored fallback */ })
      .finally(() => setLoading(false));
  }, []);

  if (loading && !me) {
    return (
      <PageShell>
        <Topbar title="Profile" onBack={() => router.back()} backLabel="Back" />
        <div className="pb fi"><div style={{ textAlign: "center", padding: 48, color: "var(--ink3)" }}>Loading profile…</div></div>
      </PageShell>
    );
  }

  const u = me!;
  const displayName = u.name || `${u.first_name || ""} ${u.last_name || ""}`.trim() || u.username || "Admin User";
  const roleLabel = u.is_superuser ? "Super Admin" : u.is_staff ? "Platform Admin" : (u.role || "Member");

  return (
    <PageShell>
      <Topbar
        title="My profile"
        subtitle="Your administrator account details"
        onBack={() => router.back()}
        backLabel="Back"
        right={
          <button className="btn btn-d btn-sm" onClick={() => logout()}>Sign out</button>
        }
      />

      <div className="pb fi">
        {/* Hero */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="profile-hero" style={{ marginBottom: 0 }}>
            <div className="profile-ava" style={{ background: "var(--tc)" }}>
              {u.avatar_url ? <img src={u.avatar_url} alt={displayName} /> : initials(displayName)}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span className="profile-name">{displayName}</span>
                <span className="bdg b-prem">{roleLabel}</span>
              </div>
              <div className="profile-meta">
                <span>{u.email}</span>
                <span className="profile-code">U{String(u.id).padStart(5, "0")}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Two columns: details + account */}
        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 16, alignItems: "start" }}>
          {/* Profile details */}
          <div className="card">
            <div className="sec-title" style={{ marginBottom: 8, fontSize: 14 }}>Profile</div>
            <div className="detail-row"><span className="detail-k">Full name</span><span className="detail-v">{displayName}</span></div>
            <div className="detail-row"><span className="detail-k">Email</span><span className="detail-v">{u.email}</span></div>
            <div className="detail-row"><span className="detail-k">Username</span><span className="detail-v">{u.username || "—"}</span></div>
            <div className="detail-row"><span className="detail-k">Role</span><span className="detail-v">{roleLabel}</span></div>
            <div className="detail-row"><span className="detail-k">First name</span><span className="detail-v">{u.first_name || "—"}</span></div>
            <div className="detail-row"><span className="detail-k">Last name</span><span className="detail-v">{u.last_name || "—"}</span></div>
          </div>

          {/* Account */}
          <div className="card">
            <div className="sec-title" style={{ marginBottom: 8, fontSize: 14 }}>Account</div>
            <div className="detail-row">
              <span className="detail-k">Status</span>
              <span className="detail-v"><span className="dot-st dot-active">Active</span></span>
            </div>
            <div className="detail-row">
              <span className="detail-k">Code</span>
              <span className="detail-v" style={{ fontFamily: "var(--font-mono)", fontSize: 12.5 }}>U{String(u.id).padStart(5, "0")}</span>
            </div>
            <div className="detail-row">
              <span className="detail-k">Two-factor</span>
              <span className="detail-v">
                {u.is_totp_enabled
                  ? <span style={{ color: "#15803d", fontWeight: 600 }}>Enabled ✓</span>
                  : <span style={{ color: "var(--ac)", fontWeight: 600 }}>Not set</span>}
              </span>
            </div>
            <div className="detail-row"><span className="detail-k">Registered</span><span className="detail-v">{fmtDate(u.date_joined)}</span></div>
            <div className="detail-row"><span className="detail-k">Last login</span><span className="detail-v">{fmtDateTime(u.last_login)}</span></div>

            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button className="btn btn-s btn-sm" onClick={() => router.push("/settings")}>Settings</button>
              <button className="btn btn-d btn-sm" onClick={() => logout()}>Sign out</button>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
