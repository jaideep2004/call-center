"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import DataTable from "@/components/data-table";
import type { Column } from "@/components/data-table";
import { showToast } from "@/lib/use-toast";

interface Publisher {
  id: string;
  name: string;
  email: string | null;
  afid: string | null;
  commission_pct: number;
  fixed_price_cents: number | null;
  retreaver_status: string;
  active: boolean;
  user_id: string | null;
  created_at: string;
  updated_at?: string;
  last_sync_at?: string | null;
}

interface ReportRow {
  publisher_id: string | null;
  publisher_name: string | null;
  calls: string;
  connected_calls: string;
  payout_cents: string;
  campaign_revenue_cents: string;
}

interface ReportResponse {
  rows: ReportRow[];
  totals: { calls: number; connected_calls: number; payout_cents: number; campaign_revenue_cents: number };
}

const PAGE_SIZE = 10;

function fmtMoney(cents: number | string | null) {
  if (cents == null || cents === "") return "—";
  const n = typeof cents === "string" ? parseInt(cents, 10) : cents;
  if (!Number.isFinite(n)) return "—";
  return `$${(n / 100).toFixed(2)}`;
}

function Kebab({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useState(() => ({ current: null as HTMLButtonElement | null }))[0];

  function toggle(e: React.MouseEvent<HTMLButtonElement>) {
    if (!open) {
      const r = e.currentTarget.getBoundingClientRect();
      // clamp inside viewport, prefer right-aligned to button
      const w = 172;
      const left = Math.min(Math.max(8, r.right - w), window.innerWidth - w - 8);
      setPos({ top: r.bottom + 6, left });
    }
    setOpen((v) => !v);
  }

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      const t = e.target as HTMLElement;
      if (btnRef.current && btnRef.current.contains(t)) return;
      // allow clicks inside the fixed menu
      if (t.closest("[data-kebab-menu]")) return;
      setOpen(false);
    }
    function onEsc(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); }
    function onScroll() { setOpen(false); }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open]);

  return (
    <>
      <button
        ref={(el) => { (btnRef as any).current = el; }}
        onClick={toggle}
        aria-label="Actions"
        aria-expanded={open}
        style={{
          cursor: "pointer",
          padding: "6px 10px",
          borderRadius: 8,
          border: "1px solid var(--line)",
          background: open ? "var(--hover)" : "transparent",
          fontSize: 16,
          lineHeight: 1,
          userSelect: "none",
        }}
      >
        ⋮
      </button>
      {open && pos && (
        <div
          data-kebab-menu
          onClick={() => setOpen(false)}
          style={{
            position: "fixed",
            top: pos.top,
            left: pos.left,
            minWidth: 172,
            background: "var(--surface, #171033)",
            border: "1px solid var(--line)",
            borderRadius: 10,
            padding: 6,
            display: "flex",
            flexDirection: "column",
            gap: 4,
            zIndex: 9999,
            boxShadow: "0 12px 32px rgba(0,0,0,0.45)",
          }}
        >
          {children}
        </div>
      )}
    </>
  );
}

export default function AdminPublishersPage() {
  const [publishers, setPublishers] = useState<Publisher[]>([]);
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [afid, setAfid] = useState("");
  const [commission, setCommission] = useState("0");
  const [fixedPriceDollars, setFixedPriceDollars] = useState("");
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncingCampaigns, setSyncingCampaigns] = useState(false);
  const [checking, setChecking] = useState(false);
  const [connection, setConnection] = useState<{ configured: boolean; ok: boolean; latency_ms: number | null; message: string } | null>(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState("name");
  const [order, setOrder] = useState<"asc" | "desc">("asc");
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<"" | "active" | "disabled">("");

  const fetchPublishers = useCallback(async () => {
    const res = await fetch("/api/v1/publishers");
    if (res.ok) {
      const body = await res.json();
      setPublishers(body.data ?? []);
    }
    setLoading(false);
  }, []);

  const fetchReport = useCallback(async () => {
    const res = await fetch("/api/v1/retreaver/report");
    if (res.ok) {
      const body = await res.json();
      setReport(body.data ?? { rows: [], totals: { calls: 0, connected_calls: 0, payout_cents: 0, campaign_revenue_cents: 0 } });
    }
  }, []);

  useEffect(() => {
    fetchPublishers();
    fetchReport();
    checkConnection();
  }, [fetchPublishers, fetchReport]);

  async function checkConnection() {
    setChecking(true);
    try {
      const res = await fetch("/api/v1/retreaver/status");
      const body = await res.json();
      setConnection(body.data ?? null);
    } catch {
      setConnection({ configured: false, ok: false, latency_ms: null, message: "Status check failed" });
    }
    setChecking(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError("");
    try {
      const dollars = fixedPriceDollars.trim() ? parseFloat(fixedPriceDollars) : NaN;
      const cents = Number.isFinite(dollars) ? Math.round(dollars * 100) : undefined;
      const res = await fetch("/api/v1/publishers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim() || undefined,
          afid: afid.trim() || undefined,
          commission_pct: parseInt(commission) || 0,
          fixed_price_cents: cents,
        }),
      });
      const body = await res.json();
      if (res.ok) {
        setName(""); setEmail(""); setAfid(""); setCommission("0"); setFixedPriceDollars("");
        showToast("Publisher created", "success");
        fetchPublishers();
      } else {
        setError(body.message ?? "Failed to create publisher");
        showToast(body.message ?? "Failed to create publisher", "error");
      }
    } catch {
      setError("Network error");
      showToast("Network error creating publisher", "error");
    }
    setSaving(false);
  }

  async function provision(p: Publisher) {
    const res = await fetch("/api/v1/retreaver/provision", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publisher_id: p.id }),
    });
    const body = await res.json();
    if (res.ok) {
      setPublishers((prev) => prev.map((x) => (x.id === p.id ? body.data : x)));
      showToast(`Provisioned "${p.name}" on Retreaver`, "success");
    } else {
      showToast(body.message ?? "Provisioning failed", "error");
    }
  }

  async function setStatus(p: Publisher, status: "active" | "paused") {
    const res = await fetch(`/api/v1/publishers/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ retreaver_status: status }),
    });
    const body = await res.json();
    if (res.ok) {
      setPublishers((prev) => prev.map((x) => (x.id === p.id ? body.data : x)));
      showToast(status === "paused" ? "Publisher paused" : "Publisher resumed", "success");
    } else {
      showToast(body.message ?? "Failed to update status", "error");
    }
  }

  async function syncCalls() {
    setSyncing(true);
    const res = await fetch("/api/v1/retreaver/sync", { method: "POST" });
    const body = await res.json();
    if (res.ok) {
      const { stored = 0, skipped = 0, truncated = false } = body.data ?? {};
      const parts = [`Synced ${stored} Retreaver calls`];
      if (skipped > 0) parts.push(`skipped ${skipped} unattributed`);
      if (truncated) parts.push("history scan capped (re-run to continue)");
      showToast(parts.join(", "), "success");
      setLastSync(new Date().toISOString());
      fetchReport();
    } else {
      showToast(body.message ?? "Sync failed", "error");
    }
    setSyncing(false);
  }

  async function syncCampaigns() {
    setSyncingCampaigns(true);
    try {
      const res = await fetch("/api/v1/retreaver/campaigns/sync", { method: "POST" });
      const body = await res.json();
      if (res.ok) {
        const { created = 0, updated = 0 } = body.data ?? {};
        const parts = [`Synced Retreaver campaigns`];
        if (created > 0) parts.push(`${created} created`);
        if (updated > 0) parts.push(`${updated} updated`);
        showToast(parts.join(" — "), "success");
        setLastSync(new Date().toISOString());
      } else {
        showToast(body.message ?? "Campaign sync failed", "error");
      }
    } catch {
      showToast("Network error syncing campaigns", "error");
    }
    setSyncingCampaigns(false);
  }

  async function toggleActive(p: Publisher) {
    const res = await fetch(`/api/v1/publishers/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !p.active }),
    });
    if (res.ok) {
      const body = await res.json();
      setPublishers((prev) => prev.map((x) => (x.id === p.id ? body.data : x)));
      showToast(p.active ? "Publisher disabled" : "Publisher enabled", "success");
    } else {
      showToast("Failed to update publisher", "error");
    }
  }

  async function handleDelete(p: Publisher) {
    if (!confirm(`Delete publisher "${p.name}"? Campaigns referencing it will be unlinked.`)) return;
    const res = await fetch(`/api/v1/publishers/${p.id}`, { method: "DELETE" });
    if (res.ok) {
      setPublishers((prev) => prev.filter((x) => x.id !== p.id));
      showToast("Publisher deleted", "success");
    } else {
      showToast("Failed to delete publisher", "error");
    }
  }

  async function sendInvite(p: Publisher) {
    const res = await fetch(`/api/v1/publishers/${p.id}/invite`, { method: "POST" });
    const body = await res.json();
    if (res.ok) {
      showToast(`Invite emailed to ${p.email ?? "publisher"}`, "success");
      const link = body.data?.link;
      if (link) {
        try {
          await navigator.clipboard.writeText(link);
          showToast("Invite link copied to clipboard as backup", "success");
        } catch {
          showToast(`Invite link: ${link}`, "info");
        }
      }
    } else {
      showToast(body.message ?? "Failed to create invite", "error");
    }
  }

  // client-side filter + sort + pagination
  const filtered = useMemo(() => {
    let out = [...publishers];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      out = out.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        (p.email ?? "").toLowerCase().includes(q) ||
        (p.afid ?? "").toLowerCase().includes(q)
      );
    }
    if (activeFilter === "active") out = out.filter((p) => p.active);
    if (activeFilter === "disabled") out = out.filter((p) => !p.active);
    out.sort((a, b) => {
      let cmp = 0;
      if (sortBy === "name") cmp = a.name.localeCompare(b.name);
      else if (sortBy === "created_at") cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      else if (sortBy === "commission_pct") cmp = a.commission_pct - b.commission_pct;
      else if (sortBy === "retreaver_status") cmp = a.retreaver_status.localeCompare(b.retreaver_status);
      return order === "asc" ? cmp : -cmp;
    });
    return out;
  }, [publishers, search, activeFilter, sortBy, order]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  useEffect(() => { setPage(1); }, [search, activeFilter]);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [totalPages, page]);

  function handleSort(field: string) {
    if (sortBy === field) setOrder((o) => (o === "asc" ? "desc" : "asc"));
    else { setSortBy(field); setOrder("asc"); }
  }

  const columns: Column<Publisher>[] = [
    { key: "name", header: "Name", sortable: true, render: (p) => <span style={{ fontWeight: 500 }}>{p.name}</span> },
    { key: "email", header: "Email", render: (p) => <span className="text-mono-sm">{p.email ?? "—"}</span> },
    { key: "afid", header: "afid", render: (p) => <span className="text-mono-sm">{p.afid ?? "—"}</span> },
    { key: "fixed_price_cents", header: "Fixed price", render: (p) => <span className="text-mono-sm">{p.fixed_price_cents != null ? `$${(p.fixed_price_cents / 100).toFixed(2)}` : "—"}</span> },
    { key: "commission_pct", header: "Commission", sortable: true, render: (p) => <span className="text-mono-sm">{p.commission_pct}%</span> },
    {
      key: "retreaver_status", header: "Retreaver", sortable: true,
      render: (p) => <span className={`badge ${p.retreaver_status === "active" ? "badge-success" : p.retreaver_status === "paused" ? "badge-warning" : p.retreaver_status === "error" ? "badge-danger" : ""}`}>{p.retreaver_status}</span>,
    },
    { key: "active", header: "Status", render: (p) => <span className={`badge ${p.active ? "badge-success" : ""}`}>{p.active ? "Active" : "Disabled"}</span> },
    { key: "created_at", header: "Created", sortable: true, render: (p) => <span className="text-mono-sm">{new Date(p.created_at).toLocaleDateString()}</span> },
    {
      key: "actions", header: "Actions", className: "actions-cell",
      render: (p) => (
        <Kebab>
          {p.user_id ? (
            <span className="badge badge-success" style={{ textAlign: "center" }}>Portal linked</span>
          ) : (
            <button className="btn btn-sm btn-secondary" onClick={() => sendInvite(p)} style={{ width: "100%" }}>Invite</button>
          )}
          {p.retreaver_status === "unprovisioned" && (
            <button className="btn btn-sm btn-secondary" onClick={() => provision(p)} style={{ width: "100%" }}>Provision</button>
          )}
          {p.retreaver_status === "active" && (
            <button className="btn btn-sm btn-secondary" onClick={() => setStatus(p, "paused")} style={{ width: "100%" }}>Pause</button>
          )}
          {p.retreaver_status === "paused" && (
            <button className="btn btn-sm btn-secondary" onClick={() => setStatus(p, "active")} style={{ width: "100%" }}>Resume</button>
          )}
          {p.retreaver_status === "error" && (
            <button className="btn btn-sm btn-secondary" onClick={() => provision(p)} style={{ width: "100%" }}>Retry</button>
          )}
          <button className="btn btn-sm btn-secondary" onClick={() => toggleActive(p)} style={{ width: "100%" }}>{p.active ? "Disable" : "Enable"}</button>
          <button className="btn btn-sm btn-danger" onClick={() => handleDelete(p)} style={{ width: "100%" }}>Delete</button>
        </Kebab>
      ),
    },
  ];

  return (
    <div className="dashboard-page">
      <div className="dashboard-page-header">
        <div>
          <p className="eyebrow"><i /> ADMIN / PUBLISHERS</p>
          <h1>Publishers</h1>
          {lastSync && <p className="text-mono-sm" style={{ marginTop: 4, color: "var(--muted)" }}>Last sync: {new Date(lastSync).toLocaleString()}</p>}
        </div>
        <div className="stack-h" style={{ gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button className="btn btn-secondary" onClick={checkConnection} disabled={checking}>
            {checking ? <span className="spinner" /> : "Check Retreaver status"}
          </button>
          {connection && (
            <span className={`badge ${connection.ok ? "badge-success" : "badge-danger"}`}>
              {connection.ok
                ? `Connected · ${connection.latency_ms ?? "?"}ms`
                : connection.message}
            </span>
          )}
          <button className="btn btn-secondary" onClick={syncCalls} disabled={syncing}>
            {syncing ? <span className="spinner" /> : "Sync Retreaver calls"}
          </button>
          <button className="btn btn-secondary" onClick={syncCampaigns} disabled={syncingCampaigns}>
            {syncingCampaigns ? <span className="spinner" /> : "Sync Retreaver campaigns"}
          </button>
        </div>
      </div>

      <section className="card" style={{ padding: "var(--space-6)", marginBottom: "var(--space-5)" }}>
        <h2 style={{ font: "500 18px var(--serif)", margin: "0 0 var(--space-4)", letterSpacing: "-0.03em" }}>Add Publisher</h2>
        <form onSubmit={handleCreate} style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr 1fr 1fr auto", gap: "var(--space-3)", alignItems: "flex-end", flexWrap: "wrap" }}>
          <div className="form-group">
            <label className="form-label">Name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Acme Media" required maxLength={255} />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="optional" />
          </div>
          <div className="form-group">
            <label className="form-label">Retreaver afid</label>
            <input className="input" value={afid} onChange={(e) => setAfid(e.target.value)} placeholder="auto on provision" />
          </div>
          <div className="form-group">
            <label className="form-label">Commission %</label>
            <input className="input" type="number" min="0" max="100" value={commission} onChange={(e) => setCommission(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Fixed price / call ($)</label>
            <input className="input" type="number" min="0" step="0.01" value={fixedPriceDollars} onChange={(e) => setFixedPriceDollars(e.target.value)} placeholder="e.g. 2.50" />
          </div>
          <button className="btn btn-primary" type="submit" disabled={saving || !name.trim()}>
            {saving ? <span className="spinner" /> : "Add"}
          </button>
        </form>
        {error && <p className="form-error" style={{ marginTop: 8 }}>{error}</p>}
        <p className="text-muted" style={{ fontSize: 11, marginTop: 8 }}>Fixed price in dollars — stored as cents (×100). Leave empty for commission-only payout.</p>
      </section>

      <div className="filter-bar" style={{ marginBottom: "var(--space-4)" }}>
        <input className="input" type="search" placeholder="Search name, email, afid…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ maxWidth: 300 }} />
        <select className="input" value={activeFilter} onChange={(e) => setActiveFilter(e.target.value as any)} style={{ maxWidth: 160 }}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="disabled">Disabled</option>
        </select>
        <span className="text-mono-sm">{filtered.length} publishers</span>
      </div>

      {loading ? (
        <div className="stack" style={{ gap: 12 }}>{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton skeleton-text" />)}</div>
      ) : publishers.length === 0 ? (
        <p className="text-muted">No publishers yet. Add your first publisher above.</p>
      ) : filtered.length === 0 ? (
        <div className="empty-state"><p>No publishers match &quot;{search}&quot;.</p></div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <DataTable
            columns={columns}
            data={paged}
            loading={false}
            emptyMessage="No publishers found."
            page={page}
            totalPages={totalPages}
            total={filtered.length}
            onPageChange={setPage}
            sortBy={sortBy}
            order={order}
            onSort={handleSort}
          />
        </div>
      )}

      <section className="card" style={{ padding: "var(--space-6)", marginTop: "var(--space-5)" }}>
        <h2 style={{ font: "500 18px var(--serif)", margin: "0 0 var(--space-2)", letterSpacing: "-0.03em" }}>Retreaver Performance</h2>
        <p className="text-muted" style={{ margin: "0 0 var(--space-4)" }}>
          Finished calls from the Retreaver sync. Margin = call revenue (from Retreaver) − publisher payout.
        </p>
        {!report || report.rows.length === 0 ? (
          <p className="text-muted">No synced calls yet. Run &quot;Sync Retreaver calls&quot; or wait for the scheduled sync.</p>
        ) : (
          <>
            <div style={{ overflowX: "auto" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Publisher</th>
                    <th>Calls</th>
                    <th>Connected</th>
                    <th>Payout</th>
                    <th>Campaign revenue</th>
                    <th>Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {report.rows.map((r) => {
                    const payout = parseInt(r.payout_cents ?? "0", 10);
                    const revenue = parseInt(r.campaign_revenue_cents ?? "0", 10);
                    const margin = revenue - payout;
                    return (
                      <tr key={r.publisher_id ?? "unassigned"}>
                        <td>{r.publisher_name ?? "Unassigned"}</td>
                        <td className="text-mono-sm">{r.calls}</td>
                        <td className="text-mono-sm">{r.connected_calls}</td>
                        <td className="text-mono-sm">${(payout / 100).toFixed(2)}</td>
                        <td className="text-mono-sm">${(revenue / 100).toFixed(2)}</td>
                        <td className={`text-mono-sm ${margin < 0 ? "text-danger" : ""}`}>${(margin / 100).toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="stack" style={{ marginTop: "var(--space-4)" }}>
              <p className="text-muted">
                Totals — calls: <strong>{report.totals.calls}</strong>, connected: <strong>{report.totals.connected_calls}</strong>, payout:{" "}
                <strong>${(report.totals.payout_cents / 100).toFixed(2)}</strong>, revenue:{" "}
                <strong>${(report.totals.campaign_revenue_cents / 100).toFixed(2)}</strong>, margin:{" "}
                <strong className={report.totals.campaign_revenue_cents - report.totals.payout_cents < 0 ? "text-danger" : ""}>
                  ${((report.totals.campaign_revenue_cents - report.totals.payout_cents) / 100).toFixed(2)}
                </strong>
              </p>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
