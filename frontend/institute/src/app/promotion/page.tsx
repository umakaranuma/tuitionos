"use client";
import { useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { PageShell } from "@/components/layout/PageShell";

/* ─── DATA ─────────────── */
const existingBatches = [
  { id: "g7a",  name: "Grade 7 — Batch A",        students: 18, finalYear: false },
  { id: "g8a",  name: "Grade 8 — Batch A",        students: 22, finalYear: false },
  { id: "g9a",  name: "Grade 9 — Batch A",        students: 20, finalYear: false },
  { id: "g10",  name: "Grade 10 — O/L Batch",     students: 25, finalYear: false },
  { id: "g11",  name: "Grade 11 — A/L Science",   students: 19, finalYear: true  },
];

const studentData: Record<string, string[]> = {
  g7a:  ["Kavitha M.", "Nithya V.", "Arun P.", "Deepa J.", "Sanjay L.", "Meena C.", "Rajan N.", "Anitha B.", "Mohan D.", "Lakshmi F.", "Kumar H.", "Thilaga W.", "Vijay X.", "Selvi Y.", "Priya A.", "Malar B.", "Bala C.", "Rohini D."],
  g8a:  ["Ramesh A.", "Geetha B.", "Suresh C.", "Kamala D.", "Prabhu E.", "Valli F.", "Arjun G.", "Saranya H.", "Ganesh I.", "Nirmala J.", "Selvam K.", "Yamuna L.", "Bala M.", "Rohini N.", "Muthu O.", "Sumathi P.", "Deva Q.", "Malar R.", "Ragu S.", "Siva T.", "Uma U.", "Kavi V."],
  g9a:  ["Abhi A.", "Brinda B.", "Chidambaram C.", "Dharani D.", "Elan E.", "Fabia F.", "Gobi G.", "Hepzi H.", "Ilavarasi I.", "Jeyam J.", "Krishnan K.", "Lavanya L.", "Murali M.", "Neeraja N.", "Ojas O.", "Priya P.", "Quentin Q.", "Rajkumar R.", "Saroja S.", "Tharun T."],
  g10:  ["Aarav Kumar", "Priya Selvan", "Dinesh Raj", "Surya T.", "Meena J.", "Ramesh A.", "Geetha S.", "Suresh K.", "Kamala R.", "Prabhu N.", "Valli M.", "Arjun G.", "Saranya D.", "Ganesh E.", "Nirmala F.", "Selvam H.", "Yamuna I.", "Bala J.", "Rohini K.", "Muthu L.", "Sumathi M.", "Deva N.", "Malar O.", "Ragu P.", "Siva Q."],
  g11:  ["Abhi R.", "Brinda S.", "Chidambaram T.", "Dharani U.", "Elan V.", "Fabia W.", "Gobi X.", "Hepzi Y.", "Ilavarasi Z.", "Jeyam AA.", "Krishnan BB.", "Lavanya CC.", "Murali DD.", "Neeraja EE.", "Ojas FF.", "Priya GG.", "Quentin HH.", "Rajkumar II.", "Saroja JJ."],
};

type Action = "promote" | "retain" | "remove";

const colors = [
  ["var(--tc-l)", "var(--tc-d)"],
  ["var(--sp-l)", "var(--sp)"],
  ["var(--rb-l)", "var(--rb)"],
  ["var(--sf-l)", "var(--sf)"],
  ["var(--pr-l)", "var(--pr)"],
];

function initials(name: string) {
  return name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
}

/* ─── COMPONENT ─────────── */
export default function PromotionPage() {
  const [step, setStep] = useState<1 | 2>(1);
  const [selBatch, setSelBatch] = useState(existingBatches[0].id);
  const [confirmed, setConfirmed] = useState(false);
  const [executed, setExecuted] = useState(false);

  // NEW BATCH creation state
  const [newBatchInputs, setNewBatchInputs] = useState<Record<string, string>>({});
  const [creatingFor, setCreatingFor] = useState<string | null>(null);

  // Batch → target batch mapping  { sourceId: targetId | "__new__" | "__remove__" }
  const defaultMappings: Record<string, string> = {
    g7a:  "g8a",
    g8a:  "g9a",
    g9a:  "g10",
    g10:  "g11",
    g11:  "__remove__",
  };
  const [mappings, setMappings] = useState<Record<string, string>>(defaultMappings);

  // Inline new-batch names  { sourceId: "Grade X — Batch A" }
  const [newBatchNames, setNewBatchNames] = useState<Record<string, string>>({});

  // Student decisions  { batchId: { studentIdx: action } }
  const [decisions, setDecisions] = useState<Record<string, Record<number, Action>>>(() => {
    const d: Record<string, Record<number, Action>> = {};
    existingBatches.forEach(b => {
      d[b.id] = {};
      studentData[b.id].forEach((_, i) => {
        d[b.id][i] = b.finalYear ? "remove" : "promote";
      });
    });
    return d;
  });

  /* helpers */
  const setDec = (idx: number, action: Action) =>
    setDecisions(prev => ({ ...prev, [selBatch]: { ...prev[selBatch], [idx]: action } }));

  const bulkSet = (action: Action) =>
    setDecisions(prev => {
      const next = { ...prev, [selBatch]: { ...prev[selBatch] } };
      studentData[selBatch].forEach((_, i) => { next[selBatch][i] = action; });
      return next;
    });

  const counts = (batchId: string) => {
    const c = { promote: 0, retain: 0, remove: 0 };
    Object.values(decisions[batchId] || {}).forEach(a => c[a]++);
    return c;
  };

  const allMappingsSet = existingBatches.every(b => {
    const m = mappings[b.id];
    if (!m) return false;
    if (m === "__new__") return !!newBatchNames[b.id]?.trim();
    return true;
  });

  const getTargetLabel = (batchId: string) => {
    const m = mappings[batchId];
    if (!m) return "—";
    if (m === "__remove__") return "Remove (final year)";
    if (m === "__new__") return newBatchNames[batchId] ? `New: "${newBatchNames[batchId]}"` : "New batch (unnamed)";
    return existingBatches.find(b => b.id === m)?.name || m;
  };

  /* ─── STEP 1: MAPPING ─── */
  if (step === 1) {
    return (
      <PageShell>
        <Topbar
          title="Year-end promotion"
          subtitle="Step 1 of 2 — Configure batch mappings"
          right={
            <button
              className={`btn btn-p btn-sm ${!allMappingsSet ? "opacity-50" : ""}`}
              onClick={() => allMappingsSet && setStep(2)}
              title={!allMappingsSet ? "Set all mappings first" : ""}
            >
              Next: Review students →
            </button>
          }
        />
        <div className="pb fi">
          {/* Info banner */}
          <div style={{
            background: "var(--sp-l)", border: "1px solid #c5d9f5", borderRadius: "var(--r)",
            padding: "12px 16px", marginBottom: 20, fontSize: 12.5, color: "var(--sp)",
            display: "flex", gap: 10, alignItems: "flex-start",
          }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" style={{ flexShrink: 0, marginTop: 1 }}>
              <circle cx="8" cy="8" r="7"/><path d="M8 5v4M8 10.5h.01"/>
            </svg>
            <div>
              <strong>How batch promotion works</strong>
              <div style={{ marginTop: 3, color: "var(--sp)", opacity: .85 }}>
                Each batch maps to a target batch. When you promote, each student&apos;s enrollment moves from their current batch to the target.
                Students already in the target batch are a separate cohort — they must be mapped to their own next target.
                <br />
                <strong>Example:</strong> Grade 7 → Grade 8. Grade 8 → Grade 9. Both run separately. No student conflicts.
              </div>
            </div>
          </div>

          {/* Mapping table */}
          <div className="sec-hdr"><span className="sec-title">Batch promotion map — 2026 → 2027</span></div>
          <div className="tw" style={{ marginBottom: 28 }}>
            <table>
              <thead>
                <tr>
                  <th>Current batch</th>
                  <th>Students</th>
                  <th>Maps to (target batch)</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {existingBatches.map(b => {
                  const m = mappings[b.id];
                  const isNew = m === "__new__";
                  const isRemove = m === "__remove__";
                  const isOk = isRemove ? true : isNew ? !!newBatchNames[b.id]?.trim() : !!m;

                  return (
                    <tr key={b.id}>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 12.5 }}>{b.name}</div>
                        {b.finalYear && <div style={{ fontSize: 10.5, color: "var(--ink3)", marginTop: 2 }}>Final year batch</div>}
                      </td>
                      <td className="mono">{b.students}</td>
                      <td style={{ minWidth: 280 }}>
                        <select
                          style={{ width: "auto", marginRight: 8 }}
                          value={isNew ? "__new__" : m || ""}
                          onChange={e => {
                            setMappings(prev => ({ ...prev, [b.id]: e.target.value }));
                            if (e.target.value !== "__new__") {
                              setNewBatchNames(prev => { const n = { ...prev }; delete n[b.id]; return n; });
                            }
                          }}
                        >
                          <option value="">— Select target —</option>
                          {existingBatches
                            .filter(tb => tb.id !== b.id)
                            .map(tb => (
                              <option key={tb.id} value={tb.id}>{tb.name}</option>
                            ))}
                          <option value="__new__">+ Create new batch…</option>
                          <option value="__remove__">Remove (final year / deactivate)</option>
                        </select>

                        {/* Inline new batch name input */}
                        {isNew && (
                          <div style={{ marginTop: 8, display: "flex", gap: 6, alignItems: "center" }}>
                            <input
                              placeholder={`e.g. Grade ${parseInt(b.name.match(/\d+/)?.[0] || "7") + 1} — Batch A`}
                              style={{ width: 260, fontSize: 12 }}
                              value={newBatchNames[b.id] || ""}
                              onChange={e => setNewBatchNames(prev => ({ ...prev, [b.id]: e.target.value }))}
                              autoFocus
                            />
                            {newBatchNames[b.id]?.trim() && (
                              <span style={{ fontSize: 10.5, color: "var(--tc-d)", fontWeight: 600 }}>
                                ✓ Will be created
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td>
                        {isOk ? (
                          <span className="bdg b-paid">Mapped</span>
                        ) : (
                          <span className="bdg b-due">Pending</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Chain visualisation */}
          <div className="sec-hdr"><span className="sec-title">Promotion chain preview</span></div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", padding: "14px 16px", background: "#fff", border: "1px solid var(--ln)", borderRadius: "var(--r-lg)" }}>
            {existingBatches.map((b, i) => {
              const target = getTargetLabel(b.id);
              const isRemove = mappings[b.id] === "__remove__";
              return (
                <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{
                    padding: "5px 10px", borderRadius: 6, fontSize: 11.5, fontWeight: 600,
                    background: "var(--sp-l)", color: "var(--sp)", border: "1px solid #c5d9f5"
                  }}>
                    {b.name.replace("Grade ", "G").split("—")[0].trim()}
                  </div>
                  <svg width="16" height="10" viewBox="0 0 16 10" fill="none" stroke={isRemove ? "var(--rb)" : "var(--tc)"} strokeWidth="1.5">
                    <path d="M1 5h12M9 1l4 4-4 4"/>
                  </svg>
                  {isRemove ? (
                    <div style={{ padding: "5px 10px", borderRadius: 6, fontSize: 11.5, fontWeight: 600, background: "var(--rb-l)", color: "var(--rb)" }}>
                      Removed
                    </div>
                  ) : (
                    <div style={{
                      padding: "5px 10px", borderRadius: 6, fontSize: 11.5, fontWeight: 600,
                      background: "var(--tc-l)", color: "var(--tc-d)", border: "1px solid #b8ddd0"
                    }}>
                      {mappings[b.id] === "__new__"
                        ? (newBatchNames[b.id] || "New batch")
                        : existingBatches.find(tb => tb.id === mappings[b.id])?.name.replace("Grade ", "G").split("—")[0].trim() || "—"}
                    </div>
                  )}
                  {i < existingBatches.length - 1 && (
                    <div style={{ width: 16, borderTop: "1.5px dashed var(--ln)" }} />
                  )}
                </div>
              );
            })}
          </div>

          {!allMappingsSet && (
            <div style={{ marginTop: 14, fontSize: 11.5, color: "var(--sf)", display: "flex", alignItems: "center", gap: 6 }}>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6.5 2L1 11h11L6.5 2zM6.5 5v3M6.5 10h.01"/></svg>
              Set all batch mappings before proceeding to student review.
            </div>
          )}
        </div>
      </PageShell>
    );
  }

  /* ─── STEP 2: STUDENTS ─── */
  const currentBatch = existingBatches.find(b => b.id === selBatch)!;
  const targetLabel = getTargetLabel(selBatch);
  const dec = decisions[selBatch] || {};
  const studs = studentData[selBatch];
  const c = counts(selBatch);
  const totalPromoted = existingBatches.reduce((sum, b) => sum + counts(b.id).promote, 0);

  return (
    <PageShell>
      <Topbar
        title="Year-end promotion"
        subtitle="Step 2 of 2 — Review students per batch"
        right={
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-g btn-sm" onClick={() => { setStep(1); setConfirmed(false); setExecuted(false); }}>
              ← Edit mappings
            </button>
            <button className="btn btn-s btn-sm" onClick={() => bulkSet("promote")}>Promote all</button>
            <button
              className="btn btn-p btn-sm"
              onClick={() => {
                setConfirmed(true);
                setTimeout(() => setExecuted(true), 800);
              }}
            >
              Confirm &amp; notify parents
            </button>
          </div>
        }
      />
      <div className="pb fi">
        {/* Success banner */}
        {executed && (
          <div style={{
            background: "var(--tc-l)", border: "1px solid #b8ddd0", borderRadius: "var(--r)",
            padding: "11px 16px", marginBottom: 16, fontSize: 12.5, color: "var(--tc-d)",
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M2 8l4 4 7-7"/></svg>
            <span>
              <strong>Promotion complete.</strong> {totalPromoted} students promoted across all batches.
              WhatsApp notifications queued with new timetable PDFs (10s stagger).
            </span>
          </div>
        )}

        {!executed && (
          <div style={{
            background: "var(--tc-l)", border: "1px solid #b8ddd0", borderRadius: "var(--r)",
            padding: "10px 14px", marginBottom: 16, fontSize: 12, color: "var(--tc-d)",
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.75">
              <circle cx="7" cy="7" r="6"/><path d="M7 4.5v3.5l2 1"/>
            </svg>
            Promoted students receive a WhatsApp notification with their new batch timetable PDF.
            Each batch is promoted independently — no cross-batch conflicts.
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 18 }}>
          {/* Batch sidebar */}
          <div>
            <div className="sec-hdr" style={{ marginBottom: 8 }}>
              <span className="sec-title">Batches</span>
            </div>
            {existingBatches.map(b => {
              const ct = counts(b.id);
              const m = mappings[b.id];
              const isRemoveAll = m === "__remove__";
              const isActive = selBatch === b.id;

              return (
                <div
                  key={b.id}
                  onClick={() => setSelBatch(b.id)}
                  style={{
                    padding: "10px 12px", borderRadius: "var(--r)", cursor: "pointer", marginBottom: 7,
                    border: `1.5px solid ${isActive ? "var(--tc)" : "var(--ln)"}`,
                    background: isActive ? "var(--tc-l)" : "#fff",
                    transition: "all 120ms",
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 600, color: isActive ? "var(--tc-d)" : "var(--ink)", marginBottom: 4 }}>
                    {b.name}
                  </div>
                  {/* Arrow to target */}
                  <div style={{ fontSize: 10.5, color: "var(--ink3)", marginBottom: 5 }}>
                    <span style={{ color: "var(--tc-d)", fontWeight: 500 }}>→</span>{" "}
                    <span style={{ color: isRemoveAll ? "var(--rb)" : "var(--ink3)" }}>
                      {getTargetLabel(b.id).replace("New: ", "").replace(/"/g, "")}
                    </span>
                  </div>
                  {/* Mini counts */}
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {ct.promote > 0 && <span className="bdg b-promote" style={{ fontSize: 9, padding: "1px 5px" }}>{ct.promote} ↑</span>}
                    {ct.retain > 0 && <span className="bdg b-retain" style={{ fontSize: 9, padding: "1px 5px" }}>{ct.retain} ↻</span>}
                    {ct.remove > 0 && <span className="bdg b-remove" style={{ fontSize: 9, padding: "1px 5px" }}>{ct.remove} ✕</span>}
                  </div>
                </div>
              );
            })}

            {/* Overall summary */}
            <div style={{ marginTop: 14, padding: "12px 14px", background: "#fff", border: "1px solid var(--ln)", borderRadius: "var(--r-lg)" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink)", marginBottom: 8 }}>All batches summary</div>
              {existingBatches.map(b => {
                const ct = counts(b.id);
                return (
                  <div key={b.id} style={{ fontSize: 10.5, color: "var(--ink3)", marginBottom: 5, lineHeight: 1.5 }}>
                    <span style={{ color: "var(--ink)", fontWeight: 500 }}>{b.name.split("—")[0].trim()}</span>
                    {" — "}
                    <span style={{ color: "var(--tc-d)" }}>{ct.promote}↑</span>
                    {" "}
                    <span style={{ color: "var(--sp)" }}>{ct.retain}↻</span>
                    {" "}
                    <span style={{ color: "var(--rb)" }}>{ct.remove}✕</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Student decisions for selected batch */}
          <div>
            <div className="sec-hdr">
              <div>
                <span className="sec-title">{currentBatch.name}</span>
                <div style={{ fontSize: 10.5, color: "var(--ink3)", marginTop: 3 }}>
                  → <strong style={{ color: mappings[selBatch] === "__remove__" ? "var(--rb)" : "var(--tc-d)" }}>
                    {getTargetLabel(selBatch)}
                  </strong>
                  {" · "}
                  These {studs.length} students move independently of students already in the target batch
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <span className="bdg b-promote">{c.promote} promote</span>
                <span className="bdg b-retain">{c.retain} retain</span>
                <span className="bdg b-remove">{c.remove} remove</span>
              </div>
            </div>

            {/* Bulk action bar */}
            <div style={{
              display: "flex", gap: 6, marginBottom: 12, padding: "8px 12px",
              background: "#fff", border: "1px solid var(--ln)", borderRadius: "var(--r)",
              alignItems: "center",
            }}>
              <span style={{ fontSize: 11.5, color: "var(--ink3)", marginRight: 4 }}>Bulk set all:</span>
              <button className="btn btn-xs btn-ok" onClick={() => bulkSet("promote")}>Promote all</button>
              <button className="btn btn-xs btn-s" onClick={() => bulkSet("retain")}>Retain all</button>
              <button className="btn btn-xs btn-d" onClick={() => bulkSet("remove")}>Remove all</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
              {studs.map((name, i) => {
                const action: Action = dec[i] ?? (currentBatch.finalYear ? "remove" : "promote");
                const [bg, fg] = colors[i % 5];
                const isRemoveTarget = mappings[selBatch] === "__remove__";

                return (
                  <div
                    key={i}
                    className={`promo-card ${action}`}
                    style={{ padding: "10px 12px" }}
                  >
                    <div className="ava" style={{ background: bg, color: fg, width: 26, height: 26, fontSize: 10 }}>
                      {initials(name)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="promo-name">{name}</div>
                      <div className="promo-sub" style={{ fontSize: 10 }}>
                        {action === "promote"
                          ? isRemoveTarget
                            ? "Will be removed"
                            : `→ ${getTargetLabel(selBatch).replace("New: ", "").replace(/"/g, "")}`
                          : action === "retain"
                          ? `Stay in ${currentBatch.name.split("—")[0].trim()}`
                          : "Deactivated"}
                      </div>
                    </div>
                    <select
                      className="promo-sel"
                      value={action}
                      onChange={e => setDec(i, e.target.value as Action)}
                      style={{ fontSize: 11 }}
                    >
                      <option value="promote">Promote</option>
                      <option value="retain">Retain</option>
                      <option value="remove">Remove</option>
                    </select>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
