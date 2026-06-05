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

const planBadge = (p: string) => {
  const map: Record<string, JSX.Element> = {
    institute_pro: <span className="bdg b-prem">Pro</span>,
    institute: <span className="bdg b-basic">Institute</span>,
    solo: <span className="bdg" style={{ background: "#f1f5f9", color: "#475569" }}>Solo</span>
  };
  return map[p] || <span className="bdg b-basic">{p}</span>;
};

const statusBadge = (s: string) => {
  const map: Record<string, JSX.Element> = {
    active: <span className="bdg b-paid">Active</span>,
    trial: <span className="bdg b-trial">Trial</span>,
    pending: <span className="bdg b-due">Pending</span>,
    paused: <span className="bdg" style={{ background: "#fef3c7", color: "#b45309" }}>Paused</span>,
    suspended: <span className="bdg b-over">Suspended</span>,
    deactivated: <span className="bdg" style={{ background: "#f1f5f9", color: "#475569" }}>Deactivated</span>,
  };
  return map[s] || <span>{s}</span>;
};

const initials = (n: string) =>
  n.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();

const P: [string, string][] = [["var(--tc-l)","var(--tc-d)"],["var(--sp-l)","var(--sp)"],["var(--sf-l)","var(--sf)"],["var(--jd-l)","var(--jd)"],["var(--rb-l)","var(--rb)"]];

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
      (i.owner_name || "").toLowerCase().includes(search.toLowerCase());
    if (!matchSearch) return false;
    if (filter === "active") return i.status === "active";
    if (filter === "pending") return i.status === "pending";
    if (filter === "suspended") return i.status === "suspended" || i.status === "paused" || i.status === "deactivated";
    return true;
  });

  const activeCount = allInsts.filter(i => i.status === "active").length;
  const pendingCount = allInsts.filter(i => i.status === "pending").length;
  const inactiveCount = allInsts.filter(i => ["suspended", "paused", "deactivated"].includes(i.status)).length;

  const tabs: { key: Filter; label: string }[] = [
    { key: "all", label: `All (${allInsts.length})` },
    { key: "active", label: `Active (${activeCount})` },
    { key: "pending", label: `Pending (${pendingCount})` },
    { key: "suspended", label: `Inactive (${inactiveCount})` },
  ];

  return (
    <PageShell>
      <Topbar
        title="All institutes"
        subtitle={`${allInsts.length} registered · ${pendingCount} pending payment`}
        right={
          <>
            <input
              placeholder="Search…"
              style={{ width: 200 }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Link href="/institutes/add">
              <button className="btn btn-p btn-sm">+ Add institute</button>
            </Link>
          </>
        }
      />
      <div className="pb fi">
        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className={`btn btn-sm ${filter === t.key ? "btn-p" : "btn-s"}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: "var(--ink3)" }}>Loading institutes...</div>
        ) : (
          <div className="tw">
            <table>
              <thead>
                <tr>
                  <th>Institute</th>
                  <th>Owner</th>
                  <th>Plan</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((i, idx) => {
                  const [bg, fg] = P[idx % P.length];
                  return (
                    <tr key={i.id}>
                      <td>
                        <div className="td-nm">
                          <div className="ava" style={{ background: bg, color: fg }}>{initials(i.name)}</div>
                          {i.name}
                        </div>
                      </td>
                      <td style={{ color: "var(--ink3)" }}>{i.owner_name}</td>
                      <td>{planBadge(i.plan)}</td>
                      <td>{statusBadge(i.status)}</td>
                      <td className="mono" style={{ color: "var(--ink3)", fontSize: 11 }}>
                        {new Date(i.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 4 }}>
                          <button className="btn btn-xs btn-s" onClick={() => router.push(`/institutes/${i.id}`)}>View</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} style={{ textAlign: "center", color: "var(--ink3)", padding: "24px 0" }}>No institutes found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PageShell>
  );
}
