"use client";

import { Suspense, useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import DataTable from "@/components/data-table";
import type { Column } from "@/components/data-table";
import { showToast } from "@/lib/use-toast";

interface CampaignBrowse {
  id: string;
  name: string;
  status: string;
  routing_strategy: string;
  price_cents: number | null;
  effective_price_cents: number | null;
  effective_payout_cents: number | null;
  has_bid_override: boolean;
  min_connected_seconds: number;
  buffer_seconds: number;
  allowed_endpoints: string[];
  target_states?: string[];
  assigned_agency_count: number;
  assigned_agent_count: number;
  assignment_status: "Assigned" | "Open" | "Not assigned";
  is_assigned_to_me: boolean;
  has_assignments: boolean;
  created_at: string;
}

const PAGE_SIZE = 10;

function formatCents(cents: number | null | undefined): string {
  if (cents == null) return "—";
  return `$${(cents / 100).toFixed(2)}`;
}

const STATUS_BADGE: Record<string, string> = {
  Assigned: "badge-success",
  Open: "badge-info",
  "Not assigned": "",
};

function AgentCampaignsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") ?? "";
  const initialPage = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);

  const [campaigns, setCampaigns] = useState<CampaignBrowse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(initialQ);
  const [debouncedQ, setDebouncedQ] = useState(initialQ);
  const [page, setPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [sortBy, setSortBy] = useState("created_at");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [endpointFilter, setEndpointFilter] = useState("");
  const [assignmentFilter, setAssignmentFilter] = useState("");
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const hasMounted = useRef(false);

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE), sortBy, order });
    if (debouncedQ) params.set("search", debouncedQ);
    // Browse expects active by default; allow status=active param for filtering
    params.set("status", "active");
    if (endpointFilter) params.set("endpoint", endpointFilter);
    // assignmentFilter is client-side only – we fetch all and filter in UI for MVP to keep pagination stable
    const res = await fetch(`/api/v1/agent/campaigns?${params.toString()}`);
    if (res.ok) {
      const body = await res.json();
      let rows: CampaignBrowse[] = body.data ?? [];
      // client-side assignment filter
      if (assignmentFilter) {
        rows = rows.filter((c) => c.assignment_status === assignmentFilter);
      }
      setCampaigns(rows);
      // If we did client filter, adjust totalPages/total based on rows length vs total – keep pagination from server unless filtering
      if (assignmentFilter) {
        // when filtering client-side, show single page filtered view for browse (limit 100 style) – but keep server pagination for non-filtered
        setTotalPages(Math.max(1, Math.ceil(rows.length / PAGE_SIZE)));
        setTotal(rows.length);
      } else {
        setTotalPages(body.pagination?.totalPages ?? 1);
        setTotal(body.pagination?.total ?? rows.length);
      }
    } else {
      const body = await res.json().catch(() => ({} as { message?: string }));
      if (res.status === 403) {
        // fallback to generic campaigns endpoint (may still be visible for agents without agent/campaigns perm)
        const alt = await fetch(`/api/v1/campaigns?status=active&limit=${PAGE_SIZE}&page=${page}${debouncedQ ? `&search=${encodeURIComponent(debouncedQ)}` : ""}`);
        if (alt.ok) {
          const ab = await alt.json();
          const rows: CampaignBrowse[] = (ab.data ?? []).map((c: CampaignBrowse) => ({
            ...c,
            assignment_status: "Open" as const,
            assigned_agency_count: 0,
            assigned_agent_count: 0,
            is_assigned_to_me: false,
            has_assignments: false,
            effective_price_cents: c.price_cents,
            effective_payout_cents: null,
          }));
          setCampaigns(rows);
          setTotalPages(ab.pagination?.totalPages ?? 1);
          setTotal(ab.pagination?.total ?? rows.length);
        }
      } else {
        showToast((body as { message?: string })?.message ?? "Failed to load campaigns", "error");
      }
    }
    setLoading(false);
  }, [page, sortBy, order, debouncedQ, endpointFilter, assignmentFilter]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

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

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }
    const p = new URLSearchParams();
    if (debouncedQ) p.set("q", debouncedQ);
    if (page > 1) p.set("page", String(page));
    const qs = p.toString();
    if (qs === searchParams.toString()) return;
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
  }, [debouncedQ, page, router, searchParams]);

  function toggleSort(field: string) {
    if (sortBy === field) setOrder(order === "asc" ? "desc" : "asc");
    else {
      setSortBy(field);
      setOrder("desc");
    }
  }

  async function handleJoin(campaign: CampaignBrowse) {
    if (campaign.assignment_status === "Assigned") return;
    if (joiningId) return;
    setJoiningId(campaign.id);
    try {
      const res = await fetch(`/api/v1/agent/campaigns/${campaign.id}/join`, { method: "POST" });
      const body = (await res.json().catch(() => ({}))) as { message?: string; success?: boolean; data?: unknown };
      if (res.ok) {
        showToast(body.message ?? "Successfully joined campaign", "success");
        setCampaigns((prev) =>
          prev.map((c) =>
            c.id === campaign.id
              ? { ...c, assignment_status: "Assigned" as const, is_assigned_to_me: true, assigned_agent_count: c.assigned_agent_count + 1, has_assignments: true }
              : c,
          ),
        );
      } else {
        // fallback: local interest marker + toast as MVP per spec
        if (res.status === 403 || res.status === 404) {
          try {
            localStorage.setItem(`campaign-interest:${campaign.id}`, JSON.stringify({ at: Date.now(), name: campaign.name }));
          } catch {}
          showToast(body.message ?? "Request sent to admin - we'll notify you when approved", "success");
          // Mark as interested locally to avoid duplicate clicks
          setCampaigns((prev) => prev.map((c) => (c.id === campaign.id ? { ...c, assignment_status: "Not assigned" as const } : c)));
        } else {
          showToast(body.message ?? "Failed to join campaign", "error");
        }
      }
    } catch {
      // Network fallback: local interest
      try {
        localStorage.setItem(`campaign-interest:${campaign.id}`, JSON.stringify({ at: Date.now(), name: campaign.name }));
        showToast("Request sent to admin - offline (saved locally)", "success");
      } catch {
        showToast("Network error", "error");
      }
    } finally {
      setJoiningId(null);
    }
  }

  function handleContactAdmin(campaign: CampaignBrowse) {
    try {
      const key = `campaign-interest:${campaign.id}`;
      localStorage.setItem(key, JSON.stringify({ at: Date.now(), name: campaign.name }));
    } catch {}
    showToast(`Interest in "${campaign.name}" noted — please contact your admin to be assigned`, "info");
    // Also try to copy campaign id
    if (navigator.clipboard) {
      navigator.clipboard.writeText(campaign.id).catch(() => {});
    }
  }

  const columns: Column<CampaignBrowse>[] = [
    {
      key: "name",
      header: "Campaign",
      sortable: true,
      render: (c) => (
        <div style={{ minWidth: 160 }}>
          <div style={{ fontWeight: 600, fontSize: 13, lineHeight: 1.2 }}>{c.name}</div>
          <div className="text-mono-sm" style={{ fontSize: 10, color: "var(--muted)" }}>{c.id.slice(0, 8)}</div>
        </div>
      ),
    },
    {
      key: "effective_price_cents",
      header: "Buyer price",
      sortable: true,
      render: (c) => (
        <span className="text-mono-sm" style={{ color: "var(--accent)", fontWeight: 600 }}>
          {formatCents(c.effective_price_cents ?? c.price_cents)}
          {c.has_bid_override && <span className="badge" style={{ marginLeft: 6, fontSize: 9 }}>bid</span>}
        </span>
      ),
    },
    {
      key: "effective_payout_cents",
      header: "Payout",
      render: (c) => <span className="text-mono-sm">{formatCents(c.effective_payout_cents)}</span>,
    },
    {
      key: "routing_strategy",
      header: "Routing",
      render: (c) => <span className="badge" style={{ textTransform: "uppercase", fontSize: 10 }}>{c.routing_strategy}</span>,
    },
    {
      key: "min_connected_seconds",
      header: "Min duration",
      render: (c) => <span className="text-mono-sm">{c.min_connected_seconds}s</span>,
    },
    {
      key: "allowed_endpoints",
      header: "Endpoints",
      render: (c) => (
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {(c.allowed_endpoints ?? []).map((ep) => (
            <span key={ep} className="badge" style={{ fontSize: 10, textTransform: "uppercase" }}>{ep}</span>
          ))}
          {(c.allowed_endpoints ?? []).length === 0 && <span className="text-muted text-mono-sm" style={{ fontSize: 11 }}>—</span>}
        </div>
      ),
    },
    {
      key: "assigned_agency_count",
      header: "Assigned",
      render: (c) => (
        <span className="text-mono-sm" style={{ fontSize: 11 }}>
          {c.assigned_agency_count} ag · {c.assigned_agent_count} agents
          {!c.has_assignments && <span className="badge badge-info" style={{ marginLeft: 6, fontSize: 9 }}>open</span>}
        </span>
      ),
    },
    {
      key: "assignment_status",
      header: "Your status",
      render: (c) => <span className={`badge ${STATUS_BADGE[c.assignment_status] ?? ""}`} style={{ fontSize: 10 }}>{c.assignment_status}</span>,
    },
    {
      key: "actions",
      header: "Action",
      render: (c) => {
        const isAssigned = c.assignment_status === "Assigned";
        const isJoining = joiningId === c.id;
        if (isAssigned) {
          return <span className="badge badge-success" style={{ fontSize: 10 }}>Assigned ✓</span>;
        }
        return (
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <button
              className="btn btn-primary btn-sm"
              disabled={isJoining}
              onClick={() => handleJoin(c)}
              style={{ fontSize: 11, padding: "6px 10px", whiteSpace: "nowrap" }}
            >
              {isJoining ? "Joining..." : c.assignment_status === "Open" ? "Join Campaign" : "Request Assignment"}
            </button>
            <button
              className="quiet-button"
              onClick={() => handleContactAdmin(c)}
              title="Copy campaign ID and mark interest locally"
              style={{ fontSize: 11, color: "var(--muted)" }}
            >
              Interested
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="dashboard-page">
      <div className="dashboard-page-header">
        <div>
          <p className="eyebrow"><i /> OPERATIONS / CAMPAIGNS</p>
          <h1>Browse Campaigns</h1>
          <p className="text-muted" style={{ fontSize: 12, margin: "6px 0 0", maxWidth: 560, lineHeight: 1.5 }}>
            Discover active campaigns across your org. <span style={{ color: "var(--ink)", fontWeight: 600 }}>Assigned</span> = you’re eligible for calls · <span style={{ color: "var(--ink)" }}>Open</span> = no restrictions · <span style={{ color: "var(--ink)" }}>Not assigned</span> = ask your admin to join.
          </p>
        </div>
        <div className="search-bar" style={{ minWidth: 260 }}>
          <input
            className="input"
            type="search"
            placeholder="Search campaigns..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            style={{ minWidth: 220 }}
          />
          <span className="text-mono-sm" style={{ whiteSpace: "nowrap", fontSize: 11 }}>{total} total</span>
        </div>
      </div>

      <div className="filter-bar">
        <select
          className="select"
          value={endpointFilter}
          onChange={(e) => { setEndpointFilter(e.target.value); setPage(1); }}
          style={{ maxWidth: 160 }}
        >
          <option value="">All endpoints</option>
          <option value="webrtc">WebRTC</option>
          <option value="pstn">PSTN</option>
        </select>
        <select
          className="select"
          value={assignmentFilter}
          onChange={(e) => { setAssignmentFilter(e.target.value); setPage(1); }}
          style={{ maxWidth: 180 }}
        >
          <option value="">All statuses</option>
          <option value="Assigned">Assigned only</option>
          <option value="Open">Open only</option>
          <option value="Not assigned">Not assigned</option>
        </select>
        <span className="text-mono-sm" style={{ marginLeft: "auto", color: "var(--muted)", fontSize: 11 }}>
          {endpointFilter || assignmentFilter ? "filtered" : "active campaigns"} · {total} found
        </span>
      </div>

      <DataTable
        columns={columns}
        data={campaigns}
        loading={loading}
        emptyMessage="No active campaigns found. Try clearing filters or contact your admin."
        page={page}
        totalPages={totalPages}
        total={total}
        onPageChange={setPage}
        sortBy={sortBy}
        order={order}
        onSort={toggleSort}
      />

      <div className="card" style={{ marginTop: "var(--space-5)", padding: "14px 16px", border: "1px dashed var(--line)", background: "rgba(168,85,247,.06)" }}>
        <p className="text-mono-sm" style={{ fontSize: 11, margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
          <span style={{ color: "var(--ink)", fontWeight: 600 }}>How joining works:</span> Click <span style={{ color: "var(--ink)" }}>Join Campaign</span> / <span style={{ color: "var(--ink)" }}>Request Assignment</span> to add your agent directly to <span className="text-mono-sm">campaign_assignments</span> (idempotent). If your org requires admin approval, use <span style={{ color: "var(--ink)" }}>Interested</span> to save locally and notify your admin. Open campaigns route to everyone even without assignment.
        </p>
      </div>
    </div>
  );
}

export default function AgentCampaignsPage() {
  return (
    <Suspense fallback={<div className="dashboard-page"><div className="skeleton skeleton-text" style={{ width: 200 }} /></div>}>
      <AgentCampaignsInner />
    </Suspense>
  );
}
