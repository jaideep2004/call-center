"use client";

import { useState, useEffect } from "react";
import { normalizeMediaUrl } from "@/lib/format";

interface Creative {
  id: string;
  type: "image" | "video";
  title: string;
  media_url: string;
  thumbnail_url: string | null;
  cta_label: string | null;
  cta_href: string | null;
  placement: "agent_hero" | "agent_feed";
}

function CreativeMedia({ creative, height }: { creative: Creative; height: number }) {
  // Render-time normalization covers rows saved before write-time
  // canonicalization (old Drive share links).
  const src = normalizeMediaUrl(creative.media_url);
  const poster = creative.thumbnail_url ? normalizeMediaUrl(creative.thumbnail_url) : undefined;
  if (creative.type === "video") {
    return (
      <video
        src={src}
        poster={poster}
        controls
        preload="metadata"
        style={{ width: "100%", height, objectFit: "cover", borderRadius: 10, background: "#000" }}
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={creative.title}
      loading="lazy"
      style={{ width: "100%", height, objectFit: "cover", borderRadius: 10 }}
    />
  );
}

/** Hero carousel: top-3 agent_hero creatives, auto-advancing with dots. */
export function AgentHero() {
  const [items, setItems] = useState<Creative[]>([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    fetch("/api/v1/cms/creatives?placement=agent_hero")
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => setItems((body?.data ?? []).slice(0, 3)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (items.length < 2) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % items.length), 6000);
    return () => clearInterval(t);
  }, [items.length]);

  if (items.length === 0) return null;
  const current = items[index % items.length]!;

  return (
    <section className="cc-card" aria-label="Featured campaigns" aria-roledescription="carousel">
      <CreativeMedia creative={current} height={180} />
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8, flexWrap: "wrap" }}>
        <strong style={{ fontSize: 13, flex: 1, minWidth: 0 }}>{current.title}</strong>
        {current.cta_label && current.cta_href && (
          <a className="btn btn-sm btn-primary" href={current.cta_href} target="_blank" rel="noreferrer">
            {current.cta_label}
          </a>
        )}
      </div>
      {items.length > 1 && (
        <div style={{ display: "flex", gap: 6, marginTop: 8 }} role="tablist" aria-label="Featured slides">
          {items.map((item, i) => (
            <button
              key={item.id}
              role="tab"
              aria-selected={i === index % items.length}
              aria-label={`Show ${item.title}`}
              onClick={() => setIndex(i)}
              style={{
                width: 24,
                height: 6,
                borderRadius: 999,
                border: 0,
                cursor: "pointer",
                background: i === index % items.length ? "var(--accent, #a855f7)" : "var(--line)",
              }}
            />
          ))}
        </div>
      )}
    </section>
  );
}

/** Full campaign updates list (Campaign Updates tab): every agent_feed
 * creative, large media, newest first. Empty state included (unlike the
 * compact home feed, which hides when empty). */
export function CampaignUpdatesList() {
  const [items, setItems] = useState<Creative[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/cms/creatives?placement=agent_feed")
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => setItems(body?.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="stack" style={{ gap: 12 }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 220, borderRadius: 12 }} />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="empty-state" style={{ padding: "32px 0" }}>
        <p className="text-muted" style={{ fontSize: 13, margin: 0 }}>
          No campaign updates yet — new ads and announcements from your admin will appear here.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
      {items.map((c) => (
        <article key={c.id} className="cc-card" style={{ overflow: "hidden", padding: 0 }}>
          <CreativeMedia creative={c} height={220} />
          <div style={{ padding: "12px 14px" }}>
            <strong style={{ fontSize: 14, display: "block" }}>{c.title}</strong>
            {c.cta_label && c.cta_href && (
              <a className="btn btn-sm btn-primary" href={c.cta_href} target="_blank" rel="noreferrer" style={{ marginTop: 10 }}>
                {c.cta_label}
              </a>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
export function AgentFeed() {
  const [items, setItems] = useState<Creative[]>([]);

  useEffect(() => {
    fetch("/api/v1/cms/creatives?placement=agent_feed")
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => setItems(body?.data ?? []))
      .catch(() => {});
  }, []);

  if (items.length === 0) return null;

  return (
    <section className="cc-card" aria-label="Campaign updates">
      <div className="cc-card__head"><div><h2>Campaign Updates</h2><small>Latest from your campaigns</small></div></div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {items.slice(0, 5).map((c) => (
          <article key={c.id} style={{ border: "1px solid var(--line)", borderRadius: 10, overflow: "hidden" }}>
            <CreativeMedia creative={c} height={110} />
            <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "8px 10px" }}>
              <strong style={{ fontSize: 12, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {c.title}
              </strong>
              {c.cta_label && c.cta_href && (
                <a className="btn btn-sm btn-ghost" href={c.cta_href} target="_blank" rel="noreferrer" style={{ fontSize: 11 }}>
                  {c.cta_label}
                </a>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
