"use client";

import { useState, useEffect, useCallback } from "react";
import { formatCents } from "@/lib/format";

interface CampaignRow {
  campaign_id: string | null;
  campaign_name: string | null;
  price_cents: number | null;
  calls: number;
  qualified_calls: number;
  payout_cents: number;
}

export default function PublisherCampaignsPage() {
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCampaigns = useCallback(async () => {
    const res = await fetch("/api/v1/publisher/overview");
    if (res.ok) {
      const body = await res.json();
      setCampaigns(body.data?.campaigns ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="stack" style={{ gap: 12 }}>
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton skeleton-text" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-page-header">
        <div>
          <p className="eyebrow"><i /> PUBLISHER / CAMPAIGNS</p>
          <h1>Campaigns</h1>
        </div>
      </div>

      <section className="card" style={{ padding: "var(--space-6)" }}>
        {campaigns.length === 0 ? (
          <div className="empty-state">
            <p><strong>No campaign data yet</strong></p>
            <p className="text-muted">Once calls are attributed to you, they&apos;ll appear here per campaign.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Campaign</th>
                <th>Buyer price</th>
                <th>Calls</th>
                <th>Qualified</th>
                <th className="text-right">Payout</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.campaign_id ?? "unassigned"}>
                  <td>{c.campaign_name ?? <span className="text-muted">Unassigned</span>}</td>
                  <td>{c.price_cents ? formatCents(c.price_cents) : "—"}</td>
                  <td>{c.calls}</td>
                  <td>{c.qualified_calls}</td>
                  <td className="text-right text-mono-sm">{formatCents(c.payout_cents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
