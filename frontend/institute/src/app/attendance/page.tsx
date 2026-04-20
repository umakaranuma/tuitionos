"use client";
import { useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { PageShell } from "@/components/layout/PageShell";
import { BatchTabs } from "@/components/ui/BatchTabs";
import { StudentProfileModal } from "@/components/ui/StudentProfileModal";
import { BATCHES, ALL_STUDENTS, BatchId, Student } from "@/lib/batchData";

type AttRecord = Record<number, Record<string, "present" | "absent">>;

function todayLabel() {
  return new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

export default function AttendancePage() {
  const [selBatch, setSelBatch] = useState<BatchId>("g10");
  const [att, setAtt]           = useState<AttRecord>({});
  const [saved, setSaved]       = useState(false);
  const [dateStr]               = useState(new Date().toISOString().slice(0, 10));
  const [viewProfile, setViewProfile] = useState<Student | null>(null);

  const batch    = BATCHES.find(b => b.id === selBatch)!;
  const subjects = batch.subjects as string[];
  const students = ALL_STUDENTS.filter(s => s.batch === selBatch);

  const getAtt = (sid: number, subj: string): "present" | "absent" =>
    att[sid]?.[subj] ?? "present"; // default present

  const setStudentSubj = (sid: number, subj: string, val: "present" | "absent") =>
    setAtt(prev => ({
      ...prev,
      [sid]: { ...(prev[sid] ?? {}), [subj]: val },
    }));

  const bulkSubject = (subj: string, val: "present" | "absent") => {
    setAtt(prev => {
      const next = { ...prev };
      students.forEach(s => {
        next[s.id] = { ...(next[s.id] ?? {}), [subj]: val };
      });
      return next;
    });
    setSaved(false);
  };

  const bulkAll = (val: "present" | "absent") => {
    const next: AttRecord = {};
    students.forEach(s => {
      next[s.id] = {};
      subjects.forEach(subj => { next[s.id][subj] = val; });
    });
    setAtt(next);
    setSaved(false);
  };

  // Stats per subject
  const subjectStats = (subj: string) => {
    const present = students.filter(s => getAtt(s.id, subj) === "present").length;
    const pct = students.length ? Math.round(present / students.length * 100) : 0;
    return { present, pct };
  };

  const totalAbsent = students.filter(s =>
    subjects.some(subj => getAtt(s.id, subj) === "absent")
  ).length;

  const changeBatch = (id: BatchId) => { setSelBatch(id); setAtt({}); setSaved(false); };

  return (
    <PageShell>
      <Topbar
        title="Attendance"
        subtitle={todayLabel()}
        right={
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-s btn-sm" onClick={() => bulkAll("present")}>All present</button>
            <button className="btn btn-d btn-xs btn-sm" onClick={() => bulkAll("absent")}>All absent</button>
            <button
              className="btn btn-p btn-sm"
              onClick={() => setSaved(true)}
              style={{ background: saved ? "var(--tc-d)" : undefined }}
            >
              {saved ? "✓ Saved" : "Save & send alerts"}
            </button>
          </div>
        }
      />
      <div className="pb fi">
        <BatchTabs active={selBatch} onChange={changeBatch} />

        {/* Info banner */}
        {saved ? (
          <div style={{
            background:"var(--tc-l)",border:"1px solid #b8ddd0",borderRadius:10,
            padding:"10px 14px",marginBottom:16,fontSize:12,color:"var(--tc-d)",
            display:"flex",alignItems:"center",gap:8,
          }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M2 7l3 3 7-7"/></svg>
            Attendance saved · {totalAbsent} absent alert{totalAbsent !== 1 ? "s" : ""} queued for 6:00 PM digest
          </div>
        ) : (
          <div style={{
            background:"#fffbeb",border:"1px solid #fde68a",borderRadius:10,
            padding:"10px 14px",marginBottom:16,fontSize:12,color:"#92400e",
            display:"flex",alignItems:"center",gap:8,
          }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.75"><circle cx="7" cy="7" r="6"/><path d="M7 4.5v3.5l2 1"/></svg>
            All students default to <strong>Present</strong>. Click cells to toggle. Absent alerts fire at 6:00 PM.
          </div>
        )}

        {/* Subject bulk cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 10, marginBottom: 20 }}>
          {subjects.map(subj => {
            const { present, pct } = subjectStats(subj);
            return (
              <div key={subj} style={{
                background: "#fff", border: "1.5px solid var(--ln)", borderRadius: 12,
                padding: "12px 14px", boxShadow: "0 1px 3px rgba(28,25,23,.05)",
              }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ink)", marginBottom: 8 }}>{subj}</div>
                {/* Mini bar */}
                <div style={{ height: 4, background: "var(--ln)", borderRadius: 99, marginBottom: 6, overflow: "hidden" }}>
                  <div style={{ height:"100%", width:`${pct}%`, background: pct >= 90 ? "#2d7a5a" : pct >= 75 ? "#c07b1a" : "#b83030", borderRadius:99, transition:"width 300ms" }} />
                </div>
                <div style={{ fontSize: 11, color: "var(--ink3)", marginBottom: 8 }}>
                  {present}/{students.length} · {pct}%
                </div>
                <div style={{ display: "flex", gap: 5 }}>
                  <button
                    onClick={() => bulkSubject(subj, "present")}
                    style={{ flex:1,padding:"4px 0",fontSize:10.5,fontWeight:700,borderRadius:6,border:"1.5px solid #b8ddd0",background:"#d4ede3",color:"#1a5040",cursor:"pointer" }}
                  >All present</button>
                  <button
                    onClick={() => bulkSubject(subj, "absent")}
                    style={{ flex:1,padding:"4px 0",fontSize:10.5,fontWeight:700,borderRadius:6,border:"1.5px solid #f5c5c5",background:"#fceaea",color:"#b83030",cursor:"pointer" }}
                  >All absent</button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Student grid */}
        <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--ink3)", letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 10 }}>
          {batch.name} · {students.length} students
        </div>
        <div style={{ background: "#fff", border: "1.5px solid var(--ln)", borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 3px rgba(28,25,23,.05)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--cr)" }}>
                <th style={{ textAlign:"left",padding:"10px 14px",fontSize:11,fontWeight:700,color:"var(--ink3)",letterSpacing:".05em",textTransform:"uppercase",whiteSpace:"nowrap",width:160 }}>
                  Student
                </th>
                {subjects.map(subj => (
                  <th key={subj} style={{ textAlign:"center",padding:"10px 10px",fontSize:11,fontWeight:700,color:"var(--ink3)",letterSpacing:".04em",textTransform:"uppercase",whiteSpace:"nowrap" }}>
                    {subj.split(" ")[0]}
                  </th>
                ))}
                <th style={{ textAlign:"center",padding:"10px 12px",fontSize:11,fontWeight:700,color:"var(--ink3)",letterSpacing:".04em",textTransform:"uppercase" }}>
                  Today
                </th>
              </tr>
            </thead>
            <tbody>
              {students.map((s, si) => {
                const absentCount = subjects.filter(subj => getAtt(s.id, subj) === "absent").length;
                const allPresent  = absentCount === 0;
                return (
                  <tr key={s.id} style={{ borderTop: si > 0 ? "1px solid var(--ln)" : "none", background: absentCount > 0 ? "#fffbeb" : "#fff" }}>
                    <td style={{ padding: "10px 14px", cursor: "pointer" }} onClick={() => setViewProfile(s)}>
                      <div className="td-nm" style={{ transition: "all 150ms" }}>
                        <div className="ava" style={{ background: s.bg, color: s.fg, width: 26, height: 26, fontSize: 10, flexShrink: 0 }}>
                          {s.initials}
                        </div>
                        <div>
                          <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink)", textDecoration: "underline transparent" }} 
                            onMouseEnter={e => e.currentTarget.style.textDecoration = "underline"}
                            onMouseLeave={e => e.currentTarget.style.textDecoration = "underline transparent"}>
                            {s.name}
                          </div>
                          <div style={{ fontSize: 10, color: "var(--ink3)", fontFamily: "var(--font-mono)" }}>{s.attPct}% avg</div>
                        </div>
                      </div>
                    </td>
                    {subjects.map(subj => {
                      const val = getAtt(s.id, subj);
                      return (
                        <td key={subj} style={{ textAlign:"center", padding:"10px 8px" }}>
                          <button
                            onClick={() => { setStudentSubj(s.id, subj, val === "present" ? "absent" : "present"); setSaved(false); }}
                            style={{
                              width: 32, height: 28, borderRadius: 7, border: "1.5px solid",
                              borderColor: val === "present" ? "#b8ddd0" : "#f5c5c5",
                              background: val === "present" ? "#d4ede3" : "#fceaea",
                              color: val === "present" ? "#1a5040" : "#b83030",
                              fontWeight: 700, fontSize: 13, cursor: "pointer", transition: "all 120ms",
                            }}
                          >
                            {val === "present" ? "✓" : "✕"}
                          </button>
                        </td>
                      );
                    })}
                    <td style={{ textAlign:"center", padding:"10px 12px" }}>
                      <span style={{
                        fontSize: 10.5, fontWeight: 700, padding: "3px 8px", borderRadius: 7,
                        background: allPresent ? "#d4ede3" : "#fceaea",
                        color: allPresent ? "#1a5040" : "#b83030",
                      }}>
                        {allPresent ? "Full" : `${absentCount} absent`}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <StudentProfileModal student={viewProfile} onClose={() => setViewProfile(null)} />
    </PageShell>
  );
}
