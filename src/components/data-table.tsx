"use client";

import { ReactNode } from "react";

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  render: (row: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
  sortBy: string;
  order: "asc" | "desc";
  onSort: (field: string) => void;
  skeletonRows?: number;
}

const rowSkeleton = (cols: number, key: number) => (
  <tr key={key}>
    {Array.from({ length: cols }).map((_, i) => (
      <td key={i}><div className="skeleton skeleton-text" style={{ height: 14 }} /></td>
    ))}
  </tr>
);

export default function DataTable<T extends { id: string }>({
  columns, data, loading, emptyMessage = "No data found.",
  page, totalPages, total, onPageChange, sortBy, order, onSort, skeletonRows = 6,
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="data-table-wrap">
        <table className="data-table" aria-busy="true">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key}>{col.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: skeletonRows }).map((_, i) => rowSkeleton(columns.length, i))}
          </tbody>
        </table>
      </div>
    );
  }

  if (data.length === 0) {
    return <div className="empty-state"><p>{emptyMessage}</p></div>;
  }

  return (
    <>
      <div className="data-table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={col.sortable ? "sortable" : ""}
                onClick={() => col.sortable && onSort(col.key)}
              >
                {col.header}
                {col.sortable && sortBy === col.key && (
                  <span className="sort-arrow">{order === "asc" ? " \u2191" : " \u2193"}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.id}>
              {columns.map((col) => (
                <td key={col.key} className={col.className ?? ""}>
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      {totalPages > 1 && (
        <div className="pagination">
          <button className="pagination-item" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>&lsaquo;</button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button key={p} className={`pagination-item${p === page ? " active" : ""}`} onClick={() => onPageChange(p)}>{p}</button>
          ))}
          <button className="pagination-item" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>&rsaquo;</button>
        </div>
      )}
      {total > 0 && (
        <p className="text-mono-sm" style={{ marginTop: "var(--space-3)", textAlign: "center" }}>
          {total} total
        </p>
      )}
    </>
  );
}
