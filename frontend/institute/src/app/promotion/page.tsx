"use client";
import { useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { PageShell } from "@/components/layout/PageShell";

const batches = [
  { name: "Grade 7 — Batch A", next: "Grade 8 — Batch A", n: 18 },
  { name: "Grade 10 — O/L Batch", next: "Grade 11 — A/L Science", n: 25 },
  { name: "Grade 11 — A/L Science", next: "[Complete — Remove]", n: 19 },
];

const studentData: Record<number, string[]> = {
  0: ["Kavitha M.", "Nithya V.", "Arun P.", "Deepa J.", "Sanjay L.", "Meena C.", "Rajan N.", "Anitha B", "Mohan D.", "Lakshmi F.", "Kumar H.", "Thilaga W.", "Vijay X.", "Selvi Y.", "Priya A.", "Malar B.", "Bala C.", "Rohini D."],
  1: ["Aarav Kumar", "Priya Selvan", "Dinesh Raj", "Surya T.", "Meena J.", "Ramesh A.", "Geetha B.", "Suresh C.", "Kamala D.", "Prabhu E.", "Valli F.", "Arjun G.", "Saranya H.", "Ganesh I.", "Nirmala J.", "Selvam K.", "Yamuna L.", "Bala M.", "Rohini N.", "Muthu O.", "Sumathi P.", "Deva Q.", "Malar R.", "Ragu S.", "Siva T."],
  2: ["Abhi A.", "Brinda B.", "Chidambaram C.", "Dharani D.", "Elan E.", "Fabia F.", "Gobi G.", "Hepzi H.", "Ilavarasi I.", "Jeyam J.", "Krishnan K.", "Lavanya L.", "Murali M.", "Neeraja N.", "Ojas O.", "Priya P.", "Quentin Q.", "Rajkumar R.", "Saroja S."],
};

const colors = [
  ["var(--tc-l)", "var(--tc-d)"],
  ["var(--sp-l)", "var(--sp)"],
  ["var(--rb-l)", "var(--rb)"],
  ["var(--sf-l)", "var(--sf)"],
  ["var(--pr-l)", "var(--pr)"],
];

type Action = "promote" | "retain" | "remove";

export default function PromotionPage() {
  const [selB, setSelB] = useState(0);
  const [decisions, setDecisions] = useState<Record<string, Record<number, Action>>>(() => {
    const d: Record<string, Record<number, Action>> = {};
    [0, 1, 2].forEach((bi) => {
      d[bi] = {};
      studentData[bi].forEach((_, i) => {
        d[bi][i] = bi === 2 ? "remove" : "promote";
      });
    });
    return d;
  });
  const [confirmed, setConfirmed] = useState(false);

  const setDec = (idx: number, action: Action) => {
    setDecisions(prev => ({ ...prev, [selB]: { ...prev[selB], [idx]: action } }));
  };

  const bulkPromote = () => {
    setDecisions(prev => {
      const next = { ...prev };
      studentData[selB].forEach((_, i) => { next[selB][i] = "promote"; });
      return next;
    });
  };

  const b = batches[selB];
  const studs = studentData[selB];
  const dec = decisions[selB] || {};
  const counts = { promote: 0, retain: 0, remove: 0 };
  Object.values(dec).forEach(a => counts[a]++);

  const ini = (name: string) => name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();

  return (
    <PageShell>
      <Topbar
        title="Year-end promotion"
        subtitle="2026 → 2027 · Move students to next grade"
        right={
          <>
            <button className="btn btn-s btn-sm" onClick={bulkPromote}>Promote all</button>
            <button
              className="btn btn-p btn-sm"
              onClick={() => setConfirmed(true)}
            >
              Confirm &amp; notify parents
            </button>
          </>
        }
      />
      <div className="pb fi">
        {confirmed && (
          <div style={{
            background: "var(--tc-l)", border: "1px solid #b8ddd0", borderRadius: "var(--r)",
            padding: "10px 14px", marginBottom: 16, fontSize: 12, color: "var(--tc-d)",
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M2 7l3 3 7-7"/></svg>
            Confirmed! WhatsApp notifications queued for {counts.promote} promoted students.
          </div>
        )}
        {!confirmed && (
          <div style={{
            background: "var(--tc-l)", border: "1px solid #b8ddd0", borderRadius: "var(--r)",
            padding: "10px 14px", marginBottom: 16, fontSize: 12, color: "var(--tc-d)",
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.75"><circle cx="7" cy="7" r="6"/><path d="M7 4.5v3.5l2 1"/></svg>
            Promoted students will receive a WhatsApp message with their new timetable PDF attached.
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 18 }}>
          {/* Batch sidebar */}
          <div>
            <div className="sec-hdr"><span className="sec-title">Select batch</span></div>
            {batches.map((bat, i) => (
              <div
                key={bat.name}
                onClick={() => setSelB(i)}
                style={{
                  padding: "9px 11px", borderRadius: "var(--r)", cursor: "pointer", marginBottom: 7,
                  border: `1px solid ${i === selB ? "var(--tc)" : "var(--ln)"}`,
                  background: i === selB ? "var(--tc-l)" : "#fff",
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 600, color: i === selB ? "var(--tc-d)" : "var(--ink)" }}>
                  {bat.name}
                </div>
                <div style={{ fontSize: 10.5, color: "var(--ink3)", marginTop: 1 }}>{bat.n} students</div>
              </div>
            ))}
          </div>

          {/* Student grid */}
          <div>
            <div className="sec-hdr">
              <span className="sec-title">{b.name} → {b.next}</span>
              <div style={{ display: "flex", gap: 6 }}>
                <span className="bdg b-promote">{counts.promote} promote</span>
                <span className="bdg b-retain">{counts.retain} retain</span>
                <span className="bdg b-remove">{counts.remove} remove</span>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
              {studs.map((name, i) => {
                const action = dec[i] || "promote";
                const [bg, fg] = colors[i % 5];
                return (
                  <div key={name} className={`promo-card ${action}`}>
                    <div className="ava" style={{ background: bg, color: fg, width: 26, height: 26, fontSize: 10 }}>
                      {ini(name)}
                    </div>
                    <div>
                      <div className="promo-name">{name}</div>
                      <div className="promo-sub">
                        {action === "promote" ? `→ ${b.next.split("—")[0].trim()}` : action === "retain" ? "Same batch" : "Deactivating"}
                      </div>
                    </div>
                    <select
                      className="promo-sel"
                      value={action}
                      onChange={(e) => setDec(i, e.target.value as Action)}
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
