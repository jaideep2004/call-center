"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
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

export default function PhoneNumbersPage() {
  const [numbers, setNumbers] = useState<PhoneNumber[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [number, setNumber] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [provider, setProvider] = useState("telnyx");
  const [saving, setSaving] = useState(false);

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
    } catch {
      showToast("Network error", "error");
    }
    setSaving(false);
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-page-header">
        <div>
          <p className="eyebrow"><i /> SETTINGS / PHONE NUMBERS</p>
          <h1>Phone Numbers</h1>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "+ Add Number"}
        </button>
      </div>

      <nav className="tabs" style={{ marginBottom: "var(--space-5)" }}>
        <Link className="tab" href="/dashboard/settings">Agency</Link>
        <Link className="tab" href="/dashboard/settings/members">Members</Link>
        <Link className="tab active" href="/dashboard/settings/phone-numbers">Phone Numbers</Link>
      </nav>

      {showForm && (
        <form onSubmit={handleAdd} className="card" style={{ padding: "var(--space-5)", marginBottom: "var(--space-5)" }}>
          <h3 style={{ font: "500 16px var(--serif)", margin: "0 0 var(--space-3)" }}>Add new number</h3>
          <div className="split" style={{ gap: "var(--space-3)", alignItems: "end" } as React.CSSProperties}>
            <div className="form-group" style={{ flex: 2 }}>
              <label className="form-label">Phone number</label>
              <input className="input" type="text" value={number} onChange={(e) => setNumber(e.target.value)} placeholder="+15551234567" required />
            </div>
            <div className="form-group" style={{ flex: 2 }}>
              <label className="form-label">Campaign</label>
              <select className="select" value={campaignId} onChange={(e) => setCampaignId(e.target.value)} required>
                <option value="">Select campaign...</option>
                {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ flex: 1 }}>
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
      ) : numbers.length === 0 ? (
        <div className="empty-state"><p>No phone numbers configured.</p></div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Number</th>
              <th>Provider</th>
              <th>Campaign</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {numbers.map((n) => {
              const camp = campaigns.find((c) => c.id === n.campaign_id);
              return (
                <tr key={n.id}>
                  <td className="text-mono-sm">{n.e164}</td>
                  <td className="text-mono-sm">{n.provider}</td>
                  <td className="text-mono-sm">{camp?.name || n.campaign_id.slice(0, 8)}</td>
                  <td><span className={`badge${n.status === "active" ? " badge-success" : ""}`}>{n.status}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
