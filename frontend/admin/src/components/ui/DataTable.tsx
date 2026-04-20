"use client";
interface Column<T> { key: keyof T; label: string; render?: (row: T) => React.ReactNode; }
interface DataTableProps<T> { columns: Column<T>[]; data: T[]; keyExtractor: (row: T) => string | number; }
export function DataTable<T>({ columns, data, keyExtractor }: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-700">
      <table className="w-full text-sm">
        <thead className="bg-slate-800/80 border-b border-slate-700">
          <tr>{columns.map(c => <th key={String(c.key)} className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">{c.label}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-slate-700/50">
          {data.map(row => (
            <tr key={keyExtractor(row)} className="hover:bg-slate-800/50 transition-colors">
              {columns.map(c => <td key={String(c.key)} className="px-4 py-3 text-slate-300">{c.render ? c.render(row) : String(row[c.key] ?? "")}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
