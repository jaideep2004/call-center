"use client";

import { Suspense, useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import DataTable from "@/components/data-table";
import type { Column } from "@/components/data-table";
import { showToast } from "@/lib/use-toast";

interface Campaign {
  id: string;
  name: string;
  status: string;
  routing_strategy: string;
  price_cents: number;
  min_connected_seconds: number;
  retreaver_cid: string | null;
  display_code: string | null;
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
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
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

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await fetch("/api/v1/retreaver/campaigns/sync", { method: "POST" });
      const body = await res.json().catch(() => ({} as { data?: { created?: number; updated?: number; archived?: number }; message?: string }));
      if (res.ok) {
        const { created = 0, updated = 0, archived = 0 } = body.data ?? {};
        const parts = ["Retreaver campaigns synced"];
        if (created > 0) parts.push(`${created} created`);
        if (updated > 0) parts.push(`${updated} updated`);
        if (archived > 0) parts.push(`${archived} archived (deleted in Retreaver)`);
        showToast(parts.join(" — "), "success");
        setLastSync(new Date().toLocaleTimeString());
        fetchCampaigns();
      } else {
        showToast(body.message ?? "Campaign sync failed", "error");
      }
    } catch {
      showToast("Network error syncing campaigns", "error");
    } finally {
      setSyncing(false);
    }
  }

  const columns: Column<Campaign>[] = [
    { key: "name", header: "Name", sortable: true, render: (c) => <span><Link href={`/dashboard/campaigns/${c.id}`} className="clickable" style={{ fontWeight: 500 }}>{c.name}</Link>{c.display_code && <span className="text-mono-sm" style={{ marginLeft: 8, color: "var(--muted)", fontSize: 11 }}>{c.display_code}</span>}</span> },
    { key: "status", header: "Status", sortable: true, render: (c) => <span className={`badge${c.status === "active" ? " badge-success" : c.status === "paused" ? " badge-warning" : c.status === "archived" ? " badge-danger" : ""}`}>{c.status}</span> },
    { key: "routing_strategy", header: "Strategy", render: (c) => <span className="text-mono-sm">{c.routing_strategy}</span> },
    { key: "price_cents", header: "Price", sortable: true, render: (c) => <span className="text-mono-sm" style={{ color: "var(--accent)" }}>{c.price_cents != null ? formatCents(c.price_cents) : "\u2014"}</span> },
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
          <input className="input" type="search" placeholder="Search campaigns..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} style={{ minWidth: 220 }} />
          <button className="btn btn-secondary btn-sm" onClick={handleSync} disabled={syncing} title="Pull latest campaigns, pause states and deletions from Retreaver (also auto-syncs every 10 minutes)">
            {syncing ? "Syncing…" : "Sync Retreaver"}
          </button>
          <Link href="/dashboard/campaigns/new" className="btn btn-primary">+ Create</Link>
        </div>
      </div>
      {lastSync && <p className="text-mono-sm" style={{ color: "var(--muted)", fontSize: 11, margin: "0 0 8px" }}>Last Retreaver sync: {lastSync} · auto-syncs every 10 min</p>}
      <div className="filter-bar">
        <select className="select" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} style={{ maxWidth: 160 }}>
          <option value="">All current</option>
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
