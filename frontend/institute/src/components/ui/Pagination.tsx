import React from 'react';

interface PaginationProps {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  itemName?: string;
}

export function Pagination({ page, limit, totalCount, totalPages, onPageChange, onLimitChange, itemName = "items" }: PaginationProps) {
  if (totalCount === 0) return null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderTop: '1px solid var(--ln)', background: '#fff' }}>
      <div style={{ fontSize: 12, color: 'var(--ink3)' }}>
        Showing {(page - 1) * limit + 1} to {Math.min(page * limit, totalCount)} of {totalCount} {itemName}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <select 
          value={limit} 
          onChange={e => onLimitChange(Number(e.target.value))} 
          className="inp" 
          style={{ width: 80, padding: '4px 8px', fontSize: 12, height: 28, minHeight: 28 }}
        >
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
        <div style={{ display: 'flex', gap: 4 }}>
          <button className="btn btn-xs btn-s" disabled={page === 1} onClick={() => onPageChange(page - 1)}>Prev</button>
          <button className="btn btn-xs btn-s" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>Next</button>
        </div>
      </div>
    </div>
  );
}
