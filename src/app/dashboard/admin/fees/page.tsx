"use client";

import { Suspense, useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import DataTable from "@/components/data-table";
import type { Column } from "@/components/data-table";
import { showToast } from "@/lib/use-toast";
import { formatCents } from "@/lib/format";

interface FeeRow {
  id: string;
  agent_id: string;
  agency_id: string;
  kind: "dialer" | "software";
  amount_cents: number;
  status: string;
  due_date: string;
  invoice_id: string | null;
  charged_at: string | null;
}

const KIND_LABELS: Record<string, string> = {
  dialer: "Dialer Fee",
  software: "Software Access",
};

const PAGE_SIZE = 10;

function AdminFeesInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialQ = searchParams.get("q") ?? "";
  const initialKind = searchParams.get("kind") ?? "";
  const initialPage = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);

  const [fees, setFees] = useState<FeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState(initialQ);
  const [debouncedQ, setDebouncedQ] = useState(initialQ);
  const [kindFilter, setKindFilter] = useState(initialKind);
  const [page, setPage] = useState(initialPage);

  const [agentMap, setAgentMap] = useState<Record<string, string>>({});

  const hasMounted = useRef(false);

  // Fetch agent names once (additive, no schema change)
  useEffect(() => {
    fetch("/api/v1/agents?limit=100")
      .then(async (res) => {
        if (!res.ok) return;
        const body = await res.json();
        const rows: Array<{ id: string; user_name?: string; user_email?: string; membership_id?: string }> = body.data ?? body ?? [];
        const map: Record<string, string> = {};
        for (const a of rows) {
          if (a.id) map[a.id] = a.user_name || a.user_email || a.membership_id?.slice(0, 8) || a.id.slice(0, 8);
        }
        setAgentMap(map);
      })
      .catch(() => {});
  }, []);

  const refresh = useCallback(() => {
    fetch("/api/v1/agent-fees")
      .then(async (res) => {
        if (res.ok) {
          const body = await res.json();
          setFees(body.data ?? []);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(refresh, [refresh]);

  // Debounce search 300ms and reset page
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

  // URL sync (?q=&kind=&page) — additive only
  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }
    const params = new URLSearchParams();
    if (debouncedQ) params.set("q", debouncedQ);
    if (kindFilter) params.set("kind", kindFilter);
    if (page > 1) params.set("page", String(page));
    const qs = params.toString();
    const current = searchParams.toString();
    if (qs === current) return;
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
  }, [debouncedQ, kindFilter, page, router, searchParams]);

  async function act(id: string, action: "charge" | "waive") {
    if (!confirm(`${action === "charge" ? "Charge" : "Waive"} this fee?`)) return;
    setBusy(id);
    try {
      const res = await fetch(`/api/v1/agent-fees/${id}/${action}`, { method: "POST" });
      const body = await res.json();
      if (res.ok) {
        showToast(body.message ?? "Done", "success");
        refresh();
      } else {
        showToast(body.message ?? "Action failed", "error");
      }
    } catch {
      showToast("Network error", "error");
    } finally {
      setBusy(null);
    }
  }

  async function generateMonthly() {
    if (!confirm("Generate monthly fees for all eligible agents? This will create pending fees for the current billing period.")) return;
    setBusy("monthly");
    try {
      const res = await fetch("/api/v1/agent-fees", { method: "POST" });
      const body = await res.json();
      showToast(res.ok ? `${body.data?.generated ?? 0} fee(s) generated` : (body.message ?? "Failed"), res.ok ? "success" : "error");
      if (res.ok) refresh();
    } finally {
      setBusy(null);
    }
  }

  async function generateWeekly() {
    if (!confirm("Generate weekly invoices? This will create invoices due Monday for pending weekly fees.")) return;
    setBusy("weekly");
    try {
      const res = await fetch("/api/v1/agent-fees/weekly", { method: "POST" });
      const body = await res.json();
      showToast(res.ok ? `${body.data?.invoices ?? 0} weekly invoice(s) generated` : (body.message ?? "Failed"), res.ok ? "success" : "error");
      if (res.ok) refresh();
    } finally {
      setBusy(null);
    }
  }

  const filtered = useMemo(() => {
    let rows = fees;
    if (kindFilter) rows = rows.filter((f) => f.kind === kindFilter);
    if (debouncedQ) {
      const q = debouncedQ.toLowerCase();
      rows = rows.filter((f) => {
        const agentName = (agentMap[f.agent_id] ?? f.agent_id).toLowerCase();
        return (
          agentName.includes(q) ||
          f.agent_id.toLowerCase().includes(q) ||
          f.kind.toLowerCase().includes(q) ||
          String(f.amount_cents).includes(q) ||
          (f.invoice_id ?? "").toLowerCase().includes(q)
        );
      });
    }
    return rows;
  }, [fees, kindFilter, debouncedQ, agentMap]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, safePage]);

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage);
  };

  const handleKindChange = (v: string) => {
    setKindFilter(v);
    setPage(1);
  };

  const isOverdue = (due: string) => {
    try {
      const d = new Date(due);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return d < today;
    } catch {
      return false;
    }
  };

  const columns: Column<FeeRow>[] = [
    {
      key: "agent",
      header: "Agent",
      render: (f) => {
        const name = agentMap[f.agent_id];
        return (
          <span title={f.agent_id} style={{ fontWeight: 500 }}>
            {name ?? f.agent_id.slice(0, 8)}
            {!name && <span className="text-mono-sm" style={{ color: "var(--muted)", marginLeft: 6, fontSize: 10 }}>{f.agent_id.slice(0, 8)}</span>}
          </span>
        );
      },
    },
    {
      key: "kind",
      header: "Type",
      render: (f) => <span className={`badge ${f.kind === "dialer" ? "badge-warning" : "badge-info"}`}>{KIND_LABELS[f.kind] ?? f.kind}</span>,
    },
    {
      key: "amount",
      header: "Amount",
      render: (f) => <span style={{ fontWeight: 600 }}>{formatCents(f.amount_cents)}</span>,
    },
    {
      key: "due",
      header: "Due",
      render: (f) => {
        const overdue = isOverdue(f.due_date);
        return (
          <span className={`badge ${overdue ? "badge-danger" : ""}`} title={f.due_date} style={overdue ? {} : { background: "transparent", border: "none", color: "inherit", padding: 0 }}>
            {f.due_date}
            {overdue && <span style={{ marginLeft: 6 }}>Overdue</span>}
          </span>
        );
      },
    },
    {
      key: "invoice",
      header: "Invoice",
      render: (f) => <span className="text-mono-sm">{f.invoice_id ? f.invoice_id.slice(0, 8) : "—"}</span>,
    },
    {
      key: "actions",
      header: "Actions",
      render: (f) => (
        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", flexWrap: "nowrap" }}>
          <button className="btn btn-sm btn-primary" disabled={busy === f.id} onClick={() => act(f.id, "charge")}>
            Charge
          </button>
          <button className="btn btn-sm" disabled={busy === f.id} onClick={() => act(f.id, "waive")}>
            Waive
          </button>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="stack" style={{ gap: 12 }}>
          {Array.from({ length: 5 }).map((_, i) => (
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
            <i /> ADMIN / FINANCE
          </p>
          <h1>Agent Fees</h1>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" onClick={generateMonthly} disabled={busy === "monthly"}>
            {busy === "monthly" ? "Generating..." : "Generate Monthly Fees"}
          </button>
          <button className="btn btn-primary" onClick={generateWeekly} disabled={busy === "weekly"}>
            {busy === "weekly" ? "Generating..." : "Generate Weekly Invoices"}
          </button>
        </div>
      </div>

      <p className="text-muted" style={{ fontSize: 11, maxWidth: 640 }}>
        Postpaid agents: <strong>Dialer Fee</strong> (plan price, adjustable). Prepaid agents: <strong>Software Access</strong> (adjustable per agent). Weekly
        invoices are generated every Monday and must be sent to the agency manually.
      </p>

      <div className="filter-bar">
        <select className="input" value={kindFilter} onChange={(e) => handleKindChange(e.target.value)} style={{ maxWidth: 180 }}>
          <option value="">All types</option>
          <option value="dialer">Dialer Fee</option>
          <option value="software">Software Access</option>
        </select>
        <div style={{ position: "relative", flex: "1 1 220px", maxWidth: 340 }}>
          <input
            className="input"
            placeholder="Search agent, type, invoice…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            aria-label="Search fees"
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
        <span className="text-mono-sm" style={{ marginLeft: "auto", whiteSpace: "nowrap" }}>
          {filtered.length} fee(s){debouncedQ || kindFilter ? " (filtered)" : ""} {filtered.length > PAGE_SIZE ? `— page ${safePage}/${totalPages}` : ""}
        </span>
      </div>

      <div className="card" style={{ padding: "var(--space-5)" }}>
        <h2>Pending Fees</h2>
        {filtered.length === 0 ? (
          <p className="text-muted" style={{ fontSize: 12, padding: "var(--space-4) 0" }}>
            {debouncedQ || kindFilter ? `No fees match your filter.` : "No pending fees. Monthly generation runs on the 1st, or generate manually above."}
          </p>
        ) : (
          <DataTable
            columns={columns}
            data={paged}
            loading={false}
            emptyMessage="No pending fees."
            page={safePage}
            totalPages={totalPages}
            total={filtered.length}
            onPageChange={handlePageChange}
            sortBy=""
            order="desc"
            onSort={() => {}}
          />
        )}
      </div>
    </div>
  );
}

export default function AdminFeesPage() {
  return (
    <Suspense fallback={<div className="dashboard-page"><div className="skeleton skeleton-text" style={{ height: 18, width: 200 }} /></div>}>
      <AdminFeesInner />
    </Suspense>
  );
}
