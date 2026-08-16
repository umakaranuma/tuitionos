"use client";
import { useEffect, useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { PageShell } from "@/components/layout/PageShell";
import { Pagination } from "@/components/ui/Pagination";
import { api } from "@/lib/api";

type ActivityEntry = { id: number; action: string; description: string; user: string; created_at: string };

const CATEGORY_OPTIONS = [
  { value: "", label: "All activity" },
  { value: "students", label: "Students" },
  { value: "exams", label: "Exams" },
  { value: "attendance", label: "Attendance" },
  { value: "timetable", label: "Timetable" },
  { value: "fees", label: "Fee payments" },
  { value: "advances", label: "Advances" },
  { value: "salary", label: "Salary payments" },
  { value: "batches", label: "Batches" },
  { value: "subjects", label: "Subjects" },
  { value: "teachers", label: "Teachers" },
  { value: "institute", label: "Account & institute" },
];

const dayLabel = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (sameDay(d, today)) return "Today";
  if (sameDay(d, yesterday)) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });
};

const timeLabel = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

const relativeTime = (iso: string) => {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return timeLabel(iso);
};

// Group this page's entries into day buckets, preserving the newest-first
// order the API already returns them in — a day only ever appears once per
// page since each page is a contiguous, already-sorted slice of history.
const groupByDay = (entries: ActivityEntry[]) => {
  const groups: { label: string; items: ActivityEntry[] }[] = [];
  for (const entry of entries) {
    const label = dayLabel(entry.created_at);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(entry);
    else groups.push({ label, items: [entry] });
  }
  return groups;
};

// Two signals per row: a colored verb badge (what kind of change — the
// scannable part) and a light category tag (which area it touched). The
// description text already carries the specifics, so these just let you
// spot the shape of the log at a glance instead of reading every line.
const verbMeta = (action: string): { label: string; bg: string; fg: string; icon: React.ReactNode } => {
  const iconProps = { width: 11, height: 11, viewBox: "0 0 16 16", fill: "none", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (action.endsWith("_added")) return {
    label: "Added", bg: "#dcfce7", fg: "#15803d",
    icon: <svg {...iconProps} stroke="#15803d"><path d="M8 3v10M3 8h10" /></svg>,
  };
  if (action.endsWith("_deleted")) return {
    label: "Deleted", bg: "var(--rb-l)", fg: "var(--rb)",
    icon: <svg {...iconProps} stroke="var(--rb)"><path d="M3.5 4.5h9M6.5 4.5V3a1 1 0 011-1h1a1 1 0 011 1v1.5M6.5 7.5v4M9.5 7.5v4M4.5 4.5l.6 8a1 1 0 001 .9h3.8a1 1 0 001-.9l.6-8" /></svg>,
  };
  if (action.endsWith("_marked_paid")) return {
    label: "Paid", bg: "var(--tc-l)", fg: "var(--tc-d)",
    icon: <svg {...iconProps} stroke="var(--tc-d)"><path d="M3 8.5l3.5 3.5L13 4.5" /></svg>,
  };
  if (action === "plan_changed") return {
    label: "Plan changed", bg: "var(--pr-l)", fg: "var(--pr)",
    icon: <svg {...iconProps} stroke="var(--pr)"><path d="M8 1.5v13M5 4h4a1.7 1.7 0 010 3.4H5.5a1.7 1.7 0 000 3.4H10" /></svg>,
  };
  if (action === "attendance_marked") return {
    label: "Marked", bg: "#e0f2fe", fg: "#0369a1",
    icon: <svg {...iconProps} stroke="#0369a1"><path d="M2.5 8l3 3 7-7" /></svg>,
  };
  return {
    label: "Updated", bg: "var(--sf-l)", fg: "var(--sf)",
    icon: <svg {...iconProps} stroke="var(--sf)"><path d="M11.5 2.5a1.4 1.4 0 012 2L5 13l-3 1 1-3z" /></svg>,
  };
};

const categoryTag = (action: string) => {
  if (action.startsWith("advance_")) return "Advance";
  if (action.startsWith("salary_payment_")) return "Salary payment";
  if (action.startsWith("student_")) return "Student";
  if (action.startsWith("exam_")) return "Exam";
  if (action.startsWith("subject_")) return "Subject";
  if (action.startsWith("teacher_")) return "Teacher";
  if (action.startsWith("batch_")) return "Batch";
  if (action.startsWith("timetable_slot_")) return "Timetable";
  if (action.startsWith("attendance_")) return "Attendance";
  if (action.startsWith("fee_")) return "Fee payment";
  if (["profile_updated", "institute_updated", "plan_changed"].includes(action)) return "Account";
  return null;
};

export default function ActivityLogPage() {
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [meta, setMeta] = useState({ total_count: 0, total_pages: 1 });
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setLoading(true);
    const params: Record<string, string | number> = { page, limit };
    if (debouncedSearch) params.search = debouncedSearch;
    if (category) params.category = category;
    api.get("/api/me/activity-log", { params })
      .then(r => {
        const d = r.data;
        setMeta({ total_count: d.total_count ?? 0, total_pages: d.total_pages ?? 1 });
        setActivity(Array.isArray(d) ? d : d.results || []);
      })
      .catch(() => setActivity([]))
      .finally(() => setLoading(false));
  }, [page, limit, debouncedSearch, category]);

  const groups = groupByDay(activity);
  const filtered = search || category;

  return (
    <PageShell>
      <Topbar title="Activity Log" subtitle={`${meta.total_count} recorded action${meta.total_count === 1 ? "" : "s"} — who changed what, and when`}
        right={<>
          <select
            style={{ width: 180, padding: "6px 10px", borderRadius: 6, border: "1px solid var(--bdr)", background: "var(--bg)", color: "var(--ink)", outline: "none" }}
            value={category}
            onChange={e => { setCategory(e.target.value); setPage(1); }}
          >
            {CATEGORY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <input placeholder="Search activity..." style={{ width: 200 }} value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </>} />
      <div className="pb fi">
        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: "var(--ink3)" }}>Loading...</div>
        ) : activity.length === 0 ? (
          <div className="card" style={{ textAlign: "center", color: "var(--ink3)", padding: 40 }}>
            {filtered ? "No activity matches your filters." : "No activity recorded yet."}
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            {groups.map((group, gi) => (
              <div key={gi}>
                <div style={{
                  position: "sticky", top: 0, zIndex: 1,
                  padding: "12px 20px", background: "var(--cr)", borderBottom: "1px solid var(--ln)",
                  borderTop: gi === 0 ? "none" : "1px solid var(--ln)",
                  fontSize: 11.5, fontWeight: 700, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: ".04em",
                }}>
                  {group.label}
                </div>
                {group.items.map(a => {
                  const verb = verbMeta(a.action);
                  const catTag = categoryTag(a.action);
                  return (
                    <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 20px", borderBottom: "1px solid var(--ln)" }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 8, background: "var(--tc-l)", color: "var(--tc-d)",
                        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, flexShrink: 0,
                      }}>
                        {a.user[0]?.toUpperCase() || "?"}
                      </div>

                      {/* Middle: badges + description — the "what happened" */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, flexWrap: "wrap" }}>
                          <span className="bdg" style={{ background: verb.bg, color: verb.fg, gap: 4 }}>{verb.icon}{verb.label}</span>
                          {catTag && <span className="bdg" style={{ background: "var(--cr-d)", color: "var(--ink3)" }}>{catTag}</span>}
                        </div>
                        <div style={{ fontSize: 13.5, color: "var(--ink)", lineHeight: 1.4 }}>{a.description}</div>
                      </div>

                      {/* Right: who + when — kept out of the reading line so
                          scanning the descriptions isn't interrupted by
                          timestamps of varying width. */}
                      <div style={{ textAlign: "right", flexShrink: 0, minWidth: 96, paddingLeft: 12, borderLeft: "1px solid var(--ln)" }} title={new Date(a.created_at).toLocaleString()}>
                        <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink2)" }}>{relativeTime(a.created_at)}</div>
                        <div style={{ fontSize: 11, color: "var(--ink3)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.user}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
            <Pagination
              page={page}
              limit={limit}
              totalCount={meta.total_count}
              totalPages={meta.total_pages}
              onPageChange={setPage}
              onLimitChange={l => { setLimit(l); setPage(1); }}
              itemName="actions"
            />
          </div>
        )}
      </div>
    </PageShell>
  );
}
