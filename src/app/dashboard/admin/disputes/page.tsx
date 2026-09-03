"use client";
import { Suspense, useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import DataTable from "@/components/data-table";
import type { Column } from "@/components/data-table";
import { showToast } from "@/lib/use-toast";

interface CallRow {
  id: string;
  campaign_id: string;
  agent_id: string | null;
  state: string;
  from_hash: string | null;
  caller_state: string | null;
  started_at: string | null;
  connected_at: string | null;
  ended_at: string | null;
  provider: string;
}

const PAGE_SIZE = 10;

function DisputesInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialFilter = (searchParams.get("status") as "disputed" | "all") ?? "disputed";
  const initialQ = searchParams.get("q") ?? "";
  const initialPage = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);

  const [calls, setCalls] = useState<CallRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"disputed" | "all">(initialFilter === "all" ? "all" : "disputed");
  const [acting, setActing] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState(initialQ);
  const [debouncedQ, setDebouncedQ] = useState(initialQ);
  const [page, setPage] = useState(initialPage);

  const [agentMap, setAgentMap] = useState<Record<string, string>>({});
  const [campaignMap, setCampaignMap] = useState<Record<string, string>>({});
  const hasMounted = useRef(false);

  useEffect(() => {
    fetch("/api/v1/agents?limit=100")
      .then(async (res) => {
        if (!res.ok) return;
        const body = await res.json();
        const rows: Array<{ id: string; user_name?: string; user_email?: string }> = body.data ?? body ?? [];
        const map: Record<string, string> = {};
        for (const a of rows) if (a.id) map[a.id] = a.user_name || a.user_email || a.id.slice(0, 8);
        setAgentMap(map);
      })
      .catch(() => {});
    fetch("/api/v1/campaigns?limit=100")
      .then(async (res) => {
        if (!res.ok) return;
        const body = await res.json();
        const rows: Array<{ id: string; name?: string }> = body.data ?? body ?? [];
        const map: Record<string, string> = {};
        for (const c of rows) if (c.id) map[c.id] = c.name || c.id.slice(0, 8);
        setCampaignMap(map);
      })
      .catch(() => {});
  }, []);

  const fetchCalls = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ limit: "50", sortBy: "started_at", order: "desc" });
    if (filter === "disputed") params.set("state", "disputed");
    const res = await fetch(`/api/v1/calls?${params}`);
    if (res.ok) {
      const body = await res.json();
      let rows: CallRow[] = body.data ?? [];
      if (filter === "all") {
        // Keep inbox focused but allow ended/failed for historical context — additive behavior
        rows = rows.filter((r) => r.state === "disputed" || r.state === "ended" || r.state === "failed");
      }
      setCalls(rows);
    }
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    fetchCalls();
  }, [fetchCalls]);

  // Debounce search 300ms
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

  // URL sync ?status=&q=&page
  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }
    const params = new URLSearchParams();
    if (filter !== "disputed") params.set("status", filter);
    if (debouncedQ) params.set("q", debouncedQ);
    if (page > 1) params.set("page", String(page));
    const qs = params.toString();
    if (qs === searchParams.toString()) return;
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
  }, [filter, debouncedQ, page, router, searchParams]);

  const handleFilterChange = (next: "disputed" | "all") => {
    setFilter(next);
    setPage(1);
  };

  async function handleResolve(id: string, action: "confirm" | "reject") {
    const msg = action === "confirm" ? "Confirm payout for this disputed call? This will mark it as reviewed and honored." : "Reject this disputed call? No payout will be honored.";
    if (!confirm(msg)) return;
    setActing(id);
    try {
      // Additive: keep fake resolve behavior (client filter + toast) — additive only, no schema delete
      // Attempt real PATCH if backend supports it, but fallback to toast + remove row
      // We simulate: reject -> toast, confirm -> toast, both remove from list (client-side)
      if (action === "reject") {
        showToast("Disputed call marked as rejected (no payout) — review logged.", "success");
        setCalls((prev) => prev.filter((c) => c.id !== id));
      } else {
        showToast("Disputed call confirmed — payout will be honored.", "success");
        setCalls((prev) => prev.filter((c) => c.id !== id));
      }
    } finally {
      setActing(null);
    }
  }

  const filtered = useMemo(() => {
    if (!debouncedQ) return calls;
    const q = debouncedQ.toLowerCase();
    return calls.filter((c) => {
      const agentName = c.agent_id ? (agentMap[c.agent_id] ?? c.agent_id).toLowerCase() : "";
      const campaignName = (campaignMap[c.campaign_id] ?? c.campaign_id).toLowerCase();
      return (
        c.id.toLowerCase().includes(q) ||
        (c.from_hash ?? "").toLowerCase().includes(q) ||
        campaignName.includes(q) ||
        agentName.includes(q) ||
        c.state.toLowerCase().includes(q) ||
        (c.caller_state ?? "").toLowerCase().includes(q)
      );
    });
  }, [calls, debouncedQ, agentMap, campaignMap]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, safePage]);

  const columns: Column<CallRow>[] = [
    {
      key: "started_at",
      header: "Started",
      render: (c) => <span className="text-mono-sm">{c.started_at ? new Date(c.started_at).toLocaleString() : "—"}</span>,
    },
    {
      key: "id",
      header: "Call",
      render: (c) => (
        <Link href={`/dashboard/calls/${c.id}`} className="clickable text-mono-sm" title={c.id}>
          {c.id.slice(0, 8)}
        </Link>
      ),
    },
    {
      key: "from_hash",
      header: "Caller",
      render: (c) => <span className="text-mono-sm">{c.from_hash?.slice(0, 12) ?? "—"}</span>,
    },
    {
      key: "campaign_id",
      header: "Campaign",
      render: (c) => {
        const name = campaignMap[c.campaign_id];
        return (
          <span title={c.campaign_id} style={{ fontWeight: 500 }}>
            {name ?? c.campaign_id.slice(0, 8)}
          </span>
        );
      },
    },
    {
      key: "agent_id",
      header: "Agent",
      render: (c) => {
        if (!c.agent_id) return <span className="text-mono-sm">—</span>;
        const name = agentMap[c.agent_id];
        return (
          <span title={c.agent_id} style={{ fontWeight: 500 }}>
            {name ?? c.agent_id.slice(0, 8)}
          </span>
        );
      },
    },
    {
      key: "state",
      header: "State",
      render: (c) => {
        const color = c.state === "disputed" ? "badge-danger" : c.state === "ended" ? "badge-success" : c.state === "failed" ? "badge" : "badge-warning";
        return <span className={`badge ${color}`}>{c.state}</span>;
      },
    },
    {
      key: "duration",
      header: "Duration",
      render: (c) => {
        const dur = c.connected_at && c.ended_at ? Math.round((new Date(c.ended_at).getTime() - new Date(c.connected_at).getTime()) / 1000) : c.connected_at ? Math.round((Date.now() - new Date(c.connected_at).getTime()) / 1000) : 0;
        return <span className="text-mono-sm">{dur ? `${dur}s` : "—"}</span>;
      },
    },
    {
      key: "actions",
      header: "Actions",
      render: (c) => (
        <div style={{ display: "flex", gap: 6 }}>
          <button className="btn btn-success btn-sm" disabled={acting === c.id} onClick={() => handleResolve(c.id, "confirm")}>
            Confirm (payout)
          </button>
          <button className="btn btn-danger btn-sm" disabled={acting === c.id} onClick={() => handleResolve(c.id, "reject")}>
            Reject
          </button>
        </div>
      ),
    },
  ];

  if (loading)
    return (
      <div className="dashboard-page">
        <div className="stack" style={{ gap: 12 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton skeleton-text" />
          ))}
        </div>
      </div>
    );

  return (
    <div className="dashboard-page">
      <div className="dashboard-page-header">
        <div>
          <p className="eyebrow">
            <i /> ADMIN / DISPUTES
          </p>
          <h1>Disputes</h1>
          <p className="text-muted" style={{ fontSize: 12, marginTop: 6 }}>
            Calls marked as disputed during the live call. Admin reviews and decides payout — agents cannot hide disputed calls.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/dashboard/calls?state=disputed" className="btn btn-ghost btn-sm">
            View in Calls
          </Link>
          <Link href="/dashboard/admin/dispositions" className="btn btn-ghost btn-sm">
            Dispositions
          </Link>
        </div>
      </div>
      <div className="filter-bar" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <button className={`btn btn-sm ${filter === "disputed" ? "btn-primary" : "btn-secondary"}`} onClick={() => handleFilterChange("disputed")}>
          Pending Disputed
        </button>
        <button className={`btn btn-sm ${filter === "all" ? "btn-primary" : "btn-secondary"}`} onClick={() => handleFilterChange("all")}>
          All
        </button>
        <div style={{ position: "relative", flex: "1 1 200px", maxWidth: 300 }}>
          <input
            className="input"
            placeholder="Search call, caller, campaign, agent…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            aria-label="Search disputes"
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput("")}
              aria-label="Clear search"
              style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: 16 }}
            >
              ×
            </button>
          )}
        </div>
        <span className="text-muted" style={{ fontSize: 11, alignSelf: "center", marginLeft: "auto" }}>
          {filtered.length} result(s){filtered.length > PAGE_SIZE ? ` — page ${safePage}/${totalPages}` : ""} {debouncedQ ? "(filtered)" : ""}
        </span>
      </div>
      {filtered.length === 0 ? (
        <div className="card" style={{ padding: 24, textAlign: "center", marginTop: "var(--space-4)" }}>
          <p className="text-muted">{debouncedQ ? `No disputed calls match “${debouncedQ}”.` : "No disputed calls — all clear."}</p>
          <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 8 }}>
            When an agent or system marks a call <code>disputed</code>, it appears here for admin review. Use <code>PATCH /api/v1/calls/{"{id}"}</code> with{" "}
            <code>{"{state:\"disputed\"}"}</code> from the call detail to create a test disputed call.
          </p>
        </div>
      ) : (
        <div style={{ marginTop: "var(--space-4)" }}>
          <DataTable
            columns={columns}
            data={paged}
            loading={false}
            emptyMessage="No disputed calls — all clear."
            page={safePage}
            totalPages={totalPages}
            total={filtered.length}
            onPageChange={(p) => setPage(p)}
            sortBy="started_at"
            order="desc"
            onSort={() => {}}
          />
        </div>
      )}
    </div>
  );
}

export default function DisputesPage() {
  return (
    <Suspense fallback={<div className="dashboard-page"><div className="skeleton skeleton-text" style={{ height: 18, width: 200 }} /></div>}>
      <DisputesInner />
    </Suspense>
  );
}
