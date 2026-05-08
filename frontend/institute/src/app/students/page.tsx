"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Topbar } from "@/components/layout/Topbar";
import { PageShell } from "@/components/layout/PageShell";
import { Modal } from "@/components/ui/Modal";
import { api } from "@/lib/api";

import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { Pagination } from "@/components/ui/Pagination";

type Student = { id: number; name: string; initials: string; parent_name: string; parent_mobile: string; has_whatsapp: boolean; batch: string; is_free: boolean; is_active: boolean; join_date: string };
type Batch = { id: number; name: string };

const P: [string,string][] = [["var(--tc-l)","var(--tc-d)"],["var(--sp-l)","var(--sp)"],["var(--sf-l)","var(--sf)"],["var(--jd-l)","var(--jd)"],["var(--rb-l)","var(--rb)"]];

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [meta, setMeta] = useState({ total_count: 0, total_pages: 1 });
  const [modal, setModal] = useState<"add" | null>(null);
  const [form, setForm] = useState({ name: "", parent_name: "", parent_mobile: "", batch: "", has_whatsapp: true });

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get(`/api/students/students?page=${page}&limit=${limit}${debouncedSearch ? `&search=${encodeURIComponent(debouncedSearch)}` : ''}`).then(r => { 
        const d = r.data; 
        if (d.total_count !== undefined) setMeta({ total_count: d.total_count, total_pages: d.total_pages });
        return Array.isArray(d) ? d : d.results || []; 
      }),
      api.get("/api/academics/batches").then(r => { const d = r.data; return Array.isArray(d) ? d : d.results || []; })
    ]).then(([s, b]) => { setStudents(s); setBatches(b); setLoading(false); }).catch(() => setLoading(false));
  };
  useEffect(load, [page, limit, debouncedSearch]);

  const searchBatches = (q: string) => {
    api.get(`/api/academics/batches?search=${encodeURIComponent(q)}`).then(r => {
      const d = r.data;
      setBatches(Array.isArray(d) ? d : d.results || []);
    });
  };

  const filtered = students;

  const save = async () => {
    if (!form.name.trim()) return;
    await api.post("/api/students/students", form);
    setModal(null); load();
  };

  return (
    <PageShell>
      <Topbar title="Students" subtitle={`${students.length} students`}
        right={<>
          <input placeholder="Search..." style={{ width: 180 }} value={search} onChange={e => setSearch(e.target.value)} />
          <button className="btn btn-p btn-sm" onClick={() => { setForm({ name: "", parent_name: "", parent_mobile: "", batch: "", has_whatsapp: true }); setModal("add"); }}>+ Add student</button>
        </>} />
      <div className="pb fi">
        {loading ? <div style={{ textAlign: "center", padding: 40, color: "var(--ink3)" }}>Loading...</div> : (
          <div className="tw">
            <table>
              <thead><tr><th>Student</th><th>Batch</th><th>Parent</th><th>Mobile</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {filtered.map((s, idx) => {
                  const [bg, fg] = P[idx % P.length];
                  return (
                    <tr key={s.id}>
                      <td><div className="td-nm"><div className="ava" style={{ background: bg, color: fg }}>{s.initials}</div>{s.name}</div></td>
                      <td style={{ color: "var(--ink3)" }}>{s.batch}</td>
                      <td>{s.parent_name || "—"}</td>
                      <td className="mono">{s.parent_mobile}{s.has_whatsapp && " (WA)"}</td>
                      <td>{s.is_free ? <span className="bdg b-trial">Free</span> : s.is_active ? <span className="bdg b-paid">Active</span> : <span className="bdg b-over">Inactive</span>}</td>
                      <td><Link href={`/students/${s.id}`}><button className="btn btn-xs btn-s">View</button></Link></td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && <tr><td colSpan={6} style={{ textAlign: "center", color: "var(--ink3)", padding: 24 }}>No students found</td></tr>}
              </tbody>
            </table>
            <Pagination 
              page={page} 
              limit={limit} 
              totalCount={meta.total_count} 
              totalPages={meta.total_pages} 
              onPageChange={setPage} 
              onLimitChange={l => { setLimit(l); setPage(1); }} 
              itemName="students" 
            />
          </div>
        )}
      </div>

      <Modal open={modal !== null} onClose={() => setModal(null)} title="Add student"
        footer={<><button className="btn btn-s btn-sm" onClick={() => setModal(null)}>Cancel</button><button className="btn btn-p btn-sm" onClick={save}>Create</button></>}>
        <div className="form-gap">
          <div><label className="flbl freq">Student name</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoFocus /></div>
          <div className="field-row">
            <div className="fg"><label className="flbl">Parent name</label><input value={form.parent_name} onChange={e => setForm(f => ({ ...f, parent_name: e.target.value }))} /></div>
            <div className="fg"><label className="flbl">Parent mobile</label><input value={form.parent_mobile} onChange={e => setForm(f => ({ ...f, parent_mobile: e.target.value }))} /></div>
          </div>
          <div>
            <label className="flbl">Batch</label>
            <SearchableSelect 
              value={form.batch} 
              onChange={val => setForm(f => ({ ...f, batch: String(val) }))}
              placeholder="Select batch..."
              options={batches.map(b => ({ value: b.name, label: b.name }))}
              onSearch={searchBatches}
            />
          </div>
        </div>
      </Modal>
    </PageShell>
  );
}
