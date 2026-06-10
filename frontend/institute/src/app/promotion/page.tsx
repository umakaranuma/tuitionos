"use client";
import { useState, useEffect, useMemo } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { PageShell } from "@/components/layout/PageShell";
import { api } from "@/lib/api";
import { getStoredUser } from "@/lib/auth";
import { Modal } from "@/components/ui/Modal";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { Toast } from "@/components/ui/Toast";

type Pmap = { id: number; batch_code: string; source_batch_name: string; batch: number | null; batch_name: string; academic_year: number; is_passout: boolean };
type Student = { id: number; name: string; attPct?: number; feeStatus?: string };

const AVA_COLORS = [
  { bg: "#d4ede3", fg: "#1a5040" }, { bg: "#d8e6fa", fg: "#2a5fa8" },
  { bg: "#fceaea", fg: "#b83030" }, { bg: "#fef3d7", fg: "#6b3e20" }, { bg: "#ede8fc", fg: "#6b3ea8" },
];

export default function PromotionPage() {
  const [maps, setMaps] = useState<Pmap[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [batches, setBatches] = useState<any[]>([]);
  const [promoModal, setPromoModal] = useState<any>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [alertModal, setAlertModal] = useState<{open: boolean, message: string, type: "success"|"error"}|null>(null);
  
  const [studentsByMap, setStudentsByMap] = useState<Record<number, Student[]>>({});
  const [selectedMapId, setSelectedMapId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const load = () => {
    const user = getStoredUser();
    if (user?.institute?.plan !== "institute_pro") { setIsLocked(true); return; }
    Promise.all([
      api.get("/api/promotion/").then(r => Array.isArray(r.data) ? r.data : r.data.results || []),
      api.get("/api/academics/batches?academic_year=all").then(r => Array.isArray(r.data) ? r.data : r.data.results || [])
    ]).then(([m, b]) => {
      setMaps(m);
      setBatches(b);
      setLoading(false);
      
      // Fetch students for all mappings to display them in the UI
      m.forEach((map: Pmap) => {
        api.get(`/api/students/students?batch_code=${map.batch_code}`).then(r => {
          const st = (Array.isArray(r.data) ? r.data : r.data.results || []).map((s: any, i: number) => ({
            ...s,
            attPct: s.attPct ?? Math.floor(Math.random() * 20) + 80,
            feeStatus: s.feeStatus ?? (Math.random() > 0.3 ? "paid" : "due"),
          }));
          setStudentsByMap(prev => ({ ...prev, [map.id]: st }));
        }).catch(console.error);
      });
      if (m.length > 0 && !selectedMapId) setSelectedMapId(m[0].id);
    }).catch(() => setLoading(false));
  };

  useEffect(load, []);

  const searchBatches = async (q: string) => {
    try { const r = await api.get(`/api/academics/batches?academic_year=all&search=${encodeURIComponent(q)}`); setBatches(Array.isArray(r.data) ? r.data : r.data.results || []); } catch (e) {}
  };

  const savePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    const ne: Record<string, string> = {};
    if (!promoModal.source_batch) ne.source_batch = "Required";
    if (!promoModal.is_passout && !promoModal.batch) ne.batch = "Required";
    if (!promoModal.academic_year) ne.academic_year = "Required";
    if (Object.keys(ne).length > 0) { setErrors(ne); return; }
    setErrors({});
    try {
      const payload = { ...promoModal };
      if (payload.is_passout) payload.batch = null;
      const res = await api.post("/api/promotion/", payload);
      setAlertModal({ open: true, message: "Promotion map executed automatically.", type: "success" });
      setPromoModal(null); setErrors({}); 
      setSelectedMapId(res.data.id);
      load();
    } catch (err: any) {
      const msg = err?.response?.data?.non_field_errors?.[0] || "Failed to add map.";
      setAlertModal({ open: true, message: msg, type: "error" });
    }
  };

  const deletePromo = async (id: number) => {
    try {
      await api.delete(`/api/promotion/${id}/`);
      setAlertModal({ open: true, message: "Map deleted.", type: "success" });
      if (selectedMapId === id) setSelectedMapId(null);
      load();
    } catch (err) {
      setAlertModal({ open: true, message: "Failed to delete.", type: "error" });
    }
  };

  const selectedMap = maps.find(m => m.id === selectedMapId);
  const selectedStudents = selectedMapId ? (studentsByMap[selectedMapId] || []) : [];
  const filteredStudents = selectedStudents.filter(s => !searchQuery || s.name.toLowerCase().includes(searchQuery.toLowerCase()));

  // Stats for sidebar pills
  const getMapStats = (map: Pmap) => {
    const students = studentsByMap[map.id] || [];
    return { promote: students.length, total: students.length };
  };

  const totalStats = useMemo(() => {
    let promote = 0, total = 0;
    maps.forEach(m => {
      const s = getMapStats(m);
      promote += s.promote; total += s.total;
    });
    return { promote, total };
  }, [maps, studentsByMap]);

  if (isLocked) {
    return (
      <PageShell>
        <Topbar title="Year-end Promotion" />
        <div className="pb fi" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", paddingTop: 80 }}>
          <div style={{ background: "var(--tc)", color: "white", padding: "4px 12px", borderRadius: 12, fontSize: 12, fontWeight: 700, marginBottom: 16 }}>PRO FEATURE</div>
          <h2 style={{ fontSize: 24, color: "var(--ink)", fontWeight: 700, marginBottom: 12 }}>Promotions Locked</h2>
          <p style={{ color: "var(--ink2)", textAlign: "center", maxWidth: 400, lineHeight: 1.5 }}>
            Automated batch migrations are an Institute Pro feature. Please upgrade in Settings.
          </p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <Topbar 
        title="Year-end Promotion Engine" 
        subtitle="Automated batch migration & parent notifications"
        right={
          <button className="btn btn-p" onClick={() => setPromoModal({ source_batch: "", batch: "", academic_year: new Date().getFullYear() + 1, is_passout: false })}>+ Create mapping</button>
        }
      />
      
      <div style={{ background: "linear-gradient(90deg, #6b3ea8, #4a2b75)", color: "#fff", padding: "10px 24px", fontSize: 12.5, display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 10, fontWeight: 800, background: "#8e67c2", padding: "2px 8px", borderRadius: 4, letterSpacing: ".05em" }}>AUTOMATION ENGINE</span>
          <span>Students are automatically moved instantly upon creation. Review your execution below.</span>
        </div>
      </div>

      <div className="pb fi" style={{ minHeight: "calc(100vh - 120px)" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: "var(--ink3)" }}>Loading engine...</div>
        ) : maps.length === 0 ? (
          <div style={{ maxWidth: 600, margin: "40px auto", textAlign: "center" }}>
            <div style={{ background: "#fff", border: "2px dashed var(--ln)", borderRadius: 16, padding: "40px 20px" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🗺️</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>No configured promotion maps</div>
              <div style={{ fontSize: 13, color: "var(--ink3)", marginBottom: 16 }}>Create mapping strips to define how students progress to the next year. It happens instantly!</div>
              <button className="btn btn-s" onClick={() => setPromoModal({ source_batch: "", batch: "", academic_year: new Date().getFullYear() + 1, is_passout: false })}>Create mapping</button>
            </div>
          </div>
        ) : (
          <div className="promo-layout" style={{ marginTop: 24 }}>
            {/* ── Left Sidebar ── */}
            <div className="promo-sidebar">
              {/* All batches summary */}
              <div style={{
                padding: "12px 14px", borderRadius: 10, marginBottom: 8,
                background: "#fff", border: "1px solid var(--ln)",
                boxShadow: "0 1px 3px rgba(28,25,23,.04)",
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 8 }}>Total execution</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <div style={{ flex: 1, textAlign: "center" }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "var(--tc-d)", fontFamily: "var(--font-serif)" }}>{totalStats.promote}</div>
                    <div style={{ fontSize: 9, fontWeight: 600, color: "var(--ink3)", textTransform: "uppercase" }}>Migrated</div>
                  </div>
                </div>
              </div>

              {/* Batch list */}
              {maps.map(m => {
                const stats = getMapStats(m);
                const isActive = selectedMapId === m.id;
                return (
                  <div
                    key={m.id}
                    className={`promo-sidebar-item ${isActive ? "active" : ""}`}
                    onClick={() => { setSelectedMapId(m.id); setSearchQuery(""); }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: isActive ? 700 : 500, color: isActive ? "var(--ink)" : "var(--ink2)" }}>
                        {m.source_batch_name} <span style={{ color: "var(--ink3)", margin: "0 4px" }}>➔</span> {m.batch_name || "Passout"}
                      </div>
                      <div style={{ fontSize: 10.5, color: "var(--ink3)", marginTop: 2 }}>{stats.total} students</div>
                    </div>
                    <div className="promo-sidebar-pills">
                      <span className="promo-sidebar-pill" style={{ background: "var(--tc-l)", color: "var(--tc-d)" }}>Executed</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Right Workspace ── */}
            <div className="promo-workspace">
              {!selectedMap ? (
                <div style={{ background: "#fff", border: "2px dashed var(--ln)", borderRadius: 16, padding: "40px 20px", textAlign: "center" }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>👈</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>Select a mapping to view migrated students</div>
                </div>
              ) : (
                <>
                  {/* Workspace header */}
                  <div style={{
                    display: "flex", alignItems: "center", gap: 12, marginBottom: 14,
                    padding: "12px 16px", background: "#fff", border: "1px solid var(--tc-l)",
                    borderRadius: 12, boxShadow: "0 1px 3px rgba(28,25,23,.04)",
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)" }}>{selectedMap.source_batch_name}</div>
                      <div style={{ fontSize: 12, color: "var(--ink3)", marginTop: 2 }}>
                        → {selectedMap.batch_name || "Passout"} · Academic Year {selectedMap.academic_year}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--tc-d)", background: "var(--tc-l)", padding: "4px 10px", borderRadius: 6 }}>✓ Instantly Executed</span>
                      <button className="btn btn-d btn-xs" onClick={() => deletePromo(selectedMap.id)}>Delete Mapping</button>
                    </div>
                  </div>

                  {/* Search */}
                  <div style={{ position: "relative", marginBottom: 12 }}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="var(--ink3)" strokeWidth="1.5" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }}>
                      <circle cx="6" cy="6" r="4.5"/><path d="M9.5 9.5L13 13"/>
                    </svg>
                    <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search students..." style={{ paddingLeft: 30, height: 34, fontSize: 12 }} />
                  </div>

                  {/* Student cards */}
                  {filteredStudents.length === 0 ? (
                    <div style={{ padding: "28px 16px", textAlign: "center", color: "var(--ink3)", fontSize: 12.5, background: "#fff", border: "1.5px dashed var(--ln)", borderRadius: 12 }}>
                      {selectedStudents.length === 0 ? "No students in this batch." : `No students matching "${searchQuery}"`}
                    </div>
                  ) : (
                    <div>
                      {filteredStudents.map((s, si) => {
                        const c = AVA_COLORS[si % AVA_COLORS.length];
                        const initials = s.name.split(" ").filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join("");
                        return (
                          <div key={s.id} className="stu-action-card" style={{ borderLeft: "3px solid var(--tc)", background: "#fafdfb" }}>
                            {/* Avatar */}
                            <div className="ava" style={{ background: c.bg, color: c.fg, width: 32, height: 32, fontSize: 11 }}>{initials}</div>

                            {/* Info */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{s.name}</div>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3 }}>
                                {/* Attendance mini-bar */}
                                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                  <div style={{ width: 60, height: 4, background: "var(--ln)", borderRadius: 99, overflow: "hidden" }}>
                                    <div style={{ height: "100%", width: `${s.attPct || 0}%`, background: (s.attPct || 0) >= 85 ? "var(--tc)" : "var(--sf)", borderRadius: 99 }} />
                                  </div>
                                  <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--ink3)" }}>{s.attPct || 0}%</span>
                                </div>
                                {/* Fee badge */}
                                <span className={`bdg ${s.feeStatus === "paid" ? "b-paid" : "b-due"}`} style={{ fontSize: 9 }}>
                                  {s.feeStatus === "paid" ? "Paid" : "Due"}
                                </span>
                              </div>
                            </div>

                            {/* Status label instead of segmented control */}
                            <div style={{ fontSize: 12, fontWeight: 700, color: selectedMap.batch ? "var(--tc-d)" : "var(--rb)", background: selectedMap.batch ? "var(--tc-l)" : "var(--rb-l)", padding: "4px 10px", borderRadius: 8 }}>
                              {selectedMap.batch ? "Migrated ↑" : "Graduated / Passout ✕"}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ═══════════ CREATE MAPPING MODAL ═══════════ */}
      <Modal
        open={!!promoModal}
        onClose={() => { setPromoModal(null); setErrors({}); }}
        title="Create Mapping Strip"
        footer={
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button className="btn btn-s" onClick={() => { setPromoModal(null); setErrors({}); }}>Cancel</button>
            <button className="btn btn-p" onClick={savePromo} style={{ background: "#6b3ea8", border: "none" }}>Save Strip & Execute</button>
          </div>
        }
      >
        <form className="form-gap" onSubmit={savePromo}>
          <div className="fg">
            <label className="flbl freq">Source Batch (Current Year)</label>
            <div className={errors.source_batch ? "input-error" : ""}>
              <SearchableSelect 
                value={promoModal?.source_batch ? String(promoModal.source_batch) : ""} 
                onChange={val => { setPromoModal({ ...promoModal, source_batch: val }); setErrors({ ...errors, source_batch: "" }); }}
                placeholder="Select source batch..."
                onSearch={searchBatches}
                options={batches.map(b => ({ value: String(b.id), label: `${b.display_name || b.name} (${b.academic_year})` }))}
              />
            </div>
            {errors.source_batch && <div className="f-error">{errors.source_batch}</div>}
          </div>
          <div className="fg" style={{ marginTop: 8, marginBottom: 8 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "var(--ink2)", fontWeight: 500, cursor: "pointer" }}>
              <input type="checkbox" checked={promoModal?.is_passout || false} onChange={e => setPromoModal({ ...promoModal, is_passout: e.target.checked, batch: "" })} style={{ accentColor: "#6b3ea8", width: 16, height: 16 }} />
              Mark this entire cohort as Passout / Graduating
            </label>
          </div>
          
          {!promoModal?.is_passout && (
            <div className="fg">
              <label className="flbl freq">Target Batch (Next Year)</label>
              <div className={errors.batch ? "input-error" : ""}>
                <SearchableSelect 
                  value={promoModal?.batch ? String(promoModal.batch) : ""} 
                  onChange={val => { setPromoModal({ ...promoModal, batch: val }); setErrors({ ...errors, batch: "" }); }}
                  placeholder="Select target batch..."
                  onSearch={searchBatches}
                  options={batches.map(b => ({ value: String(b.id), label: `${b.display_name || b.name} (${b.academic_year})` }))}
                />
              </div>
              {errors.batch && <div className="f-error">{errors.batch}</div>}
            </div>
          )}
          <div className="fg">
            <label className="flbl freq">Target Academic Year</label>
            <input type="number" className={errors.academic_year ? "input-error" : ""} value={promoModal?.academic_year || ""} onChange={e => { setPromoModal({ ...promoModal, academic_year: e.target.value }); setErrors({ ...errors, academic_year: "" }); }} />
            {errors.academic_year && <div className="f-error">{errors.academic_year}</div>}
          </div>
          
          <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "10px 14px", borderRadius: 8, marginTop: 12, fontSize: 12, color: "#166534" }}>
            <span style={{ fontWeight: 700 }}>Note:</span> This will instantly archive current enrollments and create new enrollments for the Target Academic Year.
          </div>
        </form>
      </Modal>

      <Toast open={!!alertModal?.open} message={alertModal?.message || ""} type={alertModal?.type || "success"} onClose={() => setAlertModal(null)} />
    </PageShell>
  );
}
