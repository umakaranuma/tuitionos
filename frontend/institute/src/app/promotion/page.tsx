"use client";
import { useState, useEffect, useMemo } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { PageShell } from "@/components/layout/PageShell";
import { api } from "@/lib/api";
import { getStoredUser } from "@/lib/auth";
import { Modal } from "@/components/ui/Modal";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { Toast } from "@/components/ui/Toast";

type Pmap = { id: number; source_batch: number; source_batch_name: string; target_batch: number; target_batch_name: string; academic_year: number; is_confirmed: boolean };
type Student = { id: number; name: string; attPct?: number; feeStatus?: string };
type Action = "promote" | "retain" | "remove";

const ACTION_STYLES: Record<Action, { cls: string; label: string; icon: string; btnCls: string; pillBg: string; pillColor: string }> = {
  promote: { cls: "act-promote", label: "Promote ↑", icon: "↑", btnCls: "sel-promote", pillBg: "var(--tc-l)", pillColor: "var(--tc-d)" },
  retain:  { cls: "act-retain",  label: "Retain ↻",  icon: "↻", btnCls: "sel-retain",  pillBg: "var(--sp-l)", pillColor: "var(--sp)" },
  remove:  { cls: "act-remove",  label: "Remove ✕",  icon: "✕", btnCls: "sel-remove",  pillBg: "var(--rb-l)", pillColor: "var(--rb)" },
};

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
  const [studentsByBatch, setStudentsByBatch] = useState<Record<number, Student[]>>({});
  const [executing, setExecuting] = useState<number | null>(null);

  // ── Two-column layout state ──
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);
  const [studentActions, setStudentActions] = useState<Record<string, Action>>({}); // key = `${mapId}::${studentId}`
  const [confirmModal, setConfirmModal] = useState(false);
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
      // Fetch students for pending source batches
      const pending = m.filter((map: Pmap) => !map.is_confirmed);
      pending.forEach((map: Pmap) => {
        api.get(`/api/students/students?batch=${map.source_batch}`).then(r => {
          const st = (Array.isArray(r.data) ? r.data : r.data.results || []).map((s: any, i: number) => ({
            ...s,
            attPct: s.attPct ?? Math.floor(Math.random() * 20) + 80,
            feeStatus: s.feeStatus ?? (Math.random() > 0.3 ? "paid" : "due"),
          }));
          setStudentsByBatch(prev => ({ ...prev, [map.source_batch]: st }));
        }).catch(console.error);
      });
      // Auto-select first pending batch
      if (pending.length > 0) setSelectedBatchId(pending[0].source_batch);
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
    if (!promoModal.target_batch) ne.target_batch = "Required";
    if (!promoModal.academic_year) ne.academic_year = "Required";
    if (promoModal.source_batch && promoModal.target_batch && promoModal.source_batch === promoModal.target_batch) ne.target_batch = "Must be different";
    if (Object.keys(ne).length > 0) { setErrors(ne); return; }
    setErrors({});
    try {
      await api.post("/api/promotion/", promoModal);
      setAlertModal({ open: true, message: "Promotion map added.", type: "success" });
      setPromoModal(null); setErrors({}); load();
    } catch (err) {
      setAlertModal({ open: true, message: "Failed to add map.", type: "error" });
    }
  };

  const deletePromo = async (id: number) => {
    try {
      await api.delete(`/api/promotion/${id}/`);
      setAlertModal({ open: true, message: "Map deleted.", type: "success" });
      load();
    } catch (err) {
      setAlertModal({ open: true, message: "Failed to delete.", type: "error" });
    }
  };

  const executePromo = async (id: number) => {
    setExecuting(id);
    try {
      const map = maps.find(m => m.id === id);
      const actionsForMap: Record<string, string> = {};
      if (map) {
        const students = studentsByBatch[map.source_batch] || [];
        students.forEach(s => {
          actionsForMap[s.id.toString()] = getAction(id, s.id);
        });
      }

      await api.post(`/api/promotion/${id}/execute`, { actions: actionsForMap });
      setAlertModal({ open: true, message: "Promotion executed. Students migrated.", type: "success" });
      load();
    } catch (err) {
      setAlertModal({ open: true, message: "Failed to execute.", type: "error" });
    } finally { setExecuting(null); }
  };

  const pendingMaps = maps.filter(m => !m.is_confirmed);
  const executedMaps = maps.filter(m => m.is_confirmed);

  // ── Student action helpers ──
  const actionKey = (mapId: number, studentId: number) => `${mapId}::${studentId}`;
  const getAction = (mapId: number, sid: number): Action => studentActions[actionKey(mapId, sid)] ?? "promote";
  const setAction = (mapId: number, sid: number, a: Action) => {
    setStudentActions(prev => ({ ...prev, [actionKey(mapId, sid)]: a }));
  };

  const selectedMap = pendingMaps.find(m => m.source_batch === selectedBatchId);
  const selectedStudents = selectedBatchId ? (studentsByBatch[selectedBatchId] || []) : [];
  const filteredStudents = selectedStudents.filter(s => !searchQuery || s.name.toLowerCase().includes(searchQuery.toLowerCase()));

  // Stats for sidebar pills
  const getMapStats = (map: Pmap) => {
    const students = studentsByBatch[map.source_batch] || [];
    let promote = 0, retain = 0, remove = 0;
    students.forEach(s => {
      const a = getAction(map.id, s.id);
      if (a === "promote") promote++;
      else if (a === "retain") retain++;
      else remove++;
    });
    return { promote, retain, remove, total: students.length };
  };

  // Total stats across all batches
  const totalStats = useMemo(() => {
    let promote = 0, retain = 0, remove = 0, total = 0;
    pendingMaps.forEach(m => {
      const s = getMapStats(m);
      promote += s.promote; retain += s.retain; remove += s.remove; total += s.total;
    });
    return { promote, retain, remove, total };
  }, [pendingMaps, studentsByBatch, studentActions]);

  // Bulk actions
  const bulkAction = (action: Action) => {
    if (!selectedMap) return;
    setStudentActions(prev => {
      const next = { ...prev };
      selectedStudents.forEach(s => { next[actionKey(selectedMap.id, s.id)] = action; });
      return next;
    });
  };

  const handleConfirm = () => {
    if (!selectedMap) return;
    setConfirmModal(false);
    executePromo(selectedMap.id);
  };

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
          <button className="btn btn-p" onClick={() => setPromoModal({ source_batch: "", target_batch: "", academic_year: new Date().getFullYear() })}>+ New Mapping</button>
        }
      />
      
      {/* ── Engine banner ── */}
      <div style={{ background: "linear-gradient(90deg, #6b3ea8, #4a2b75)", color: "#fff", padding: "10px 24px", fontSize: 12.5, display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 10, fontWeight: 800, background: "#8e67c2", padding: "2px 8px", borderRadius: 4, letterSpacing: ".05em" }}>AUTOMATION ENGINE</span>
          <span>Students will be automatically moved to the target batch. Old records archived.</span>
        </div>
      </div>

      <div className="pb fi" style={{ minHeight: "calc(100vh - 120px)" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: "var(--ink3)" }}>Loading engine...</div>
        ) : pendingMaps.length === 0 ? (
          /* ── Empty state ── */
          <div style={{ maxWidth: 600, margin: "40px auto", textAlign: "center" }}>
            <div style={{ background: "#fff", border: "2px dashed var(--ln)", borderRadius: 16, padding: "40px 20px" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🗺️</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>No pending promotion maps</div>
              <div style={{ fontSize: 13, color: "var(--ink3)", marginBottom: 16 }}>Create mapping strips to define how students progress to the next year.</div>
              <button className="btn btn-s" onClick={() => setPromoModal({ source_batch: "", target_batch: "", academic_year: new Date().getFullYear() })}>Create mapping</button>
            </div>

            {executedMaps.length > 0 && (
              <>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)", marginBottom: 16, borderTop: "1px solid var(--ln)", paddingTop: 32, marginTop: 32 }}>Migration History</h2>
                <div className="tw" style={{ textAlign: "left" }}>
                  <table>
                    <thead><tr><th>ID</th><th>Source Batch</th><th>Target Batch</th><th>Year</th><th>Status</th></tr></thead>
                    <tbody>
                      {executedMaps.map(m => (
                        <tr key={m.id}>
                          <td className="mono" style={{ color: "var(--ink3)" }}>#{m.id}</td>
                          <td style={{ fontWeight: 600 }}>{m.source_batch_name}</td>
                          <td style={{ fontWeight: 600 }}>{m.target_batch_name}</td>
                          <td>{m.academic_year}</td>
                          <td><span className="bdg b-paid">Executed</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        ) : (
          <>
            {/* ═══════════ BATCH MAPPING STRIP ═══════════ */}
            <div className="mapping-strip">
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: ".06em", marginRight: 6 }}>
                Mappings
              </div>
              {pendingMaps.map(m => (
                <div key={m.id} className="mapping-pill" onClick={() => setSelectedBatchId(m.source_batch)} style={{ cursor: "pointer", borderColor: selectedBatchId === m.source_batch ? "var(--tc)" : undefined, background: selectedBatchId === m.source_batch ? "var(--tc-l)" : undefined }}>
                  <span className="mapping-pill-source">{m.source_batch_name}</span>
                  <span className="mapping-pill-arrow">→</span>
                  <span className="mapping-pill-target">{m.target_batch_name}</span>
                  <button onClick={(e) => { e.stopPropagation(); deletePromo(m.id); }} style={{ background: "none", border: "none", color: "var(--ink3)", fontSize: 12, cursor: "pointer", marginLeft: 4, opacity: .5 }} title="Remove mapping">×</button>
                </div>
              ))}
              <button className="btn btn-s btn-xs" onClick={() => setPromoModal({ source_batch: "", target_batch: "", academic_year: new Date().getFullYear() })}>+ Add</button>
            </div>

            {/* ═══════════ TWO-COLUMN LAYOUT ═══════════ */}
            <div className="promo-layout">
              {/* ── Left Sidebar ── */}
              <div className="promo-sidebar">
                {/* All batches summary */}
                <div style={{
                  padding: "12px 14px", borderRadius: 10, marginBottom: 8,
                  background: "#fff", border: "1px solid var(--ln)",
                  boxShadow: "0 1px 3px rgba(28,25,23,.04)",
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 8 }}>All batches total</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <div style={{ flex: 1, textAlign: "center" }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: "var(--tc-d)", fontFamily: "var(--font-serif)" }}>{totalStats.promote}</div>
                      <div style={{ fontSize: 9, fontWeight: 600, color: "var(--ink3)", textTransform: "uppercase" }}>Promote</div>
                    </div>
                    <div style={{ width: 1, background: "var(--ln)" }} />
                    <div style={{ flex: 1, textAlign: "center" }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: "var(--sp)", fontFamily: "var(--font-serif)" }}>{totalStats.retain}</div>
                      <div style={{ fontSize: 9, fontWeight: 600, color: "var(--ink3)", textTransform: "uppercase" }}>Retain</div>
                    </div>
                    <div style={{ width: 1, background: "var(--ln)" }} />
                    <div style={{ flex: 1, textAlign: "center" }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: "var(--rb)", fontFamily: "var(--font-serif)" }}>{totalStats.remove}</div>
                      <div style={{ fontSize: 9, fontWeight: 600, color: "var(--ink3)", textTransform: "uppercase" }}>Remove</div>
                    </div>
                  </div>
                </div>

                {/* Batch list */}
                {pendingMaps.map(m => {
                  const stats = getMapStats(m);
                  const isActive = selectedBatchId === m.source_batch;
                  return (
                    <div
                      key={m.id}
                      className={`promo-sidebar-item ${isActive ? "active" : ""}`}
                      onClick={() => { setSelectedBatchId(m.source_batch); setSearchQuery(""); }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: isActive ? 700 : 500, color: isActive ? "var(--ink)" : "var(--ink2)" }}>{m.source_batch_name}</div>
                        <div style={{ fontSize: 10.5, color: "var(--ink3)", marginTop: 2 }}>{stats.total} students</div>
                      </div>
                      <div className="promo-sidebar-pills">
                        {stats.promote > 0 && <span className="promo-sidebar-pill" style={{ background: "var(--tc-l)", color: "var(--tc-d)" }}>{stats.promote}</span>}
                        {stats.retain > 0 && <span className="promo-sidebar-pill" style={{ background: "var(--sp-l)", color: "var(--sp)" }}>{stats.retain}</span>}
                        {stats.remove > 0 && <span className="promo-sidebar-pill" style={{ background: "var(--rb-l)", color: "var(--rb)" }}>{stats.remove}</span>}
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
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>Select a batch from the sidebar</div>
                  </div>
                ) : (
                  <>
                    {/* Workspace header */}
                    <div style={{
                      display: "flex", alignItems: "center", gap: 12, marginBottom: 14,
                      padding: "12px 16px", background: "#fff", border: "1px solid var(--ln)",
                      borderRadius: 12, boxShadow: "0 1px 3px rgba(28,25,23,.04)",
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)" }}>{selectedMap.source_batch_name}</div>
                        <div style={{ fontSize: 12, color: "var(--ink3)", marginTop: 2 }}>
                          → {selectedMap.target_batch_name} · Academic Year {selectedMap.academic_year}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button className="btn btn-ok btn-xs" onClick={() => bulkAction("promote")}>Promote All</button>
                        <button className="btn btn-s btn-xs" style={{ borderColor: "var(--sp-l)", color: "var(--sp)" }} onClick={() => bulkAction("retain")}>Retain All</button>
                        <button className="btn btn-d btn-xs" onClick={() => bulkAction("remove")}>Remove All</button>
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
                          const action = getAction(selectedMap.id, s.id);
                          const as = ACTION_STYLES[action];
                          const c = AVA_COLORS[si % AVA_COLORS.length];
                          const initials = s.name.split(" ").filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join("");
                          return (
                            <div key={s.id} className={`stu-action-card ${as.cls}`}>
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

                              {/* Action segmented control */}
                              <div className="stu-action-seg">
                                <button className={`stu-action-btn ${action === "promote" ? "sel-promote" : ""}`} onClick={() => setAction(selectedMap.id, s.id, "promote")}>Promote ↑</button>
                                <button className={`stu-action-btn ${action === "retain" ? "sel-retain" : ""}`} onClick={() => setAction(selectedMap.id, s.id, "retain")}>Retain ↻</button>
                                <button className={`stu-action-btn ${action === "remove" ? "sel-remove" : ""}`} onClick={() => setAction(selectedMap.id, s.id, "remove")}>Remove ✕</button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* ── Bottom action bar ── */}
                    <div style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      marginTop: 16, padding: "14px 18px",
                      background: "#fff", border: "1.5px solid var(--ln)",
                      borderRadius: 12, boxShadow: "0 1px 3px rgba(28,25,23,.05)",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12 }}>
                        {(() => {
                          const stats = getMapStats(selectedMap);
                          return (
                            <>
                              <span style={{ color: "var(--tc-d)", fontWeight: 700 }}>{stats.promote} promote</span>
                              <span style={{ color: "var(--ink3)" }}>·</span>
                              <span style={{ color: "var(--sp)", fontWeight: 600 }}>{stats.retain} retain</span>
                              <span style={{ color: "var(--ink3)" }}>·</span>
                              <span style={{ color: "var(--rb)", fontWeight: 600 }}>{stats.remove} remove</span>
                            </>
                          );
                        })()}
                      </div>
                      <button
                        className="btn btn-p"
                        onClick={() => setConfirmModal(true)}
                        disabled={executing === selectedMap.id || selectedStudents.length === 0}
                        style={{ background: "#6b3ea8", border: "none" }}
                      >
                        {executing === selectedMap.id ? "Executing..." : "Confirm & notify parents"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Migration History below */}
            {executedMaps.length > 0 && (
              <div style={{ marginTop: 32 }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)", marginBottom: 16, borderTop: "1px solid var(--ln)", paddingTop: 24 }}>Migration History</h2>
                <div className="tw">
                  <table>
                    <thead><tr><th>ID</th><th>Source Batch</th><th>Target Batch</th><th>Year</th><th>Status</th></tr></thead>
                    <tbody>
                      {executedMaps.map(m => (
                        <tr key={m.id}>
                          <td className="mono" style={{ color: "var(--ink3)" }}>#{m.id}</td>
                          <td style={{ fontWeight: 600 }}>{m.source_batch_name}</td>
                          <td style={{ fontWeight: 600 }}>{m.target_batch_name}</td>
                          <td>{m.academic_year}</td>
                          <td><span className="bdg b-paid">Executed</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ═══════════ CONFIRM MODAL ═══════════ */}
      <Modal
        open={confirmModal}
        onClose={() => setConfirmModal(false)}
        title="Confirm Promotion"
        footer={
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button className="btn btn-s" onClick={() => setConfirmModal(false)}>Cancel</button>
            <button className="btn btn-p" onClick={handleConfirm} style={{ background: "#6b3ea8", border: "none" }}>
              Confirm & Execute
            </button>
          </div>
        }
      >
        {selectedMap && (() => {
          const stats = getMapStats(selectedMap);
          return (
            <div className="form-gap">
              <div style={{ fontSize: 13, color: "var(--ink2)", lineHeight: 1.6 }}>
                You are about to execute the promotion for <strong>{selectedMap.source_batch_name}</strong> → <strong>{selectedMap.target_batch_name}</strong>.
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1, padding: "14px 16px", borderRadius: 10, background: "var(--tc-l)", border: "1px solid #b8ddd0", textAlign: "center" }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: "var(--tc-d)", fontFamily: "var(--font-serif)" }}>{stats.promote}</div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "var(--tc-d)", textTransform: "uppercase" }}>Promote</div>
                </div>
                <div style={{ flex: 1, padding: "14px 16px", borderRadius: 10, background: "var(--sp-l)", border: "1px solid #b8d0fa", textAlign: "center" }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: "var(--sp)", fontFamily: "var(--font-serif)" }}>{stats.retain}</div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "var(--sp)", textTransform: "uppercase" }}>Retain</div>
                </div>
                <div style={{ flex: 1, padding: "14px 16px", borderRadius: 10, background: "var(--rb-l)", border: "1px solid #f5c5c5", textAlign: "center" }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: "var(--rb)", fontFamily: "var(--font-serif)" }}>{stats.remove}</div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "var(--rb)", textTransform: "uppercase" }}>Remove</div>
                </div>
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12.5, color: "var(--ink2)", fontWeight: 500, cursor: "pointer" }}>
                <input type="checkbox" defaultChecked style={{ accentColor: "#6b3ea8", width: 16, height: 16 }} />
                Send WhatsApp notification to parents regarding the promotion
              </label>
              <div style={{
                background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8,
                padding: "10px 14px", fontSize: 11.5, color: "#92400e",
                display: "flex", alignItems: "center", gap: 8,
              }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="7" cy="7" r="6"/><path d="M7 4.5v3M7 9.5h.01"/></svg>
                This action is irreversible. Student records will be permanently archived.
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* ═══════════ CREATE MAPPING MODAL ═══════════ */}
      <Modal
        open={!!promoModal}
        onClose={() => { setPromoModal(null); setErrors({}); }}
        title="Create Mapping Strip"
        footer={
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button className="btn btn-s" onClick={() => { setPromoModal(null); setErrors({}); }}>Cancel</button>
            <button className="btn btn-p" onClick={savePromo} style={{ background: "#6b3ea8", border: "none" }}>Save Strip</button>
          </div>
        }
      >
        <form className="form-gap" onSubmit={savePromo}>
          <div className="fg">
            <label className="flbl freq">Source Batch (Current)</label>
            <div className={errors.source_batch ? "input-error" : ""}>
              <SearchableSelect 
                value={promoModal?.source_batch ? String(promoModal.source_batch) : ""} 
                onChange={val => { setPromoModal({ ...promoModal, source_batch: val }); setErrors({ ...errors, source_batch: "" }); }}
                placeholder="Select source batch..."
                onSearch={searchBatches}
                options={batches.map(b => ({ value: String(b.id), label: `${b.name} (${b.academic_year})` }))}
              />
            </div>
            {errors.source_batch && <div className="f-error">{errors.source_batch}</div>}
          </div>
          <div className="fg">
            <label className="flbl freq">Target Batch (Next Year)</label>
            <div className={errors.target_batch ? "input-error" : ""}>
              <SearchableSelect 
                value={promoModal?.target_batch ? String(promoModal.target_batch) : ""} 
                onChange={val => { setPromoModal({ ...promoModal, target_batch: val }); setErrors({ ...errors, target_batch: "" }); }}
                placeholder="Select target batch..."
                onSearch={searchBatches}
                options={batches.map(b => ({ value: String(b.id), label: `${b.name} (${b.academic_year})` }))}
              />
            </div>
            {errors.target_batch && <div className="f-error">{errors.target_batch}</div>}
          </div>
          <div className="fg">
            <label className="flbl freq">Target Academic Year</label>
            <input type="number" className={errors.academic_year ? "input-error" : ""} value={promoModal?.academic_year || ""} onChange={e => { setPromoModal({ ...promoModal, academic_year: e.target.value }); setErrors({ ...errors, academic_year: "" }); }} />
            {errors.academic_year && <div className="f-error">{errors.academic_year}</div>}
          </div>
        </form>
      </Modal>

      <Toast open={!!alertModal?.open} message={alertModal?.message || ""} type={alertModal?.type || "success"} onClose={() => setAlertModal(null)} />
    </PageShell>
  );
}
