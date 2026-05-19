"use client";
import { useState, useEffect } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { PageShell } from "@/components/layout/PageShell";
import { api } from "@/lib/api";
import { getStoredUser } from "@/lib/auth";
import { Modal } from "@/components/ui/Modal";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { Toast } from "@/components/ui/Toast";

type Pmap = { id: number; source_batch: number; source_batch_name: string; target_batch: number; target_batch_name: string; academic_year: number; is_confirmed: boolean };

export default function PromotionPage() {
  const [maps, setMaps] = useState<Pmap[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [batches, setBatches] = useState<any[]>([]);
  const [promoModal, setPromoModal] = useState<any>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [alertModal, setAlertModal] = useState<{open: boolean, message: string, type: "success"|"error"}|null>(null);

  const load = () => {
    const user = getStoredUser();
    if (user?.institute?.plan !== "institute_pro") {
      setIsLocked(true);
      return;
    }
    Promise.all([
      api.get("/api/promotion/"),
      api.get("/api/academics/batches")
    ]).then(([resP, resB]) => {
      setMaps(Array.isArray(resP.data) ? resP.data : resP.data.results || []);
      setBatches(Array.isArray(resB.data) ? resB.data : resB.data.results || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };
  
  useEffect(load, []);

  const searchBatches = async (q: string) => {
    try {
      const r = await api.get(`/api/academics/batches?search=${encodeURIComponent(q)}`);
      setBatches(Array.isArray(r.data) ? r.data : r.data.results || []);
    } catch (e) {}
  };

  const savePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const newErrors: Record<string, string> = {};
    if (!promoModal.source_batch) newErrors.source_batch = "Required";
    if (!promoModal.target_batch) newErrors.target_batch = "Required";
    if (!promoModal.academic_year) newErrors.academic_year = "Required";
    if (promoModal.source_batch && promoModal.target_batch && promoModal.source_batch === promoModal.target_batch) {
      newErrors.target_batch = "Target batch must be different";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});

    try {
      await api.post("/api/promotion/", promoModal);
      setAlertModal({ open: true, message: "Promotion map added successfully.", type: "success" });
      setPromoModal(null);
      setErrors({});
      load();
    } catch (err) {
      setAlertModal({ open: true, message: "Failed to add promotion map.", type: "error" });
    }
  };

  const deletePromo = async (id: number) => {
    try {
      await api.delete(`/api/promotion/${id}/`);
      setAlertModal({ open: true, message: "Promotion map deleted successfully.", type: "success" });
      load();
    } catch (err) {
      setAlertModal({ open: true, message: "Failed to delete promotion map.", type: "error" });
    }
  };

  if (isLocked) {
    return (
      <PageShell>
        <Topbar title="Year-end Promotion" />
        <div className="pb fi" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", paddingTop: 80 }}>
          <div style={{ background: "var(--tc)", color: "white", padding: "4px 12px", borderRadius: 12, fontSize: 12, fontWeight: 700, marginBottom: 16 }}>PRO FEATURE</div>
          <h2 style={{ fontSize: 24, color: "var(--ink)", fontWeight: 700, marginBottom: 12 }}>Promotions Locked</h2>
          <p style={{ color: "var(--ink2)", textAlign: "center", maxWidth: 400, lineHeight: 1.5 }}>
            Automated student batch migrations are an Institute Pro feature. Please upgrade your package in Settings to access this capability.
          </p>
        </div>
      </PageShell>
    );
  }

  const execute = async (id: number) => {
    await api.post(`/api/promotion/${id}/execute`);
    load();
  };

  return (
    <PageShell>
      <Topbar 
        title="Year-end Promotion" 
        subtitle="Promote students to next batch"
        right={
          <button className="btn btn-p" onClick={() => setPromoModal({ source_batch: "", target_batch: "", academic_year: new Date().getFullYear() })}>+ Add Promotion Map</button>
        }
      />
      <div className="pb fi">
        {loading ? <div style={{ textAlign: "center", padding: 40, color: "var(--ink3)" }}>Loading...</div> : (
          maps.length > 0 ? (
            <div className="g3">
              {maps.map(m => (
                <div key={m.id} className="card" style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>
                      {m.source_batch_name} → {m.target_batch_name}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--ink3)" }}>
                      Academic year {m.academic_year} · {m.is_confirmed ? "Executed" : "Pending"}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    {m.is_confirmed ? (
                      <span className="bdg b-paid">Done</span>
                    ) : (
                      <>
                        <button className="btn btn-ok btn-sm" onClick={() => execute(m.id)}>Execute</button>
                        <button onClick={() => deletePromo(m.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--rb)", fontSize: 12, fontWeight: 600 }}>Delete</button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card" style={{ textAlign: "center", color: "var(--ink3)", padding: 40 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>No promotion maps configured</div>
              <div style={{ fontSize: 12 }}>Set up promotion maps to auto-migrate students at year-end.</div>
            </div>
          )
        )}
      </div>

      <Modal
        open={!!promoModal}
        onClose={() => { setPromoModal(null); setErrors({}); }}
        title="Add Promotion Map"
        footer={
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button className="btn btn-s" onClick={() => { setPromoModal(null); setErrors({}); }}>Cancel</button>
            <button className="btn btn-p" onClick={savePromo}>Save Map</button>
          </div>
        }
      >
        <form className="form-gap" onSubmit={savePromo}>
          <div className="fg">
            <label className="flbl freq">Source Batch</label>
            <div className={errors.source_batch ? "input-error" : ""}>
              <SearchableSelect 
                value={promoModal?.source_batch ? String(promoModal.source_batch) : ""} 
                onChange={val => { setPromoModal({ ...promoModal, source_batch: val }); setErrors({ ...errors, source_batch: "" }); }}
                placeholder="Select Source Batch..."
                onSearch={searchBatches}
                options={batches.map(b => ({ value: String(b.id), label: b.name }))}
              />
            </div>
            {errors.source_batch && <div className="f-error">{errors.source_batch}</div>}
          </div>
          <div className="fg">
            <label className="flbl freq">Target Batch</label>
            <div className={errors.target_batch ? "input-error" : ""}>
              <SearchableSelect 
                value={promoModal?.target_batch ? String(promoModal.target_batch) : ""} 
                onChange={val => { setPromoModal({ ...promoModal, target_batch: val }); setErrors({ ...errors, target_batch: "" }); }}
                placeholder="Select Target Batch..."
                onSearch={searchBatches}
                options={batches.map(b => ({ value: String(b.id), label: b.name }))}
              />
            </div>
            {errors.target_batch && <div className="f-error">{errors.target_batch}</div>}
          </div>
          <div className="fg">
            <label className="flbl freq">Academic Year</label>
            <input type="number" className={errors.academic_year ? "input-error" : ""} value={promoModal?.academic_year || ""} onChange={e => { setPromoModal({ ...promoModal, academic_year: e.target.value }); setErrors({ ...errors, academic_year: "" }); }} />
            {errors.academic_year && <div className="f-error">{errors.academic_year}</div>}
          </div>
        </form>
      </Modal>

      <Toast 
        open={!!alertModal?.open} 
        message={alertModal?.message || ""} 
        type={alertModal?.type || "success"} 
        onClose={() => setAlertModal(null)} 
      />
    </PageShell>
  );
}
