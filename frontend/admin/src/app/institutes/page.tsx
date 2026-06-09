"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Topbar } from "@/components/layout/Topbar";
import { PageShell } from "@/components/layout/PageShell";
import { api } from "@/lib/api";

type Inst = {
  id: number; name: string; subdomain: string; plan: string;
  status: string; owner_name: string; owner_email: string;
  owner_mobile: string; is_active: boolean; created_at: string;
};

const PLAN_LABELS: Record<string, string> = {
  institute_pro: "Pro",
  institute: "Institution",
  solo: "Solo",
  trial: "Trial",
};

const planBadge = (p: string) => {
  const map: Record<string, JSX.Element> = {
    institute_pro: <span className="bdg b-prem">{PLAN_LABELS.institute_pro}</span>,
    institute: <span className="bdg b-basic">{PLAN_LABELS.institute}</span>,
    solo: <span className="bdg" style={{ background: "var(--cr-d)", color: "var(--ink3)" }}>Solo</span>,
    trial: <span className="bdg b-trial">Trial</span>,
  };
  return map[p] || <span className="bdg b-basic">{p}</span>;
};

const statusDot = (s: string) => {
  const cls: Record<string, string> = {
    active: "dot-active", trial: "dot-trial", pending: "dot-pending",
    paused: "dot-paused", suspended: "dot-suspended", deactivated: "dot-deactivated",
  };
  const labels: Record<string, string> = {
    active: "Active", trial: "Trial", pending: "Pending",
    paused: "Paused", suspended: "Suspended", deactivated: "Deactivated",
  };
  return (
    <span className={`dot-st ${cls[s] || ""}`}>
      {labels[s] || s}
    </span>
  );
};

const initials = (n: string) =>
  n.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();

const AV_COLORS = [
  ["#e0e7ff","#4338ca"],["#e0f2fe","#0284c7"],["#ffedd5","#c2410c"],
  ["#dcfce7","#15803d"],["#fee2e2","#b91c1c"],
];

type Filter = "all" | "active" | "pending" | "suspended";

export default function InstitutesPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [allInsts, setAllInsts] = useState<Inst[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/api/institutes/").then((r) => {
      const d = r.data;
      setAllInsts(Array.isArray(d) ? d : d.results || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const filtered = allInsts.filter((i) => {
    const matchSearch = i.name.toLowerCase().includes(search.toLowerCase()) ||
      (i.owner_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (i.owner_email || "").toLowerCase().includes(search.toLowerCase());
    if (!matchSearch) return false;
    if (filter === "active") return i.status === "active";
    if (filter === "pending") return i.status === "pending" || i.status === "trial";
    if (filter === "suspended") return ["suspended", "paused", "deactivated"].includes(i.status);
    return true;
  });

  const counts = {
    all: allInsts.length,
    active: allInsts.filter(i => i.status === "active").length,
    pending: allInsts.filter(i => ["pending", "trial"].includes(i.status)).length,
    suspended: allInsts.filter(i => ["suspended", "paused", "deactivated"].includes(i.status)).length,
  };

  const tabs: { key: Filter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "active", label: "Active" },
    { key: "pending", label: "Pending" },
    { key: "suspended", label: "Suspended" },
  ];

  return (
    <PageShell>
      <Topbar
        title="Institutes"
        subtitle={`${allInsts.length} registered`}
        right={
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--ink3)", pointerEvents: "none" }}>
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 16 16">
                  <circle cx="7" cy="7" r="5"/><path d="M10.5 10.5L14 14" strokeLinecap="round"/>
                </svg>
              </span>
              <input
                placeholder="Search institutes…"
                style={{ paddingLeft: 30, width: 220 }}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Link href="/institutes/add">
              <button className="btn btn-p btn-sm">+ Add institute</button>
            </Link>
          </div>
        }
      />

      <div className="pb fi">
        {/* Filter tabs */}
        <div className="filter-tabs" style={{ marginBottom: 16 }}>
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className={`filter-tab ${filter === t.key ? "on" : ""}`}
            >
              {t.label}
              <span className="filter-tab-ct">{counts[t.key]}</span>
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 48, color: "var(--ink3)" }}>Loading institutes...</div>
        ) : (
          <div className="tw">
            <table>
              <thead>
                <tr>
                  <th>Institution</th>
                  <th>Owner</th>
                  <th>Type</th>
                  <th>Registered</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((i, idx) => {
                  const [bg, fg] = AV_COLORS[idx % AV_COLORS.length];
                  return (
                    <tr key={i.id} onClick={() => router.push(`/institutes/${i.id}`)} style={{ cursor: "pointer" }}>
                      <td>
                        <div className="td-nm">
                          <div className="ava" style={{ background: bg, color: fg }}>{initials(i.name)}</div>
                          <div>
                            <div className="td-nm-main">{i.name}</div>
                            <div className="td-nm-sub">{i.subdomain ? `${i.subdomain}.tuitionos.lk` : i.owner_email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="td-nm-main" style={{ fontSize: 13 }}>{i.owner_name || "—"}</div>
                        {i.owner_email && <div className="td-nm-sub">{i.owner_email}</div>}
                      </td>
                      <td>{planBadge(i.plan)}</td>
                      <td style={{ fontSize: 12.5, color: "var(--ink3)" }}>
                        {new Date(i.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                      <td>{statusDot(i.status)}</td>
                      <td onClick={e => e.stopPropagation()}>
                        <button className="btn btn-xs btn-s" onClick={() => router.push(`/institutes/${i.id}`)}>
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", color: "var(--ink3)", padding: "40px 0" }}>
                      No institutes found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PageShell>
  );
}
