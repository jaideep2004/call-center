"use client";

import { Suspense, useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import DataTable from "@/components/data-table";
import type { Column } from "@/components/data-table";
import Sparkline from "@/components/sparkline";
import { showToast } from "@/lib/use-toast";
import { formatCents } from "@/lib/format";

interface CampaignRow {
  campaign_id: string | null;
  campaign_name: string | null;
  price_cents: number | null;
  calls: number;
  qualified_calls: number;
  payout_cents: number;
}

type CampaignTableRow = CampaignRow & { id: string };

const PAGE_SIZE = 10;

function PublisherCampaignsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") ?? "";
  const initialPage = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);

  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(initialQ);
  const [debouncedQ, setDebouncedQ] = useState(initialQ);
  const [page, setPage] = useState(initialPage);
  const [sortBy, setSortBy] = useState<string>("payout_cents");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const hasMounted = useRef(false);

  const fetchCampaigns = useCallback(async () => {
    const res = await fetch("/api/v1/publisher/overview");
    if (res.ok) {
      const body = await res.json();
      setCampaigns(body.data?.campaigns ?? []);
    } else {
      showToast("Failed to load campaigns", "error");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  // Debounce 300ms
  useEffect(() => {
    const t = setTimeout(() => {
      const trimmed = searchInput.trim();
      if (trimmed !== debouncedQ) {
        setDebouncedQ(trimmed);
        setPage(1);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput, debouncedQ]);

  // URL sync ?q=&page
  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }
    const params = new URLSearchParams();
    if (debouncedQ) params.set("q", debouncedQ);
    if (page > 1) params.set("page", String(page));
    const qs = params.toString();
    if (qs === searchParams.toString()) return;
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
  }, [debouncedQ, page, router, searchParams]);

  const campaignsWithId: CampaignTableRow[] = useMemo(
    () => campaigns.map((c, idx) => ({ ...c, id: c.campaign_id ?? `unassigned-${idx}` })),
    [campaigns]
  );

  const filtered = useMemo(() => {
    let out = [...campaignsWithId];
    if (debouncedQ) {
      const q = debouncedQ.toLowerCase();
      out = out.filter((c) => {
        return (
          (c.campaign_name ?? "unassigned").toLowerCase().includes(q) ||
          String(c.price_cents ?? "").includes(q) ||
          String(c.calls).includes(q) ||
          String(c.qualified_calls).includes(q) ||
          String(c.payout_cents).includes(q)
        );
      });
    }
    out.sort((a, b) => {
      let cmp = 0;
      if (sortBy === "campaign_name") cmp = (a.campaign_name ?? "").localeCompare(b.campaign_name ?? "");
      else if (sortBy === "calls") cmp = a.calls - b.calls;
      else if (sortBy === "qualified_calls") cmp = a.qualified_calls - b.qualified_calls;
      else if (sortBy === "payout_cents") cmp = a.payout_cents - b.payout_cents;
      else if (sortBy === "price_cents") cmp = (a.price_cents ?? 0) - (b.price_cents ?? 0);
      return order === "asc" ? cmp : -cmp;
    });
    return out;
  }, [campaignsWithId, debouncedQ, sortBy, order]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, safePage]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  function handleSort(field: string) {
    if (sortBy === field) setOrder((o) => (o === "asc" ? "desc" : "asc"));
    else {
      setSortBy(field);
      setOrder(field === "campaign_name" ? "asc" : "desc");
    }
  }

  const sparklineData: number[] | null = useMemo(() => {
    if (campaignsWithId.length < 2) return null;
    // payout per campaign sorted descending gives a distribution sparkline
    const vals = [...campaignsWithId].sort((a, b) => b.payout_cents - a.payout_cents).map((c) => c.payout_cents);
    return vals.some((v) => v > 0) ? vals : null;
  }, [campaignsWithId]);

  const columns: Column<CampaignTableRow>[] = [
    {
      key: "campaign_name",
      header: "Campaign",
      sortable: true,
      render: (c) => c.campaign_name ?? <span className="text-muted">Unassigned</span>,
    },
    {
      key: "price_cents",
      header: "Buyer price",
      sortable: true,
      render: (c) => (c.price_cents ? formatCents(c.price_cents) : "—"),
    },
    { key: "calls", header: "Calls", sortable: true, render: (c) => <span className="text-mono-sm">{c.calls}</span> },
    { key: "qualified_calls", header: "Qualified", sortable: true, render: (c) => <span className="text-mono-sm">{c.qualified_calls}</span> },
    {
      key: "payout_cents",
      header: "Payout",
      sortable: true,
      className: "text-right",
      render: (c) => <span className="text-mono-sm" style={{ fontWeight: 600 }}>{formatCents(c.payout_cents)}</span>,
    },
  ];

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="stack" style={{ gap: 12 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton skeleton-text" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-page-header">
        <div>
          <p className="eyebrow">
            <i /> PUBLISHER / CAMPAIGNS
          </p>
          <h1>Campaigns</h1>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span className="text-mono-sm" style={{ color: "var(--muted)" }}>
            {filtered.length} campaign(s){debouncedQ ? " (filtered)" : ""}
          </span>
          <button className="btn btn-secondary btn-sm" onClick={() => { fetchCampaigns(); showToast("Refreshing campaigns…", "info"); }}>
            Refresh
          </button>
        </div>
      </div>

      {sparklineData && sparklineData.length >= 2 && (
        <section className="card card--spacious">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div>
              <h2 style={{ font: "500 16px var(--serif)", margin: 0 }}>Payout by Campaign</h2>
              <p className="text-muted" style={{ fontSize: 11, margin: "4px 0 0" }}>Distribution of earned payout across campaigns (high → low)</p>
            </div>
            <span className="text-mono-sm" style={{ color: "var(--muted)" }}>
              {formatCents(sparklineData.reduce((a, b) => a + b, 0))} total
            </span>
          </div>
          <div style={{ width: "100%", overflow: "hidden", marginTop: "var(--space-4)" }}>
            <Sparkline data={sparklineData} width={720} height={48} responsive />
          </div>
        </section>
      )}

      <div className="filter-bar">
        <div className="filter-bar__primary">
          <div style={{ position: "relative", flex: "1 1 260px", maxWidth: 380 }}>
            <input
              className="input"
              placeholder="Search campaign, price, payout…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              aria-label="Search campaigns"
            />
            {searchInput && (
              <button
                onClick={() => setSearchInput("")}
                aria-label="Clear search"
                style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--muted)",
                  fontSize: 16,
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            )}
          </div>
        </div>
        <span className="filter-bar__meta">
          {filtered.length > PAGE_SIZE ? `Page ${safePage} of ${totalPages}` : `${filtered.length} campaign(s)`}{debouncedQ ? " (filtered)" : ""}
        </span>
      </div>

      <section className="card card--spacious">

        {campaigns.length === 0 ? (
          <div className="empty-state">
            <p>
              <strong>No campaign data yet</strong>
            </p>
            <p className="text-muted">Once calls are attributed to you, they&apos;ll appear here per campaign.</p>
            <div style={{ display: "flex", gap: 8, marginTop: "var(--space-4)", justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/dashboard/publisher" className="btn btn-primary btn-sm">
                Back to Overview
              </Link>
              <button className="btn btn-secondary btn-sm" onClick={() => showToast("Contact your account manager to get assigned to campaigns.", "info")}>
                Need campaigns?
              </button>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <p>No campaigns match &quot;{debouncedQ}&quot;.</p>
            <button className="btn btn-secondary btn-sm" style={{ marginTop: "var(--space-4)" }} onClick={() => setSearchInput("")}>
              Clear search
            </button>
          </div>
        ) : (
          <DataTable
              columns={columns}
              data={paged}
              loading={false}
              emptyMessage="No campaigns match your search."
              page={safePage}
              totalPages={totalPages}
              total={filtered.length}
              onPageChange={setPage}
              sortBy={sortBy}
              order={order}
              onSort={handleSort}
            />
        )}
      </section>
    </div>
  );
}

export default function PublisherCampaignsPage() {
  return (
    <Suspense fallback={<div className="dashboard-page"><div className="skeleton skeleton-text" style={{ height: 18, width: 200 }} /></div>}>
      <PublisherCampaignsInner />
    </Suspense>
  );
}
