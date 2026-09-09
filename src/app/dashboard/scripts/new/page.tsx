"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { showToast } from "@/lib/use-toast";

interface Campaign {
  id: string;
  name: string;
  status: string;
}

const PLACEHOLDERS = [
  { chip: "[Your Name]", hint: "agent_name", desc: "Agent full name" },
  { chip: "[Phone Number]", hint: "phone", desc: "Agent phone" },
  { chip: "[NPN Number]", hint: "npn", desc: "Agent NPN" },
  { chip: "[State]", hint: "state", desc: "Caller/agent state" },
  { chip: "[Beneficiary Name]", hint: "beneficiary", desc: "Beneficiary" },
] as const;

function renderPreview(content: string): string {
  const vars: Record<string, string> = {
    "your name": "Alex Johnson",
    "phone number": "+1 (555) 0142",
    "npn number": "12345678",
    npn: "12345678",
    state: "CA",
    "beneficiary name": "Jane Doe",
    beneficiary: "Jane Doe",
    "your_name": "Alex Johnson",
    "agent_name": "Alex Johnson",
    phone: "+1 (555) 0142",
  };
  let out = content;
  // {{var}} style
  out = out.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_m, k: string) => vars[k.toLowerCase()] ?? _m);
  // [Bracket] style
  out = out.replace(/\[\s*([^\]]+?)\s*\]/g, (m, k: string) => {
    const norm = k.trim().toLowerCase().replace(/_/g, " ").replace(/\s+/g, " ");
    return vars[norm] ?? m;
  });
  return out;
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetch("/api/v1/campaigns?limit=100").then(async (res) => {
      if (res.ok) {
        const body = await res.json();
        setCampaigns(body.data ?? []);
      }
    }).catch(() => {});
  }, []);

  function insertChip(chip: string) {
    const el = textareaRef.current;
    if (!el) { setContent((c) => c + (c ? " " : "") + chip); return; }
    const start = el.selectionStart ?? content.length;
    const end = el.selectionEnd ?? content.length;
    const next = content.slice(0, start) + chip + content.slice(end);
    setContent(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + chip.length;
      el.setSelectionRange(pos, pos);
    });
  }

  const preview = useMemo(() => renderPreview(content), [content]);

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
          <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 6, maxWidth: 640 }}>Use chips to insert dynamic placeholders. They render as <span style={{ color: "var(--accent)" }}>[Your Name]</span> in the editor and auto-fill during calls (Final Expense 13-step: intro, trust, WHY, beneficiary, process, health, income, options, trust, benefits, application, banking, close).</p>
        </div>
      </div>
      <div className="split" style={{ gap: "var(--space-6)", alignItems: "start" } as React.CSSProperties}>
        <form onSubmit={handleSubmit} className="card card--form" style={{ flex: 1.4, minWidth: 0 }}>
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
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
              {PLACEHOLDERS.map((ph) => (
                <button key={ph.chip} type="button" className="badge badge-info" onClick={() => insertChip(ph.chip)} title={`${ph.desc} - inserts ${ph.chip}`} style={{ cursor: "pointer", border: 0, fontSize: 11, padding: "6px 10px" }}>
                  + {ph.chip}
                </button>
              ))}
            </div>
            <textarea ref={textareaRef} className="textarea" rows={14} value={content} onChange={(e) => setContent(e.target.value)} placeholder={"Write the full script here. Include talking points, objection responses, and call flow instructions...\n\nExample: Hello, this is [Your Name] (NPN [NPN Number]) calling from [State]. May I confirm beneficiary [Beneficiary Name]? Call me at [Phone Number]."} style={{ fontFamily: "var(--mono)", fontSize: 14, lineHeight: 1.6 }} />
            <span className="form-hint">
              Click a chip to insert at cursor. Also supports {"{{agent_name}}"}, {"{{phone}}"}, {"{{npn}}"}, {"{{state}}"}, {"{{beneficiary}}"}. Live preview on the right shows filled values.
            </span>
          </div>
          <div style={{ display: "flex", gap: "var(--space-3)", paddingTop: "var(--space-4)", borderTop: "1px solid var(--line)", marginTop: "var(--space-2)" }}>
            <button className="btn btn-primary" type="submit" disabled={saving} style={{ whiteSpace: "nowrap" }}>{saving ? "Saving..." : "Create Script"}</button>
            <button className="btn btn-ghost" type="button" onClick={() => router.back()}>Cancel</button>
          </div>
        </form>
        <div style={{ flex: 1, minWidth: 280, position: "sticky", top: "var(--space-6)", alignSelf: "start" }}>
          <div className="card" style={{ background: "rgba(168,85,247,0.06)", border: "1px solid var(--line)", padding: "var(--space-4)", minHeight: 320, maxHeight: "calc(100vh - 120px)", overflow: "auto" }}>
            <p style={{ font: "600 10px var(--mono)", letterSpacing: "0.12em", color: "var(--muted)", margin: "0 0 12px", display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", boxShadow: "0 0 8px rgba(168,85,247,0.5)" }} />LIVE PREVIEW — sample agent
            </p>
            {content.trim() ? (
              <pre style={{ whiteSpace: "pre-wrap", font: "13px/1.65 var(--mono)", margin: 0, color: "var(--ink)", wordBreak: "break-word" }}>{preview}</pre>
            ) : (
              <p className="text-muted" style={{ fontSize: 12, lineHeight: 1.6, margin: 0, fontStyle: "italic" }}>Start typing your script — preview will appear here with sample values:<br />[Your Name] → Alex Johnson<br />[NPN Number] → 12345678<br />[State] → CA<br />[Beneficiary Name] → Jane Doe</p>
            )}
          </div>
          <p className="text-muted" style={{ fontSize: 10, marginTop: 8, lineHeight: 1.5, textAlign: "center" }}>Preview updates as you type. Placeholders auto-fill during live calls.</p>
        </div>
      </div>
    </div>
  );
}
