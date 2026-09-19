"use client";

import { useState, useEffect, useCallback } from "react";
import Modal from "@/components/modal";
import { showToast } from "@/lib/use-toast";

interface Creative {
  id: string;
  campaign_id: string | null;
  type: "image" | "video";
  title: string;
  media_url: string;
  thumbnail_url: string | null;
  cta_label: string | null;
  cta_href: string | null;
  placement: "agent_hero" | "agent_feed";
  priority: number;
  active: boolean;
  starts_at: string | null;
  ends_at: string | null;
}

interface Campaign {
  id: string;
  name: string;
}

const EMPTY = {
  campaign_id: "",
  type: "image",
  title: "",
  media_url: "",
  thumbnail_url: "",
  cta_label: "",
  cta_href: "",
  placement: "agent_feed",
  priority: 0,
  active: true,
  starts_at: "",
  ends_at: "",
};

export default function AdminCreatives() {
  const [rows, setRows] = useState<Creative[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<null | { editing: Creative | null }>(null);
  const [form, setForm] = useState({ ...EMPTY, type: "image" as "image" | "video", placement: "agent_feed" as "agent_hero" | "agent_feed" });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [useUpload, setUseUpload] = useState(false);

  const refresh = useCallback(async () => {
    const [cr, cg] = await Promise.all([
      fetch("/api/v1/cms/admin/creatives").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/v1/campaigns?limit=100").then((r) => (r.ok ? r.json() : null)),
    ]);
    if (cr) setRows(cr.data ?? []);
    if (cg) setCampaigns((cg.data ?? []).map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })));
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  function openModal(editing: Creative | null) {
    setForm(
      editing
        ? {
            campaign_id: editing.campaign_id ?? "",
            type: editing.type,
            title: editing.title,
            media_url: editing.media_url,
            thumbnail_url: editing.thumbnail_url ?? "",
            cta_label: editing.cta_label ?? "",
            cta_href: editing.cta_href ?? "",
            placement: editing.placement,
            priority: editing.priority,
            active: editing.active,
            starts_at: editing.starts_at ? editing.starts_at.slice(0, 16) : "",
            ends_at: editing.ends_at ? editing.ends_at.slice(0, 16) : "",
          }
        : { ...EMPTY, type: "image" as const, placement: "agent_feed" as const },
    );
    setUseUpload(false);
    setModal({ editing });
  }

  async function handleUploadFile(file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const res = await fetch("/api/v1/cms/upload", { method: "POST", body: formData });
      const body = await res.json().catch(() => ({} as { url?: string; message?: string }));
      if (res.ok && body.url) {
        setForm((prev) => ({ ...prev, media_url: body.url as string }));
        showToast("Upload complete", "success");
      } else {
        showToast(body.message ?? "Upload failed — paste a URL instead", "error");
      }
    } catch {
      showToast("Upload failed — paste a URL instead", "error");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    if (!form.title.trim() || !form.media_url.trim()) {
      showToast("Title and media are required", "error");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        campaign_id: form.campaign_id || null,
        type: form.type,
        title: form.title.trim(),
        media_url: form.media_url.trim(),
        thumbnail_url: form.thumbnail_url.trim() || null,
        cta_label: form.cta_label.trim() || null,
        cta_href: form.cta_href.trim() || null,
        placement: form.placement,
        priority: Number(form.priority) || 0,
        active: form.active,
        starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
        ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
      };
      const editing = modal?.editing;
      const res = await fetch(
        editing ? `/api/v1/cms/admin/creatives?id=${encodeURIComponent(editing.id)}` : "/api/v1/cms/admin/creatives",
        { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) },
      );
      const body = await res.json().catch(() => ({} as { message?: string }));
      if (res.ok) {
        showToast(editing ? "Creative updated" : "Creative created", "success");
        setModal(null);
        refresh();
      } else {
        showToast(body.message ?? "Save failed", "error");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this creative? Agents will stop seeing it.")) return;
    const res = await fetch(`/api/v1/cms/admin/creatives?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (res.ok) {
      showToast("Creative deleted", "success");
      refresh();
    } else {
      showToast("Delete failed", "error");
    }
  }

  const campaignName = (id: string | null) => (id ? campaigns.find((c) => c.id === id)?.name ?? id.slice(0, 8) : "All campaigns");

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
        <p className="text-muted" style={{ margin: 0, fontSize: 12 }}>
          {rows.length} creative{rows.length === 1 ? "" : "s"} · hero shows top-3 carousel, feed lists the rest
        </p>
        <button className="btn btn-primary btn-sm" onClick={() => openModal(null)}>+ Add creative</button>
      </div>
      {loading ? (
        <div className="stack" style={{ gap: 8 }}>{Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton skeleton-text" />)}</div>
      ) : rows.length === 0 ? (
        <div className="empty-state" style={{ padding: "28px 20px" }}>
          <p style={{ margin: 0, font: "600 14px var(--serif)" }}>No creatives yet</p>
          <p style={{ margin: "6px 0 0", fontSize: 12 }}>Add campaign ads — agents see them on their dashboard.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {rows.map((c) => (
            <div key={c.id} style={{ display: "flex", gap: 12, alignItems: "center", padding: 10, border: "1px solid var(--line)", borderRadius: 10, flexWrap: "wrap" }}>
              {c.type === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.thumbnail_url ?? c.media_url} alt="" style={{ width: 64, height: 40, objectFit: "cover", borderRadius: 6, flexShrink: 0 }} />
              ) : (
                <span className="badge badge-info" style={{ flexShrink: 0 }}>video</span>
              )}
              <div style={{ flex: "1 1 160px", minWidth: 0 }}>
                <strong style={{ fontSize: 13, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.title}</strong>
                <span className="text-mono-sm" style={{ fontSize: 11, color: "var(--muted)" }}>
                  {campaignName(c.campaign_id)} · {c.placement === "agent_hero" ? "hero" : "feed"} · prio {c.priority}
                </span>
              </div>
              <span className={`badge ${c.active ? "badge-success" : ""}`} style={{ fontSize: 10 }}>{c.active ? "live" : "off"}</span>
              <div style={{ display: "flex", gap: 6 }}>
                <button className="btn btn-sm btn-ghost" onClick={() => openModal(c)}>Edit</button>
                <button className="btn btn-sm btn-ghost" onClick={() => handleDelete(c.id)} style={{ color: "var(--danger, #ef4444)" }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <Modal label={modal.editing ? "Edit creative" : "Add creative"} onClose={() => setModal(null)}>
          <div className="card card--spacious" style={{ width: "min(560px, 100%)", maxHeight: "90vh", overflowY: "auto" }}>
            <h2 style={{ margin: "0 0 12px", font: "600 16px var(--serif)" }}>{modal.editing ? "Edit creative" : "Add creative"}</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <label style={{ fontSize: 12 }}>Title<input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <label style={{ fontSize: 12 }}>Campaign
                  <select className="select" value={form.campaign_id} onChange={(e) => setForm({ ...form, campaign_id: e.target.value })}>
                    <option value="">All campaigns (global)</option>
                    {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </label>
                <label style={{ fontSize: 12 }}>Type
                  <select className="select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as "image" | "video" })}>
                    <option value="image">Image</option>
                    <option value="video">Video</option>
                  </select>
                </label>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button type="button" className={`btn btn-sm ${!useUpload ? "btn-secondary" : "btn-ghost"}`} onClick={() => setUseUpload(false)}>Paste URL</button>
                <button type="button" className={`btn btn-sm ${useUpload ? "btn-secondary" : "btn-ghost"}`} onClick={() => setUseUpload(true)}>Upload file</button>
              </div>
              {useUpload ? (
                <label style={{ fontSize: 12 }}>File ({form.type === "image" ? "≤5MB" : "≤50MB mp4/webm"})
                  <input className="input" type="file" accept={form.type === "image" ? "image/*" : "video/mp4,video/webm"}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadFile(f); }} disabled={uploading} />
                  {uploading && <span className="text-mono-sm" style={{ fontSize: 11 }}>Uploading…</span>}
                </label>
              ) : null}
              <label style={{ fontSize: 12 }}>Media URL<input className="input" value={form.media_url} onChange={(e) => setForm({ ...form, media_url: e.target.value })} placeholder="https://…" /></label>
              <label style={{ fontSize: 12 }}>Thumbnail URL (optional)<input className="input" value={form.thumbnail_url} onChange={(e) => setForm({ ...form, thumbnail_url: e.target.value })} placeholder="https://…" /></label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <label style={{ fontSize: 12 }}>CTA label<input className="input" value={form.cta_label} onChange={(e) => setForm({ ...form, cta_label: e.target.value })} placeholder="Learn more" /></label>
                <label style={{ fontSize: 12 }}>CTA link<input className="input" value={form.cta_href} onChange={(e) => setForm({ ...form, cta_href: e.target.value })} placeholder="https://…" /></label>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <label style={{ fontSize: 12 }}>Placement
                  <select className="select" value={form.placement} onChange={(e) => setForm({ ...form, placement: e.target.value as "agent_hero" | "agent_feed" })}>
                    <option value="agent_feed">Feed</option>
                    <option value="agent_hero">Hero</option>
                  </select>
                </label>
                <label style={{ fontSize: 12 }}>Priority<input className="input" type="number" min={0} value={form.priority} onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })} /></label>
                <label style={{ fontSize: 12, display: "flex", alignItems: "flex-end", gap: 6, paddingBottom: 8 }}>
                  <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Active
                </label>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <label style={{ fontSize: 12 }}>Starts at (optional)<input className="input" type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} /></label>
                <label style={{ fontSize: 12 }}>Ends at (optional)<input className="input" type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} /></label>
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setModal(null)}>Cancel</button>
                <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving} aria-busy={saving}>{saving ? "Saving…" : "Save creative"}</button>
              </div>
            </div>
          </div>
        </Modal>
      )}
      <p className="text-mono-sm" style={{ fontSize: 10, color: "var(--muted)", marginTop: 8 }}>Uploads need Supabase storage keys — otherwise paste a URL.</p>
    </div>
  );
}
