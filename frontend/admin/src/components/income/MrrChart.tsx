"use client";
import { useState } from "react";

export type TrendPoint = {
  month: number;
  label: string;
  expected: number;
  collected: number;
  outstanding: number;
  paid_count: number;
  institutes: number;
};

type Props = {
  trend: TrendPoint[];
  loading?: boolean;
  focusMonth?: number;
};

const fmt = (n: number) => `LKR ${Math.round(n).toLocaleString()}`;

export function MrrChart({ trend, loading, focusMonth }: Props) {
  const [hover, setHover] = useState<number | null>(null);

  const peak = Math.max(1, ...trend.map(t => t.expected));
  const totalCollected = trend.reduce((s, t) => s + t.collected, 0);
  const totalExpected = trend.reduce((s, t) => s + t.expected, 0);
  const rate = totalExpected ? Math.round((totalCollected / totalExpected) * 100) : 0;

  return (
    <div className="card" style={{ padding: 20 }}>
      <div className="sec-hdr" style={{ marginBottom: 4 }}>
        <div>
          <div className="sec-title">Revenue Trend</div>
          <div style={{ fontSize: 11, color: "var(--ink3)", marginTop: 3 }}>
            Expected vs collected per month
          </div>
        </div>
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--ink2)" }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: "var(--tc-l)", border: "1px solid var(--tc)" }} />
            Expected
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--ink2)" }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: "var(--jd)" }} />
            Collected
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", color: "var(--ink3)", padding: "48px 0" }}>Loading chart…</div>
      ) : (
        <>
          <div
            style={{
              display: "flex", alignItems: "flex-end", gap: 8,
              height: 168, paddingTop: 28, position: "relative",
            }}
          >
            {trend.map((t, i) => {
              const expH = (t.expected / peak) * 100;
              const colH = (t.collected / peak) * 100;
              const isHover = hover === i;
              const isFocus = focusMonth === t.month;
              return (
                <div
                  key={t.month}
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                  style={{
                    flex: 1, display: "flex", flexDirection: "column",
                    alignItems: "center", gap: 6, height: "100%",
                    justifyContent: "flex-end", position: "relative", cursor: "default",
                  }}
                >
                  {isHover && (
                    <div
                      style={{
                        position: "absolute", bottom: "calc(100% + 6px)", left: "50%",
                        transform: "translateX(-50%)", zIndex: 5,
                        background: "var(--ink)", color: "#fff", borderRadius: 8,
                        padding: "8px 10px", fontSize: 11, whiteSpace: "nowrap",
                        boxShadow: "0 8px 24px rgba(0,0,0,.22)", lineHeight: 1.5,
                      }}
                    >
                      <div style={{ fontWeight: 700, marginBottom: 2 }}>{t.label}</div>
                      <div style={{ color: "#c7d2fe" }}>Expected: {fmt(t.expected)}</div>
                      <div style={{ color: "#bfdbfe" }}>Collected: {fmt(t.collected)}</div>
                      <div style={{ color: "#fca5a5" }}>Outstanding: {fmt(t.outstanding)}</div>
                    </div>
                  )}
                  <div
                    style={{
                      position: "relative", width: "78%", maxWidth: 34,
                      height: `${expH}%`, minHeight: t.expected > 0 ? 4 : 0,
                      background: "var(--tc-l)",
                      border: `1px solid ${isFocus ? "var(--tc-d)" : "var(--tc)"}`,
                      borderRadius: "5px 5px 0 0",
                      display: "flex", alignItems: "flex-end",
                      transition: "filter 150ms", filter: isHover ? "brightness(.97)" : "none",
                    }}
                  >
                    <div
                      style={{
                        width: "100%", height: `${expH ? (colH / expH) * 100 : 0}%`,
                        background: isFocus ? "var(--tc)" : "var(--jd)",
                        borderRadius: "4px 4px 0 0", transition: "height .5s",
                      }}
                    />
                  </div>
                  <div style={{
                    fontSize: 10, fontWeight: isFocus ? 700 : 500,
                    color: isFocus ? "var(--tc)" : "var(--ink3)",
                  }}>{t.label}</div>
                </div>
              );
            })}
          </div>

          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--ln)",
          }}>
            <div style={{ fontSize: 11, color: "var(--ink3)" }}>
              YTD collected <strong style={{ color: "var(--ink2)", fontFamily: "var(--font-mono)" }}>{fmt(totalCollected)}</strong> of {fmt(totalExpected)}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 120, height: 6, background: "var(--cr-d)", borderRadius: 99, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${rate}%`, background: "var(--jd)", borderRadius: 99 }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--jd)" }}>{rate}%</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
