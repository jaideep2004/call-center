"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { showToast } from "@/lib/use-toast";

interface Campaign {
  id: string;
  name: string;
  status: string;
}

export default function NewScriptPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("general");
  const [tags, setTags] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/v1/campaigns?limit=100").then(async (res) => {
      if (res.ok) {
        const body = await res.json();
        setCampaigns(body.data ?? []);
      }
    }).catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError("Title is required"); return; }
    if (!content.trim()) { setError("Content is required"); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/scripts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, category, tags: tags.split(",").map((t) => t.trim()).filter(Boolean), campaign_id: campaignId || null }),
      });
      if (res.ok) {
        const body = await res.json();
        showToast("Script created", "success");
        router.push(`/dashboard/scripts/${body.data.id}`);
      } else {
        const body = await res.json();
        setError(body.message);
        showToast(body.message ?? "Failed to create script", "error");
      }
    } catch {
      setError("Network error");
      showToast("Network error creating script", "error");
    }
    setSaving(false);
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-page-header">
        <div>
          <p className="eyebrow"><i /> OPERATIONS / SCRIPTS / NEW</p>
          <h1>New Script</h1>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="card" style={{ maxWidth: 680 }}>
        {error && <div className="error-banner"><p>{error}</p></div>}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
          <div className="form-group">
            <label className="form-label">Script Title</label>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Welcome Call, Follow-up Script" />
            <span className="form-hint">A clear name agents will see when selecting this script.</span>
          </div>
          <div className="form-group">
            <label className="form-label">Category</label>
            <select className="select" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="general">General</option>
              <option value="sales">Sales</option>
              <option value="support">Support</option>
              <option value="objection_handling">Objection Handling</option>
              <option value="closing">Closing</option>
            </select>
            <span className="form-hint">Used to filter scripts on the agent dashboard.</span>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Assigned Campaign</label>
          <select className="select" value={campaignId} onChange={(e) => setCampaignId(e.target.value)}>
            <option value="">No campaign (available to all calls)</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>{c.name} {c.status !== "active" ? `(${c.status})` : ""}</option>
            ))}
          </select>
          <span className="form-hint">This script shows in the softphone automatically when the agent receives a call for this campaign. Leave empty for a general script used as fallback.</span>
        </div>
        <div className="form-group">
          <label className="form-label">Tags</label>
          <input className="input" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="tag1, tag2, tag3" />
          <span className="form-hint">Comma-separated keywords for quick filtering.</span>
        </div>
        <div className="form-group">
          <label className="form-label">Script Content</label>
          <textarea className="textarea" rows={14} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Write the full script here. Include talking points, objection responses, and call flow instructions..." style={{ fontFamily: "var(--mono)", fontSize: 14, lineHeight: 1.6 }} />
          <span className="form-hint">
            Use dynamic variables to auto-fill during calls: {"{{agent_name}}"}, {"{{phone}}"}, {"{{npn}}"}, {"{{state}}"}, {"{{beneficiary}}"}. Unfilled variables stay visible for the agent to complete.
          </span>
        </div>
        <div style={{ display: "flex", gap: "var(--space-3)", paddingTop: "var(--space-3)", borderTop: "1px solid var(--border)" }}>
          <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? "Saving..." : "Create Script"}</button>
          <button className="btn btn-ghost" type="button" onClick={() => router.back()}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
