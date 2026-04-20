"use client";
import { useState, useMemo } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { PageShell } from "@/components/layout/PageShell";

/* ─── DATA ───────────────────────────────────────── */
const batchList = [
  { id: "g7a",  label: "Grade 7",   name: "Grade 7 — Batch A",     n: 18, final: false, color: "#2a5fa8", colorL: "#d8e6fa" },
  { id: "g8a",  label: "Grade 8",   name: "Grade 8 — Batch A",     n: 22, final: false, color: "#2d7a5a", colorL: "#d4ede3" },
  { id: "g9a",  label: "Grade 9",   name: "Grade 9 — Batch A",     n: 20, final: false, color: "#6b3ea8", colorL: "#ede8fc" },
  { id: "g10",  label: "Grade 10",  name: "Grade 10 — O/L Batch",  n: 25, final: false, color: "#c07b1a", colorL: "#fef3d7" },
  { id: "g11",  label: "Grade 11",  name: "Grade 11 — A/L Science",n: 19, final: true,  color: "#b83030", colorL: "#fceaea" },
];

const mappingDefaults: Record<string, string> = {
  g7a: "g8a", g8a: "g9a", g9a: "g10", g10: "g11", g11: "__remove__",
};

const studentData: Record<string, { name: string; att: string; fee: "paid" | "due" }[]> = {
  g7a: [
    { name: "Kavitha M.",   att: "99%", fee: "paid" }, { name: "Nithya V.",    att: "96%", fee: "paid" },
    { name: "Arun P.",      att: "88%", fee: "due"  }, { name: "Deepa J.",     att: "92%", fee: "paid" },
    { name: "Sanjay L.",    att: "95%", fee: "paid" }, { name: "Meena C.",     att: "78%", fee: "due"  },
    { name: "Rajan N.",     att: "97%", fee: "paid" }, { name: "Anitha B.",    att: "91%", fee: "paid" },
    { name: "Mohan D.",     att: "84%", fee: "paid" }, { name: "Lakshmi F.",   att: "100%",fee: "paid" },
    { name: "Kumar H.",     att: "89%", fee: "due"  }, { name: "Thilaga W.",   att: "93%", fee: "paid" },
    { name: "Vijay X.",     att: "72%", fee: "due"  }, { name: "Selvi Y.",     att: "97%", fee: "paid" },
    { name: "Priya A.",     att: "95%", fee: "paid" }, { name: "Malar B.",     att: "88%", fee: "paid" },
    { name: "Bala C.",      att: "91%", fee: "paid" }, { name: "Rohini D.",    att: "96%", fee: "paid" },
  ],
  g8a: [
    { name: "Ramesh A.",    att: "94%", fee: "paid" }, { name: "Geetha B.",    att: "91%", fee: "paid" },
    { name: "Suresh C.",    att: "87%", fee: "due"  }, { name: "Kamala D.",    att: "98%", fee: "paid" },
    { name: "Prabhu E.",    att: "76%", fee: "due"  }, { name: "Valli F.",     att: "93%", fee: "paid" },
    { name: "Arjun G.",     att: "95%", fee: "paid" }, { name: "Saranya H.",   att: "89%", fee: "paid" },
    { name: "Ganesh I.",    att: "92%", fee: "paid" }, { name: "Nirmala J.",   att: "86%", fee: "due"  },
    { name: "Selvam K.",    att: "97%", fee: "paid" }, { name: "Yamuna L.",    att: "90%", fee: "paid" },
    { name: "Bala M.",      att: "83%", fee: "paid" }, { name: "Rohini N.",    att: "95%", fee: "paid" },
    { name: "Muthu O.",     att: "88%", fee: "paid" }, { name: "Sumathi P.",   att: "99%", fee: "paid" },
    { name: "Deva Q.",      att: "71%", fee: "due"  }, { name: "Malar R.",     att: "94%", fee: "paid" },
    { name: "Ragu S.",      att: "92%", fee: "paid" }, { name: "Siva T.",      att: "96%", fee: "paid" },
    { name: "Uma U.",       att: "89%", fee: "paid" }, { name: "Kavi V.",      att: "91%", fee: "paid" },
  ],
  g9a: [
    { name: "Abhi A.",      att: "95%", fee: "paid" }, { name: "Brinda B.",    att: "92%", fee: "paid" },
    { name: "Chidambaram C.",att:"88%", fee: "due"  }, { name: "Dharani D.",   att: "97%", fee: "paid" },
    { name: "Elan E.",      att: "91%", fee: "paid" }, { name: "Fabia F.",     att: "94%", fee: "paid" },
    { name: "Gobi G.",      att: "79%", fee: "due"  }, { name: "Hepzi H.",     att: "96%", fee: "paid" },
    { name: "Ilavarasi I.", att: "90%", fee: "paid" }, { name: "Jeyam J.",     att: "85%", fee: "due"  },
    { name: "Krishnan K.",  att: "93%", fee: "paid" }, { name: "Lavanya L.",   att: "98%", fee: "paid" },
    { name: "Murali M.",    att: "87%", fee: "paid" }, { name: "Neeraja N.",   att: "95%", fee: "paid" },
    { name: "Ojas O.",      att: "92%", fee: "paid" }, { name: "Priya P.",     att: "97%", fee: "paid" },
    { name: "Quentin Q.",   att: "89%", fee: "paid" }, { name: "Rajkumar R.",  att: "93%", fee: "paid" },
    { name: "Saroja S.",    att: "96%", fee: "paid" }, { name: "Tharun T.",    att: "91%", fee: "due"  },
  ],
  g10: [
    { name: "Aarav Kumar",  att: "94%", fee: "paid" }, { name: "Priya Selvan", att: "81%", fee: "due"  },
    { name: "Dinesh Raj",   att: "97%", fee: "paid" }, { name: "Surya T.",     att: "72%", fee: "due"  },
    { name: "Meena J.",     att: "78%", fee: "paid" }, { name: "Ramesh A.",    att: "93%", fee: "paid" },
    { name: "Geetha S.",    att: "95%", fee: "paid" }, { name: "Suresh K.",    att: "88%", fee: "paid" },
    { name: "Kamala R.",    att: "96%", fee: "paid" }, { name: "Prabhu N.",    att: "91%", fee: "due"  },
    { name: "Valli M.",     att: "94%", fee: "paid" }, { name: "Arjun G.",     att: "89%", fee: "paid" },
    { name: "Saranya D.",   att: "97%", fee: "paid" }, { name: "Ganesh E.",    att: "92%", fee: "paid" },
    { name: "Nirmala F.",   att: "86%", fee: "paid" }, { name: "Selvam H.",    att: "98%", fee: "paid" },
    { name: "Yamuna I.",    att: "90%", fee: "paid" }, { name: "Bala J.",      att: "87%", fee: "paid" },
    { name: "Rohini K.",    att: "95%", fee: "paid" }, { name: "Muthu L.",     att: "93%", fee: "paid" },
    { name: "Sumathi M.",   att: "99%", fee: "paid" }, { name: "Deva N.",      att: "76%", fee: "due"  },
    { name: "Malar O.",     att: "91%", fee: "paid" }, { name: "Ragu P.",      att: "94%", fee: "paid" },
    { name: "Siva Q.",      att: "88%", fee: "paid" },
  ],
  g11: [
    { name: "Abhi R.",      att: "97%", fee: "paid" }, { name: "Brinda S.",    att: "94%", fee: "paid" },
    { name: "Chidambaram T.",att:"91%", fee: "paid" }, { name: "Dharani U.",   att: "88%", fee: "paid" },
    { name: "Elan V.",      att: "95%", fee: "paid" }, { name: "Fabia W.",     att: "92%", fee: "due"  },
    { name: "Gobi X.",      att: "89%", fee: "paid" }, { name: "Hepzi Y.",     att: "97%", fee: "paid" },
    { name: "Ilavarasi Z.", att: "93%", fee: "paid" }, { name: "Jeyam AA.",    att: "86%", fee: "paid" },
    { name: "Krishnan BB.", att: "98%", fee: "paid" }, { name: "Lavanya CC.",  att: "95%", fee: "paid" },
    { name: "Murali DD.",   att: "90%", fee: "paid" }, { name: "Neeraja EE.",  att: "94%", fee: "paid" },
    { name: "Ojas FF.",     att: "92%", fee: "paid" }, { name: "Priya GG.",    att: "96%", fee: "paid" },
    { name: "Quentin HH.",  att: "88%", fee: "paid" }, { name: "Rajkumar II.", att: "99%", fee: "paid" },
    { name: "Saroja JJ.",   att: "93%", fee: "paid" },
  ],
};

type Action = "promote" | "retain" | "remove";

function initials(n: string) {
  return n.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
}

function attColor(att: string) {
  const v = parseInt(att);
  if (v >= 90) return "var(--tc-d)";
  if (v >= 75) return "var(--sf)";
  return "var(--rb)";
}

const ACTION_CONFIG: Record<Action, { label: string; accent: string; bg: string; border: string }> = {
  promote: { label: "Promote",  accent: "#2d7a5a", bg: "#d4ede3", border: "#b8ddd0" },
  retain:  { label: "Retain",   accent: "#2a5fa8", bg: "#d8e6fa", border: "#c5d9f5" },
  remove:  { label: "Remove",   accent: "#b83030", bg: "#fceaea", border: "#f5c5c5" },
};

/* ─── STUDENT CARD ──────────────────────────────── */
function StudentCard({
  student, idx, action, targetBatch, onSet,
}: {
  student: { name: string; att: string; fee: "paid" | "due" };
  idx: number;
  action: Action;
  targetBatch: string;
  onSet: (a: Action) => void;
}) {
  const cfg = ACTION_CONFIG[action];
  const ini = initials(student.name);
  const avatarColors: [string, string][] = [
    ["#d4ede3","#1a5040"], ["#d8e6fa","#2a5fa8"], ["#fceaea","#b83030"],
    ["#fef3d7","#6b3e20"], ["#ede8fc","#6b3ea8"],
  ];
  const [avBg, avFg] = avatarColors[idx % 5];

  return (
    <div style={{
      background: "#fff",
      border: `1.5px solid ${cfg.border}`,
      borderLeft: `4px solid ${cfg.accent}`,
      borderRadius: 12,
      padding: "13px 14px",
      display: "flex",
      flexDirection: "column",
      gap: 10,
      boxShadow: "0 1px 3px rgba(28,25,23,.06)",
      transition: "border-color 200ms, box-shadow 200ms",
    }}>
      {/* Top: avatar + name */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: "50%", background: avBg, color: avFg,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 12, fontWeight: 700, flexShrink: 0,
          border: `1.5px solid ${cfg.border}`,
        }}>
          {ini}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", lineHeight: 1.2 }}>
            {student.name}
          </div>
          <div style={{ display: "flex", gap: 5, marginTop: 3, alignItems: "center" }}>
            <span style={{ fontSize: 10.5, fontFamily: "var(--font-mono)", color: attColor(student.att) }}>
              {student.att}
            </span>
            <span style={{ width: 3, height: 3, borderRadius: "50%", background: "var(--ln)", display: "inline-block" }} />
            {student.fee === "paid"
              ? <span style={{ fontSize: 10, fontWeight: 600, color: "var(--tc-d)", background: "var(--tc-l)", padding: "1px 5px", borderRadius: 99 }}>Paid</span>
              : <span style={{ fontSize: 10, fontWeight: 600, color: "#c07b1a", background: "#fef3d7", padding: "1px 5px", borderRadius: 99 }}>Fee due</span>
            }
          </div>
        </div>
      </div>

      {/* Where going */}
      <div style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "5px 9px",
        background: action === "remove" ? "#fceaea" : action === "retain" ? "#f5f8ff" : "#f0fdf8",
        borderRadius: 7, fontSize: 11,
      }}>
        {action === "promote" && (
          <>
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="var(--tc-d)" strokeWidth="1.75">
              <path d="M5.5 9V2M2 5l3.5-3.5L9 5"/>
            </svg>
            <span style={{ color: "var(--tc-d)", fontWeight: 600 }}>→ {targetBatch}</span>
          </>
        )}
        {action === "retain" && (
          <>
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="#2a5fa8" strokeWidth="1.75">
              <path d="M2 5.5h7M6 3l2.5 2.5L6 8"/>
            </svg>
            <span style={{ color: "#2a5fa8", fontWeight: 600 }}>Stays in same batch</span>
          </>
        )}
        {action === "remove" && (
          <>
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="var(--rb)" strokeWidth="1.75">
              <path d="M2 2l7 7M9 2L2 9"/>
            </svg>
            <span style={{ color: "var(--rb)", fontWeight: 600 }}>Deactivated</span>
          </>
        )}
      </div>

      {/* Segmented control */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
        gap: 0, borderRadius: 8, overflow: "hidden",
        border: "1.5px solid var(--ln)",
      }}>
        {(["promote", "retain", "remove"] as Action[]).map((a, i) => {
          const selected = action === a;
          const c = ACTION_CONFIG[a];
          return (
            <button
              key={a}
              onClick={() => onSet(a)}
              style={{
                padding: "6px 0",
                fontSize: 11, fontWeight: 600,
                background: selected ? c.bg : "transparent",
                color: selected ? c.accent : "var(--ink3)",
                border: "none",
                borderLeft: i > 0 ? "1.5px solid var(--ln)" : "none",
                cursor: "pointer",
                transition: "all 140ms",
              }}
            >
              {a === "promote" ? "↑ Promote" : a === "retain" ? "↻ Retain" : "✕ Remove"}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── MAIN PAGE ─────────────────────────────────── */
export default function PromotionPage() {
  const [selBatch, setSelBatch] = useState("g7a");
  const [mappings, setMappings] = useState<Record<string, string>>(mappingDefaults);
  const [newBatchNames, setNewBatchNames] = useState<Record<string, string>>({});
  const [editMap, setEditMap] = useState(false);
  const [search, setSearch] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  // Decisions: { batchId: { idx: action } }
  const [decisions, setDecisions] = useState<Record<string, Record<number, Action>>>(() => {
    const d: Record<string, Record<number, Action>> = {};
    batchList.forEach(b => {
      d[b.id] = {};
      studentData[b.id].forEach((_, i) => { d[b.id][i] = b.final ? "remove" : "promote"; });
    });
    return d;
  });

  const setDec = (batchId: string, idx: number, action: Action) =>
    setDecisions(prev => ({ ...prev, [batchId]: { ...prev[batchId], [idx]: action } }));

  const bulkSet = (batchId: string, action: Action) =>
    setDecisions(prev => {
      const batchDecisions: Record<number, Action> = {};
      studentData[batchId].forEach((_, i) => { batchDecisions[i] = action; });
      return { ...prev, [batchId]: batchDecisions };
    });

  const counts = (batchId: string) => {
    const c = { promote: 0, retain: 0, remove: 0 };
    Object.values(decisions[batchId] || {}).forEach(a => c[a as Action]++);
    return c;
  };

  const totalAll = useMemo(() => {
    let promote = 0, retain = 0, remove = 0;
    batchList.forEach(b => {
      const c = counts(b.id);
      promote += c.promote; retain += c.retain; remove += c.remove;
    });
    return { promote, retain, remove };
  }, [decisions]);

  const getTargetName = (batchId: string) => {
    const m = mappings[batchId];
    if (!m || m === "__remove__") return "Remove";
    if (m === "__new__") return newBatchNames[batchId] || "New batch";
    return batchList.find(b => b.id === m)?.name || "—";
  };

  // filter students by search
  const currentStudents = studentData[selBatch] || [];
  const filtered = currentStudents
    .map((s, i) => ({ ...s, idx: i }))
    .filter(s => s.name.toLowerCase().includes(search.toLowerCase()));

  const selBatchObj = batchList.find(b => b.id === selBatch)!;
  const targetName = getTargetName(selBatch);
  const selCounts = counts(selBatch);

  return (
    <PageShell>
      <Topbar
        title="Year-end promotion"
        subtitle="2026 → 2027 academic year"
        right={
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ fontSize: 11.5, color: "var(--ink3)", borderRight: "1px solid var(--ln)", paddingRight: 12 }}>
              <strong style={{ color: "var(--tc-d)" }}>{totalAll.promote}</strong> promote ·{" "}
              <strong style={{ color: "#2a5fa8" }}>{totalAll.retain}</strong> retain ·{" "}
              <strong style={{ color: "var(--rb)" }}>{totalAll.remove}</strong> remove
            </div>
            <button
              className="btn btn-p btn-sm"
              style={{ background: confirmed ? "var(--tc-d)" : undefined }}
              onClick={() => setConfirmed(true)}
            >
              {confirmed ? "✓ Confirmed" : "Confirm & notify parents"}
            </button>
          </div>
        }
      />

      <div style={{ padding: "0 26px" }}>
        {/* ── Batch mapping strip ── */}
        <div style={{
          background: "#fff", border: "1px solid var(--ln)", borderRadius: 12,
          padding: "10px 16px", margin: "14px 0",
          boxShadow: "0 1px 3px rgba(28,25,23,.05)",
        }}>
          {/* Collapsed strip */}
          {!editMap && (
            <div style={{ display: "flex", alignItems: "center", gap: 0, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--ink3)", letterSpacing: ".06em", textTransform: "uppercase", marginRight: 12 }}>
                Promotion map
              </span>
              {batchList.map((b, i) => (
                <span key={b.id} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: b.color }}>
                    {b.label}
                  </span>
                  <svg width="14" height="10" viewBox="0 0 14 10" fill="none" stroke={mappings[b.id] === "__remove__" ? "var(--rb)" : "var(--ln)"} strokeWidth="1.25">
                    <path d="M1 5h10M8 2l3 3-3 3"/>
                  </svg>
                  <span style={{
                    fontSize: 11, fontWeight: 600,
                    color: mappings[b.id] === "__remove__" ? "var(--rb)" : "var(--ink3)",
                  }}>
                    {mappings[b.id] === "__remove__" ? "Removed" : batchList.find(tb => tb.id === mappings[b.id])?.label || "?"}
                  </span>
                  {i < batchList.length - 1 && <span style={{ color: "var(--ln)", margin: "0 8px", fontSize: 14 }}>·</span>}
                </span>
              ))}
              <button
                className="btn btn-g btn-xs"
                style={{ marginLeft: "auto", fontSize: 11 }}
                onClick={() => setEditMap(true)}
              >
                Edit mappings
              </button>
            </div>
          )}

          {/* Expanded mapping editor */}
          {editMap && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)" }}>Configure batch promotion mappings</span>
                <button className="btn btn-p btn-xs" onClick={() => setEditMap(false)}>Done</button>
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                {batchList.map(b => (
                  <div key={b.id} style={{
                    display: "grid", gridTemplateColumns: "1fr auto 1fr auto",
                    gap: 10, alignItems: "center", padding: "8px 12px",
                    background: "var(--cr)", borderRadius: 8, border: "1px solid var(--ln)",
                  }}>
                    {/* Source */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{
                        width: 8, height: 8, borderRadius: "50%", background: b.color, flexShrink: 0,
                      }} />
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink)" }}>{b.name}</span>
                      <span style={{ fontSize: 10.5, color: "var(--ink3)", fontFamily: "var(--font-mono)" }}>
                        {b.n} students
                      </span>
                    </div>
                    {/* Arrow */}
                    <svg width="18" height="12" viewBox="0 0 18 12" fill="none" stroke="var(--ink3)" strokeWidth="1.5">
                      <path d="M1 6h14M11 2l4 4-4 4"/>
                    </svg>
                    {/* Target dropdown */}
                    <div>
                      <select
                        style={{ width: "100%", fontSize: 12 }}
                        value={mappings[b.id] || ""}
                        onChange={e => setMappings(prev => ({ ...prev, [b.id]: e.target.value }))}
                      >
                        <option value="">— Pick target —</option>
                        {batchList.filter(tb => tb.id !== b.id).map(tb => (
                          <option key={tb.id} value={tb.id}>{tb.name}</option>
                        ))}
                        <option value="__new__">+ Create new batch…</option>
                        <option value="__remove__">Remove (final year)</option>
                      </select>
                      {mappings[b.id] === "__new__" && (
                        <input
                          style={{ marginTop: 5, fontSize: 11.5 }}
                          placeholder="New batch name, e.g. Grade 12 — A/L"
                          value={newBatchNames[b.id] || ""}
                          onChange={e => setNewBatchNames(prev => ({ ...prev, [b.id]: e.target.value }))}
                          autoFocus
                        />
                      )}
                    </div>
                    {/* Status */}
                    {mappings[b.id]
                      ? <span className="bdg b-paid" style={{ fontSize: 10 }}>✓ Set</span>
                      : <span className="bdg b-due" style={{ fontSize: 10 }}>Pending</span>
                    }
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Main two-column layout ── */}
        <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 18, paddingBottom: 32 }}>

          {/* ── LEFT: Batch tabs ── */}
          <div>
            {confirmed && (
              <div style={{
                background: "var(--tc-l)", border: "1px solid #b8ddd0", borderRadius: 10,
                padding: "10px 12px", marginBottom: 12, fontSize: 12, color: "var(--tc-d)",
              }}>
                <div style={{ fontWeight: 700, marginBottom: 2 }}>✓ Promotion queued</div>
                <div style={{ fontSize: 10.5 }}>
                  {totalAll.promote} students promoted · WA notifications sent (10s stagger)
                </div>
              </div>
            )}

            {batchList.map(b => {
              const ct = counts(b.id);
              const isActive = selBatch === b.id;
              const targetN = getTargetName(b.id);
              return (
                <div
                  key={b.id}
                  onClick={() => { setSelBatch(b.id); setSearch(""); }}
                  style={{
                    padding: "11px 13px",
                    borderRadius: 11,
                    cursor: "pointer",
                    marginBottom: 6,
                    border: `1.5px solid ${isActive ? b.color : "var(--ln)"}`,
                    background: isActive ? b.colorL : "#fff",
                    transition: "all 140ms",
                    boxShadow: isActive ? `0 2px 8px ${b.color}22` : "none",
                  }}
                >
                  {/* Batch name */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: b.color, flexShrink: 0 }} />
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: isActive ? b.color : "var(--ink)" }}>
                      {b.name.split("—")[0].trim()}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--ink3)", fontFamily: "var(--font-mono)", marginLeft: "auto" }}>
                      {b.n}
                    </div>
                  </div>
                  {/* Target arrow */}
                  <div style={{ fontSize: 10.5, color: mappings[b.id] === "__remove__" ? "var(--rb)" : "var(--ink3)", marginBottom: 7, marginLeft: 14 }}>
                    → {targetN.split("—")[0].trim()}
                  </div>
                  {/* Mini count pills */}
                  <div style={{ display: "flex", gap: 4, marginLeft: 14 }}>
                    {ct.promote > 0 && (
                      <span style={{ fontSize: 9.5, fontWeight: 700, padding: "2px 6px", borderRadius: 99, background: "#d4ede3", color: "#1a5040" }}>
                        {ct.promote} ↑
                      </span>
                    )}
                    {ct.retain > 0 && (
                      <span style={{ fontSize: 9.5, fontWeight: 700, padding: "2px 6px", borderRadius: 99, background: "#d8e6fa", color: "#2a5fa8" }}>
                        {ct.retain} ↻
                      </span>
                    )}
                    {ct.remove > 0 && (
                      <span style={{ fontSize: 9.5, fontWeight: 700, padding: "2px 6px", borderRadius: 99, background: "#fceaea", color: "#b83030" }}>
                        {ct.remove} ✕
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Overall summary box */}
            <div style={{
              marginTop: 14, padding: "14px", background: "#fff",
              border: "1.5px solid var(--ln)", borderRadius: 12,
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink)", marginBottom: 10, letterSpacing: ".03em", textTransform: "uppercase" }}>
                All batches total
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {[
                  { label: "Promoted", val: totalAll.promote, color: "#1a5040", bg: "#d4ede3" },
                  { label: "Retained", val: totalAll.retain,  color: "#2a5fa8", bg: "#d8e6fa" },
                  { label: "Removed",  val: totalAll.remove,  color: "#b83030", bg: "#fceaea" },
                ].map(row => (
                  <div key={row.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: row.bg, border: `1.5px solid ${row.color}`, flexShrink: 0 }} />
                      <span style={{ fontSize: 11.5, color: "var(--ink2)" }}>{row.label}</span>
                    </div>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: row.color }}>
                      {row.val}
                    </span>
                  </div>
                ))}
                <div style={{ borderTop: "1px solid var(--ln)", paddingTop: 8, marginTop: 2 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--ink)" }}>Total</span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700 }}>
                      {totalAll.promote + totalAll.retain + totalAll.remove}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── RIGHT: Student cards ── */}
          <div>
            {/* Batch header */}
            <div style={{
              background: "#fff", border: "1.5px solid var(--ln)",
              borderTop: `4px solid ${selBatchObj.color}`,
              borderRadius: 12, padding: "14px 16px", marginBottom: 14,
              boxShadow: "0 1px 3px rgba(28,25,23,.06)",
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)", marginBottom: 3 }}>
                    {selBatchObj.name}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5 }}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke={selBatchObj.color} strokeWidth="1.75">
                      <path d="M1 6h8M7 3l3 3-3 3"/>
                    </svg>
                    <span style={{ color: mappings[selBatch] === "__remove__" ? "var(--rb)" : selBatchObj.color, fontWeight: 600 }}>
                      {targetName} {mappings[selBatch] === "__remove__" ? "(Final year — all deactivated)" : `· ${selCounts.promote} students moving`}
                    </span>
                  </div>
                </div>
                {/* Count chips */}
                <div style={{ display: "flex", gap: 6 }}>
                  {[
                    { k: "promote" as Action, label: `${selCounts.promote} promote` },
                    { k: "retain"  as Action, label: `${selCounts.retain} retain`  },
                    { k: "remove"  as Action, label: `${selCounts.remove} remove`  },
                  ].map(({ k, label }) => (
                    <span key={k} style={{
                      padding: "3px 9px", borderRadius: 99, fontSize: 11, fontWeight: 700,
                      background: ACTION_CONFIG[k].bg, color: ACTION_CONFIG[k].accent,
                      border: `1px solid ${ACTION_CONFIG[k].border}`,
                    }}>
                      {label}
                    </span>
                  ))}
                </div>
              </div>

              {/* Controls row */}
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <div style={{ position: "relative", flex: 1, maxWidth: 240 }}>
                  <svg
                    width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="var(--ink3)" strokeWidth="1.5"
                    style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
                  >
                    <circle cx="5.5" cy="5.5" r="4.5"/><path d="M10 10l-2-2"/>
                  </svg>
                  <input
                    placeholder="Search students…"
                    style={{ paddingLeft: 28, fontSize: 12.5 }}
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
                <span style={{ fontSize: 11, color: "var(--ink3)" }}>Bulk:</span>
                {(["promote", "retain", "remove"] as Action[]).map(a => {
                  const c = ACTION_CONFIG[a];
                  return (
                    <button
                      key={a}
                      onClick={() => bulkSet(selBatch, a)}
                      style={{
                        padding: "5px 11px", borderRadius: 7, border: `1.5px solid ${c.border}`,
                        background: c.bg, color: c.accent, fontSize: 11.5, fontWeight: 700,
                        cursor: "pointer", transition: "all 120ms",
                      }}
                    >
                      {a === "promote" ? "↑ All" : a === "retain" ? "↻ All" : "✕ All"}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Student grid */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: 10,
            }}>
              {filtered.map(s => (
                <StudentCard
                  key={s.idx}
                  student={s}
                  idx={s.idx}
                  action={decisions[selBatch]?.[s.idx] ?? (selBatchObj.final ? "remove" : "promote")}
                  targetBatch={targetName.split("—")[0].trim()}
                  onSet={a => setDec(selBatch, s.idx, a)}
                />
              ))}
              {filtered.length === 0 && (
                <div style={{ gridColumn: "1/-1", textAlign: "center", color: "var(--ink3)", padding: "40px 0", fontSize: 13 }}>
                  No students match &ldquo;{search}&rdquo;
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
