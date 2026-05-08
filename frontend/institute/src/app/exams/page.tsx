"use client";
import { useState, useEffect } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { PageShell } from "@/components/layout/PageShell";
import { api } from "@/lib/api";

type Exam = { id: number; name: string; year: number; batch: number; batch_name: string; start_date: string; end_date: string; status: string; max_marks: number };

const statusBadge = (s: string) => {
  const map: Record<string, JSX.Element> = { completed: <span className="bdg b-paid">Completed</span>, upcoming: <span className="bdg b-trial">Upcoming</span>, ongoing: <span className="bdg b-due">Ongoing</span> };
  return map[s] || <span className="bdg b-due">{s}</span>;
};

export default function ExamsPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/api/academics/exams").then(r => {
      const d = r.data; setExams(Array.isArray(d) ? d : d.results || []); setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <PageShell>
      <Topbar title="Exams" subtitle={`${exams.length} exams`} right={<button className="btn btn-p btn-sm">+ Create exam</button>} />
      <div className="pb fi">
        {loading ? <div style={{ textAlign: "center", padding: 40, color: "var(--ink3)" }}>Loading...</div> : (
          <div className="g3">
            {exams.map(e => (
              <div key={e.id} className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>{e.name}</div>
                    <div style={{ fontSize: 11, color: "var(--ink3)", marginTop: 2 }}>{e.batch_name} · Year {e.year}</div>
                  </div>
                  {statusBadge(e.status)}
                </div>
                <div style={{ display: "flex", gap: 16, fontSize: 11.5, color: "var(--ink3)" }}>
                  <span className="mono">{e.start_date} — {e.end_date}</span>
                  <span>Max: {e.max_marks} marks</span>
                </div>
              </div>
            ))}
            {exams.length === 0 && <div className="card" style={{ textAlign: "center", color: "var(--ink3)", padding: 24 }}>No exams yet</div>}
          </div>
        )}
      </div>
    </PageShell>
  );
}
