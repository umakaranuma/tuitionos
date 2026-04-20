"use client";
import { useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { PageShell } from "@/components/layout/PageShell";

const subjects = ["Mathematics", "Physics", "Chemistry", "English"];
const students = [
  { initials: "AK", name: "Aarav Kumar", bg: "var(--tc-l)", fg: "var(--tc-d)", att: { Mathematics: "present", Physics: "absent", Chemistry: "present", English: "present" } },
  { initials: "PS", name: "Priya Selvan", bg: "var(--sp-l)", fg: "var(--sp)", att: { Mathematics: "absent", Physics: "absent", Chemistry: "present", English: "present" } },
  { initials: "ST", name: "Surya T.", bg: "var(--rb-l)", fg: "var(--rb)", att: { Mathematics: "present", Physics: "present", Chemistry: "present", English: "present" } },
  { initials: "MJ", name: "Meena J.", bg: "var(--sf-l)", fg: "var(--sf)", att: { Mathematics: "present", Physics: "present", Chemistry: "absent", English: "present" } },
  { initials: "RG", name: "Ragu S.", bg: "var(--pr-l)", fg: "var(--pr)", att: { Mathematics: "present", Physics: "present", Chemistry: "present", English: "absent" } },
];

type AttState = Record<string, Record<string, string>>;

export default function AttendancePage() {
  const initAtt: AttState = {};
  students.forEach(s => {
    initAtt[s.name] = { ...s.att };
  });
  const [att, setAtt] = useState<AttState>(initAtt);
  const [bulkStates, setBulkStates] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  const setBulk = (subj: string, state: string) => {
    setBulkStates(prev => ({ ...prev, [subj]: state }));
    setAtt(prev => {
      const next = { ...prev };
      students.forEach(s => {
        next[s.name] = { ...next[s.name], [subj]: state };
      });
      return next;
    });
  };

  const toggle = (student: string, subj: string) => {
    setAtt(prev => ({
      ...prev,
      [student]: { ...prev[student], [subj]: prev[student][subj] === "present" ? "absent" : "present" }
    }));
  };

  return (
    <PageShell>
      <Topbar
        title="Attendance"
        subtitle="Today · Sunday 20 April 2026"
        right={
          <>
            <select style={{ width: "auto" }}>
              <option>Grade 10 — O/L Batch</option>
              <option>Grade 7 — Batch A</option>
              <option>Grade 11 — A/L Sci</option>
            </select>
            <button className="btn btn-p btn-sm" onClick={() => setSaved(true)}>
              Save &amp; send alerts
            </button>
          </>
        }
      />
      <div className="pb fi">
        {saved && (
          <div style={{
            background: "var(--tc-l)", border: "1px solid #b8ddd0", borderRadius: "var(--r)",
            padding: "10px 14px", marginBottom: 16, fontSize: 12.5, color: "var(--tc-d)",
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M2 7l3 3 7-7"/></svg>
            Attendance saved. Absent alerts will fire at 6:00 PM as a daily digest.
          </div>
        )}
        {!saved && (
          <div style={{
            background: "var(--tc-l)", border: "1px solid #b8ddd0", borderRadius: "var(--r)",
            padding: "10px 14px", marginBottom: 16, fontSize: 12, color: "var(--tc-d)",
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.75"><circle cx="7" cy="7" r="6"/><path d="M7 4.5v3.5l2 1"/></svg>
            Absent alerts will fire at 6:00 PM as a daily digest — one WhatsApp message per parent.
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <div className="sec-hdr"><span className="sec-title">Mark by subject — Grade 10 O/L</span></div>
          <div className="att-grid">
            {subjects.map((subj) => (
              <div key={subj} className="att-card">
                <div className="att-subject">{subj}</div>
                <div className="att-btns">
                  <button
                    className={`att-btn ${bulkStates[subj] === "present" ? "present" : ""}`}
                    onClick={() => setBulk(subj, "present")}
                  >Present</button>
                  <button
                    className={`att-btn ${bulkStates[subj] === "absent" ? "absent" : ""}`}
                    onClick={() => setBulk(subj, "absent")}
                  >Absent</button>
                </div>
                <div className="att-count">All 25 students</div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="sec-hdr"><span className="sec-title">Student list — Grade 10 O/L ({students.length} students shown)</span></div>
          <div className="tw">
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  {subjects.map(s => <th key={s}>{s}</th>)}
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.name}>
                    <td>
                      <div className="td-nm">
                        <div className="ava" style={{ background: s.bg, color: s.fg }}>{s.initials}</div>
                        {s.name}
                      </div>
                    </td>
                    {subjects.map(subj => (
                      <td key={subj} onClick={() => toggle(s.name, subj)} style={{ cursor: "pointer" }}>
                        <span className={`bdg ${att[s.name][subj] === "present" ? "b-present" : "b-absent"}`}>
                          {att[s.name][subj] === "present" ? "Present" : "Absent"}
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
