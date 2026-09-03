"use client";

import { Suspense, useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { formatCents } from "@/lib/format";
import DataTable from "@/components/data-table";
import type { Column } from "@/components/data-table";
import Sparkline from "@/components/sparkline";
import { showToast } from "@/lib/use-toast";

interface Overview {
  publisher: { id: string; name: string; fixed_price_cents: number | null; retreaver_status: string };
  stats: { total_calls: number; qualified_calls: number; payout_cents: number };
  campaigns: {
    campaign_id: string | null;
    campaign_name: string | null;
    price_cents: number | null;
    calls: number;
    qualified_calls: number;
    payout_cents: number;
  }[];
}

interface CallRow {
  id: string;
  uuid: string;
  caller: string | null;
  status: string | null;
  connected: boolean | null;
  payout_cents: number | null;
  campaign_name: string | null;
  created_at: string;
}

type CampaignRowForTable = Overview["campaigns"][number] & { id: string };

const PAGE_SIZE = 10;

function PublisherOverviewInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") ?? "";
  const initialPage = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);

  const [overview, setOverview] = useState<Overview | null>(null);
  const [recent, setRecent] = useState<CallRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [payoutTrend, setPayoutTrend] = useState<number[] | null>(null);

  const [searchInput, setSearchInput] = useState(initialQ);
  const [debouncedQ, setDebouncedQ] = useState(initialQ);
  const [campaignPage, setCampaignPage] = useState(initialPage);
  const [callsPage, setCallsPage] = useState(initialPage);
  const hasMounted = useRef(false);

  const fetchData = useCallback(async () => {
    const [ovRes, callsRes, payoutsRes] = await Promise.all([
      fetch("/api/v1/publisher/overview"),
      fetch("/api/v1/publisher/calls?limit=50"),
      fetch("/api/v1/publisher/payouts").catch(() => null as unknown as Response),
    ]);
    if (ovRes.ok) {
      const body = await ovRes.json();
      setOverview(body.data ?? null);
    }
    if (callsRes.ok) {
      const body = await callsRes.json();
      setRecent(body.data?.rows ?? []);
    }
    // Additive: try to load monthly payout trend for responsive chart; fallback to campaigns/recent
    if (payoutsRes && payoutsRes.ok) {
      try {
        const body = await payoutsRes.json();
        const monthly: Array<{ payout_cents: number }> = body.data?.monthly ?? [];
        if (monthly.length >= 2) setPayoutTrend(monthly.map((m) => Number(m.payout_cents)));
      } catch {}
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Debounce search 300ms — resets both pages
  useEffect(() => {
    const t = setTimeout(() => {
      const trimmed = searchInput.trim();
      if (trimmed !== debouncedQ) {
        setDebouncedQ(trimmed);
        setCampaignPage(1);
        setCallsPage(1);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput, debouncedQ]);

  // URL sync ?q=&page (campaign page) — additive only
  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }
    const params = new URLSearchParams();
    if (debouncedQ) params.set("q", debouncedQ);
    if (campaignPage > 1) params.set("page", String(campaignPage));
    const qs = params.toString();
    const current = searchParams.toString();
    if (qs === current) return;
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
  }, [debouncedQ, campaignPage, router, searchParams]);

  const campaignsWithId: CampaignRowForTable[] = useMemo(() => {
    const list = overview?.campaigns ?? [];
    return list.map((c) => ({ ...c, id: c.campaign_id ?? `unassigned-${c.campaign_name ?? "na"}` }));
  }, [overview]);

  const filteredCampaigns = useMemo(() => {
    if (!debouncedQ) return campaignsWithId;
    const q = debouncedQ.toLowerCase();
    return campaignsWithId.filter((c) => {
      return (
        (c.campaign_name ?? "unassigned").toLowerCase().includes(q) ||
        String(c.price_cents ?? "").includes(q) ||
        String(c.calls).includes(q) ||
        String(c.payout_cents).includes(q)
      );
    });
  }, [campaignsWithId, debouncedQ]);

  const filteredRecent = useMemo(() => {
    if (!debouncedQ) return recent;
    const q = debouncedQ.toLowerCase();
    return recent.filter((c) => {
      return (
        (c.caller ?? "").toLowerCase().includes(q) ||
        (c.campaign_name ?? "").toLowerCase().includes(q) ||
        (c.status ?? "").toLowerCase().includes(q) ||
        (c.connected ? "connected" : "missed").includes(q) ||
        new Date(c.created_at).toLocaleString().toLowerCase().includes(q)
      );
    });
  }, [recent, debouncedQ]);

  const campaignTotalPages = Math.max(1, Math.ceil(filteredCampaigns.length / PAGE_SIZE));
  const safeCampaignPage = Math.min(campaignPage, campaignTotalPages);
  const pagedCampaigns = useMemo(() => {
    const start = (safeCampaignPage - 1) * PAGE_SIZE;
    return filteredCampaigns.slice(start, start + PAGE_SIZE);
  }, [filteredCampaigns, safeCampaignPage]);

  const callsTotalPages = Math.max(1, Math.ceil(filteredRecent.length / PAGE_SIZE));
  const safeCallsPage = Math.min(callsPage, callsTotalPages);
  const pagedRecent = useMemo(() => {
    const start = (safeCallsPage - 1) * PAGE_SIZE;
    return filteredRecent.slice(start, start + PAGE_SIZE);
  }, [filteredRecent, safeCallsPage]);

  // Sparkline data: prefer monthly payoutTrend; else campaigns payout; else recent payout bucketed
  const sparklineData: number[] | null = useMemo(() => {
    if (payoutTrend && payoutTrend.length >= 2) return payoutTrend;
    if (campaignsWithId.length >= 2) return campaignsWithId.map((c) => c.payout_cents);
    if (recent.length >= 2) {
      // bucket recent calls by day (last 14) for trend
      const byDay = new Map<string, number>();
      const sorted = [...recent].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      for (const r of sorted) {
        const key = r.created_at.slice(0, 10);
        byDay.set(key, (byDay.get(key) ?? 0) + (r.payout_cents ?? 0));
      }
      const vals = Array.from(byDay.values());
      return vals.length >= 2 ? vals : recent.map((r) => r.payout_cents ?? 0);
    }
    return null;
  }, [payoutTrend, campaignsWithId, recent]);

  const handleRefresh = () => {
    setLoading(true);
    fetchData().then(() => showToast("Overview refreshed", "success"));
  };

  const campaignColumns: Column<CampaignRowForTable>[] = [
    {
      key: "campaign_name",
      header: "Campaign",
      sortable: true,
      render: (c) => c.campaign_name ?? <span className="text-muted">Unassigned</span>,
    },
    {
      key: "price_cents",
      header: "Buyer price",
      render: (c) => (c.price_cents ? formatCents(c.price_cents) : "—"),
    },
    { key: "calls", header: "Calls", sortable: true, render: (c) => <span className="text-mono-sm">{c.calls}</span> },
    { key: "qualified_calls", header: "Qualified", render: (c) => <span className="text-mono-sm">{c.qualified_calls}</span> },
    {
      key: "payout_cents",
      header: "Payout",
      sortable: true,
      className: "text-right",
      render: (c) => <span className="text-mono-sm" style={{ fontWeight: 600 }}>{formatCents(c.payout_cents)}</span>,
    },
  ];

  const callColumns: Column<CallRow>[] = [
    {
      key: "created_at",
      header: "Date",
      sortable: true,
      render: (c) => <span className="text-mono-sm">{new Date(c.created_at).toLocaleString()}</span>,
    },
    { key: "caller", header: "Caller", render: (c) => <span className="text-mono-sm">{c.caller ?? "—"}</span> },
    { key: "campaign_name", header: "Campaign", render: (c) => c.campaign_name ?? <span className="text-muted">—</span> },
    {
      key: "status",
      header: "Status",
      render: (c) => (
        <span className={`badge ${c.connected ? "badge-success" : "badge-info"}`}>
          {c.connected ? "Connected" : c.status ?? "—"}
        </span>
      ),
    },
    {
      key: "payout_cents",
      header: "Payout",
      className: "text-right",
      render: (c) => <span className="text-mono-sm">{c.payout_cents ? formatCents(c.payout_cents) : "—"}</span>,
    },
  ];

  const [campaignSortBy, setCampaignSortBy] = useState<string>("payout_cents");
  const [campaignOrder, setCampaignOrder] = useState<"asc" | "desc">("desc");
  const [callSortBy, setCallSortBy] = useState<string>("created_at");
  const [callOrder, setCallOrder] = useState<"asc" | "desc">("desc");

  const sortedPagedCampaigns = useMemo(() => {
    const out = [...pagedCampaigns];
    out.sort((a, b) => {
      let cmp = 0;
      if (campaignSortBy === "campaign_name") cmp = (a.campaign_name ?? "").localeCompare(b.campaign_name ?? "");
      else if (campaignSortBy === "calls") cmp = a.calls - b.calls;
      else if (campaignSortBy === "payout_cents") cmp = a.payout_cents - b.payout_cents;
      return campaignOrder === "asc" ? cmp : -cmp;
    });
    return out;
  }, [pagedCampaigns, campaignSortBy, campaignOrder]);

  const sortedPagedRecent = useMemo(() => {
    const out = [...pagedRecent];
    out.sort((a, b) => {
      let cmp = 0;
      if (callSortBy === "created_at") cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      else if (callSortBy === "caller") cmp = (a.caller ?? "").localeCompare(b.caller ?? "");
      return callOrder === "asc" ? cmp : -cmp;
    });
    return out;
  }, [pagedRecent, callSortBy, callOrder]);

  function handleCampaignSort(field: string) {
    if (campaignSortBy === field) setCampaignOrder((o) => (o === "asc" ? "desc" : "asc"));
    else {
      setCampaignSortBy(field);
      setCampaignOrder(field === "campaign_name" ? "asc" : "desc");
    }
  }
  function handleCallSort(field: string) {
    if (callSortBy === field) setCallOrder((o) => (o === "asc" ? "desc" : "asc"));
    else {
      setCallSortBy(field);
      setCallOrder(field === "caller" ? "asc" : "desc");
    }
  }

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="stack" style={{ gap: 12 }}>
          {Array.from({ length: 6 }).map((_, i) => (
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
            <i /> PUBLISHER / OVERVIEW
          </p>
          <h1>{overview?.publisher.name ?? "Overview"}</h1>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span
            className={`badge ${
              overview?.publisher.retreaver_status === "active"
                ? "badge-success"
                : overview?.publisher.retreaver_status === "paused"
                  ? "badge-warning"
                  : "badge-info"
            }`}
          >
            {overview?.publisher.retreaver_status ?? "—"}
          </span>
          <button className="btn btn-secondary btn-sm" onClick={handleRefresh}>
            Refresh
          </button>
        </div>
      </div>

      <div className="grid-4" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card stat-card">
          <p className="text-mono-sm">CALLS</p>
          <p className="stat-value">{overview?.stats.total_calls ?? 0}</p>
        </div>
        <div className="card stat-card">
          <p className="text-mono-sm">QUALIFIED CALLS</p>
          <p className="stat-value">{overview?.stats.qualified_calls ?? 0}</p>
        </div>
        <div className="card stat-card">
          <p className="text-mono-sm">EARNED</p>
          <p className="stat-value">{formatCents(overview?.stats.payout_cents ?? 0)}</p>
        </div>
        <div className="card stat-card">
          <p className="text-mono-sm">PAYOUT PER CALL</p>
          <p className="stat-value">{overview?.publisher.fixed_price_cents ? formatCents(overview.publisher.fixed_price_cents) : "—"}</p>
        </div>
      </div>

      {sparklineData && sparklineData.length >= 2 && (
        <section className="card" style={{ padding: "var(--space-6)", marginBottom: "var(--space-6)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div>
              <h2 style={{ font: "500 18px var(--serif)", margin: 0 }}>Revenue Trend</h2>
              <p className="text-muted" style={{ fontSize: 11, margin: "4px 0 0" }}>
                Payout trend — {payoutTrend ? "monthly history" : campaignsWithId.length >= 2 ? "per campaign" : "recent calls by day"}
              </p>
            </div>
            <span className="text-mono-sm" style={{ color: "var(--muted)" }}>
              {formatCents(Math.max(...sparklineData))} peak · {formatCents(sparklineData.reduce((a, b) => a + b, 0))} total
            </span>
          </div>
          <div style={{ width: "100%", overflow: "hidden", marginTop: "var(--space-4)" }}>
            <Sparkline data={sparklineData} width={720} height={56} responsive />
          </div>
        </section>
      )}

      <div className="filter-bar" style={{ marginBottom: "var(--space-3)" }}>
        <div style={{ position: "relative", flex: "1 1 260px", maxWidth: 360 }}>
          <input
            className="input"
            placeholder="Search campaigns, callers, status…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            aria-label="Search overview"
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput("")}
              aria-label="Clear search"
              style={{
                position: "absolute",
                right: 8,
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--muted)",
                fontSize: 16,
              }}
            >
              ×
            </button>
          )}
        </div>
        <span className="text-mono-sm" style={{ marginLeft: "auto" }}>
          {filteredCampaigns.length} campaign(s) · {filteredRecent.length} call(s)
          {(debouncedQ ? " (filtered)" : "")}
        </span>
      </div>

      <section className="card" style={{ padding: "var(--space-6)", marginBottom: "var(--space-6)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: "var(--space-4)" }}>
          <h2 style={{ font: "500 18px var(--serif)", margin: 0 }}>Campaigns</h2>
          <Link href="/dashboard/publisher/campaigns" className="btn btn-ghost btn-sm">
            View all
          </Link>
        </div>
        {(overview?.campaigns.length ?? 0) === 0 ? (
          <div className="empty-state">
            <p>
              <strong>No campaign data yet</strong>
            </p>
            <p className="text-muted">Once calls are attributed to you, they&apos;ll appear here per campaign.</p>
            <Link href="/dashboard/publisher/campaigns" className="btn btn-primary btn-sm" style={{ marginTop: "var(--space-3)" }}>
              Browse Campaigns
            </Link>
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="empty-state">
            <p>No campaigns match &quot;{debouncedQ}&quot;.</p>
            <button className="btn btn-secondary btn-sm" style={{ marginTop: "var(--space-3)" }} onClick={() => setSearchInput("")}>
              Clear search
            </button>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <DataTable
              columns={campaignColumns}
              data={sortedPagedCampaigns}
              loading={false}
              emptyMessage="No campaigns match your search."
              page={safeCampaignPage}
              totalPages={campaignTotalPages}
              total={filteredCampaigns.length}
              onPageChange={setCampaignPage}
              sortBy={campaignSortBy}
              order={campaignOrder}
              onSort={handleCampaignSort}
            />
          </div>
        )}
      </section>

      <section className="card" style={{ padding: "var(--space-6)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: "var(--space-4)" }}>
          <h2 style={{ font: "500 18px var(--serif)", margin: 0 }}>Recent calls</h2>
          <Link href="/dashboard/publisher/calls" className="btn btn-ghost btn-sm">
            View all
          </Link>
        </div>
        {recent.length === 0 ? (
          <div className="empty-state">
            <p>
              <strong>No calls yet</strong>
            </p>
            <p className="text-muted">Calls routed through your campaign will appear here.</p>
            <div style={{ display: "flex", gap: 8, marginTop: "var(--space-3)" }}>
              <Link href="/dashboard/publisher/campaigns" className="btn btn-primary btn-sm">
                View Campaigns
              </Link>
              <button className="btn btn-secondary btn-sm" onClick={() => showToast("Share your tracking link to start receiving calls.", "info")}>
                How to get calls
              </button>
            </div>
          </div>
        ) : filteredRecent.length === 0 ? (
          <div className="empty-state">
            <p>No calls match &quot;{debouncedQ}&quot;.</p>
            <button className="btn btn-secondary btn-sm" style={{ marginTop: "var(--space-3)" }} onClick={() => setSearchInput("")}>
              Clear search
            </button>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <DataTable
              columns={callColumns}
              data={sortedPagedRecent}
              loading={false}
              emptyMessage="No calls match your search."
              page={safeCallsPage}
              totalPages={callsTotalPages}
              total={filteredRecent.length}
              onPageChange={setCallsPage}
              sortBy={callSortBy}
              order={callOrder}
              onSort={handleCallSort}
            />
          </div>
        )}
      </section>
    </div>
  );
}

export default function PublisherOverviewPage() {
  return (
    <Suspense fallback={<div className="dashboard-page"><div className="skeleton skeleton-text" style={{ height: 18, width: 200 }} /></div>}>
      <PublisherOverviewInner />
    </Suspense>
  );
}
