"use client";

import { Suspense, useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
const PAGE_SIZE = 10;
function CampaignsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") ?? "";
  const initialStatus = searchParams.get("status") ?? "";
  const initialPage = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(initialQ);
  const [debouncedQ, setDebouncedQ] = useState(initialQ);
  const [page, setPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [sortBy, setSortBy] = useState("created_at");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const hasMounted = useRef(false);

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE), sortBy, order });
    if (debouncedQ) params.set("search", debouncedQ);
    if (statusFilter) params.set("status", statusFilter);
    const res = await fetch(`/api/v1/campaigns?${params}`);
    if (res.ok) {
      const body = await res.json();
      setCampaigns(body.data);
      setTotalPages(body.pagination.totalPages);
      setTotal(body.pagination.total);
    }
    setLoading(false);
  }, [page, sortBy, order, debouncedQ, statusFilter]);

  useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);

  useEffect(() => {
    const t = setTimeout(() => {
      const trimmed = searchInput.trim();
      if (trimmed !== debouncedQ) { setDebouncedQ(trimmed); setPage(1); }
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput, debouncedQ]);

  useEffect(() => {
    if (!hasMounted.current) { hasMounted.current = true; return; }
    const p = new URLSearchParams();
    if (debouncedQ) p.set("q", debouncedQ);
    if (statusFilter) p.set("status", statusFilter);
    if (page > 1) p.set("page", String(page));
    const qs = p.toString();
    if (qs === searchParams.toString()) return;
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
  }, [debouncedQ, statusFilter, page, router, searchParams]);

  function toggleSort(field: string) {
    if (sortBy === field) setOrder(order === "asc" ? "desc" : "asc");
    else { setSortBy(field); setOrder("desc"); }
  }

  const columns: Column<Campaign>[] = [
    { key: "name", header: "Name", sortable: true, render: (c) => <Link href={`/dashboard/campaigns/${c.id}`} className="clickable" style={{ fontWeight: 500 }}>{c.name}</Link> },
    { key: "status", header: "Status", sortable: true, render: (c) => <span className={`badge${c.status === "active" ? " badge-success" : c.status === "paused" ? " badge-warning" : c.status === "archived" ? " badge-danger" : ""}`}>{c.status}</span> },
    { key: "routing_strategy", header: "Strategy", render: (c) => <span className="text-mono-sm">{c.routing_strategy}</span> },
    { key: "price_cents", header: "Price", sortable: true, render: (c) => <span className="text-mono-sm" style={{ color: "var(--accent)" }}>{c.price_cents != null ? formatCents(c.price_cents) : "\u2014"}</span> },
    { key: "retreaver_cid", header: "Retreaver", render: (c) => c.retreaver_cid ? <span className="badge badge-success">Linked · {c.retreaver_cid}</span> : <span className="text-muted text-mono-sm">\u2014</span> },
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
          <input className="input" type="search" placeholder="Search campaigns..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} style={{ minWidth: 220 }} />
          <Link href="/dashboard/campaigns/new" className="btn btn-primary">+ Create</Link>
        </div>
      </div>
      <div className="filter-bar">
        <select className="select" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} style={{ maxWidth: 160 }}>
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="archived">Archived</option>
        </select>
        <span className="text-mono-sm" style={{ marginLeft: "auto", color: "var(--muted)", fontSize: 11 }}>{total} campaigns</span>
      </div>
      <DataTable
          columns={columns}
          data={campaigns}
          loading={loading}
          emptyMessage="No campaigns found. Create your first campaign to start routing calls."
          page={page}
          totalPages={totalPages}
          total={total}
          onPageChange={setPage}
          sortBy={sortBy}
          order={order}
          onSort={toggleSort}
        />
    </div>
  );
}
export default function CampaignsPage() {
  return (
    <Suspense fallback={<div className="dashboard-page"><div className="skeleton skeleton-text" /></div>}>
      <CampaignsInner />
    </Suspense>
  );
}
