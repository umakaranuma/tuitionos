"use client";
import { useState } from "react";
import Link from "next/link";
import { Topbar } from "@/components/layout/Topbar";
import { PageShell } from "@/components/layout/PageShell";

const allInsts = [
  { n: "St. Patrick's", d: "Jaffna", plan: "premium", s: 312, bill: "May 1", st: "paid", bg: "var(--tc-l)", fg: "var(--tc-d)" },
  { n: "Alpha Lanka", d: "Colombo", plan: "basic", s: 87, bill: "May 1", st: "trial", bg: "var(--sp-l)", fg: "var(--sp)" },
  { n: "Bright Minds", d: "Kandy", plan: "basic", s: 145, bill: "Apr 10", st: "due", bg: "var(--sf-l)", fg: "var(--sf)" },
  { n: "Nova Science", d: "Gampaha", plan: "premium", s: 203, bill: "May 1", st: "paid", bg: "var(--jd-l)", fg: "var(--jd)" },
  { n: "Edu Leaders", d: "Vavuniya", plan: "basic", s: 68, bill: "Mar 10", st: "overdue", bg: "var(--rb-l)", fg: "var(--rb)" },
  { n: "Vision Academy", d: "Colombo", plan: "premium", s: 280, bill: "May 1", st: "paid", bg: "var(--tc-l)", fg: "var(--tc-d)" },
  { n: "Mathura Edu", d: "Jaffna", plan: "basic", s: 110, bill: "May 1", st: "paid", bg: "var(--sp-l)", fg: "var(--sp)" },
  { n: "Sunrise Tutors", d: "Kandy", plan: "basic", s: 55, bill: "May 1", st: "paid", bg: "var(--jd-l)", fg: "var(--jd)" },
  { n: "Peak Learners", d: "Colombo", plan: "premium", s: 198, bill: "May 1", st: "paid", bg: "var(--tc-l)", fg: "var(--tc-d)" },
  { n: "Saris Academy", d: "Jaffna", plan: "basic", s: 75, bill: "May 1", st: "paid", bg: "var(--sp-l)", fg: "var(--sp)" },
  { n: "Clarity School", d: "Gampaha", plan: "premium", s: 145, bill: "May 1", st: "paid", bg: "var(--jd-l)", fg: "var(--jd)" },
  { n: "Glow Institute", d: "Kandy", plan: "basic", s: 92, bill: "Apr 5", st: "overdue", bg: "var(--rb-l)", fg: "var(--rb)" },
];

const planBadge = (p: string) =>
  p === "premium" ? <span className="bdg b-prem">Premium</span> : <span className="bdg b-basic">Basic</span>;

const statusBadge = (s: string) => {
  const map: Record<string, JSX.Element> = {
    paid: <span className="bdg b-paid">Paid</span>,
    due: <span className="bdg b-due">Due</span>,
    overdue: <span className="bdg b-over">Overdue</span>,
    trial: <span className="bdg b-trial">Trial</span>,
  };
  return map[s] || <span>{s}</span>;
};

const initials = (n: string) =>
  n.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();

type Filter = "all" | "premium" | "basic" | "overdue";

export default function InstitutesPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  const filtered = allInsts.filter((i) => {
    const matchSearch = i.n.toLowerCase().includes(search.toLowerCase()) || i.d.toLowerCase().includes(search.toLowerCase());
    if (!matchSearch) return false;
    if (filter === "premium") return i.plan === "premium";
    if (filter === "basic") return i.plan === "basic";
    if (filter === "overdue") return i.st === "overdue" || i.st === "due";
    return true;
  });

  const tabs: { key: Filter; label: string }[] = [
    { key: "all", label: "All (68)" },
    { key: "premium", label: "Premium (23)" },
    { key: "basic", label: "Basic (45)" },
    { key: "overdue", label: "Overdue (7)" },
  ];

  return (
    <PageShell>
      <Topbar
        title="All institutes"
        subtitle="68 active · 4 on trial"
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
              className={`btn btn-sm ${filter === t.key ? "btn-p" : "btn-s"} ${t.key === "overdue" && filter !== t.key ? "btn-d" : ""}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="tw">
          <table>
            <thead>
              <tr>
                <th>Institute</th>
                <th>District</th>
                <th>Plan</th>
                <th>Students</th>
                <th>Next bill</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((i) => (
                <tr key={i.n}>
                  <td>
                    <div className="td-nm">
                      <div className="ava" style={{ background: i.bg, color: i.fg }}>{initials(i.n)}</div>
                      {i.n}
                    </div>
                  </td>
                  <td style={{ color: "var(--ink3)" }}>{i.d}</td>
                  <td>{planBadge(i.plan)}</td>
                  <td className="mono">{i.s}</td>
                  <td
                    className="mono"
                    style={{ color: i.st === "overdue" ? "var(--rb)" : i.st === "due" ? "var(--sf)" : "var(--ink3)" }}
                  >
                    {i.bill}
                  </td>
                  <td>{statusBadge(i.st)}</td>
                  <td>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button className="btn btn-xs btn-s">View</button>
                      {i.st === "overdue" && <button className="btn btn-xs btn-d">Suspend</button>}
                      {i.st === "due" && <button className="btn btn-xs btn-ok">Remind</button>}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: "center", color: "var(--ink3)", padding: "24px 0" }}>No institutes found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </PageShell>
  );
}
