"use client";

import { useMemo, useState } from "react";
import { PageShell } from "@/components/layout/PageShell";
import { Topbar } from "@/components/layout/Topbar";

const institutes = [
  { name: "St. Patrick's", district: "Jaffna", plan: "Premium", students: 312, nextBill: "May 1", status: "Paid" },
  { name: "Alpha Lanka", district: "Colombo", plan: "Basic", students: 87, nextBill: "May 1", status: "Trial" },
  { name: "Bright Minds", district: "Kandy", plan: "Basic", students: 145, nextBill: "Apr 10", status: "Due" },
  { name: "Edu Leaders", district: "Vavuniya", plan: "Basic", students: 68, nextBill: "Mar 10", status: "Overdue" },
];

export default function InstitutesPage() {
  const [filter, setFilter] = useState("All");
  const rows = useMemo(
    () =>
      institutes.filter((item) => {
        if (filter === "All") return true;
        if (filter === "Overdue") return item.status === "Overdue" || item.status === "Due";
        return item.plan === filter;
      }),
    [filter],
  );

  return (
    <PageShell>
      <Topbar title="All institutes" subtitle="68 active · 4 on trial" />
      <div className="pb">
        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          {["All", "Premium", "Basic", "Overdue"].map((item) => (
            <button key={item} className={`btn ${filter === item ? "btn-p" : "btn-s"}`} onClick={() => setFilter(item)}>
              {item}
            </button>
          ))}
        </div>
        <div className="tw">
          <table className="table">
            <thead>
              <tr><th>Institute</th><th>District</th><th>Plan</th><th>Students</th><th>Next bill</th><th>Status</th></tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                <tr key={item.name}>
                  <td>{item.name}</td>
                  <td>{item.district}</td>
                  <td>{item.plan}</td>
                  <td className="mono">{item.students}</td>
                  <td className="mono">{item.nextBill}</td>
                  <td>{item.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PageShell>
  );
}
