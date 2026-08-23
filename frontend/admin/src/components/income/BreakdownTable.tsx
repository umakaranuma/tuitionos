"use client";

export type PlanBucket = {
  plan: string;
  label: string;
  institutes: number;
  expected: number;
  collected: number;
  outstanding: number;
  paid_count: number;
};

type Props = {
  breakdown: PlanBucket[];
  focusLabel?: string;
  loading?: boolean;
};

const PLAN_COLORS: Record<string, string> = {
  solo: "var(--sp)",
  institute: "var(--tc)",
  institute_pro: "var(--ac)",
};

const fmt = (n: number) => Math.round(n).toLocaleString();

export function BreakdownTable({ breakdown, focusLabel, loading }: Props) {
  const totalExpected = breakdown.reduce((s, b) => s + b.expected, 0) || 1;

  return (
    <div className="card" style={{ padding: 20 }}>
      <div className="sec-hdr" style={{ marginBottom: 14 }}>
        <div>
          <div className="sec-title">Revenue by Plan</div>
          <div style={{ fontSize: 11, color: "var(--ink3)", marginTop: 3 }}>
            {focusLabel ? focusLabel : "Current period"}
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", color: "var(--ink3)", padding: "32px 0" }}>Loading…</div>
      ) : breakdown.length === 0 ? (
        <div style={{ textAlign: "center", color: "var(--ink3)", padding: "32px 0" }}>No data for this period</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {breakdown.map(b => {
            const share = Math.round((b.expected / totalExpected) * 100);
            const collectedPct = b.expected ? Math.round((b.collected / b.expected) * 100) : 0;
            const color = PLAN_COLORS[b.plan] || "var(--tc)";
            return (
              <div key={b.plan}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 9, height: 9, borderRadius: 3, background: color }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{b.label}</span>
                    <span style={{ fontSize: 11, color: "var(--ink3)" }}>· {b.institutes} institute{b.institutes !== 1 ? "s" : ""}</span>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--ink)" }}>
                      LKR {fmt(b.expected)}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--ink3)", marginLeft: 6 }}>{share}%</span>
                  </div>
                </div>
                <div style={{ height: 8, background: "var(--cr-d)", borderRadius: 99, overflow: "hidden", position: "relative" }}>
                  <div style={{ position: "absolute", inset: 0, width: `${share}%`, background: `${color}26`, borderRadius: 99 }} />
                  <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: `${(share * collectedPct) / 100}%`, background: color, borderRadius: 99, transition: "width .5s" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                  <span style={{ fontSize: 10.5, color: "var(--jd)" }}>Collected LKR {fmt(b.collected)} ({collectedPct}%)</span>
                  {b.outstanding > 0 && (
                    <span style={{ fontSize: 10.5, color: "var(--rb)" }}>Outstanding LKR {fmt(b.outstanding)}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
