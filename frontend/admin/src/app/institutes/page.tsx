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

const planBadge = (p: string) =>
  p === "premium" ? <span className="bdg b-prem">Premium</span> : <span className="bdg b-basic">Basic</span>;

const statusBadge = (s: string) => {
  const map: Record<string, JSX.Element> = {
    active: <span className="bdg b-paid">Active</span>,
    trial: <span className="bdg b-trial">Trial</span>,
    suspended: <span className="bdg b-over">Suspended</span>,
  };
  return map[s] || <span>{s}</span>;
};

const initials = (n: string) =>
  n.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();

const P: [string, string][] = [["var(--tc-l)","var(--tc-d)"],["var(--sp-l)","var(--sp)"],["var(--sf-l)","var(--sf)"],["var(--jd-l)","var(--jd)"],["var(--rb-l)","var(--rb)"]];

type Filter = "all" | "premium" | "basic" | "overdue";

export default function InstitutesPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [allInsts, setAllInsts] = useState<Inst[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/api/institutes").then((r) => {
      const d = r.data;
      setAllInsts(Array.isArray(d) ? d : d.results || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const filtered = allInsts.filter((i) => {
    const matchSearch = i.name.toLowerCase().includes(search.toLowerCase()) ||
      (i.owner_name || "").toLowerCase().includes(search.toLowerCase());
    if (!matchSearch) return false;
    if (filter === "premium") return i.plan === "premium";
    if (filter === "basic") return i.plan === "basic";
    if (filter === "overdue") return i.status === "suspended";
    return true;
  });

  const premiumCount = allInsts.filter(i => i.plan === "premium").length;
  const basicCount = allInsts.filter(i => i.plan === "basic").length;
  const trialCount = allInsts.filter(i => i.status === "trial").length;

  const tabs: { key: Filter; label: string }[] = [
    { key: "all", label: `All (${allInsts.length})` },
    { key: "premium", label: `Premium (${premiumCount})` },
    { key: "basic", label: `Basic (${basicCount})` },
    { key: "overdue", label: `Trial (${trialCount})` },
  ];

  return (
    <PageShell>
      <Topbar
        title="All institutes"
        subtitle={`${allInsts.length} registered · ${trialCount} on trial`}
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
