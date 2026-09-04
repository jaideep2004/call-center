"use client";

import { Suspense, useState, useEffect, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import DataTable from "@/components/data-table";
import type { Column } from "@/components/data-table";
import { showToast } from "@/lib/use-toast";
import { DISPOSITION_LABELS, DISPOSITION_COLORS } from "@/server/constants";

interface DispositionRow {
  id: string;
  call_id: string;
  agent_id: string;
  outcome: string;
  notes: string | null;
  admin_confirmed: boolean;
  created_at: string;
}

const OUTCOME_LABELS = DISPOSITION_LABELS;
const OUTCOME_COLORS = DISPOSITION_COLORS;
const PAGE_SIZE = 10;

function AdminDispositionsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialStatus = (searchParams.get("status") as "pending" | "all") ?? "pending";
  const initialQ = searchParams.get("q") ?? "";
  const initialOutcome = searchParams.get("outcome") ?? "";
  const initialPage = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);

  const [dispositions, setDispositions] = useState<DispositionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"pending" | "all">(initialStatus === "all" ? "all" : "pending");
  const [confirming, setConfirming] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState(initialQ);
  const [debouncedQ, setDebouncedQ] = useState(initialQ);
  const [outcomeFilter, setOutcomeFilter] = useState(initialOutcome);
  const [page, setPage] = useState(initialPage);

  const [agentMap, setAgentMap] = useState<Record<string, string>>({});
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
  }, []);

  useEffect(() => {
    setLoading(true);
    const endpoint = tab === "pending" ? "/api/v1/dispositions?status=pending" : "/api/v1/dispositions";
    fetch(endpoint).then(async (res) => {
      if (res.ok) {
        const body = await res.json();
        setDispositions(body.data ?? []);
      }
      setLoading(false);
    });
  }, [tab]);

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

  // URL sync ?status=&q=&outcome=&page
  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }
    const params = new URLSearchParams();
    if (tab !== "pending") params.set("status", tab);
    if (debouncedQ) params.set("q", debouncedQ);
    if (outcomeFilter) params.set("outcome", outcomeFilter);
    if (page > 1) params.set("page", String(page));
    const qs = params.toString();
    if (qs === searchParams.toString()) return;
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
  }, [tab, debouncedQ, outcomeFilter, page, router, searchParams]);

  const summary = useMemo(() => {
    const pending = dispositions.filter((d) => !d.admin_confirmed).length;
    const confirmed = dispositions.filter((d) => d.admin_confirmed).length;
    const perAgent: Record<string, { total: number; sold: number; pending: number; name: string }> = {};
    for (const d of dispositions) {
      const name = agentMap[d.agent_id] ?? d.agent_id.slice(0, 8);
      const key = name;
      const a = perAgent[key] ?? { total: 0, sold: 0, pending: 0, name };
      a.total++;
      if (d.outcome === "sold") a.sold++;
      if (!d.admin_confirmed) a.pending++;
      perAgent[key] = a;
    }
    return { pending, confirmed, perAgent };
  }, [dispositions, agentMap]);

  const filtered = useMemo(() => {
    let rows = dispositions;
    if (outcomeFilter) rows = rows.filter((d) => d.outcome === outcomeFilter);
    if (debouncedQ) {
      const q = debouncedQ.toLowerCase();
      rows = rows.filter((d) => {
        const agentName = (agentMap[d.agent_id] ?? d.agent_id).toLowerCase();
        return (
          agentName.includes(q) ||
          d.agent_id.toLowerCase().includes(q) ||
          d.call_id.toLowerCase().includes(q) ||
          d.outcome.toLowerCase().includes(q) ||
          (d.notes ?? "").toLowerCase().includes(q)
        );
      });
    }
    // sort by date desc (DataTable could do but we do client)
    return [...rows].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [dispositions, outcomeFilter, debouncedQ, agentMap]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, safePage]);

  const handleConfirm = async (id: string) => {
    if (!confirm("Confirm this disposition? This will mark it as admin-reviewed.")) return;
    setConfirming(id);
    try {
      const res = await fetch(`/api/v1/dispositions/${id}/confirm`, { method: "PATCH" });
      if (res.ok) {
        setDispositions((prev) => prev.filter((d) => d.id !== id));
        showToast("Disposition confirmed", "success");
      } else {
        showToast("Failed to confirm disposition", "error");
      }
    } catch {
      showToast("Network error confirming disposition", "error");
    } finally {
      setConfirming(null);
    }
  };

  const handleTabChange = (next: "pending" | "all") => {
    setTab(next);
    setPage(1);
  };

  const handleOutcomeChange = (v: string) => {
    setOutcomeFilter(v);
    setPage(1);
  };

  const columns: Column<DispositionRow>[] = [
    {
      key: "call_id",
      header: "Call",
      render: (d) => (
        <span className="text-mono-sm" title={d.call_id}>
          {d.call_id.slice(0, 8)}
        </span>
      ),
    },
    {
      key: "agent_id",
      header: "Agent",
      render: (d) => {
        const name = agentMap[d.agent_id];
        return (
          <span title={d.agent_id} style={{ fontWeight: 500 }}>
            {name ?? d.agent_id.slice(0, 8)}
          </span>
        );
      },
    },
    {
      key: "outcome",
      header: "Outcome",
      render: (d) => <span className={`badge ${OUTCOME_COLORS[d.outcome] ?? ""}`}>{OUTCOME_LABELS[d.outcome] ?? d.outcome}</span>,
    },
    {
      key: "notes",
      header: "Notes",
      render: (d) => {
        const text = d.notes ?? "—";
        const truncated = text.length > 80 ? text.slice(0, 80) + "…" : text;
        return (
          <span
            title={d.notes ?? undefined}
            style={{ maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "inline-block", cursor: d.notes ? "pointer" : "default", verticalAlign: "middle" }}
            onClick={() => {
              if (d.notes && d.notes.length > 80) alert(d.notes);
            }}
          >
            {truncated}
          </span>
        );
      },
    },
    {
      key: "created_at",
      header: "Date",
      render: (d) => <span className="text-mono-sm">{new Date(d.created_at).toLocaleString()}</span>,
    },
    {
      key: "actions",
      header: "Actions",
      render: (d) => (
        <>
          {!d.admin_confirmed ? (
            <button className="btn btn-success btn-sm" onClick={() => handleConfirm(d.id)} disabled={confirming === d.id}>
              {confirming === d.id ? "Confirming..." : "Confirm"}
            </button>
          ) : (
            <span className="badge badge-success">Confirmed</span>
          )}
        </>
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
            <i /> ADMIN / DISPOSITIONS
          </p>
          <h1>Dispositions</h1>
        </div>
      </div>
      <div className="filter-bar" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <button className={`btn btn-sm ${tab === "pending" ? "btn-primary" : "btn-secondary"}`} onClick={() => handleTabChange("pending")}>
          Pending Review
        </button>
        <button className={`btn btn-sm ${tab === "all" ? "btn-primary" : "btn-secondary"}`} onClick={() => handleTabChange("all")}>
          All
        </button>
        <select className="input" value={outcomeFilter} onChange={(e) => handleOutcomeChange(e.target.value)} style={{ maxWidth: 180 }}>
          <option value="">All outcomes</option>
          {Object.entries(OUTCOME_LABELS).map(([v, label]) => (
            <option key={v} value={v}>
              {label}
            </option>
          ))}
        </select>
        <div style={{ position: "relative", flex: "1 1 200px", maxWidth: 300 }}>
          <input
            className="input"
            placeholder="Search agent, call, outcome, notes…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            aria-label="Search dispositions"
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
        <span className="text-mono-sm" style={{ marginLeft: "auto" }}>
          {filtered.length} result(s){filtered.length > PAGE_SIZE ? ` — page ${safePage}/${totalPages}` : ""}
        </span>
      </div>

      <div className="card" style={{ display: "flex", gap: "var(--space-5)", flexWrap: "wrap", padding: "var(--space-4)", marginTop: "var(--space-3)" }}>
        <div>
          <span className="text-muted" style={{ fontSize: 11 }}>
            Pending
          </span>
          <p style={{ font: "500 24px/1 var(--mono)", color: "var(--orange)" }}>{summary.pending}</p>
        </div>
        <div>
          <span className="text-muted" style={{ fontSize: 11 }}>
            Confirmed
          </span>
          <p style={{ font: "500 24px/1 var(--mono)", color: "var(--accent)" }}>{summary.confirmed}</p>
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <span className="text-muted" style={{ fontSize: 11 }}>
            Per-agent
          </span>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
            {Object.entries(summary.perAgent)
              .slice(0, 6)
              .map(([key, s]) => (
                <span key={key} className="badge" style={{ fontSize: 10 }} title={key}>
                  {key}: {s.sold}/{s.total}
                  {s.pending > 0 ? ` (${s.pending}⏳)` : ""}
                </span>
              ))}
            {Object.keys(summary.perAgent).length === 0 && <span className="text-muted" style={{ fontSize: 11 }}>—</span>}
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted" style={{ marginTop: "var(--space-4)" }}>
          {debouncedQ || outcomeFilter ? `No dispositions match your filter.` : "No dispositions found."}
        </p>
      ) : (
        <div style={{ marginTop: "var(--space-4)" }}>
          <DataTable
            columns={columns}
            data={paged}
            loading={false}
            emptyMessage="No dispositions found."
            page={safePage}
            totalPages={totalPages}
            total={filtered.length}
            onPageChange={(p) => setPage(p)}
            sortBy=""
            order="desc"
            onSort={() => {}}
          />
        </div>
      )}
    </div>
  );
}

export default function AdminDispositionsPage() {
  return (
    <Suspense fallback={<div className="dashboard-page"><div className="skeleton skeleton-text" style={{ height: 18, width: 200 }} /></div>}>
      <AdminDispositionsInner />
    </Suspense>
  );
}
