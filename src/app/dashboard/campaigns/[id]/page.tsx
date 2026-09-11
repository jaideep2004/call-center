"use client";

import { useState, useEffect, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { showToast } from "@/lib/use-toast";
import { usePublishers } from "@/features/publishers/use-publishers";

interface CampaignDetail {
  id: string;
  name: string;
  status: string;
  routing_strategy: string;
  price_cents: number;
  min_connected_seconds: number;
  buffer_seconds: number;
  allowed_endpoints: string[];
  record_calls: boolean;
  consent_policy: Record<string, unknown>;
  publisher_id: string | null;
  rtb_enabled: boolean;
  rtb_postback_key_encrypted: string | null;
  retreaver_cid: string | null;
  created_at: string;
}

const STRATEGY_LABELS: Record<string, string> = {
  priority: "Priority",
  round_robin: "Round robin",
};
const STATUS_COLORS: Record<string, string> = {
  draft: "",
  active: "badge-success",
  paused: "",
  archived: "",
};

const TABS = [
  { key: "general", label: "General" },
  { key: "publishers", label: "Publishers" },
  { key: "bidding", label: "Bidding" },
  { key: "rtb", label: "RTB & Numbers" },
  { key: "assignments", label: "Assignments" },
] as const;
type TabKey = typeof TABS[number]["key"];
const TAB_KEYS = new Set(TABS.map((t) => t.key));

function CampaignDetailInner() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const rawTab = searchParams.get("tab");
  const activeTab: TabKey = (rawTab && TAB_KEYS.has(rawTab as TabKey) ? rawTab : "general") as TabKey;

  const { publishers } = usePublishers();
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [editName, setEditName] = useState("");

  const [assignments, setAssignments] = useState<{
    agencies: { id: string; name: string }[];
    agents: { id: string; name: string }[];
    assigned_agency_ids: string[];
    assigned_agent_ids: string[];
  } | null>(null);
  const [campaignPublishers, setCampaignPublishers] = useState<string[]>([]);
  const [publishersSaving, setPublishersSaving] = useState(false);
  const [assignmentLoading, setAssignmentLoading] = useState(true);
  const [assignmentSaving, setAssignmentSaving] = useState(false);
  const [rtbKey, setRtbKey] = useState("");
  const [showRtbKey, setShowRtbKey] = useState(false);
  const [rtbAutoLoading, setRtbAutoLoading] = useState(false);
  const [generatedRtbUrl, setGeneratedRtbUrl] = useState<string | null>(null);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [deploying, setDeploying] = useState(false);
  const [retreaverNumbers, setRetreaverNumbers] = useState<
    { id: number; number: string | null; toll_free: boolean; afid: string | null; sid: string | null }[]
  >([]);
  const [numbersLoading, setNumbersLoading] = useState(false);

  const [bidOverride, setBidOverride] = useState<{
    price_cents: number | null;
    payout_cents: number | null;
    note: string | null;
  } | null>(null);
  const [bidPrice, setBidPrice] = useState("");
  const [bidPayout, setBidPayout] = useState("");
  const [bidNote, setBidNote] = useState("");
  const [bidSaving, setBidSaving] = useState(false);

  function setTab(key: TabKey) {
    const qs = new URLSearchParams(searchParams.toString());
    qs.set("tab", key);
    router.push(`/dashboard/campaigns/${id}?${qs.toString()}`, { scroll: false });
  }

  useEffect(() => {
    fetch(`/api/v1/campaigns/${id}/bid`).then(async (res) => {
      if (res.ok) {
        const body = await res.json();
        const o = body.data?.override ?? null;
        setBidOverride(o);
        if (o) {
          setBidPrice(o.price_cents != null ? String(o.price_cents / 100) : "");
          setBidPayout(o.payout_cents != null ? String(o.payout_cents / 100) : "");
          setBidNote(o.note ?? "");
        }
      }
    }).catch(() => {});
  }, [id]);

  async function saveBid() {
    setBidSaving(true);
    try {
      const res = await fetch(`/api/v1/campaigns/${id}/bid`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          price_cents: bidPrice === "" ? null : Math.round(parseFloat(bidPrice) * 100),
          payout_cents: bidPayout === "" ? null : Math.round(parseFloat(bidPayout) * 100),
          note: bidNote || null,
        }),
      });
      const body = await res.json();
      if (res.ok) {
        setBidOverride(body.data);
        showToast("Bid override updated — effective immediately", "success");
      } else {
        showToast(body.message ?? "Bid update failed", "error");
      }
    } catch {
      showToast("Network error", "error");
    } finally {
      setBidSaving(false);
    }
  }

  async function clearBid() {
    setBidSaving(true);
    try {
      const res = await fetch(`/api/v1/campaigns/${id}/bid`, { method: "DELETE" });
      if (res.ok) {
        setBidOverride(null);
        setBidPrice("");
        setBidPayout("");
        setBidNote("");
        showToast("Bid override cleared", "success");
      }
    } catch {
      showToast("Network error", "error");
    } finally {
      setBidSaving(false);
    }
  }

  useEffect(() => {
    fetch(`/api/v1/campaigns/${id}`).then(async (res) => {
      if (res.ok) {
        const body = await res.json();
        setCampaign(body.data);
      }
      setLoading(false);
    });
  }, [id]);

  useEffect(() => {
    fetch(`/api/v1/campaigns/${id}/assignments`).then(async (res) => {
      if (res.ok) {
        const body = await res.json();
        setAssignments(body.data);
      }
      setAssignmentLoading(false);
    }).catch(() => setAssignmentLoading(false));
  }, [id]);

  useEffect(() => {
    fetch(`/api/v1/campaigns/${id}/publishers`).then(async (res) => {
      if (res.ok) {
        const body = await res.json();
        setCampaignPublishers(body.data?.publisher_ids ?? []);
      }
    }).catch(() => {});
  }, [id]);

  async function savePublishers() {
    setPublishersSaving(true);
    try {
      const res = await fetch(`/api/v1/campaigns/${id}/publishers`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publisher_ids: campaignPublishers }),
      });
      if (res.ok) {
        showToast("Publishers updated", "success");
        const cr = await fetch(`/api/v1/campaigns/${id}`);
        if (cr.ok) {
          const b = await cr.json();
          setCampaign(b.data);
        }
      } else {
        const b = await res.json();
        showToast(b.message ?? "Failed to update publishers", "error");
      }
    } catch {
      showToast("Network error", "error");
    }
    setPublishersSaving(false);
  }

  function toggleAssignment(kind: "agency" | "agent", value: string) {
    if (!assignments) return;
    const key = kind === "agency" ? "assigned_agency_ids" : "assigned_agent_ids";
    const arr = assignments[key];
    setAssignments({
      ...assignments,
      [key]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value],
    });
  }

  async function saveAssignments() {
    if (!assignments) return;
    setAssignmentSaving(true);
    try {
      const res = await fetch(`/api/v1/campaigns/${id}/assignments`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agency_ids: assignments.assigned_agency_ids,
          agent_ids: assignments.assigned_agent_ids,
        }),
      });
      if (res.ok) {
        showToast("Assignments saved", "success");
      } else {
        const body = await res.json();
        showToast(body.message ?? "Failed to save assignments", "error");
      }
    } catch {
      showToast("Network error saving assignments", "error");
    }
    setAssignmentSaving(false);
  }

  async function update(field: string, value: unknown) {
    setSaving(field);
    try {
      const res = await fetch(`/api/v1/campaigns/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      if (res.ok) {
        const body = await res.json();
        setCampaign(body.data);
        showToast(`${field} updated`, "success");
      } else {
        const body = await res.json();
        showToast(body.message ?? `Failed to update ${field}`, "error");
      }
    } catch {
      showToast(`Network error updating ${field}`, "error");
    }
    setSaving(null);
  }

  function toggleArray(
    field: "allowed_endpoints",
    value: string,
  ) {
    if (!campaign) return;
    const arr = campaign[field];
    update(
      field,
      arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value],
    );
  }

  async function handleRename() {
    if (!campaign || !editName.trim()) return;
    await update("name", editName.trim());
    setEditingName(false);
  }

  async function loadRetreaverNumbers() {
    setNumbersLoading(true);
    try {
      const res = await fetch(`/api/v1/campaigns/${id}/retreaver/numbers`);
      if (res.ok) {
        const body = await res.json();
        setRetreaverNumbers(body.data ?? []);
      } else {
        const body = await res.json();
        showToast(body.message ?? "Failed to load numbers", "error");
      }
    } catch {
      showToast("Network error loading numbers", "error");
    }
    setNumbersLoading(false);
  }

  async function deployToRetreaver() {
    setDeploying(true);
    try {
      const res = await fetch(`/api/v1/campaigns/${id}/retreaver`, { method: "POST" });
      const body = await res.json();
      if (res.ok) {
        setCampaign(body.data);
        showToast("Campaign deployed to Retreaver", "success");
      } else {
        showToast(body.message ?? "Deploy failed", "error");
      }
    } catch {
      showToast("Network error deploying campaign", "error");
    }
    setDeploying(false);
  }

  async function handleAutoCreateRtbKey() {
    if (rtbAutoLoading) return;
    setRtbAutoLoading(true);
    try {
      const res = await fetch(`/api/v1/campaigns/${id}/retreaver/rtb-key`, { method: "POST" });
      const body = await res.json().catch(() => ({} as { message?: string; data?: { key: string; rtbUrl: string } }));
      if (res.ok && (body as { data?: { key: string; rtbUrl: string } }).data) {
        const data = (body as { data: { key: string; rtbUrl: string; campaign?: CampaignDetail } }).data;
        setGeneratedKey(data.key);
        setGeneratedRtbUrl(data.rtbUrl);
        setRtbKey(data.key);
        if (data.campaign) setCampaign(data.campaign as CampaignDetail);
        else if (campaign) setCampaign({ ...campaign, rtb_postback_key_encrypted: "***", rtb_enabled: true });
        showToast("RTB key auto-created - copy the URL below", "success");
      } else {
        showToast((body as { message?: string }).message ?? "Failed to auto-create RTB key", "error");
      }
    } catch {
      showToast("Network error creating RTB key", "error");
    }
    setRtbAutoLoading(false);
  }

  if (loading)
    return (
      <div className='dashboard-page'>
        <div className='stack' style={{ gap: 16 }}>
          <div className='skeleton skeleton-text' style={{ width: 200 }} />
          <div className='skeleton skeleton-text' style={{ width: 320 }} />
          <div
            className='split'
            style={{ "--gap": "var(--space-5)" } as React.CSSProperties}>
            <div
              className='skeleton skeleton-text'
              style={{ height: 200, flex: 2 }}
            />
            <div
              className='skeleton skeleton-text'
              style={{ height: 200, flex: 1 }}
            />
          </div>
        </div>
      </div>
    );

  if (!campaign)
    return (
      <div className='dashboard-page'>
        <div
          className='card'
          style={{ padding: "var(--space-8)", textAlign: "center" }}>
          <p
            style={{
              font: "500 24px var(--serif)",
              margin: "0 0 var(--space-4)",
            }}>
            Campaign not found
          </p>
          <button
            className='btn btn-secondary'
            onClick={() => router.push("/dashboard/campaigns")}>
            Back to campaigns
          </button>
        </div>
      </div>
    );

  return (
    <div className='dashboard-page'>
      <div className='dashboard-page-header'>
        <div style={{ minWidth: 0 }}>
          <p className='eyebrow'>
            <i /> OPERATIONS / CAMPAIGN <span style={{ color: "var(--muted)", marginLeft: 8 }}>• {TABS.find((t) => t.key === activeTab)?.label.toUpperCase()}</span>
          </p>
          {editingName ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginTop: 8,
                flexWrap: "wrap",
              }}>
              <input
                className='input'
                type='text'
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleRename()}
                autoFocus
                style={{ fontSize: 24, fontWeight: 500, maxWidth: 400 }}
              />
              <button
                className='btn btn-primary'
                onClick={handleRename}
                disabled={saving === "name"}>
                {saving === "name" ? <span className='spinner' /> : "Save"}
              </button>
              <button
                className='btn btn-secondary'
                onClick={() => setEditingName(false)}>
                Cancel
              </button>
            </div>
          ) : (
            <h1 style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{campaign.name}</span>
              <button
                className='quiet-button'
                onClick={() => {
                  setEditName(campaign.name);
                  setEditingName(true);
                }}
                style={{ fontSize: 14 }}>
                &#9998;
              </button>
            </h1>
          )}
        </div>
        <div className='stack-h' style={{ gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {campaign.retreaver_cid ? (
            <span className='badge badge-success'>
              Deployed on Retreaver · cid {campaign.retreaver_cid}
            </span>
          ) : (
            <span className='badge'>Not on Retreaver</span>
          )}
          <button
            className='btn btn-primary'
            onClick={deployToRetreaver}
            disabled={deploying}>
            {deploying ? <span className='spinner' /> : "Deploy to Retreaver"}
          </button>
          <button
            className='btn btn-secondary'
            onClick={() => router.push("/dashboard/campaigns")}>
            Back
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div
        role='tablist'
        aria-label='Campaign sections'
        style={{
          display: "flex",
          gap: 6,
          borderBottom: "1px solid var(--line)",
          paddingBottom: 0,
          overflowX: "auto",
          scrollbarWidth: "none",
          marginTop: 4,
        }}
      >
        {TABS.map((t) => {
          const isActive = activeTab === t.key;
          return (
            <button
              key={t.key}
              role='tab'
              aria-selected={isActive}
              onClick={() => setTab(t.key as TabKey)}
              style={{
                padding: "10px 14px 11px",
                font: "600 11px var(--mono)",
                letterSpacing: "0.7px",
                textTransform: "uppercase",
                whiteSpace: "nowrap",
                border: 0,
                borderBottom: isActive ? "2px solid var(--acid)" : "2px solid transparent",
                background: isActive ? "rgba(168,85,247,.12)" : "transparent",
                color: isActive ? "var(--ink)" : "var(--muted)",
                borderRadius: "8px 8px 0 0",
                cursor: "pointer",
                marginBottom: -1,
                transition: "all 140ms ease",
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      <p className="text-muted text-mono-sm" style={{ fontSize: 10, margin: "6px 2px 0", letterSpacing: "0.4px" }}>
        {activeTab === "general" && "Routing, price, status, and recording — the campaign core."}
        {activeTab === "publishers" && "Multi-select which publishers can send traffic — uses campaign_publishers."}
        {activeTab === "bidding" && "Manual bid overrides apply immediately to billing and payout."}
        {activeTab === "rtb" && "Real-time bidding and Retreaver intake numbers."}
        {activeTab === "assignments" && "Agencies, agents, endpoints, and policy."}
      </p>

      {/* Tab contents */}
      <div style={{ marginTop: "var(--space-5)" }}>
        {activeTab === "general" && (
          <div className='stack' style={{ gap: "var(--space-5)", maxWidth: 760 }}>
            <section className='card' style={{ padding: "var(--space-6)" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "var(--space-4)",
                }}>
                <h2
                  style={{
                    font: "500 18px var(--serif)",
                    margin: 0,
                    letterSpacing: "-0.03em",
                  }}>
                  General
                </h2>
                <span
                  className={`badge ${STATUS_COLORS[campaign.status]}`}
                  style={{ textTransform: "uppercase", fontSize: 10 }}>
                  {campaign.status}
                </span>
              </div>
              <dl className='data-list'>
                <dt>Routing</dt>
                <dd style={{ margin: "10px 0px" }}>
                  <select
                    className='input'
                    value={campaign.routing_strategy}
                    onChange={(e) => update("routing_strategy", e.target.value)}
                    style={{ maxWidth: 160 }}>
                    {Object.entries(STRATEGY_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                </dd>
                <dt>Price</dt>
                <dd style={{ margin: "10px 0px" }}>
                  <span className='text-mono-sm' style={{ marginRight: 4 }}>
                    $
                  </span>
                  <input
                    className='input'
                    type='number'
                    min='0'
                    step='0.01'
                    value={(campaign.price_cents ?? 0) / 100}
                    onChange={(e) =>
                      update(
                        "price_cents",
                        Math.round((parseFloat(e.target.value) || 0) * 100),
                      )
                    }
                    style={{ maxWidth: 110 }}
                  />
                  <span
                    className='text-muted text-mono-sm'
                    style={{ marginLeft: 6, fontSize: 10 }}>
                    / qualified call
                  </span>
                </dd>
                <dt>Retreaver CID</dt>
                <dd style={{ margin: "10px 0px" }}>
                  <input
                    className='input'
                    type='text'
                    placeholder='e.g. 9872'
                    value={campaign.retreaver_cid ?? ""}
                    onChange={(e) =>
                      update("retreaver_cid", e.target.value || null)
                    }
                    style={{ maxWidth: 160 }}
                  />
                  <span
                    className='text-muted text-mono-sm'
                    style={{ marginLeft: 6, fontSize: 10 }}>
                    Retreaver campaign id (auto-linked)
                  </span>
                </dd>
                <dt>Min connect</dt>
                <dd style={{ margin: "10px 0px" }}>
                  <input
                    className='input'
                    type='number'
                    min='0'
                    value={campaign.min_connected_seconds}
                    onChange={(e) =>
                      update(
                        "min_connected_seconds",
                        parseInt(e.target.value) || 0,
                      )
                    }
                    style={{ maxWidth: 100 }}
                  />
                  <span
                    className='text-muted text-mono-sm'
                    style={{ marginLeft: 6, fontSize: 10 }}>
                    seconds
                  </span>
                </dd>
                <dt>Buffer</dt>
                <dd style={{ margin: "10px 0px" }}>
                  <input
                    className='input'
                    type='number'
                    min='0'
                    value={campaign.buffer_seconds}
                    onChange={(e) =>
                      update("buffer_seconds", parseInt(e.target.value) || 0)
                    }
                    style={{ maxWidth: 100 }}
                  />
                  <span className='text-muted text-mono-sm' style={{ marginLeft: 6, fontSize: 10 }}>seconds</span>
                </dd>
                <dt>Record calls</dt>
                <dd style={{ margin: "10px 0px" }}>
                  <label className='toggle'>
                    <input
                      type='checkbox'
                      checked={campaign.record_calls}
                      onChange={(e) => update("record_calls", e.target.checked)}
                    />
                    <span>{campaign.record_calls ? "Yes" : "No"}</span>
                  </label>
                </dd>
                <dt>Status</dt>
                <dd style={{ margin: "10px 0px" }}>
                  <select
                    className='input'
                    value={campaign.status}
                    onChange={(e) => update("status", e.target.value)}
                    style={{ maxWidth: 120 }}>
                    <option value='draft'>Draft</option>
                    <option value='active'>Active</option>
                    <option value='paused'>Paused</option>
                    <option value='archived'>Archived</option>
                  </select>
                </dd>
                <dt>Created</dt>
                <dd className='text-mono-sm' style={{ margin: "10px 0px" }}>
                  {new Date(campaign.created_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </dd>
              </dl>
              {saving && (
                <p
                  className='text-muted text-mono-sm'
                  style={{ fontSize: 10, margin: "var(--space-3) 0 0" }}>
                  Saving {saving}...
                </p>
              )}
            </section>

            <section className='card' style={{ padding: "var(--space-6)" }}>
              <h2
                style={{
                  font: "500 18px var(--serif)",
                  margin: "0 0 var(--space-4)",
                  letterSpacing: "-0.03em",
                }}>
                Endpoints
              </h2>
              <div className='stack' style={{ gap: 8 }}>
                {["webrtc", "pstn"].map((ep) => (
                  <label
                    key={ep}
                    className='toggle'
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      cursor: "pointer",
                    }}>
                    <input
                      type='checkbox'
                      checked={campaign.allowed_endpoints.includes(ep)}
                      onChange={() => toggleArray("allowed_endpoints", ep)}
                    />
                    <span
                      style={{
                        font: "500 13px var(--mono)",
                        textTransform: "uppercase",
                      }}>
                      {ep}
                    </span>
                    <span className='text-muted' style={{ fontSize: 10 }}>
                      {ep === "webrtc" ? "Browser-based calls" : "Phone network"}
                    </span>
                  </label>
                ))}
              </div>
            </section>

            <section className='card' style={{ padding: "var(--space-6)" }}>
              <h2
                style={{
                  font: "500 18px var(--serif)",
                  margin: "0 0 var(--space-4)",
                  letterSpacing: "-0.03em",
                }}>
                Consent Policy
              </h2>
              <pre
                className='text-mono-sm'
                style={{
                  fontSize: 11,
                  color: "var(--muted)",
                  overflow: "auto",
                  maxHeight: 200,
                }}>
                {JSON.stringify(campaign.consent_policy, null, 2)}
              </pre>
            </section>

            <section className='card' style={{ padding: "var(--space-6)" }}>
              <h2
                style={{
                  font: "500 18px var(--serif)",
                  margin: "0 0 var(--space-4)",
                  letterSpacing: "-0.03em",
                }}>
                Danger Zone
              </h2>
              <p
                className='text-muted text-mono-sm'
                style={{ fontSize: 11, marginBottom: "var(--space-3)" }}>
                Archiving hides the campaign from active views.
              </p>
              <button
                className='btn btn-secondary'
                onClick={() => update("status", "archived")}
                style={{
                  width: "100%",
                  justifyContent: "center",
                  borderColor: "#704536",
                  color: "#e89b79",
                }}>
                {saving === "status" ? (
                  <span className='spinner' />
                ) : (
                  "Archive campaign"
                )}
              </button>
            </section>
          </div>
        )}

        {activeTab === "publishers" && (
          <section className='card' style={{ padding: "var(--space-6)", maxWidth: 560 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "var(--space-4)" }}>
              <h2 style={{ font: "500 18px var(--serif)", margin: 0, letterSpacing: "-0.03em" }}>Publishers</h2>
              <span className='badge' style={{ fontSize: 10 }}>{campaignPublishers.length} selected</span>
              <span className='text-muted text-mono-sm' style={{ marginLeft: "auto", fontSize: 10 }}>campaign_publishers join • multi</span>
            </div>
            <p className='text-muted' style={{ fontSize: 11, margin: "0 0 var(--space-4)", lineHeight: 1.6 }}>
              Select all publishers that can send traffic for this campaign. Stored in <span style={{ color: "var(--ink)", fontWeight: 600 }}>campaign_publishers</span> (legacy <span className="text-mono-sm">publisher_id</span> stays synced to first).
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 320, overflowY: "auto", border: "1px solid var(--line)", borderRadius: 10, padding: 12, background: "rgba(22,12,42,.35)" }}>
              {publishers.length === 0 ? (
                <span className='text-muted text-mono-sm' style={{ fontSize: 11 }}>No publishers yet — create one in Admin → Publishers.</span>
              ) : (
                publishers.map((p) => {
                  const checked = campaignPublishers.includes(p.id);
                  return (
                    <label key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, cursor: "pointer", padding: "7px 10px", borderRadius: 8, border: "1px solid " + (checked ? "rgba(168,85,247,.28)" : "transparent"), background: checked ? "rgba(168,85,247,.13)" : "transparent" }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const next = e.target.checked ? [...campaignPublishers, p.id] : campaignPublishers.filter((id) => id !== p.id);
                          setCampaignPublishers(next);
                        }}
                        style={{ accentColor: "var(--acid)" }}
                      />
                      <span style={{ fontWeight: checked ? 600 : 400 }}>{p.name}</span>
                      {checked && <span className='badge badge-success' style={{ marginLeft: "auto", fontSize: 9 }}>selected</span>}
                    </label>
                  );
                })
              )}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 14, alignItems: "center" }}>
              <button className="btn btn-primary" onClick={savePublishers} disabled={publishersSaving} style={{ minWidth: 136, justifyContent: "center" }}>
                {publishersSaving ? <span className="spinner" /> : "Save publishers"}
              </button>
              <span className='text-muted text-mono-sm' style={{ fontSize: 10 }}>Join table persists immediately; legacy publisher_id syncs to first.</span>
            </div>
          </section>
        )}

        {activeTab === "bidding" && (
          <section className='card' style={{ padding: "var(--space-6)", maxWidth: 640 }}>
            <h2
              style={{
                font: "500 18px var(--serif)",
                margin: "0 0 var(--space-4)",
                letterSpacing: "-0.03em",
              }}>
              Bidding
            </h2>
            <p className='text-muted' style={{ fontSize: 11, margin: "0 0 var(--space-4)" }}>
              Manual bid — applies immediately to billing and publisher payout. No schedule. Leave empty to use campaign price.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
              <label className='text-mono-sm' style={{ fontSize: 11, color: "var(--muted)" }}>$ / call
                <input
                  className='input'
                  type='number'
                  min='0'
                  step='0.01'
                  placeholder='agent price'
                  value={bidPrice}
                  onChange={(e) => setBidPrice(e.target.value)}
                  style={{ maxWidth: 120, marginLeft: 6, marginTop: 4, display: "block" }}
                />
              </label>
              <label className='text-mono-sm' style={{ fontSize: 11, color: "var(--muted)" }}>$ / payout
                <input
                  className='input'
                  type='number'
                  min='0'
                  step='0.01'
                  placeholder='publisher'
                  value={bidPayout}
                  onChange={(e) => setBidPayout(e.target.value)}
                  style={{ maxWidth: 120, marginLeft: 6, marginTop: 4, display: "block" }}
                />
              </label>
              <div style={{ display: "flex", gap: 8, alignSelf: "flex-end", marginBottom: 2 }}>
                <button className='btn btn-sm btn-primary' onClick={saveBid} disabled={bidSaving}>
                  {bidSaving ? "Saving..." : "Apply Bid"}
                </button>
                {bidOverride && (
                  <button className='btn btn-sm btn-secondary' onClick={clearBid} disabled={bidSaving}>Clear</button>
                )}
              </div>
            </div>
            <input
              className='input'
              type='text'
              placeholder='Bid note (e.g. low call volume — boost)'
              value={bidNote}
              onChange={(e) => setBidNote(e.target.value)}
              style={{ maxWidth: 420, marginTop: 12, display: "block" }}
            />
            {bidOverride && (
              <div style={{ marginTop: 14, padding: "10px 12px", borderRadius: 8, border: "1px solid rgba(168,85,247,.18)", background: "rgba(168,85,247,.08)" }}>
                <p className='text-mono-sm' style={{ fontSize: 11, margin: 0, color: "var(--muted)" }}>
                  Active override: <span style={{ color: "var(--ink)" }}>{bidOverride.price_cents != null ? `$${(bidOverride.price_cents/100).toFixed(2)}/call` : "—"}</span> • payout <span style={{ color: "var(--ink)" }}>{bidOverride.payout_cents != null ? `$${(bidOverride.payout_cents/100).toFixed(2)}` : "—"}</span> {bidOverride.note ? `• ${bidOverride.note}` : ""}
                </p>
              </div>
            )}
          </section>
        )}

        {activeTab === "rtb" && (
          <div className='stack' style={{ gap: "var(--space-5)", maxWidth: 720 }}>
            <section className='card' style={{ padding: "var(--space-6)" }}>
              <h2
                style={{
                  font: "500 18px var(--serif)",
                  margin: "0 0 var(--space-4)",
                  letterSpacing: "-0.03em",
                }}>
                RTB Bidding
              </h2>
              <dl className='data-list'>
                <dt>RTB enabled</dt>
                <dd style={{ margin: "10px 0px" }}>
                  <label className='toggle'>
                    <input
                      type='checkbox'
                      checked={campaign.rtb_enabled}
                      onChange={(e) => update("rtb_enabled", e.target.checked)}
                    />
                    <span>{campaign.rtb_enabled ? "Yes" : "No"}</span>
                  </label>
                  <p className='text-muted' style={{ fontSize: 11, margin: "8px 0 0" }}>
                    Routes Retreaver bid requests to this campaign&apos;s Telnyx number.
                  </p>
                </dd>
                <dt>Postback key</dt>
                <dd style={{ margin: "10px 0px" }}>
                  {campaign.rtb_postback_key_encrypted ? (
                    <div className='stack-h' style={{ gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <span className='badge badge-success' style={{ fontSize: 10 }}>
                        Configured (encrypted)
                      </span>
                      <button
                        className='quiet-button'
                        onClick={() => setShowRtbKey(!showRtbKey)}
                        style={{ fontSize: 12 }}>
                        {showRtbKey ? "Hide" : "Replace"}
                      </button>
                      {showRtbKey && (
                        <>
                          <input
                            className='input'
                            type='text'
                            value={rtbKey}
                            onChange={(e) => setRtbKey(e.target.value)}
                            placeholder='New Retreaver postback key'
                            style={{ maxWidth: 200 }}
                          />
                          <button
                            className='btn btn-primary btn-sm'
                            onClick={() => {
                              if (!rtbKey.trim()) return;
                              update("rtb_postback_key", rtbKey.trim());
                              setRtbKey("");
                              setShowRtbKey(false);
                            }}
                            disabled={saving === "rtb_postback_key"}>
                            {saving === "rtb_postback_key" ? <span className='spinner' /> : "Save"}
                          </button>
                          <button
                            className='btn btn-secondary btn-sm'
                            onClick={handleAutoCreateRtbKey}
                            disabled={rtbAutoLoading || saving === "rtb_postback_key"}
                            style={{ whiteSpace: "nowrap" }}>
                            {rtbAutoLoading ? <span className='spinner' /> : "Auto Create"}
                          </button>
                        </>
                      )}
                      {!showRtbKey && (
                        <button
                          className='btn btn-secondary btn-sm'
                          onClick={handleAutoCreateRtbKey}
                          disabled={rtbAutoLoading}
                          style={{ whiteSpace: "nowrap" }}>
                          {rtbAutoLoading ? <span className='spinner' /> : "Auto Create"}
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className='stack-h' style={{ gap: 8, flexWrap: "wrap" }}>
                      <input
                        className='input'
                        type='text'
                        value={rtbKey}
                        onChange={(e) => setRtbKey(e.target.value)}
                        placeholder='Retreaver postback key'
                        style={{ maxWidth: 200 }}
                      />
                      <button
                        className='btn btn-primary btn-sm'
                        onClick={() => {
                          if (!rtbKey.trim()) return;
                          update("rtb_postback_key", rtbKey.trim());
                          setRtbKey("");
                        }}
                        disabled={saving === "rtb_postback_key"}>
                        {saving === "rtb_postback_key" ? <span className='spinner' /> : "Save"}
                      </button>
                      <button
                        className='btn btn-secondary btn-sm'
                        onClick={handleAutoCreateRtbKey}
                        disabled={rtbAutoLoading || saving === "rtb_postback_key"}
                        style={{ whiteSpace: "nowrap" }}>
                        {rtbAutoLoading ? <span className='spinner' /> : "Auto Create"}
                      </button>
                    </div>
                  )}
                  <p className='text-muted' style={{ fontSize: 11, margin: "8px 0 0" }}>
                    Stored encrypted with ENCRYPTION_KEY. Never shown again after saving. <span style={{ color: "var(--ink)", fontWeight: 600 }}>Auto Create</span> generates a random 32-char hex for demo/testing; real Retreaver keys must be created in Retreaver UI for production RTB.
                  </p>
                  {(generatedKey || generatedRtbUrl) && (
                    <div style={{ marginTop: 12, padding: "12px 14px", borderRadius: 10, border: "1px solid rgba(168,85,247,.18)", background: "rgba(168,85,247,.08)", maxWidth: 560 }}>
                      <p className='text-mono-sm' style={{ fontSize: 11, margin: "0 0 6px", color: "var(--muted)", letterSpacing: "0.4px", textTransform: "uppercase" }}>Generated RTB credentials</p>
                      {generatedKey && (
                        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
                          <span className='text-mono-sm' style={{ fontSize: 12, color: "var(--ink)", wordBreak: "break-all", flex: 1 }}>key: {generatedKey}</span>
                          <button
                            className='btn btn-ghost btn-sm'
                            onClick={() => {
                              navigator.clipboard.writeText(generatedKey).then(() => showToast("Key copied", "success")).catch(() => showToast("Copy failed", "error"));
                            }}
                            style={{ fontSize: 11 }}>
                            Copy key
                          </button>
                        </div>
                      )}
                      {generatedRtbUrl && (
                        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                          <span className='text-mono-sm' style={{ fontSize: 11, color: "var(--ink)", wordBreak: "break-all", flex: 1, background: "rgba(0,0,0,.2)", padding: "6px 8px", borderRadius: 6 }}>{generatedRtbUrl}</span>
                          <button
                            className='btn btn-ghost btn-sm'
                            onClick={() => {
                              navigator.clipboard.writeText(generatedRtbUrl).then(() => showToast("RTB URL copied", "success")).catch(() => showToast("Copy failed", "error"));
                            }}
                            style={{ fontSize: 11 }}>
                            Copy URL
                          </button>
                        </div>
                      )}
                      <p className='text-muted text-mono-sm' style={{ fontSize: 10, margin: "8px 0 0" }}>Demo URL: replace YOUR_PUBLISHER_ID with your Retreaver afid. Real RTB still requires the key to exist in Retreaver’s UI.</p>
                    </div>
                  )}
                </dd>
              </dl>
            </section>

            <section className='card' style={{ padding: "var(--space-6)" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "var(--space-4)",
                }}>
                <h2
                  style={{
                    font: "500 18px var(--serif)",
                    margin: 0,
                    letterSpacing: "-0.03em",
                  }}>
                  Retreaver numbers
                </h2>
                {campaign.retreaver_cid && (
                  <button
                    className='btn btn-sm btn-secondary'
                    onClick={loadRetreaverNumbers}
                    disabled={numbersLoading}>
                    {numbersLoading ? <span className='spinner' /> : retreaverNumbers.length > 0 ? "Refresh" : "Load"}
                  </button>
                )}
              </div>
              {campaign.retreaver_cid ? (
                retreaverNumbers.length === 0 ? (
                  <p className='text-muted' style={{ fontSize: 12, margin: 0 }}>
                    {numbersLoading
                      ? "Fetching from Retreaver..."
                      : "No numbers fetched yet. Click Load to see the intake numbers attached to this campaign in Retreaver."}
                  </p>
                ) : (
                  <div className="data-table-wrap"><table className='data-table'>
                    <thead>
                      <tr>
                        <th>Number</th>
                        <th>afid</th>
                        <th>sid</th>
                      </tr>
                    </thead>
                    <tbody>
                      {retreaverNumbers.map((n) => (
                        <tr key={n.id}>
                          <td className='text-mono-sm'>
                            {n.number ?? "—"}
                            {n.toll_free && (
                              <span className='badge' style={{ marginLeft: 6 }}>
                                toll-free
                              </span>
                            )}
                          </td>
                          <td className='text-mono-sm'>{n.afid ?? "—"}</td>
                          <td className='text-mono-sm'>{n.sid ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table></div>
                )
              ) : (
                <p className='text-muted' style={{ fontSize: 12, margin: 0 }}>
                  Deploy to Retreaver or run the campaign sync to link this campaign first.
                </p>
              )}
            </section>
          </div>
        )}

        {activeTab === "assignments" && (
          <div className='stack' style={{ gap: "var(--space-5)", maxWidth: 720 }}>
            <section className='card' style={{ padding: "var(--space-6)" }}>
              <h2
                style={{
                  font: "500 18px var(--serif)",
                  margin: "0 0 var(--space-4)",
                  letterSpacing: "-0.03em",
                }}>
                Assignments
              </h2>
              {assignmentLoading ? (
                <div className='stack' style={{ gap: 8 }}>
                  <div className='skeleton skeleton-text' />
                  <div className='skeleton skeleton-text' />
                </div>
              ) : assignments ? (
                <div className='stack' style={{ gap: "var(--space-4)" }}>
                  <div>
                    <p
                      style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink)", marginBottom: 10, fontFamily: "var(--mono)" }}>
                      Agencies <span style={{ fontWeight: 400, color: "var(--muted)", textTransform: "none", letterSpacing: 0, fontSize: 11 }}>— all their agents get calls</span>
                    </p>
                    <div className='stack-h' style={{ gap: 8, flexWrap: "wrap" }}>
                      {assignments.agencies.map((a) => (
                        <button
                          key={a.id}
                          type='button'
                          className={
                            assignments.assigned_agency_ids.includes(a.id)
                              ? "badge badge-success"
                              : "badge"
                          }
                          onClick={() => toggleAssignment("agency", a.id)}
                          style={{
                            cursor: "pointer",
                            border: 0,
                            fontFamily: "var(--mono)",
                            fontSize: 12,
                            padding: "7px 12px",
                            fontWeight: assignments.assigned_agency_ids.includes(a.id) ? 700 : 500,
                          }}>
                          {a.name}
                        </button>
                      ))}
                      {assignments.agencies.length === 0 && (
                        <span className='text-muted' style={{ fontSize: 12 }}>
                          No agencies yet
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <p
                      style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink)", marginBottom: 10, fontFamily: "var(--mono)" }}>
                      Individual Agents <span style={{ fontWeight: 400, color: "var(--muted)", textTransform: "none", letterSpacing: 0, fontSize: 11 }}>— direct assignment</span>
                    </p>
                    <div className='stack-h' style={{ gap: 8, flexWrap: "wrap" }}>
                      {assignments.agents.map((a) => (
                        <button
                          key={a.id}
                          type='button'
                          className={
                            assignments.assigned_agent_ids.includes(a.id)
                              ? "badge badge-success"
                              : "badge"
                          }
                          onClick={() => toggleAssignment("agent", a.id)}
                          style={{
                            cursor: "pointer",
                            border: 0,
                            fontFamily: "var(--mono)",
                            fontSize: 12,
                            padding: "7px 12px",
                            fontWeight: assignments.assigned_agent_ids.includes(a.id) ? 700 : 500,
                          }}>
                          {a.name}
                        </button>
                      ))}
                      {assignments.agents.length === 0 && (
                        <span className='text-muted' style={{ fontSize: 12 }}>
                          No agents yet
                        </span>
                      )}
                    </div>
                  </div>
                  <div className='split' style={{ gap: 8, alignItems: "center" }}>
                    <button
                      className='btn btn-primary btn-sm'
                      onClick={saveAssignments}
                      disabled={assignmentSaving}>
                      {assignmentSaving ? <span className='spinner' /> : "Save assignments"}
                    </button>
                    <span className='text-muted' style={{ fontSize: 10 }}>
                      No selections = all agencies/agents eligible (open campaign).
                    </span>
                  </div>
                </div>
              ) : (
                <p className='text-muted' style={{ fontSize: 11 }}>
                  Could not load assignments.
                </p>
              )}
            </section>

            <section className='card' style={{ padding: "var(--space-6)" }}>
              <h2
                style={{
                  font: "500 18px var(--serif)",
                  margin: "0 0 var(--space-4)",
                  letterSpacing: "-0.03em",
                }}>
                Endpoints
              </h2>
              <div className='stack' style={{ gap: 8 }}>
                {["webrtc", "pstn"].map((ep) => (
                  <label
                    key={ep}
                    className='toggle'
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      cursor: "pointer",
                    }}>
                    <input
                      type='checkbox'
                      checked={campaign.allowed_endpoints.includes(ep)}
                      onChange={() => toggleArray("allowed_endpoints", ep)}
                    />
                    <span
                      style={{
                        font: "500 13px var(--mono)",
                        textTransform: "uppercase",
                      }}>
                      {ep}
                    </span>
                    <span className='text-muted' style={{ fontSize: 10 }}>
                      {ep === "webrtc" ? "Browser-based calls" : "Phone network"}
                    </span>
                  </label>
                ))}
              </div>
            </section>

            <section className='card' style={{ padding: "var(--space-6)" }}>
              <h2
                style={{
                  font: "500 18px var(--serif)",
                  margin: "0 0 var(--space-4)",
                  letterSpacing: "-0.03em",
                }}>
                Consent Policy
              </h2>
              <pre
                className='text-mono-sm'
                style={{
                  fontSize: 11,
                  color: "var(--muted)",
                  overflow: "auto",
                  maxHeight: 200,
                }}>
                {JSON.stringify(campaign.consent_policy, null, 2)}
              </pre>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CampaignDetailPage() {
  return (
    <Suspense fallback={<div className="dashboard-page"><div className="skeleton skeleton-text" /></div>}>
      <CampaignDetailInner />
    </Suspense>
  );
}
