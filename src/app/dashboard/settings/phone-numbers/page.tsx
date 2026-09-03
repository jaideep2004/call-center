"use client";

import { Suspense, useState, useEffect, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import DataTable from "@/components/data-table";
import type { Column } from "@/components/data-table";
import { showToast } from "@/lib/use-toast";

interface PhoneNumber {
  id: string;
  campaign_id: string;
  provider: string;
  e164: string;
  status: string;
}

interface Campaign {
  id: string;
  name: string;
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
    const m: Record<string, string> = {};
    for (const c of campaigns) m[c.id] = c.name;
    return m;
  }, [campaigns]);

  const filtered = useMemo(() => {
    if (!debouncedQ) return numbers;
    const q = debouncedQ;
    return numbers.filter((n) => n.e164.toLowerCase().includes(q) || n.provider.toLowerCase().includes(q) || (campaignMap[n.campaign_id] ?? "").toLowerCase().includes(q) || n.status.toLowerCase().includes(q));
  }, [numbers, debouncedQ, campaignMap]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page]);

  const columns: Column<PhoneNumber>[] = [
    { key: "e164", header: "Number", render: (n) => <span className="text-mono-sm" style={{ fontWeight: 500 }}>{n.e164}</span> },
    { key: "provider", header: "Provider", render: (n) => <span className={`badge ${n.provider === "telnyx" ? "badge-info" : ""}`}>{n.provider}</span> },
    { key: "campaign_id", header: "Campaign", render: (n) => <span className="text-mono-sm">{campaignMap[n.campaign_id] ?? n.campaign_id.slice(0, 8)}</span> },
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
          <button className="btn btn-primary btn-sm" onClick={() => setShowForm((v) => !v)}>{showForm ? "Cancel" : "+ Add number"}</button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="card" style={{ padding: "var(--space-5)", marginBottom: "var(--space-5)" }}>
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
          </div>
        </form>
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
