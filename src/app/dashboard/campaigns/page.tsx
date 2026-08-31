"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import DataTable from "@/components/data-table";
import type { Column } from "@/components/data-table";

interface Campaign {
  id: string;
  name: string;
  status: string;
  routing_strategy: string;
  price_cents: number;
  min_connected_seconds: number;
  retreaver_cid: string | null;
  created_at: string;
}

function formatCents(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [sortBy, setSortBy] = useState("created_at");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [statusFilter, setStatusFilter] = useState("");

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "25", sortBy, order });
    if (search) params.set("search", search);
    if (statusFilter) params.set("status", statusFilter);
    const res = await fetch(`/api/v1/campaigns?${params}`);
    if (res.ok) {
      const body = await res.json();
      setCampaigns(body.data);
      setTotalPages(body.pagination.totalPages);
      setTotal(body.pagination.total);
    }
    setLoading(false);
  }, [page, sortBy, order, search, statusFilter]);

  useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);

  function toggleSort(field: string) {
    if (sortBy === field) setOrder(order === "asc" ? "desc" : "asc");
    else { setSortBy(field); setOrder("desc"); }
  }

  const columns: Column<Campaign>[] = [
    { key: "name", header: "Name", sortable: true, render: (c) => <Link href={`/dashboard/campaigns/${c.id}`} className="clickable">{c.name}</Link> },
    { key: "status", header: "Status", sortable: true, render: (c) => <span className={`badge${c.status === "active" ? " badge-success" : ""}`}>{c.status}</span> },
    { key: "routing_strategy", header: "Strategy", render: (c) => <span className="text-mono-sm">{c.routing_strategy}</span> },
    { key: "price_cents", header: "Price", sortable: true, render: (c) => <span className="text-mono-sm">{c.price_cents != null ? formatCents(c.price_cents) : "—"}</span> },
    { key: "retreaver_cid", header: "Retreaver", render: (c) => c.retreaver_cid ? <span className="badge badge-success">Linked · {c.retreaver_cid}</span> : <span className="text-muted text-mono-sm">—</span> },
    { key: "min_connected_seconds", header: "Min connect", render: (c) => <span className="text-mono-sm">{c.min_connected_seconds}s</span> },
    { key: "created_at", header: "Created", sortable: true, render: (c) => <span className="text-mono-sm">{new Date(c.created_at).toLocaleDateString()}</span> },
  ];

  return (
    <div className="dashboard-page">
      <div className="dashboard-page-header">
        <div>
          <p className="eyebrow"><i /> OPERATIONS / CAMPAIGNS</p>
          <h1>Campaigns</h1>
        </div>
        <div className="search-bar">
          <input className="input" type="search" placeholder="Search campaigns..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          <Link href="/dashboard/campaigns/new" className="btn btn-primary">+ Create</Link>
          <span className="text-mono-sm">{total} total</span>
        </div>
      </div>
      <div className="filter-bar">
        <select className="input" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="archived">Archived</option>
        </select>
      </div>
      {loading ? (
        <div className="stack" style={{ gap: 12 }}>{Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton skeleton-text" />)}</div>
      ) : campaigns.length === 0 ? (
        <div className="empty-state"><p>No campaigns found.</p></div>
      ) : (
        <DataTable
          columns={columns}
          data={campaigns}
          page={page}
          totalPages={totalPages}
          total={total}
          onPageChange={setPage}
          sortBy={sortBy}
          order={order}
          onSort={toggleSort}
        />
      )}
    </div>
  );
}
