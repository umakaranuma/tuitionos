"use client";
import { useState, useMemo } from "react";

/* ── Column definition ── */
export type Column<T> = {
  key: string;
  header: string;
  width?: number | string;
  render: (row: T, index: number) => React.ReactNode;
};

/* ── Props ── */
export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  rowKey: (row: T) => string | number;
  /** Which per-page sizes to offer (default [10, 25, 50]) */
  perPageOptions?: number[];
  /** Default per-page (default 10) */
  defaultPerPage?: number;
  /** Callback when row is clicked */
  onRowClick?: (row: T) => void;
  /** Row background override */
  rowBg?: (row: T) => string | undefined;
  /** Render something below the table footer (e.g. floating save bar) */
  footer?: React.ReactNode;
  /** Empty state message */
  emptyMessage?: string;
  /** Extra header content (left side, e.g. "Showing Grade 10 students") */
  headerLeft?: React.ReactNode;
  /** Title shown above the table */
  title?: string;
}

const PER_PAGE_OPTS = [10, 25, 50];

export function DataTable<T>({
  columns,
  data,
  rowKey,
  perPageOptions = PER_PAGE_OPTS,
  defaultPerPage = 10,
  onRowClick,
  rowBg,
  footer,
  emptyMessage = "No records found",
  headerLeft,
  title,
}: DataTableProps<T>) {
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(defaultPerPage);

  // Reset to page 1 when data or perPage changes
  const totalPages = Math.max(1, Math.ceil(data.length / perPage));
  const safePage = Math.min(page, totalPages);
  if (safePage !== page) setPage(safePage);

  const pageData = useMemo(
    () => data.slice((safePage - 1) * perPage, safePage * perPage),
    [data, safePage, perPage]
  );

  const startIdx = (safePage - 1) * perPage + 1;
  const endIdx = Math.min(safePage * perPage, data.length);

  // Page number range to show (max 5 numbers)
  const pageNumbers = useMemo(() => {
    const pages: number[] = [];
    let start = Math.max(1, safePage - 2);
    let end = Math.min(totalPages, start + 4);
    start = Math.max(1, end - 4);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }, [safePage, totalPages]);

  return (
    <div>
      {/* Table header bar */}
      {(title || headerLeft) && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginBottom: 8,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {title && (
              <span style={{
                fontSize: 11.5, fontWeight: 700, color: "var(--ink3)",
                letterSpacing: ".06em", textTransform: "uppercase",
              }}>
                {title}
              </span>
            )}
            {headerLeft}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="tw">
        <table>
          <thead>
            <tr>
              {columns.map(col => (
                <th key={col.key} style={col.width ? { width: col.width } : undefined}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} style={{
                  textAlign: "center", color: "var(--ink3)",
                  padding: "32px 0", fontSize: 12.5,
                }}>
                  <div style={{ fontSize: 28, marginBottom: 6 }}>📭</div>
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              pageData.map((row, idx) => (
                <tr
                  key={rowKey(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  style={{
                    background: rowBg?.(row) || "#fff",
                    cursor: onRowClick ? "pointer" : undefined,
                  }}
                >
                  {columns.map(col => (
                    <td key={col.key}>{col.render(row, (safePage - 1) * perPage + idx)}</td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination footer */}
        {data.length > 0 && (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "10px 14px", borderTop: "1px solid var(--ln)",
            background: "var(--cr)", fontSize: 12,
          }}>
            {/* Left: Per page + showing info */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 11, color: "var(--ink3)", fontWeight: 500 }}>
                  Rows per page
                </span>
                <select
                  value={perPage}
                  onChange={e => { setPerPage(Number(e.target.value)); setPage(1); }}
                  style={{
                    width: 56, padding: "4px 6px", fontSize: 11.5,
                    borderRadius: 6, border: "1.5px solid var(--ln)",
                    background: "#fff", fontWeight: 600, cursor: "pointer",
                  }}
                >
                  {perPageOptions.map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
              <span style={{
                fontSize: 11, color: "var(--ink3)", fontFamily: "var(--font-mono)",
                fontWeight: 500,
              }}>
                Showing {startIdx}–{endIdx} of {data.length}
              </span>
            </div>

            {/* Right: Page navigation */}
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={safePage === 1}
                style={{
                  width: 28, height: 28, borderRadius: 7,
                  border: "1.5px solid var(--ln)", background: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: safePage === 1 ? "not-allowed" : "pointer",
                  opacity: safePage === 1 ? 0.4 : 1,
                  transition: "all 120ms", fontSize: 13, color: "var(--ink2)",
                }}
              >
                ‹
              </button>

              {pageNumbers.map(pn => (
                <button
                  key={pn}
                  onClick={() => setPage(pn)}
                  style={{
                    width: 28, height: 28, borderRadius: 7,
                    border: pn === safePage ? "1.5px solid var(--tc)" : "1.5px solid transparent",
                    background: pn === safePage ? "var(--tc-l)" : "transparent",
                    color: pn === safePage ? "var(--tc-d)" : "var(--ink3)",
                    fontWeight: pn === safePage ? 700 : 500,
                    fontSize: 11.5, cursor: "pointer",
                    transition: "all 120ms",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  {pn}
                </button>
              ))}

              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                style={{
                  width: 28, height: 28, borderRadius: 7,
                  border: "1.5px solid var(--ln)", background: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: safePage === totalPages ? "not-allowed" : "pointer",
                  opacity: safePage === totalPages ? 0.4 : 1,
                  transition: "all 120ms", fontSize: 13, color: "var(--ink2)",
                }}
              >
                ›
              </button>
            </div>
          </div>
        )}
      </div>

      {footer}
    </div>
  );
}
