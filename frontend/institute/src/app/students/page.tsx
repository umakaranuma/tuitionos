"use client";
import { useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { PageShell } from "@/components/layout/PageShell";

const allStudents = [
  { initials: "AK", name: "Aarav Kumar", batch: "Grade 10 O/L", grade: "10", mobile: "+94 77 123 4567", fee: "paid", att: "94%", attOk: true, bg: "var(--tc-l)", fg: "var(--tc-d)" },
  { initials: "PS", name: "Priya Selvan", batch: "Grade 10 O/L", grade: "10", mobile: "+94 77 234 5678", fee: "due", att: "81%", attOk: false, bg: "var(--sp-l)", fg: "var(--sp)" },
  { initials: "DR", name: "Dinesh Raj", batch: "Grade 11 A/L", grade: "11", mobile: "+94 77 345 6789", fee: "paid", att: "97%", attOk: true, bg: "var(--rb-l)", fg: "var(--rb)" },
  { initials: "KM", name: "Kavitha M.", batch: "Grade 7 Batch A", grade: "7", mobile: "+94 77 456 7890", fee: "paid", att: "99%", attOk: true, bg: "var(--sf-l)", fg: "var(--sf)" },
  { initials: "ST", name: "Surya T.", batch: "Grade 10 O/L", grade: "10", mobile: "+94 77 567 8901", fee: "due", att: "72%", attOk: false, bg: "var(--pr-l)", fg: "var(--pr)" },
  { initials: "NV", name: "Nithya V.", batch: "Grade 7 Batch A", grade: "7", mobile: "+94 77 678 9012", fee: "paid", att: "96%", attOk: true, bg: "var(--tc-l)", fg: "var(--tc-d)" },
  { initials: "RP", name: "Rajan P.", batch: "Grade 11 A/L", grade: "11", mobile: "+94 77 789 0123", fee: "paid", att: "88%", attOk: true, bg: "var(--sp-l)", fg: "var(--sp)" },
  { initials: "MJ", name: "Meena J.", batch: "Grade 10 O/L", grade: "10", mobile: "+94 77 890 1234", fee: "paid", att: "78%", attOk: false, bg: "var(--sf-l)", fg: "var(--sf)" },
];

const filters = [
  { key: "all", label: "All (312)" },
  { key: "7", label: "Grade 7 (42)" },
  { key: "10", label: "Grade 10 (95)" },
  { key: "11", label: "Grade 11 (62)" },
];

export default function StudentsPage() {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = allStudents.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.mobile.includes(search);
    if (!matchSearch) return false;
    if (filter === "all") return true;
    return s.grade === filter;
  });

  return (
    <PageShell>
      <Topbar
        title="Students"
        subtitle="312 enrolled"
        right={
          <>
            <input
              placeholder="Search students…"
              style={{ width: 180 }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button className="btn btn-p btn-sm">+ Enroll student</button>
          </>
        }
      />
      <div className="pb fi">
        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`btn btn-sm ${filter === f.key ? "btn-p" : "btn-s"}`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th>Student</th><th>Batch</th><th>Parent mobile</th>
                <th>Fee status</th><th>Attendance</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.name}>
                  <td>
                    <div className="td-nm">
                      <div className="ava" style={{ background: s.bg, color: s.fg }}>{s.initials}</div>
                      {s.name}
                    </div>
                  </td>
                  <td style={{ color: "var(--ink3)" }}>{s.batch}</td>
                  <td className="mono">{s.mobile}</td>
                  <td>
                    {s.fee === "paid"
                      ? <span className="bdg b-paid">Paid</span>
                      : <span className="bdg b-due">Due</span>}
                  </td>
                  <td className="mono" style={{ color: s.attOk ? "var(--tc)" : s.att < "75%" ? "var(--rb)" : "var(--sf)" }}>
                    {s.att}
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 4 }}>
                      {s.fee === "due" && <button className="btn btn-xs btn-ok">Mark paid</button>}
                      <button className="btn btn-xs btn-s">View</button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: "center", color: "var(--ink3)", padding: "24px 0" }}>No students found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </PageShell>
  );
}
