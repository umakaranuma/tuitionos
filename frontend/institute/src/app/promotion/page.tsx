"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { Topbar } from "@/components/layout/Topbar";
import { PageShell } from "@/components/layout/PageShell";
import { Modal } from "@/components/ui/Modal";
import { SearchSelect } from "@/components/ui/SearchSelect";
import { useToast } from "@/components/ui/ToastProvider";
import { api } from "@/lib/api";
import { getStoredUser } from "@/lib/auth";

type Batch = {
  id: number;
  grade: string;
  section: string;
  display_name: string;
  name: string;
  label: string;
  academic_year: number;
  student_count: number;
};

type Pmap = {
  id: number;
  batch_code: string;
  source_batch_name: string;
  batch: number | null;
  batch_name: string;
  academic_year: number;
  is_passout: boolean;
};

// Parse a numeric grade out of "Grade 6", "Grade 11", "A/L Year 1", etc.
function gradeNumber(grade: string): number | null {
  const m = /(\d+)/.exec(grade);
  return m ? parseInt(m[1], 10) : null;
}

// Suggest a target batch in the next year: same scheme but grade+1.
// Grade 11 (or anything without a higher peer) → passout.
function suggestTargetBatch(source: Batch, targets: Batch[]): { batch: Batch | null; passout: boolean } {
  const n = gradeNumber(source.grade);
  if (n === null) return { batch: null, passout: false };
  const targetGrade = source.grade.replace(/\d+/, String(n + 1));
  const peer = targets.find(b =>
    b.grade.toLowerCase() === targetGrade.toLowerCase() &&
    b.section.toLowerCase() === source.section.toLowerCase(),
  ) || targets.find(b => b.grade.toLowerCase() === targetGrade.toLowerCase());
  if (peer) return { batch: peer, passout: false };
  // No next-grade peer exists — this is the terminal grade for this institute.
  return { batch: null, passout: true };
}

export default function PromotionPage() {
  const toast = useToast();
  const [isLocked, setIsLocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  const currentYear = useMemo(() => {
    if (typeof window === "undefined") return new Date().getFullYear();
    const stored = parseInt(window.localStorage.getItem("academic_year") || "", 10);
    return Number.isFinite(stored) ? stored : new Date().getFullYear();
  }, []);
  // From year = the year that is ENDING. To year = the year being promoted INTO.
  // Default: promote the current academic year → next.
  const [fromYear, setFromYear] = useState<number>(currentYear);
  const [toYear, setToYear] = useState<number>(currentYear + 1);

  const [sourceBatches, setSourceBatches] = useState<Batch[]>([]);
  const [targetBatches, setTargetBatches] = useState<Batch[]>([]);
  const [maps, setMaps] = useState<Pmap[]>([]);

  const [editingFor, setEditingFor] = useState<Batch | null>(null);
  const [editForm, setEditForm] = useState<{ targetBatchId: string; isPassout: boolean }>({ targetBatchId: "", isPassout: false });

  // Plan check
  useEffect(() => {
    const user = getStoredUser();
    if (user?.institute?.plan !== "institute_pro") setIsLocked(true);
  }, []);

  // Load mappings + both years of batches
  const load = useCallback(async () => {
    if (isLocked) { setLoading(false); return; }
    setLoading(true);
    try {
      const [mapsRes, srcRes, tgtRes] = await Promise.all([
        api.get(`/api/promotion/`, { headers: { "X-Academic-Year": String(toYear) } }),
        api.get(`/api/academics/batches?academic_year=${fromYear}`),
        api.get(`/api/academics/batches?academic_year=${toYear}`),
      ]);
      const mapsArr: Pmap[] = Array.isArray(mapsRes.data) ? mapsRes.data : mapsRes.data.results || [];
      const srcArr: Batch[] = Array.isArray(srcRes.data) ? srcRes.data : srcRes.data.results || [];
      const tgtArr: Batch[] = Array.isArray(tgtRes.data) ? tgtRes.data : tgtRes.data.results || [];
      // Sort by grade number when possible — keeps the visual ordered low → high.
      const byGrade = (a: Batch, b: Batch) => (gradeNumber(a.grade) ?? 99) - (gradeNumber(b.grade) ?? 99);
      setMaps(mapsArr);
      setSourceBatches([...srcArr].sort(byGrade));
      setTargetBatches([...tgtArr].sort(byGrade));
    } catch {
      toast.error("Couldn't load promotion plan.");
    } finally { setLoading(false); }
  }, [fromYear, toYear, isLocked, toast]);

  useEffect(() => { load(); }, [load]);

  // Build a per-source plan: existing map (if any), or suggested map.
  type PlanRow = {
    source: Batch;
    map: Pmap | null;
    suggested: { batch: Batch | null; passout: boolean };
  };
  const plan: PlanRow[] = useMemo(() => {
    return sourceBatches.map(s => {
      // Map from source year's batch → its promotion mapping. The Pmap records
      // batch_code per source batch, which the backend resolves via enrollments.
      const m = maps.find(mp => mp.source_batch_name === (s.display_name || s.name));
      return { source: s, map: m || null, suggested: suggestTargetBatch(s, targetBatches) };
    });
  }, [sourceBatches, targetBatches, maps]);

  const summary = useMemo(() => {
    const promoted = plan.filter(r => r.map && !r.map.is_passout).length;
    const graduated = plan.filter(r => r.map?.is_passout).length;
    const pending = plan.filter(r => !r.map).length;
    const students = plan.reduce((s, r) => s + (r.source.student_count || 0), 0);
    return { promoted, graduated, pending, students };
  }, [plan]);

  const createMap = async (source: Batch, targetBatchId: number | null, isPassout: boolean) => {
    try {
      await api.post(`/api/promotion/`, {
        source_batch: source.id,
        batch: isPassout ? null : targetBatchId,
        is_passout: isPassout,
        academic_year: toYear,
      }, { headers: { "X-Academic-Year": String(toYear) } });
      return true;
    } catch (err) {
      const msg = (err as { response?: { data?: { non_field_errors?: string[]; error?: string } } })?.response?.data;
      toast.error(msg?.non_field_errors?.[0] || msg?.error || "Couldn't save this promotion.");
      return false;
    }
  };

  const deleteMap = async (id: number) => {
    try {
      await api.delete(`/api/promotion/${id}/`, { headers: { "X-Academic-Year": String(toYear) } });
      toast.success("Promotion removed.");
      load();
    } catch { toast.error("Couldn't remove that promotion."); }
  };

  const openEditFor = (source: Batch) => {
    const existing = plan.find(r => r.source.id === source.id);
    if (existing?.map) {
      setEditForm({
        targetBatchId: existing.map.batch ? String(existing.map.batch) : "",
        isPassout: existing.map.is_passout,
      });
    } else {
      const sug = existing?.suggested;
      setEditForm({
        targetBatchId: sug?.batch ? String(sug.batch.id) : "",
        isPassout: !!sug?.passout,
      });
    }
    setEditingFor(source);
  };

  const saveEdit = async () => {
    if (!editingFor) return;
    setWorking(true);
    // If there's an existing map, remove it first so the new one replaces cleanly.
    const existing = plan.find(r => r.source.id === editingFor.id)?.map;
    if (existing) {
      try { await api.delete(`/api/promotion/${existing.id}/`, { headers: { "X-Academic-Year": String(toYear) } }); }
      catch { /* ignore */ }
    }
    const ok = await createMap(
      editingFor,
      editForm.isPassout ? null : (editForm.targetBatchId ? parseInt(editForm.targetBatchId, 10) : null),
      editForm.isPassout,
    );
    if (ok) {
      toast.success(editForm.isPassout ? "Marked as graduating." : "Promotion saved.");
      setEditingFor(null);
      load();
    }
    setWorking(false);
  };

  const autoSuggestAll = async () => {
    const unmapped = plan.filter(r => !r.map);
    if (unmapped.length === 0) {
      toast.info?.("Every batch already has a promotion.");
      return;
    }
    setWorking(true);
    let ok = 0, fail = 0;
    for (const row of unmapped) {
      const sug = row.suggested;
      if (sug.passout) {
        const did = await createMap(row.source, null, true);
        did ? ok++ : fail++;
      } else if (sug.batch) {
        const did = await createMap(row.source, sug.batch.id, false);
        did ? ok++ : fail++;
      }
    }
    if (ok > 0) toast.success(`Auto-mapped ${ok} batch${ok !== 1 ? "es" : ""}.`);
    if (fail > 0) toast.error(`${fail} batch${fail !== 1 ? "es" : ""} couldn't be auto-mapped.`);
    setWorking(false);
    load();
  };

  // ── Render ──
  if (isLocked) {
    return (
      <PageShell>
        <Topbar title="Year-end Promotion" />
        <div className="pb fi" style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 60 }}>
          <span className="bdg b-prem" style={{ marginBottom: 12 }}>PRO FEATURE</span>
          <div className="topbar-title" style={{ marginBottom: 6 }}>Promotions are locked</div>
          <div style={{ color: "var(--ink3)", textAlign: "center", maxWidth: 400, fontSize: 13.5, lineHeight: 1.5 }}>
            Year-end promotion automation is an Institute Pro feature.
          </div>
          <Link href="/settings" className="btn btn-p btn-sm" style={{ marginTop: 14 }}>Upgrade plan</Link>
        </div>
      </PageShell>
    );
  }

  const yearOptions = [-1, 0, 1, 2].map(off => currentYear + off);

  return (
    <PageShell>
      <Topbar
        title="Year-end Promotion"
        subtitle="Move every batch up one year. Graduating cohorts become passout."
      />
      <div className="pb fi">

        {/* ── Year transition header ── */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 18 }}>
            <div style={{ flex: 1, minWidth: 280 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink3)", letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 8 }}>
                Promote
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <div style={{ width: 140 }}>
                  <SearchSelect
                    value={String(fromYear)}
                    onChange={v => setFromYear(parseInt(v, 10))}
                    searchable={false}
                    options={yearOptions.map(y => ({ value: String(y), label: `Year ${y}` }))}
                  />
                </div>
                <div className="promo-arrow" aria-hidden>→</div>
                <div style={{ width: 140 }}>
                  <SearchSelect
                    value={String(toYear)}
                    onChange={v => setToYear(parseInt(v, 10))}
                    searchable={false}
                    options={yearOptions.map(y => ({ value: String(y), label: `Year ${y}` }))}
                  />
                </div>
              </div>
            </div>

            <div className="promo-summary">
              <div className="promo-summary-item">
                <div className="promo-summary-val" style={{ color: "var(--jd)" }}>{summary.promoted}</div>
                <div className="promo-summary-lbl">Promoted</div>
              </div>
              <div className="promo-summary-item">
                <div className="promo-summary-val" style={{ color: "var(--tc)" }}>{summary.graduated}</div>
                <div className="promo-summary-lbl">Graduating</div>
              </div>
              <div className="promo-summary-item">
                <div className="promo-summary-val" style={{ color: summary.pending > 0 ? "var(--sf)" : "var(--ink3)" }}>{summary.pending}</div>
                <div className="promo-summary-lbl">Pending</div>
              </div>
              <div className="promo-summary-item">
                <div className="promo-summary-val">{summary.students}</div>
                <div className="promo-summary-lbl">Students</div>
              </div>
            </div>
          </div>

          {summary.pending > 0 && (
            <div style={{
              marginTop: 14, padding: "12px 14px", background: "var(--ac-l)",
              border: "1px solid #f5d98a", borderRadius: 10, display: "flex",
              alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap",
            }}>
              <div style={{ fontSize: 12.5, color: "#9a5b14", lineHeight: 1.5 }}>
                <strong>{summary.pending} batch{summary.pending !== 1 ? "es" : ""} still need a target.</strong>{" "}
                Auto-suggest will move Grade N → Grade N+1 and mark the highest grade as graduating.
              </div>
              <button className="btn btn-p btn-sm" onClick={autoSuggestAll} disabled={working}>
                {working ? "Working…" : "Auto-suggest all"}
              </button>
            </div>
          )}
        </div>

        {/* ── Promotion plan grid ── */}
        {loading ? (
          <div className="card" style={{ textAlign: "center", padding: 40, color: "var(--ink3)" }}>Loading promotion plan…</div>
        ) : plan.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "48px 20px" }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>🎓</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)", marginBottom: 6 }}>
              No batches in {fromYear}
            </div>
            <div style={{ fontSize: 13, color: "var(--ink3)", marginBottom: 16, lineHeight: 1.5 }}>
              Add batches for the year you want to promote from, then come back here to map them to the next year.
            </div>
            <Link href="/batches" className="btn btn-s btn-sm">Manage batches</Link>
          </div>
        ) : (
          <div className="promo-grid">
            {plan.map(row => {
              const { source, map, suggested } = row;
              const isPassout = map?.is_passout ?? (!map && suggested.passout);
              const targetName = map
                ? (map.is_passout ? null : map.batch_name)
                : (suggested.batch ? suggested.batch.display_name || suggested.batch.name : null);
              const status: "saved" | "suggested" | "pending" = map
                ? "saved"
                : (suggested.batch || suggested.passout) ? "suggested" : "pending";
              return (
                <div key={source.id} className={`promo-row promo-row-${status}`}>
                  {/* Source */}
                  <div className="promo-batch promo-batch-from">
                    <div className="promo-batch-year">{fromYear}</div>
                    <div className="promo-batch-name">{source.display_name || source.name}</div>
                    <div className="promo-batch-meta">{source.student_count} student{source.student_count !== 1 ? "s" : ""}</div>
                  </div>

                  {/* Arrow + status */}
                  <div className="promo-flow">
                    <div className={`promo-flow-line ${status}`}>
                      <div className={`promo-flow-label ${status}`}>
                        {status === "saved" ? "✓ saved" : status === "suggested" ? "suggested" : "needs target"}
                      </div>
                      <div className="promo-flow-arrow">→</div>
                    </div>
                  </div>

                  {/* Target */}
                  {isPassout ? (
                    <div className="promo-batch promo-batch-passout">
                      <div className="promo-batch-year">🎓 Passout</div>
                      <div className="promo-batch-name">Graduating cohort</div>
                      <div className="promo-batch-meta">Students mark as inactive</div>
                    </div>
                  ) : targetName ? (
                    <div className="promo-batch promo-batch-to">
                      <div className="promo-batch-year">{toYear}</div>
                      <div className="promo-batch-name">{targetName}</div>
                      <div className="promo-batch-meta">Continues in {toYear}</div>
                    </div>
                  ) : (
                    <div className="promo-batch promo-batch-empty">
                      <div className="promo-batch-year">{toYear}</div>
                      <div className="promo-batch-name" style={{ color: "var(--ink3)" }}>No target chosen</div>
                      <div className="promo-batch-meta">
                        Create a Grade in {toYear} first, or mark as passout.
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="promo-actions">
                    <button className="btn btn-xs btn-s" onClick={() => openEditFor(source)}>
                      {map ? "Edit" : "Set target"}
                    </button>
                    {map && (
                      <button className="btn btn-xs btn-d" onClick={() => deleteMap(map.id)}>Remove</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Edit modal ── */}
      <Modal
        open={!!editingFor}
        onClose={() => setEditingFor(null)}
        title={editingFor ? `Promote ${editingFor.display_name || editingFor.name}` : "Promote batch"}
        footer={
          <>
            <button className="btn btn-s btn-sm" onClick={() => setEditingFor(null)} disabled={working}>Cancel</button>
            <button className="btn btn-p btn-sm" onClick={saveEdit} disabled={working}>
              {working ? "Saving…" : "Save promotion"}
            </button>
          </>
        }
      >
        <div className="form-gap">
          {editingFor && (
            <div style={{ background: "var(--cr)", borderRadius: 10, padding: "10px 14px", fontSize: 12.5 }}>
              <div style={{ color: "var(--ink3)", marginBottom: 2 }}>Promoting from</div>
              <div style={{ fontWeight: 700, color: "var(--ink)" }}>{editingFor.display_name || editingFor.name}</div>
              <div style={{ fontSize: 11, color: "var(--ink3)", marginTop: 2 }}>
                {editingFor.student_count} student{editingFor.student_count !== 1 ? "s" : ""} in {fromYear}
              </div>
            </div>
          )}

          <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "var(--ink2)", fontWeight: 500, cursor: "pointer", padding: "10px 12px", border: "1px solid var(--ln)", borderRadius: 10, background: editForm.isPassout ? "var(--tc-l)" : "#fff" }}>
            <input
              type="checkbox"
              checked={editForm.isPassout}
              onChange={e => setEditForm(f => ({ ...f, isPassout: e.target.checked, targetBatchId: e.target.checked ? "" : f.targetBatchId }))}
              style={{ width: 16, height: 16 }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, color: "var(--ink)" }}>🎓 Mark as graduating (Passout)</div>
              <div style={{ fontSize: 11, color: "var(--ink3)", marginTop: 1 }}>
                Use this for the highest grade — students are archived as alumni.
              </div>
            </div>
          </label>

          {!editForm.isPassout && (
            <div>
              <label className="flbl">Promote into ({toYear})</label>
              <SearchSelect
                value={editForm.targetBatchId}
                onChange={v => setEditForm(f => ({ ...f, targetBatchId: v }))}
                placeholder={targetBatches.length === 0 ? `No batches in ${toYear} yet` : "Select target batch…"}
                disabled={targetBatches.length === 0}
                options={targetBatches.map(b => ({
                  value: String(b.id),
                  label: b.display_name || b.name,
                  sub: `${b.student_count} student${b.student_count !== 1 ? "s" : ""} · ${b.academic_year}`,
                }))}
              />
              {targetBatches.length === 0 && (
                <div className="hint" style={{ marginTop: 6 }}>
                  Create a Grade in {toYear} from <Link href="/batches" style={{ color: "var(--tc)" }}>Batches</Link>, then return here.
                </div>
              )}
            </div>
          )}

          <div style={{
            background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "10px 14px",
            borderRadius: 10, fontSize: 11.5, color: "#166534", lineHeight: 1.5,
          }}>
            Saving runs the promotion immediately — current-year enrollments archive, and new enrollments are created in {toYear}.
          </div>
        </div>
      </Modal>
    </PageShell>
  );
}
