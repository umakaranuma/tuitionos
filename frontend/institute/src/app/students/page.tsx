"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Topbar } from "@/components/layout/Topbar";
import { PageShell } from "@/components/layout/PageShell";
import { Modal } from "@/components/ui/Modal";
import { api } from "@/lib/api";

import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { Pagination } from "@/components/ui/Pagination";
import { useToast } from "@/components/ui/ToastProvider";
import { Avatar } from "@/components/ui/Avatar";
import { CroppableImageInput } from "@/components/ui/CroppableImageInput";
import { getStoredUser } from "@/lib/auth";

type Student = { id: number; name: string; initials: string; image?: string | null; parent_name: string; parent_mobile: string; has_whatsapp: boolean; batch: string; is_free: boolean; is_active: boolean; status: "active" | "passout" | "inactive"; join_date: string };

const STATUS_STYLE: Record<Student["status"], { bg: string; fg: string; label: string }> = {
  active: { bg: "#dcfce7", fg: "#15803d", label: "Active" },
  passout: { bg: "var(--sp-l)", fg: "var(--sp)", label: "Passout" },
  inactive: { bg: "var(--rb-l)", fg: "var(--rb)", label: "Inactive" },
};
type Batch = { id: number; name: string; display_name?: string };
type StudentStats = { active: number; passout: number; inactive: number; total: number };

const P: [string,string][] = [["var(--tc-l)","var(--tc-d)"],["var(--sp-l)","var(--sp)"],["var(--sf-l)","var(--sf)"],["var(--jd-l)","var(--jd)"],["var(--rb-l)","var(--rb)"]];

export default function StudentsPage() {
  const toast = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [stats, setStats] = useState<StudentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [studentStatus, setStudentStatus] = useState("active");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [meta, setMeta] = useState({ total_count: 0, total_pages: 1 });
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [editTarget, setEditTarget] = useState<Student | null>(null);
  const [form, setForm] = useState({ name: "", parent_name: "", parent_mobile: "", batch: "", has_whatsapp: true });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const loadStats = () => {
    api.get("/api/students/students/stats").then(r => setStats(r.data)).catch(() => setStats(null));
  };

  const load = () => {
    setUser(getStoredUser());
    setLoading(true);
    Promise.all([
      api.get(`/api/students/students?page=${page}&limit=${limit}&student_status=${studentStatus}${debouncedSearch ? `&search=${encodeURIComponent(debouncedSearch)}` : ''}`).then(r => {
        const d = r.data;
        if (d.total_count !== undefined) setMeta({ total_count: d.total_count, total_pages: d.total_pages });
        return Array.isArray(d) ? d : d.results || [];
      }),
      api.get("/api/academics/batches").then(r => { const d = r.data; return Array.isArray(d) ? d : d.results || []; })
    ]).then(([s, b]) => { setStudents(s); setBatches(b); setLoading(false); }).catch(() => setLoading(false));
    loadStats();
  };
  useEffect(load, [page, limit, debouncedSearch, studentStatus]);

  const searchBatches = (q: string) => {
    api.get(`/api/academics/batches?search=${encodeURIComponent(q)}`).then(r => {
      const d = r.data;
      setBatches(Array.isArray(d) ? d : d.results || []);
    });
  };

  const filtered = students;

  const openAdd = () => {
    setEditTarget(null);
    setForm({ name: "", parent_name: "", parent_mobile: "", batch: "", has_whatsapp: true });
    setImageFile(null);
    setModal("add");
  };

  const openEdit = (s: Student) => {
    setEditTarget(s);
    setForm({ name: s.name, parent_name: s.parent_name || "", parent_mobile: s.parent_mobile || "", batch: s.batch, has_whatsapp: s.has_whatsapp });
    setImageFile(null);
    setModal("edit");
  };

  const save = async () => {
    if (!form.name.trim()) {
      toast.error("Student name is required.");
      return;
    }
    if (!form.batch.trim()) {
      toast.error("Batch is required.");
      return;
    }
    try {
      const payload = new FormData();
      payload.append("name", form.name);
      payload.append("parent_name", form.parent_name);
      payload.append("parent_mobile", form.parent_mobile);
      payload.append("batch", form.batch);
      payload.append("has_whatsapp", form.has_whatsapp ? "true" : "false");
      if (imageFile) payload.append("image", imageFile);
      if (modal === "edit" && editTarget) {
        await api.patch(`/api/students/students/${editTarget.id}`, payload);
        toast.success("Student updated.");
      } else {
        await api.post("/api/students/students", payload);
        toast.success("Student added.");
      }
      setModal(null);
      setEditTarget(null);
      setImageFile(null);
      load();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data ? JSON.stringify(err.response.data) : "Failed to save student.");
    }
  };

  return (
    <PageShell>
      <Topbar title="Students" subtitle={`${meta.total_count} ${studentStatus === "all" ? "" : studentStatus + " "}students this year`}
        right={<>
          <select
            style={{ width: 160, padding: "6px 10px", borderRadius: 6, border: "1px solid var(--bdr)", background: "var(--bg)", color: "var(--ink)", outline: "none" }}
            value={studentStatus}
            onChange={e => { setStudentStatus(e.target.value); setPage(1); }}
          >
            <option value="active">Active Students</option>
            <option value="passout">Passout Students</option>
            <option value="inactive">Inactive Students</option>
            <option value="all">All Students</option>
          </select>
          <input placeholder="Search..." style={{ width: 180 }} value={search} onChange={e => setSearch(e.target.value)} />
          <button className="btn btn-p btn-sm" onClick={openAdd}>+ Add student</button>
        </>} />
      <div className="pb fi">
        {/* Real per-status counts for this academic year — independent of
            whichever filter/page is currently applied to the table below. */}
        {stats && (
          <div className="g4" style={{ marginBottom: 18 }}>
            <div className="kpi" style={{ "--kc": "var(--tc)" } as any}>
              <div className="kpi-lbl">Active</div>
              <div className="kpi-val">{stats.active}</div>
              <div className="kpi-tr nt">Enrolled this year</div>
            </div>
            <div className="kpi" style={{ "--kc": "var(--sp)" } as any}>
              <div className="kpi-lbl">Passout</div>
              <div className="kpi-val">{stats.passout}</div>
              <div className="kpi-tr nt">Left after last year</div>
            </div>
            <div className="kpi" style={{ "--kc": "var(--rb)" } as any}>
              <div className="kpi-lbl">Inactive</div>
              <div className="kpi-val">{stats.inactive}</div>
              <div className="kpi-tr nt">Never enrolled</div>
            </div>
            <div className="kpi" style={{ "--kc": "var(--sf)" } as any}>
              <div className="kpi-lbl">Total</div>
              <div className="kpi-val">{stats.total}</div>
              <div className="kpi-tr nt">All students</div>
            </div>
          </div>
        )}
        {loading ? <div style={{ textAlign: "center", padding: 40, color: "var(--ink3)" }}>Loading...</div> : (
          <div className="tw">
            <table>
              <thead><tr><th>Student</th><th>Batch</th><th>Status</th><th>Parent</th><th>Mobile</th><th>Actions</th></tr></thead>
              <tbody>
                {filtered.map((s, idx) => {
                  const [bg, fg] = P[idx % P.length];
                  const st = STATUS_STYLE[s.status] ?? STATUS_STYLE.inactive;
                  return (
                    <tr key={s.id}>
                      <td><div className="td-nm"><Avatar src={s.image} name={s.name} size={32} radius={8} bg={bg} fg={fg} />{s.name}</div></td>
                      <td style={{ color: "var(--ink3)" }}>{s.batch}</td>
                      <td><span className="bdg" style={{ background: st.bg, color: st.fg }}>{st.label}</span></td>
                      <td>{s.parent_name || "—"}</td>
                      <td className="mono">{s.parent_mobile}{s.has_whatsapp && " (WA)"}</td>
                      <td>
                        <div style={{ display: "flex", gap: 4 }}>
                          <Link href={`/students/${s.id}`}><button className="btn btn-xs btn-s">View</button></Link>
                          <button className="btn btn-xs btn-s" onClick={() => openEdit(s)}>Edit</button>
                        </div>
                      </td>
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

      <Modal open={modal !== null} onClose={() => { setModal(null); setEditTarget(null); }} title={modal === "edit" ? `Edit — ${editTarget?.name}` : "Add student"}
        footer={<><button className="btn btn-s btn-sm" onClick={() => { setModal(null); setEditTarget(null); }}>Cancel</button><button className="btn btn-p btn-sm" onClick={save}>{modal === "edit" ? "Save changes" : "Create"}</button></>}>
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
              options={batches.map(b => ({ value: b.name, label: b.display_name || b.name }))}
              onSearch={searchBatches}
            />
          </div>
          <div className="fg fg-full">
            <label className="flbl">Photo</label>
            {user?.institute?.plan === "institute_pro" ? (
              <CroppableImageInput
                value={editTarget?.image}
                name={form.name}
                onChange={setImageFile}
                hint="Click to upload a student photo"
              />
            ) : (
              <div style={{ padding: 16, background: "var(--w)", border: "1px solid var(--ln)", borderRadius: 12, display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ background: "var(--tc)", color: "white", padding: "4px 8px", borderRadius: 8, fontSize: 10, fontWeight: 700 }}>PRO</div>
                <div style={{ fontSize: 12.5, color: "var(--ink2)" }}>Upgrade to Institute Pro to upload student photos.</div>
              </div>
            )}
          </div>
        </div>
      </Modal>
    </PageShell>
  );
}
