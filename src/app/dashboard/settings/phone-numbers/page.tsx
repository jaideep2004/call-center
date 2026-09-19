"use client";

import { Suspense, useState, useEffect, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import DataTable from "@/components/data-table";
import type { Column } from "@/components/data-table";
import Modal from "@/components/modal";
import { showToast } from "@/lib/use-toast";

interface PhoneNumber {
  id: string;
  campaign_id: string | null;
  provider: string;
  e164: string;
  status: string;
}

interface Campaign {
  id: string;
  name: string;
  display_code?: string | null;
}

const PAGE_SIZE = 10;

function PhoneNumbersInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") ?? "";
  const initialPage = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);

  const [numbers, setNumbers] = useState<PhoneNumber[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [number, setNumber] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [provider, setProvider] = useState("telnyx");
  const [saving, setSaving] = useState(false);
  const [searchInput, setSearchInput] = useState(initialQ);
  const [debouncedQ, setDebouncedQ] = useState(initialQ);
  const [page, setPage] = useState(initialPage);
  const hasMounted = useRef(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/v1/phone-numbers").then((r) => r.ok ? r.json() : { data: [] }),
      fetch("/api/v1/campaigns").then((r) => r.ok ? r.json() : { data: [] }),
    ]).then(([numBody, campBody]) => {
      setNumbers(numBody.data ?? []);
      setCampaigns(campBody.data ?? []);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      const trimmed = searchInput.trim().toLowerCase();
      if (trimmed !== debouncedQ) { setDebouncedQ(trimmed); setPage(1); }
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput, debouncedQ]);

  useEffect(() => {
    if (!hasMounted.current) { hasMounted.current = true; return; }
    const p = new URLSearchParams();
    if (debouncedQ) p.set("q", debouncedQ);
    if (page > 1) p.set("page", String(page));
    const qs = p.toString();
    if (qs === searchParams.toString()) return;
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
  }, [debouncedQ, page, router, searchParams]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!number || !campaignId) return;
    setSaving(true);
    try {
      const res = await fetch("/api/v1/phone-numbers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number, campaign_id: campaignId, provider }),
      });
      const body = await res.json();
      if (res.ok) {
        showToast("Phone number added", "success");
        setNumbers((prev) => [...prev, body.data]);
        setNumber("");
        setCampaignId("");
        setShowForm(false);
      } else {
        showToast(body.message ?? "Failed to add number", "error");
      }
    } catch { showToast("Network error", "error"); }
    setSaving(false);
  }

  const campaignMap = useMemo(() => {
    const m: Record<string, { name: string; display_code?: string | null }> = {};
    for (const c of campaigns) m[c.id] = { name: c.name, display_code: c.display_code };
    return m;
  }, [campaigns]);

  const filtered = useMemo(() => {
    if (!debouncedQ) return numbers;
    const q = debouncedQ;
    return numbers.filter((n) => n.e164.toLowerCase().includes(q) || n.provider.toLowerCase().includes(q) || (n.campaign_id ? (campaignMap[n.campaign_id]?.name ?? n.campaign_id) : "unassigned").toLowerCase().includes(q) || n.status.toLowerCase().includes(q));
  }, [numbers, debouncedQ, campaignMap]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page]);

  async function moveNumber(id: string, campaignId: string | null) {
    try {
      const res = await fetch(`/api/v1/phone-numbers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaign_id: campaignId }),
      });
      const body = await res.json();
      if (res.ok) {
        setNumbers((prev) => prev.map((n) => (n.id === id ? body.data : n)));
        showToast(campaignId ? "Number moved" : "Number unassigned — parked as spare", "success");
      } else {
        showToast(body.message ?? "Failed to move number", "error");
      }
    } catch {
      showToast("Network error moving number", "error");
    }
  }

  const columns: Column<PhoneNumber>[] = [
    { key: "e164", header: "Number", render: (n) => <span className="text-mono-sm" style={{ fontWeight: 500 }}>{n.e164}</span> },
    { key: "provider", header: "Provider", render: (n) => <span className={`badge ${n.provider === "telnyx" ? "badge-info" : ""}`}>{n.provider}</span> },
    {
      key: "campaign_id", header: "Campaign", render: (n) => {
        const known = n.campaign_id ? campaignMap[n.campaign_id] : undefined;
        return (
          <span>
            {known ? (
              <span className="text-mono-sm" title={n.campaign_id ?? ""} style={{ fontWeight: 500 }}>
                {known.name}
                {known.display_code && <span style={{ marginLeft: 6, color: "var(--muted)", fontSize: 11 }}>{known.display_code}</span>}
              </span>
            ) : n.campaign_id ? (
              <span className="badge badge-warning" title={n.campaign_id}>Unknown campaign · {n.campaign_id.slice(0, 8)}</span>
            ) : (
              <span className="badge">Unassigned</span>
            )}
            <select
              className="select"
              aria-label={`Move ${n.e164} to campaign`}
              value={n.campaign_id ?? ""}
              onChange={(e) => moveNumber(n.id, e.target.value || null)}
              style={{ marginLeft: 8, maxWidth: 190, fontSize: 11, padding: "4px 6px" }}
            >
              <option value="">Unassigned (spare)</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.display_code ? `${c.display_code} · ` : ""}{c.name}
                </option>
              ))}
            </select>
          </span>
        );
      },
    },
    { key: "status", header: "Status", render: (n) => <span className={`badge ${n.status === "active" ? "badge-success" : n.status === "inactive" ? "" : "badge-warning"}`}>{n.status}</span> },
  ];

  return (
    <div className="dashboard-page">
      <nav className="tabs" style={{ marginBottom: "var(--space-4)" }}>
        <Link className="tab" href="/dashboard/settings">Agency</Link>
        <Link className="tab" href="/dashboard/settings/members">Members</Link>
        <Link className="tab active" href="/dashboard/settings/phone-numbers">Phone Numbers</Link>
      </nav>
      <div className="dashboard-page-header">
        <div>
          <p className="eyebrow"><i /> SETTINGS / PHONE NUMBERS</p>
          <h1>Phone Numbers</h1>
        </div>
        <div className="search-bar">
          <input className="input" type="search" placeholder="Search numbers..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} style={{ maxWidth: 180 }} />
          <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>+ Add number</button>
        </div>
      </div>

      {showForm && (
        <Modal label="Add new number" onClose={() => setShowForm(false)}>
        <form onSubmit={handleAdd} className="card" style={{ padding: "var(--space-5)", width: "min(560px, 100%)" }}>
          <h3 style={{ font: "500 16px var(--serif)", margin: "0 0 var(--space-3)" }}>Add new number</h3>
          <div className="split" style={{ gap: "var(--space-3)", alignItems: "end", flexWrap: "wrap" } as React.CSSProperties}>
            <div className="form-group" style={{ flex: 2, minWidth: 160 }}>
              <label className="form-label">Phone number</label>
              <input className="input" type="text" value={number} onChange={(e) => setNumber(e.target.value)} placeholder="+155****4567" required />
            </div>
            <div className="form-group" style={{ flex: 2, minWidth: 160 }}>
              <label className="form-label">Campaign</label>
              <select className="select" value={campaignId} onChange={(e) => setCampaignId(e.target.value)} required>
                <option value="">Select campaign...</option>
                {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ flex: 1, minWidth: 120 }}>
              <label className="form-label">Provider</label>
              <select className="select" value={provider} onChange={(e) => setProvider(e.target.value)}>
                <option value="telnyx">Telnyx</option>
                <option value="twilio">Twilio</option>
              </select>
            </div>
            <button className="btn btn-primary" type="submit" disabled={saving || !number || !campaignId} style={{ marginBottom: 2 }}>
              {saving ? "..." : "Add"}
            </button>
            <button className="btn btn-ghost" type="button" onClick={() => setShowForm(false)} style={{ marginBottom: 2 }}>
              Cancel
            </button>
          </div>
        </form>
        </Modal>
      )}

      {loading ? (
        <div className="stack" style={{ gap: 12 }}>{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton skeleton-text" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state"><p>{numbers.length === 0 ? "No phone numbers configured. Add your first tracking number above." : `No numbers match "${debouncedQ}".`}</p></div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <DataTable
            columns={columns}
            data={paginated}
            emptyMessage="No numbers"
            page={page}
            totalPages={totalPages}
            total={filtered.length}
            onPageChange={setPage}
            sortBy="e164"
            order="asc"
            onSort={() => {}}
          />
        </div>
      )}
    </div>
  );
}

export default function PhoneNumbersPage() {
  return (
    <Suspense fallback={<div className="dashboard-page"><div className="skeleton skeleton-text" /></div>}>
      <PhoneNumbersInner />
    </Suspense>
  );
}
