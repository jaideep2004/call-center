"use client";

import { Suspense, useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { US_STATES } from "@/lib/us-states";
import { formatDuration } from "@/lib/format";
import { showToast } from "@/lib/use-toast";
import DeviceTest from "@/components/device-test";
import DataTable from "@/components/data-table";
import type { Column } from "@/components/data-table";
import { useTelnyxWebRTC } from "@/lib/use-telnyx-webrtc";

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
  priority?: number;
  last_assigned_at?: string | null;
  user_name?: string;
  npn?: string | null;
}

const STATUS_LABELS: Record<Avail, string> = {
  offline: "Offline",
  available: "Online",
  busy: "Busy",
  away: "Away",
};

const STATUS_COLORS: Record<Avail, string> = {
  offline: "var(--muted)",
  available: "var(--success, #22c55e)",
  busy: "var(--warning, #f59e0b)",
  away: "var(--amber, #f59e0b)",
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

function ChecklistRow({ ok, pending, label, desc, meta }: { ok: boolean; pending?: boolean; label: string; desc: string; meta?: string }) {
  return (
    <div
      className="tc-check-row"
      style={{
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
        padding: "12px 12px",
        borderRadius: 10,
        border: `1px solid ${ok ? "rgba(34,197,94,0.22)" : pending ? "rgba(245,158,11,0.18)" : "var(--line)"}`,
        background: ok ? "rgba(34,197,94,0.07)" : pending ? "rgba(245,158,11,0.06)" : "rgba(255,255,255,0.02)",
      }}
    >
      <span
        aria-hidden
        style={{
          width: 28,
          height: 28,
          borderRadius: 999,
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
          background: ok ? "rgba(34,197,94,0.14)" : pending ? "rgba(245,158,11,0.14)" : "rgba(255,255,255,0.04)",
          border: `1px solid ${ok ? "rgba(34,197,94,0.28)" : pending ? "rgba(245,158,11,0.22)" : "var(--line)"}`,
          color: ok ? "#86efac" : pending ? "#fbbf24" : "var(--muted)",
          fontSize: 13,
          fontWeight: 700,
          lineHeight: 1,
        }}
      >
        {ok ? "✓" : pending ? "•" : "×"}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <strong style={{ font: "600 13px var(--sans)", letterSpacing: "-0.01em", color: "var(--ink)" }}>{label}</strong>
          {meta && (
            <span
              className={`badge ${ok ? "badge-success" : pending ? "badge-warning" : ""}`}
              style={{ fontSize: 9, padding: "2px 6px", textTransform: "uppercase", letterSpacing: 0.6 }}
            >
              {meta}
            </span>
          )}
        </div>
        <p style={{ margin: "4px 0 0", font: "400 12px/1.5 var(--sans)", color: ok ? "#b9d7c3" : "var(--muted)", opacity: ok ? 0.95 : 0.9 }}>{desc}</p>
      </div>
    </div>
  );
}

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
  const [deviceReady, setDeviceReady] = useState(false);
  const hasMounted = useRef(false);
  const webrtc = useTelnyxWebRTC(agentId);

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

  // hydrate deviceReady from storage on agent change (in case DeviceTest hasn't mounted yet)
  useEffect(() => {
    if (!agentId) return;
    try {
      const v = localStorage.getItem(`cc-device-ready:${agentId}`);
      if (v === "1") setDeviceReady(true);
    } catch {}
  }, [agentId]);

  const handleDeviceReady = useCallback((ready: boolean) => {
    setDeviceReady(ready);
  }, []);

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
    { key: "from_hash", header: "From", render: (c) => <span className="text-mono-sm" title={c.from_hash ?? ""}>{c.from_hash?.slice(0, 12) ?? "—"}</span> },
    { key: "caller_state", header: "State", render: (c) => c.caller_state ? <span className="badge badge-info">{c.caller_state}</span> : <span className="text-muted">—</span> },
    { key: "campaign_id", header: "Campaign", render: (c) => <span className="text-mono-sm">{campaignMap[c.campaign_id] ?? c.campaign_id.slice(0, 8)}</span> },
    { key: "duration", header: "Duration", render: (c) => {
      const d = c.connected_at && c.ended_at ? Math.round((new Date(c.ended_at).getTime() - new Date(c.connected_at).getTime()) / 1000) : 0;
      return <span className="text-mono-sm">{d > 0 ? formatDuration(d) : "—"}</span>;
    }},
    { key: "started_at", header: "Date", render: (c) => <span className="text-mono-sm">{c.started_at ? new Date(c.started_at).toLocaleString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }) : "—"}</span> },
  ];

  if (loading) return (
    <div className="dashboard-page">
      <div className="stack" style={{ gap: 12 }}>{Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton skeleton-text" />)}</div>
    </div>
  );

  const isOnline = availability === "available";
  const isApproved = agentInfo?.approval_status === "approved";
  const hasEndpoint = (agentInfo?.endpoint_types?.length ?? 0) > 0;
  const hasPSTN = agentInfo?.endpoint_types?.includes("pstn") ?? false;
  const hasWebRTC = agentInfo?.endpoint_types?.includes("webrtc") ?? false;
  const pstnForwardingOk = !hasPSTN || Boolean(agentInfo?.forwarding_number);
  const endpointReady = hasEndpoint && pstnForwardingOk;
  const statesReady = !!agentInfo; // loaded; empty means Any state and is valid
  const webrtcLabel = hasWebRTC ? (webrtc.isReady ? "WebRTC live" : webrtc.error ? "WebRTC error" : "WebRTC connecting") : hasPSTN ? "PSTN forward" : "Not set";
  const readyChecks = [
    { ok: isApproved, label: "Admin Approval", desc: isApproved ? "Approved to receive calls" : agentInfo ? `${agentInfo.approval_status} — Contact admin to approve` : "Loading approval…", meta: isApproved ? "Approved" : (agentInfo?.approval_status ?? "pending") },
    { ok: deviceReady, label: "Mic & Speaker", desc: deviceReady ? "Both tested — verified on this device" : "Test mic & speaker to unlock Go Online", meta: deviceReady ? "Verified" : "Required" },
    { ok: statesReady, label: "Licensed States", desc: agentInfo?.states?.length ? `${agentInfo.states.length} states selected — routing filtered` : "Any state — you will receive calls from all states", meta: agentInfo?.states?.length ? `${agentInfo.states.length} set` : "Any" },
    { ok: endpointReady, label: "Call Endpoint", desc: !hasEndpoint ? "No endpoint configured — contact admin" : !pstnForwardingOk ? "PSTN selected but forwarding number missing" : hasWebRTC && hasPSTN ? `Hybrid: webrtc + pstn → ${agentInfo?.forwarding_number ?? ""}` : hasWebRTC ? `Browser softphone · ${webrtcLabel}` : `Phone forward → ${agentInfo?.forwarding_number ?? ""}`, meta: endpointReady ? (hasWebRTC && hasPSTN ? "Hybrid" : hasWebRTC ? webrtcLabel : "PSTN") : "Missing" },
  ];
  const passCount = readyChecks.filter((c) => c.ok).length;
  const allReady = passCount === readyChecks.length;
  const canGoOnline = isApproved && deviceReady && endpointReady;
  const goOnlineBlockedReason = !isApproved ? "Awaiting admin approval" : !endpointReady ? "Endpoint not ready" : !deviceReady ? "Test mic & speaker first" : null;
  const isGoOnlineDisabled = !isOnline && !!goOnlineBlockedReason;

  return (
    <div className="dashboard-page tc-page">
      {/* HERO */}
      <section className="tc-hero" aria-labelledby="tc-title">
        <div className="tc-hero__main">
          <p className="eyebrow"><i aria-hidden /> AGENT / TAKE CALLS</p>
          <h1 id="tc-title">Take Calls</h1>
          <p className="tc-subtitle">
            Go online only when every check is green. Devices are verified on this browser — refresh keeps your test.
          </p>
          <div className="tc-hero__meta" role="list">
            <span className={`badge ${isApproved ? "badge-success" : "badge-warning"}`} role="listitem" title={`Approval: ${agentInfo?.approval_status ?? "unknown"}`}>
              {isApproved ? "Approved" : agentInfo?.approval_status ?? "Pending approval"}
            </span>
            <span className="badge" role="listitem" title={agentInfo?.endpoint_types?.join(", ") ?? "No endpoint"} style={{ textTransform: "uppercase", letterSpacing: 0.6 }}>
              {agentInfo?.endpoint_types?.length ? agentInfo.endpoint_types.join(" · ") : "No endpoint"}
            </span>
            {hasPSTN && agentInfo?.forwarding_number && (
              <span className="text-mono-sm tc-hero__forwarding" role="listitem" title={agentInfo.forwarding_number}>
                → {agentInfo.forwarding_number}
              </span>
            )}
            <span className="text-mono-sm tc-hero__count" role="listitem">{calls.length} total calls</span>
            {hasWebRTC && (
              <span className={`badge ${webrtc.isReady ? "badge-success" : webrtc.error ? "badge-danger" : "badge-warning"}`} style={{ fontSize: 9 }} title={webrtc.error ?? webrtcLabel}>
                {webrtcLabel}
              </span>
            )}
          </div>
        </div>

        <div className="tc-hero__cta">
          <div className="tc-availability" aria-live="polite">
            <span className="take-calls-dot" style={{ background: STATUS_COLORS[availability], boxShadow: isOnline ? "0 0 12px rgba(34,197,94,0.45)" : "none" }} aria-hidden />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className="take-calls-label" style={{ margin: 0 }}>Availability</p>
              <p className="take-calls-value" style={{ margin: "2px 0 0", color: isOnline ? "var(--success, #22c55e)" : "var(--ink)" }}>{STATUS_LABELS[availability]}</p>
            </div>
            {isOnline ? (
              <span className="badge badge-success" style={{ fontSize: 9, flexShrink: 0 }}>RECEIVING</span>
            ) : (
              <span className="badge" style={{ fontSize: 9, flexShrink: 0 }}>{allReady ? "READY" : `${passCount}/4 checks`}</span>
            )}
          </div>

          {agentId ? (
            <>
              <div style={{ position: "relative" }} title={goOnlineBlockedReason ?? undefined}>
                <button
                  className={`btn ${isOnline ? "btn-danger" : "btn-primary"} tc-cta-btn`}
                  onClick={toggleAvailability}
                  disabled={toggling || isGoOnlineDisabled}
                  aria-describedby="tc-cta-help"
                  aria-busy={toggling}
                >
                  {toggling ? "Updating…" : isOnline ? "Go Offline" : "Go Online"}
                </button>
              </div>
              <p id="tc-cta-help" className="tc-cta-help">
                {isOnline
                  ? "You are live — calls will be routed to your endpoint."
                  : goOnlineBlockedReason === "Test mic & speaker first"
                    ? "Test mic & speaker first — primary CTA is gated until both are verified."
                    : goOnlineBlockedReason ?? "Complete all checks to go online."}
              </p>
              {!isOnline && !allReady && (
                <div className="tc-cta-progress" aria-hidden>
                  <div className="tc-cta-progress__bar">
                    <span style={{ width: `${(passCount / 4) * 100}%` }} />
                  </div>
                  <span className="text-mono-sm" style={{ fontSize: 10, color: "var(--muted)" }}>{passCount}/4 ready</span>
                </div>
              )}
            </>
          ) : (
            <button
              className="btn btn-primary tc-cta-btn"
              onClick={autoCreateAgent}
              disabled={creatingAgent}
              aria-busy={creatingAgent}
            >
              {creatingAgent ? "Creating…" : "Create Agent Profile"}
            </button>
          )}

          {!isApproved && agentId && (
            <div className="tc-callout tc-callout--warning" role="status">
              <strong>Approval required</strong>
              <span>Your profile is {agentInfo?.approval_status ?? "pending"}. Contact admin to approve before you can receive calls.</span>
            </div>
          )}
          {isApproved && !endpointReady && agentId && (
            <div className="tc-callout tc-callout--warning" role="status">
              <strong>Endpoint missing</strong>
              <span>{hasPSTN && !pstnForwardingOk ? "PSTN endpoint needs a forwarding number — contact admin." : "No call endpoint configured — contact admin to set WebRTC or PSTN."}</span>
            </div>
          )}
          {isApproved && endpointReady && !isOnline && (
            <div className={`tc-callout ${allReady ? "tc-callout--success" : "tc-callout--muted"}`} role="status">
              <strong>{allReady ? "Ready to receive calls" : "Almost ready"}</strong>
              <span>{allReady ? "Click Go Online to start receiving inbound calls." : `Complete ${4 - passCount} more check(s) to unlock Go Online.`}</span>
            </div>
          )}
          {isApproved && isOnline && (
            <div className="tc-callout tc-callout--success" role="status">
              <strong>Live — receiving calls</strong>
              <span>Incoming calls will be routed to {hasWebRTC && hasPSTN ? "browser or phone" : hasWebRTC ? "your browser softphone" : hasPSTN ? agentInfo?.forwarding_number ?? "your forwarding number" : "your endpoint"}.</span>
            </div>
          )}
        </div>
      </section>

      {/* MIDDLE 2-col */}
      <div className="tc-grid">
        {/* LEFT */}
        <div className="tc-grid__left">
          {/* Device Gate */}
          <section className="card card--spacious tc-card" aria-labelledby="tc-device-title">
            <div className="tc-card__head">
              <div>
                <h2 id="tc-device-title" style={{ margin: 0, font: "600 16px var(--serif)", letterSpacing: "-0.03em" }}>Device Readiness</h2>
                <p className="text-muted" style={{ margin: "4px 0 0", fontSize: 12, lineHeight: 1.5 }}>
                  Verify headset on this browser. We gate <span className="text-mono-sm" style={{ fontSize: 11, color: "var(--ink)" }}>Go Online</span> until mic & speaker are tested. Stored per device as <span className="text-mono-sm" style={{ fontSize: 10 }}>cc-device-ready</span>.
                </p>
              </div>
              <span className={`badge ${deviceReady ? "badge-success" : "badge-warning"}`} style={{ flexShrink: 0, fontSize: 10 }}>
                {deviceReady ? "Verified" : "Action needed"}
              </span>
            </div>

            <DeviceTest compact={false} agentId={agentId} onReadyChange={handleDeviceReady} />

            {!deviceReady && (
              <p className="text-mono-sm" style={{ margin: "10px 0 0", fontSize: 11, color: "var(--warning, #f59e0b)", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.18)", padding: "8px 10px", borderRadius: 8 }}>
                Tip: Click <strong>Start mic check</strong> and allow permission, speak for a few seconds, then <strong>Play test sound</strong>. Both must show ✓ TESTED.
              </p>
            )}
          </section>

          {/* Readiness Checklist */}
          <section className="card card--spacious tc-card" aria-labelledby="tc-checklist-title">
            <div className="tc-card__head" style={{ marginBottom: 14 }}>
              <div>
                <h2 id="tc-checklist-title" style={{ margin: 0, font: "600 16px var(--serif)", letterSpacing: "-0.03em" }}>Call Readiness Checklist</h2>
                <p className="text-muted" style={{ margin: "4px 0 0", fontSize: 12 }}>All green to receive calls. Mirrors routing gates.</p>
              </div>
              <span className="text-mono-sm" style={{ fontSize: 10, letterSpacing: 0.6, textTransform: "uppercase", color: allReady ? "var(--success, #22c55e)" : "var(--muted)", border: `1px solid ${allReady ? "rgba(34,197,94,0.28)" : "var(--line)"}`, padding: "4px 8px", borderRadius: 999, background: allReady ? "rgba(34,197,94,0.10)" : "rgba(255,255,255,0.03)" }}>
                {passCount}/4 PASS
              </span>
            </div>

            <div className="tc-checklist">
              <ChecklistRow
                ok={isApproved}
                pending={!isApproved && !!agentInfo}
                label="Admin approval"
                desc={isApproved ? "You are approved — routing is enabled." : agentInfo ? `Status: ${agentInfo.approval_status}. Contact admin to approve.` : "Loading…"}
                meta={isApproved ? "Approved" : agentInfo?.approval_status ?? "…"}
              />
              <ChecklistRow
                ok={deviceReady}
                label="Device (mic + speaker)"
                desc={deviceReady ? "Mic started and speaker tone played — stored for this device." : "Grant mic, confirm level moves, then play tone. Both emit ✓ TESTED."}
                meta={deviceReady ? "Verified" : "Required"}
              />
              <ChecklistRow
                ok={statesReady}
                label="Licensed states"
                desc={agentInfo?.states?.length ? `${agentInfo.states.length} states filtered — only matching caller states will route.` : "No restriction — eligible for calls from any state."}
                meta={agentInfo?.states?.length ? `${agentInfo.states.length} set` : "Any"}
              />
              <ChecklistRow
                ok={endpointReady}
                pending={!endpointReady && hasEndpoint}
                label="WebRTC / PSTN endpoint"
                desc={
                  !hasEndpoint
                    ? "No endpoint assigned — routing will skip you."
                    : !pstnForwardingOk
                      ? "PSTN needs a forwarding number."
                      : hasWebRTC && hasPSTN
                        ? `Hybrid — browser + PSTN fallback to ${agentInfo?.forwarding_number ?? ""} · ${webrtcLabel}`
                        : hasWebRTC
                          ? `Browser softphone — ${webrtcLabel}`
                          : `PSTN forward to ${agentInfo?.forwarding_number ?? ""}`
                }
                meta={endpointReady ? (hasWebRTC && hasPSTN ? "Hybrid" : hasWebRTC ? (webrtc.isReady ? "WebRTC live" : "WebRTC…") : "PSTN") : "Missing"}
              />
            </div>

            <div
              style={{
                marginTop: 14,
                padding: "10px 12px",
                borderRadius: 10,
                border: `1px solid ${allReady ? "rgba(34,197,94,0.22)" : "var(--line)"}`,
                background: allReady ? "rgba(34,197,94,0.06)" : "rgba(255,255,255,0.02)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <span className="text-mono-sm" style={{ fontSize: 11, color: allReady ? "#b9d7c3" : "var(--muted)" }}>
                {allReady ? "All checks pass — you can go online." : `${4 - passCount} check(s) still needed — Go Online is disabled.`}
              </span>
              <span style={{ display: "inline-flex", gap: 6 }}>
                {readyChecks.map((c) => (
                  <i
                    key={c.label}
                    aria-hidden
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 999,
                      background: c.ok ? "var(--success, #22c55e)" : "var(--line)",
                      boxShadow: c.ok ? "0 0 8px rgba(34,197,94,0.45)" : "none",
                      display: "inline-block",
                    }}
                  />
                ))}
              </span>
            </div>
          </section>
        </div>

        {/* RIGHT */}
        <div className="tc-grid__right">
          {/* Agent Snapshot */}
          {agentId && agentInfo && (
            <section className="card card--spacious tc-card tc-card--snapshot" aria-labelledby="tc-snapshot-title">
              <div className="tc-card__head">
                <h2 id="tc-snapshot-title" style={{ margin: 0, font: "600 14px var(--serif)", letterSpacing: "-0.02em" }}>Agent Snapshot</h2>
                <span className="badge" style={{ fontSize: 9, textTransform: "uppercase" }}>{availability}</span>
              </div>

              <div className="tc-snapshot-grid">
                <div className="tc-snapshot-field">
                  <span className="call-detail-label">Approval</span>
                  <span className="call-detail-value" style={{ fontSize: 13 }}>
                    {isApproved ? <span style={{ color: "var(--success, #22c55e)" }}>Approved</span> : <span style={{ color: "#f59e0b" }}>{agentInfo.approval_status}</span>}
                  </span>
                </div>
                <div className="tc-snapshot-field">
                  <span className="call-detail-label">Endpoint</span>
                  <span className="call-detail-value text-mono-sm" style={{ fontSize: 12, wordBreak: "break-all" }}>
                    {agentInfo.endpoint_types?.length ? agentInfo.endpoint_types.join(" · ") : "—"}
                  </span>
                </div>
                <div className="tc-snapshot-field">
                  <span className="call-detail-label">Forwarding</span>
                  <span className="call-detail-value text-mono-sm" style={{ fontSize: 12 }}>{agentInfo.forwarding_number ?? "Not set"}</span>
                </div>
                <div className="tc-snapshot-field">
                  <span className="call-detail-label">Priority</span>
                  <span className="call-detail-value text-mono-sm" style={{ fontSize: 12 }}>{agentInfo.priority ?? "—"}</span>
                </div>
                <div className="tc-snapshot-field" style={{ gridColumn: "1 / -1" }}>
                  <span className="call-detail-label">Licensed States</span>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                    {agentInfo.states?.length ? agentInfo.states.slice(0, 8).map((c: string) => <span key={c} className="badge badge-info" style={{ fontSize: 10 }}>{c}</span>) : <span className="text-mono-sm" style={{ fontSize: 11, color: "var(--muted)" }}>Any state (no restriction)</span>}
                    {(agentInfo.states?.length ?? 0) > 8 && <span className="badge" style={{ fontSize: 10 }}>+{(agentInfo.states?.length ?? 0) - 8} more</span>}
                  </div>
                </div>
                <div className="tc-snapshot-field" style={{ gridColumn: "1 / -1", borderTop: "1px solid var(--line)", paddingTop: 10, marginTop: 2 }}>
                  <span className="call-detail-label">Last assigned</span>
                  <span className="call-detail-value text-mono-sm" style={{ fontSize: 11, color: "var(--muted)" }}>{agentInfo.last_assigned_at ? new Date(agentInfo.last_assigned_at).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "Never"}</span>
                </div>
                <div className="tc-snapshot-field" style={{ gridColumn: "1 / -1" }}>
                  <span className="call-detail-label">Agent ID</span>
                  <span className="call-detail-value text-mono-sm" style={{ fontSize: 10, color: "var(--muted)", wordBreak: "break-all" }}>{agentInfo.id}</span>
                </div>
              </div>

              <div className="tc-snapshot-actions">
                <Link href="/dashboard/settings" className="btn btn-sm btn-ghost" style={{ flex: 1, fontSize: 11 }}>
                  Settings
                </Link>
                <a href="#tc-states" className="btn btn-sm btn-secondary" style={{ flex: 1, fontSize: 11 }}>
                  Edit states
                </a>
              </div>

              {!pstnForwardingOk && (
                <p className="text-mono-sm" style={{ margin: "10px 0 0", fontSize: 11, color: "#fbbf24", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.18)", padding: "8px 10px", borderRadius: 8 }}>
                  PSTN fallback is selected but no forwarding number is set — routing may fail. Contact admin.
                </p>
              )}
            </section>
          )}

          {/* States Editor */}
          {agentId && (
            <section id="tc-states" className="card card--spacious tc-card" aria-labelledby="tc-states-title">
              <div className="tc-card__head">
                <h2 id="tc-states-title" style={{ margin: 0, font: "600 14px var(--serif)", letterSpacing: "-0.02em" }}>Licensed States</h2>
                {!editingStates ? (
                  <button className="btn btn-sm btn-ghost" onClick={() => { setStatesDraft([...(agentInfo?.states ?? [])]); setEditingStates(true); }} style={{ fontSize: 11, padding: "6px 10px" }}>
                    Edit
                  </button>
                ) : null}
              </div>

              {editingStates ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <p className="text-muted" style={{ fontSize: 11, margin: 0, lineHeight: 1.5 }}>
                    Pick states you are licensed to handle. Leave empty for “any state”. Used for state-wise routing — only calls from these states will route to you.
                  </p>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", maxHeight: 220, overflowY: "auto", padding: 10, border: "1px solid var(--line)", borderRadius: 10, background: "rgba(255,255,255,0.02)" }}>
                    {US_STATES.map((s) => (
                      <button
                        key={s.code}
                        type="button"
                        className={statesDraft.includes(s.code) ? "badge badge-success" : "badge"}
                        onClick={() => toggleState(s.code)}
                        style={{ cursor: "pointer", border: 0, fontFamily: "var(--mono)", fontSize: 10, padding: "5px 8px" }}
                        title={s.name}
                        aria-pressed={statesDraft.includes(s.code)}
                      >
                        {s.code}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button className="btn btn-primary btn-sm" onClick={saveStates} disabled={savingStates} aria-busy={savingStates}>{savingStates ? "Saving…" : "Save states"}</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditingStates(false)}>Cancel</button>
                    {statesDraft.length > 0 && <button className="btn btn-ghost btn-sm" onClick={() => setStatesDraft([])}>Clear</button>}
                  </div>
                  <p className="text-mono-sm" style={{ fontSize: 10, color: "var(--muted)", margin: 0 }}>{statesDraft.length} selected · {statesDraft.length === 0 ? "Any state" : statesDraft.join(", ").slice(0, 60) + (statesDraft.join(", ").length > 60 ? "…" : "")}</p>
                </div>
              ) : (
                <>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {agentInfo?.states?.length ? agentInfo.states.map((c: string) => <span key={c} className="badge badge-info" style={{ fontSize: 10 }}>{c}</span>) : <span className="text-mono-sm" style={{ fontSize: 11, color: "var(--muted)" }}>Any state (no restriction)</span>}
                  </div>
                  <p className="text-muted" style={{ fontSize: 11, margin: "10px 0 0", lineHeight: 1.5 }}>
                    State filter is live for routing. Ask admin to adjust campaign allowed states if you are not receiving calls.
                  </p>
                </>
              )}
            </section>
          )}

          {!agentId && (
            <section className="card card--spacious tc-card">
              <h2 style={{ margin: 0, font: "600 14px var(--serif)" }}>No agent profile</h2>
              <p className="text-muted" style={{ fontSize: 12, marginTop: 8, lineHeight: 1.6 }}>Create your agent profile to configure states and verify devices. An admin must approve you before routing begins.</p>
            </section>
          )}
        </div>
      </div>

      {error && <p className="form-error" style={{ marginTop: 4, padding: "10px 12px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.18)", borderRadius: 8 }}>{error}</p>}

      {/* BOTTOM: Recent Calls */}
      <section className="card card--table tc-calls-card" aria-labelledby="tc-calls-title" style={{ overflow: "hidden" }}>
        <div className="card-header" style={{ gap: 16, alignItems: "center" }}>
          <div style={{ flex: "1 1 160px", minWidth: 0 }}>
            <h2 id="tc-calls-title" style={{ margin: 0, font: "600 16px var(--serif)", letterSpacing: "-0.02em" }}>Recent Calls</h2>
            <p className="text-muted" style={{ margin: "4px 0 0", fontSize: 11 }}>Your last routed calls. Search by ID, hash, state or campaign.</p>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", flex: "1 1 280px", justifyContent: "flex-end" }}>
            <div style={{ position: "relative", flex: "1 1 200px", maxWidth: 280 }}>
              <input
                className="input"
                type="search"
                placeholder="Search calls…"
                value={callSearch}
                onChange={(e) => setCallSearch(e.target.value)}
                aria-label="Search calls"
                style={{ minWidth: 0, paddingLeft: 36 }}
              />
              <span aria-hidden style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", fontSize: 12 }}>⌕</span>
            </div>
            <span className="text-mono-sm" style={{ whiteSpace: "nowrap", fontSize: 11, color: "var(--muted)", border: "1px solid var(--line)", padding: "6px 10px", borderRadius: 999, background: "rgba(255,255,255,0.02)" }}>
              {filteredCalls.length} call(s){callDebounced ? " · filtered" : ""}{filteredCalls.length > PAGE_SIZE ? ` · page ${callPage}/${callTotalPages}` : ""}
            </span>
          </div>
        </div>

        <div className="data-table-wrap" style={{ borderTop: "1px solid var(--line)" }}>
          {filteredCalls.length === 0 ? (
            <div className="empty-state" style={{ padding: "36px 24px" }}>
              <div style={{ width: 48, height: 48, borderRadius: 999, display: "grid", placeItems: "center", background: "rgba(168,85,247,0.10)", border: "1px solid rgba(168,85,247,0.18)", color: "var(--acid)", fontSize: 20, marginBottom: 12 }} aria-hidden>◯</div>
              <p style={{ margin: 0, font: "600 14px var(--serif)", color: "var(--ink)" }}>{calls.length === 0 ? "No calls yet" : `No calls match “${callDebounced}”`}</p>
              <p style={{ margin: "6px 0 0", fontSize: 12, maxWidth: 420, lineHeight: 1.6 }}>
                {calls.length === 0 ? "Once you go online, inbound calls routed to you will appear here. Test devices and go online to start." : "Try a different search or clear the filter to see all calls."}
              </p>
              {callDebounced && <button className="btn btn-sm btn-ghost" onClick={() => setCallSearch("")} style={{ marginTop: 12, fontSize: 11 }}>Clear search</button>}
            </div>
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
      </section>
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
