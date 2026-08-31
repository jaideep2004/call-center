"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import DataTable from "@/components/data-table";
import type { Column } from "@/components/data-table";

interface Invoice {
  id: string;
  call_id: string | null;
  total_cents: number;
  currency: string;
  status: string;
  created_at: string;
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState("");

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "25" });
    if (statusFilter) params.set("status", statusFilter);
    const res = await fetch(`/api/v1/invoices?${params}`);
    if (res.ok) {
      const body = await res.json();
      setInvoices(body.data);
      setTotalPages(body.pagination.totalPages);
      setTotal(body.pagination.total);
    }
    setLoading(false);
  }, [page, statusFilter]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const columns: Column<Invoice>[] = [
    { key: "created_at", header: "Date", render: (inv) => <span className="text-mono-sm">{new Date(inv.created_at).toLocaleDateString()}</span> },
    { key: "id", header: "Invoice", render: (inv) => <Link href={`/dashboard/wallet/invoices/${inv.id}`} className="clickable">{inv.id.slice(0, 8)}</Link> },
    { key: "call_id", header: "Call", render: (inv) => <span className="text-mono-sm">{inv.call_id ? inv.call_id.slice(0, 8) : "—"}</span> },
    { key: "total_cents", header: "Amount", render: (inv) => <span className="text-mono-sm">${(inv.total_cents / 100).toFixed(2)} {inv.currency}</span> },
    {
      key: "status", header: "Status",
      render: (inv) => <span className={`badge${inv.status === "paid" ? " badge-success" : ""}${inv.status === "disputed" ? " badge-danger" : ""}`}>{inv.status}</span>,
    },
  ];

  return (
    <div className="dashboard-page">
      <div className="dashboard-page-header">
        <div>
          <p className="eyebrow"><i /> FINANCE / INVOICES</p>
          <h1>Invoices</h1>
        </div>
        <Link href="/dashboard/wallet" className="text-mono-sm" style={{ color: "var(--cyan)" }}>← Back to wallet</Link>
      </div>
      <div className="filter-bar">
        <select className="input" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="cancelled">Cancelled</option>
          <option value="disputed">Disputed</option>
        </select>
        <span className="text-mono-sm">{total} total</span>
      </div>
      <DataTable
        columns={columns}
        data={invoices}
        loading={loading}
        emptyMessage="No invoices found."
        page={page}
        totalPages={totalPages}
        total={total}
        onPageChange={setPage}
        sortBy=""
        order="desc"
        onSort={() => {}}
      />
    </div>
  );
}
