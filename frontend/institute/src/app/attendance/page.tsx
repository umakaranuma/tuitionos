"use client";
import { useState, useEffect } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { PageShell } from "@/components/layout/PageShell";
import { api } from "@/lib/api";
import { SearchableSelect } from "@/components/ui/SearchableSelect";

type Attendance = { id: number; student: number; student_name: string; batch: number; date: string; is_present: boolean; marked_at: string };
type Batch = { id: number; name: string };

export default function AttendancePage() {
  const [records, setRecords] = useState<Attendance[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBatch, setSelectedBatch] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);

  const load = () => {
    const params: Record<string, string> = { date: selectedDate };
    if (selectedBatch) params.batch = selectedBatch;
    Promise.all([
      api.get("/api/attendance/", { params }).then(r => { const d = r.data; return Array.isArray(d) ? d : d.results || []; }),
      api.get("/api/academics/batches").then(r => { const d = r.data; return Array.isArray(d) ? d : d.results || []; }),
    ]).then(([a, b]) => { setRecords(a); setBatches(b); setLoading(false); });
  };
  useEffect(load, [selectedBatch, selectedDate]);

  const searchBatches = async (q: string) => {
    try {
      const r = await api.get(`/api/academics/batches?search=${encodeURIComponent(q)}`);
      setBatches(Array.isArray(r.data) ? r.data : r.data.results || []);
    } catch (e) {}
  };

  const present = records.filter(r => r.is_present).length;
  const absent = records.filter(r => !r.is_present).length;
  const rate = records.length > 0 ? Math.round((present / records.length) * 100) : 0;

  return (
    <PageShell>
      <Topbar title="Attendance" subtitle={`${selectedDate} · ${records.length} records`}
        right={<div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="date" value={selectedDate} onChange={e => { setSelectedDate(e.target.value); setLoading(true); }} />
          <div style={{ minWidth: 160 }}>
            <SearchableSelect 
              value={selectedBatch} 
              onChange={val => { setSelectedBatch(String(val)); setLoading(true); }}
              placeholder="All batches"
              onSearch={searchBatches}
              options={[{ value: "", label: "All batches" }, ...batches.map(b => ({ value: b.id, label: b.name }))]}
            />
          </div>
        </div>} />
      <div className="pb fi">
        <div className="g4" style={{ marginBottom: 18 }}>
          <div className="kpi" style={{ "--kc": "var(--tc)" } as any}><div className="kpi-lbl">Present</div><div className="kpi-val">{present}</div><div className="kpi-tr up">students</div></div>
          <div className="kpi" style={{ "--kc": "var(--rb)" } as any}><div className="kpi-lbl">Absent</div><div className="kpi-val">{absent}</div><div className="kpi-tr dn">students</div></div>
          <div className="kpi" style={{ "--kc": "var(--jd)" } as any}><div className="kpi-lbl">Rate</div><div className="kpi-val">{rate}%</div><div className="kpi-tr nt">today</div></div>
          <div className="kpi" style={{ "--kc": "var(--sf)" } as any}><div className="kpi-lbl">Total</div><div className="kpi-val">{records.length}</div><div className="kpi-tr nt">marked</div></div>
        </div>

        {loading ? <div style={{ textAlign: "center", padding: 40, color: "var(--ink3)" }}>Loading...</div> : (
          <div className="tw">
            <table>
              <thead><tr><th>Student</th><th>Status</th><th>Marked at</th></tr></thead>
              <tbody>
                {records.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600 }}>{r.student_name}</td>
                    <td>{r.is_present ? <span className="bdg b-paid">Present</span> : <span className="bdg b-over">Absent</span>}</td>
                    <td className="mono" style={{ color: "var(--ink3)" }}>{r.marked_at ? new Date(r.marked_at).toLocaleTimeString() : "—"}</td>
                  </tr>
                ))}
                {records.length === 0 && <tr><td colSpan={3} style={{ textAlign: "center", color: "var(--ink3)", padding: 24 }}>No attendance records for this date</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PageShell>
  );
}
