"use client";

import { Suspense, useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { US_STATES } from "@/lib/us-states";
import { formatDuration, formatTimer } from "@/lib/format";
import { showToast } from "@/lib/use-toast";
import DeviceTest from "@/components/device-test";
import DataTable from "@/components/data-table";
import type { Column } from "@/components/data-table";

type Avail = "offline" | "available" | "busy" | "away";

interface CallRow {
  id: string;
  state: string;
  from_hash: string | null;
  caller_state: string | null;
  campaign_id: string;
  started_at: string | null;
  connected_at: string | null;
  ended_at: string | null;
}

interface AgentInfo {
  id: string;
  availability: string;
  approval_status: string;
  membership_id: string;
  forwarding_number: string | null;
  endpoint_types: string[];
  states: string[];
}

const STATUS_LABELS: Record<Avail, string> = {
  offline: "Offline",
  available: "Online",
  busy: "Busy",
  away: "Away",
};

const STATUS_COLORS: Record<Avail, string> = {
  offline: "var(--muted)",
  available: "var(--acid)",
  busy: "var(--orange)",
  away: "var(--yellow)",
};

const CALL_STATE_COLORS: Record<string, string> = {
  connected: "badge-success",
  ringing: "badge-warning",
  accepted: "badge-info",
  ended: "",
  failed: "badge-danger",
  missed: "badge-warning",
};

const PAGE_SIZE = 10;

function TakeCallsInner() {
  const { data: session } = authClient.useSession();
  const user = session?.user;
  const router = useRouter();
  const searchParams = useSearchParams();

  const [membershipId, setMembershipId] = useState<string | null>(null);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [agentInfo, setAgentInfo] = useState<AgentInfo | null>(null);
  const [statesDraft, setStatesDraft] = useState<string[]>([]);
  const [savingStates, setSavingStates] = useState(false);
  const [editingStates, setEditingStates] = useState(false);
  const [availability, setAvailability] = useState<Avail>("offline");
  const [calls, setCalls] = useState<CallRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creatingAgent, setCreatingAgent] = useState(false);
  const [campaignMap, setCampaignMap] = useState<Record<string, string>>({});
  const [callSearch, setCallSearch] = useState(searchParams.get("q") ?? "");
  const [callDebounced, setCallDebounced] = useState(searchParams.get("q") ?? "");
  const [callPage, setCallPage] = useState(Math.max(1, Number(searchParams.get("page") ?? "1") || 1));
  const hasMounted = useRef(false);

  const loadAgent = useCallback(async () => {
    const res = await fetch("/api/v1/me");
    if (!res.ok) return;
    const body = await res.json();
    setMembershipId(body.data.membership?.id ?? null);
    const aid = body.data.agentId ?? null;
    setAgentId(aid);
    if (aid) {
      const agentRes = await fetch(`/api/v1/agents/${aid}`);
      if (agentRes.ok) {
        const agentBody = await agentRes.json();
        setAgentInfo(agentBody.data);
        setAvailability(agentBody.data.availability ?? "offline");
        setStatesDraft(agentBody.data.states ?? []);
      }
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    loadAgent().finally(() => setLoading(false));
  }, [user, loadAgent]);

  useEffect(() => {
    if (!agentId) return;
    fetch(`/api/v1/calls?agent_id=${encodeURIComponent(agentId)}&limit=50`).then(async (res) => {
      if (res.ok) {
        const body = await res.json();
        setCalls(body.data ?? []);
      }
    });
  }, [agentId]);

  useEffect(() => {
    fetch("/api/v1/campaigns?limit=100").then(async (r) => {
      if (!r.ok) return;
      const b = await r.json();
      const rows: Array<{ id: string; name: string }> = b.data ?? [];
      const m: Record<string, string> = {};
      for (const c of rows) m[c.id] = c.name;
      setCampaignMap(m);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      const trimmed = callSearch.trim().toLowerCase();
      if (trimmed !== callDebounced) { setCallDebounced(trimmed); setCallPage(1); }
    }, 300);
    return () => clearTimeout(t);
  }, [callSearch, callDebounced]);

  useEffect(() => {
    if (!hasMounted.current) { hasMounted.current = true; return; }
    const p = new URLSearchParams();
    if (callDebounced) p.set("q", callDebounced);
    if (callPage > 1) p.set("page", String(callPage));
    const qs = p.toString();
    if (qs === searchParams.toString()) return;
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
  }, [callDebounced, callPage, router, searchParams]);

  const toggleAvailability = useCallback(async () => {
    if (!agentId || toggling) return;
    setToggling(true);
    setError(null);
    const next: Avail = availability === "available" ? "offline" : "available";
    try {
      const res = await fetch(`/api/v1/agents/${agentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ availability: next }),
      });
      if (res.ok) {
        setAvailability(next);
        showToast(`You are now ${next === "available" ? "online" : "offline"}`, "success");
      } else {
        const body = await res.json();
        setError(body.message ?? "Failed to update status");
        showToast(body.message ?? "Failed to update status", "error");
      }
    } catch {
      setError("Network error");
      showToast("Network error updating availability", "error");
    } finally {
      setToggling(false);
    }
  }, [agentId, availability, toggling]);

  function toggleState(code: string) {
    setStatesDraft((prev) => prev.includes(code) ? prev.filter((s) => s !== code) : [...prev, code]);
  }

  async function saveStates() {
    if (!agentId) return;
    setSavingStates(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/agents/${agentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ states: statesDraft }),
      });
      if (res.ok) {
        const body = await res.json();
        setAgentInfo(body.data);
        setStatesDraft(body.data.states ?? statesDraft);
        setEditingStates(false);
        showToast("States updated", "success");
      } else {
        const body = await res.json();
        setError(body.message ?? "Failed to update states");
        showToast(body.message ?? "Failed to update states", "error");
      }
    } catch {
      setError("Network error");
      showToast("Network error", "error");
    } finally {
      setSavingStates(false);
    }
  }

  const autoCreateAgent = useCallback(async () => {
    setCreatingAgent(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/agents/auto-create", { method: "POST" });
      if (res.ok) {
        showToast("Agent profile created! Reloading...", "success");
        await loadAgent();
      } else {
        const body = await res.json();
        setError(body.message ?? "Failed to create agent profile");
        showToast(body.message ?? "Failed to create agent profile", "error");
      }
    } catch {
      setError("Network error");
      showToast("Network error creating agent profile", "error");
    } finally {
      setCreatingAgent(false);
    }
  }, [loadAgent]);

  const filteredCalls = useMemo(() => {
    if (!callDebounced) return calls;
    const q = callDebounced;
    return calls.filter((c) => c.id.toLowerCase().includes(q) || (c.from_hash ?? "").toLowerCase().includes(q) || c.state.toLowerCase().includes(q) || (campaignMap[c.campaign_id] ?? "").toLowerCase().includes(q));
  }, [calls, callDebounced, campaignMap]);

  const callTotalPages = Math.max(1, Math.ceil(filteredCalls.length / PAGE_SIZE));
  const paginatedCalls = useMemo(() => filteredCalls.slice((callPage - 1) * PAGE_SIZE, callPage * PAGE_SIZE), [filteredCalls, callPage]);

  const callColumns: Column<CallRow>[] = [
    { key: "id", header: "Call", render: (c) => <Link href={`/dashboard/calls/${c.id}`} className="clickable">{c.id.slice(0, 8)}</Link> },
    { key: "state", header: "Status", render: (c) => <span className={`badge ${CALL_STATE_COLORS[c.state] ?? ""}`}>{c.state}</span> },
    { key: "from_hash", header: "From", render: (c) => <span className="text-mono-sm" title={c.from_hash ?? ""}>{c.from_hash?.slice(0, 12) ?? "\u2014"}</span> },
    { key: "caller_state", header: "State", render: (c) => c.caller_state ? <span className="badge badge-info">{c.caller_state}</span> : <span className="text-muted">\u2014</span> },
    { key: "campaign_id", header: "Campaign", render: (c) => <span className="text-mono-sm">{campaignMap[c.campaign_id] ?? c.campaign_id.slice(0, 8)}</span> },
    { key: "duration", header: "Duration", render: (c) => {
      const d = c.connected_at && c.ended_at ? Math.round((new Date(c.ended_at).getTime() - new Date(c.connected_at).getTime()) / 1000) : 0;
      return <span className="text-mono-sm">{d > 0 ? formatDuration(d) : "\u2014"}</span>;
    }},
    { key: "started_at", header: "Date", render: (c) => <span className="text-mono-sm">{c.started_at ? new Date(c.started_at).toLocaleString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }) : "\u2014"}</span> },
  ];

  if (loading) return (
    <div className="dashboard-page">
      <div className="stack" style={{ gap: 12 }}>{Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton skeleton-text" />)}</div>
    </div>
  );

  const isOnline = availability === "available";
  const isApproved = agentInfo?.approval_status === "approved";

  return (
    <div className="dashboard-page">
      <div className="dashboard-page-header">
        <div>
          <p className="eyebrow"><i /> AGENT / TAKE CALLS</p>
          <h1>Take Calls</h1>
        </div>
      </div>

      <div className="take-calls-card">
        <div className="take-calls-status">
          <span className="take-calls-dot" style={{ background: STATUS_COLORS[availability] }} />
          <div>
            <p className="take-calls-label">Current Status</p>
            <p className="take-calls-value">{STATUS_LABELS[availability]}</p>
          </div>
        </div>
        {agentId ? (
          <button
            className={`btn ${isOnline ? "btn-danger" : "btn-success"} take-calls-toggle`}
            onClick={toggleAvailability}
            disabled={toggling || !isApproved}
          >
            {toggling ? "Updating..." : isOnline ? "Go Offline" : "Go Online"}
          </button>
        ) : (
          <button
            className="btn btn-primary take-calls-toggle"
            onClick={autoCreateAgent}
            disabled={creatingAgent}
          >
            {creatingAgent ? "Creating..." : "Create Agent Profile"}
          </button>
        )}
      </div>

      <div className="card card--spacious" style={{ maxWidth: 640 }}>
        <h2 style={{ marginBottom: 4, font: "500 16px var(--serif)" }}>Device Check</h2>
        <p className="text-muted" style={{ fontSize: 12, marginBottom: "var(--space-4)" }}>
          Verify your headset before going online. Grant mic access when prompted.
        </p>
        <DeviceTest compact />
      </div>

      {agentId && (
        <div className="card card--spacious">
          <h2 style={{ marginBottom: 14, font: "500 16px var(--serif)" }}>Agent Status</h2>
          <div className="call-detail-grid">
            <div className="call-detail-field">
              <span className="call-detail-label">Approval</span>
              <span className="call-detail-value">
                {isApproved ? (
                  <span style={{ color: "var(--acid)" }}>Approved</span>
                ) : (
                  <span style={{ color: "#e89b79" }}>{agentInfo?.approval_status ?? "Unknown"} — Contact admin to approve</span>
                )}
              </span>
            </div>
            <div className="call-detail-field">
              <span className="call-detail-label">Online Status</span>
              <span className="call-detail-value" style={{ color: isOnline ? "var(--acid)" : "var(--muted)" }}>
                {STATUS_LABELS[availability]}
                {!isOnline && isApproved && <span style={{ color: "#e89b79", fontSize: 11, marginLeft: 8 }}>Turn on to receive calls</span>}
              </span>
            </div>
            <div className="call-detail-field">
              <span className="call-detail-label">Endpoint</span>
              <span className="call-detail-value text-mono-sm">{agentInfo?.endpoint_types?.join(", ") ?? "—"}</span>
            </div>
            <div className="call-detail-field">
              <span className="call-detail-label">Forwarding</span>
              <span className="call-detail-value text-mono-sm">{agentInfo?.forwarding_number ?? "Not set"}</span>
            </div>
          </div>
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span className="call-detail-label">Licensed States</span>
              {!editingStates ? (
                <button className="btn btn-sm btn-ghost" onClick={() => { setStatesDraft([...(agentInfo?.states ?? [])]); setEditingStates(true); }}>Edit</button>
              ) : null}
            </div>
            {editingStates ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <p className="text-muted" style={{ fontSize: 11, margin: 0 }}>Pick the states you are licensed to handle. Leave empty for “any state”. Used for state-wise routing.</p>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", maxHeight: 200, overflowY: "auto", padding: 8, border: "1px solid var(--line)", borderRadius: 10, background: "rgba(255,255,255,0.02)" }}>
                  {US_STATES.map((s) => (
                    <button
                      key={s.code}
                      type="button"
                      className={statesDraft.includes(s.code) ? "badge badge-success" : "badge"}
                      onClick={() => toggleState(s.code)}
                      style={{ cursor: "pointer", border: 0, fontFamily: "var(--mono)", fontSize: 10 }}
                      title={s.name}
                    >
                      {s.code}
                    </button>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-primary btn-sm" onClick={saveStates} disabled={savingStates}>{savingStates ? "Saving..." : "Save states"}</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditingStates(false)}>Cancel</button>
                  {statesDraft.length > 0 && <button className="btn btn-ghost btn-sm" onClick={() => setStatesDraft([])}>Clear</button>}
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {agentInfo?.states?.length ? agentInfo.states.map((c: string) => <span key={c} className="badge badge-info" style={{ fontSize: 10 }}>{c}</span>) : <span className="text-mono-sm" style={{ fontSize: 11, color: "var(--muted)" }}>Any state (no restriction)</span>}
              </div>
            )}
          </div>
          {(!isApproved || !isOnline) && (
            <div className="error-banner" style={{ marginTop: 16 }}>
              <p>
                {!agentId ? "No agent profile. Click 'Create Agent Profile' above." :
                 !isApproved ? "Your agent profile needs admin approval before you can receive calls." :
                 !isOnline ? "You are offline. Click 'Go Online' to start receiving calls." :
                 "You are ready to receive calls."}
              </p>
            </div>
          )}
          {isApproved && isOnline && (
            <div className="error-banner" style={{ marginTop: 16, borderColor: "#465f57", background: "rgba(70,95,87,0.1)" }}>
              <p style={{ color: "#b9d7c3" }}>Ready to receive calls. Incoming calls will be routed to you.</p>
            </div>
          )}
        </div>
      )}

      {error && <p className="form-error" style={{ marginTop: 8 }}>{error}</p>}

      <div className="filter-bar">
        <div className="filter-bar__primary">
          <h2 style={{ margin: 0, font: "500 16px var(--serif)" }}>Recent Calls</h2>
        </div>
        <div className="filter-bar__group" style={{ marginLeft: "auto" }}>
          <input className="input" type="search" placeholder="Search calls…" value={callSearch} onChange={(e) => setCallSearch(e.target.value)} style={{ minWidth: 220 }} />
          <span className="filter-bar__meta" style={{ marginLeft: 0 }}>{filteredCalls.length} call(s){callDebounced ? " (filtered)" : ""}{filteredCalls.length > PAGE_SIZE ? ` — page ${callPage}/${callTotalPages}` : ""}</span>
        </div>
      </div>

      <div className="card card--spacious">
        {filteredCalls.length === 0 ? (
          <div className="empty-state"><p>{calls.length === 0 ? "No calls yet. Once you go online, incoming calls will appear here." : `No calls match "${callDebounced}".`}</p></div>
        ) : (
            <DataTable
              columns={callColumns}
              data={paginatedCalls}
              emptyMessage="No calls"
              page={callPage}
              totalPages={callTotalPages}
              total={filteredCalls.length}
              onPageChange={setCallPage}
              sortBy="started_at"
              order="desc"
              onSort={() => {}}
            />
        )}
      </div>
    </div>
  );
}

export default function TakeCallsPage() {
  return (
    <Suspense fallback={<div className="dashboard-page"><div className="skeleton skeleton-text" style={{ height: 18, width: 200 }} /></div>}>
      <TakeCallsInner />
    </Suspense>
  );
}
