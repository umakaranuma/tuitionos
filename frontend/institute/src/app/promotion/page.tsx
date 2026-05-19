"use client";
import { useState, useEffect } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { PageShell } from "@/components/layout/PageShell";
import { api } from "@/lib/api";
import { getStoredUser } from "@/lib/auth";

type Pmap = { id: number; source_batch: number; source_batch_name: string; target_batch: number; target_batch_name: string; academic_year: number; is_confirmed: boolean };

export default function PromotionPage() {
  const [maps, setMaps] = useState<Pmap[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(false);

  const load = () => {
    const user = getStoredUser();
    if (user?.institute?.plan !== "institute_pro") {
      setIsLocked(true);
      return;
    }
    api.get("/api/promotion/").then(r => {
      const d = r.data; setMaps(Array.isArray(d) ? d : d.results || []); setLoading(false);
    }).catch(() => setLoading(false));
  };
  useEffect(load, []);

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
      <Topbar title="Year-end Promotion" subtitle="Promote students to next batch" />
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
                  {m.is_confirmed ? (
                    <span className="bdg b-paid">Done</span>
                  ) : (
                    <button className="btn btn-ok btn-sm" onClick={() => execute(m.id)}>Execute</button>
                  )}
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
    </PageShell>
  );
}
