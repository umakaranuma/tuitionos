import { BATCHES, BatchId, ALL_STUDENTS } from "@/lib/batchData";

interface BatchTabsProps {
  active: BatchId;
  onChange: (id: BatchId) => void;
  showCount?: boolean;
}

export function BatchTabs({ active, onChange, showCount = true }: BatchTabsProps) {
  return (
    <div style={{
      display: "flex", gap: 6, flexWrap: "wrap",
      padding: "10px 14px",
      background: "#fff", border: "1px solid var(--ln)",
      borderRadius: 12, marginBottom: 18,
      boxShadow: "0 1px 3px rgba(28,25,23,.05)",
    }}>
      <span style={{
        fontSize: 10.5, fontWeight: 700, color: "var(--ink3)",
        letterSpacing: ".07em", textTransform: "uppercase",
        alignSelf: "center", marginRight: 6, whiteSpace: "nowrap",
      }}>
        Batch
      </span>
      {BATCHES.map(b => {
        const isActive = active === b.id;
        const count = showCount ? ALL_STUDENTS.filter(s => s.batch === b.id).length : 0;
        return (
          <button
            key={b.id}
            onClick={() => onChange(b.id as BatchId)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "6px 13px", borderRadius: 8, border: "1.5px solid",
              borderColor: isActive ? b.color : "var(--ln)",
              background: isActive ? b.colorL : "transparent",
              color: isActive ? b.color : "var(--ink3)",
              fontSize: 12.5, fontWeight: isActive ? 700 : 500,
              cursor: "pointer", transition: "all 140ms",
            }}
          >
            {b.label}
            {showCount && (
              <span style={{
                fontSize: 10.5, fontWeight: 700,
                background: isActive ? b.color : "var(--cr-d)",
                color: isActive ? "#fff" : "var(--ink3)",
                borderRadius: 99, padding: "1px 6px",
                transition: "all 140ms",
              }}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
