"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { showToast } from "@/lib/use-toast";

export default function NewAgencyPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function autoSlug(val: string) {
    setName(val);
    setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !slug) { setError("Name and slug are required"); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/v1/agencies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug }),
      });
      if (res.ok) {
        const body = await res.json();
        showToast("Agency created", "success");
        router.push("/dashboard/admin/agencies");
      } else {
        const body = await res.json();
        setError(body.message ?? "Failed to create agency");
        showToast(body.message ?? "Failed to create agency", "error");
      }
    } catch {
      setError("Network error");
      showToast("Network error creating agency", "error");
    }
    setSaving(false);
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-page-header">
        <div>
          <p className="eyebrow"><i /> ADMIN / AGENCIES / NEW</p>
          <h1>Create Agency</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="split" style={{ "--gap": "var(--space-6)" } as React.CSSProperties}>
          <div className="stack" style={{ flex: 2, gap: "var(--space-5)" }}>
            <section className="card" style={{ padding: "var(--space-6)" }}>
              <h2 style={{ font: "500 18px var(--serif)", margin: "0 0 var(--space-4)", letterSpacing: "-0.03em" }}>Agency Details</h2>

              <div className="form-group">
                <label className="form-label" htmlFor="name">Agency Name</label>
                <input id="name" className="input" type="text" value={name} onChange={(e) => autoSlug(e.target.value)} placeholder="e.g. Acme Insurance" required />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="slug">Slug</label>
                <input id="slug" className="input" type="text" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="e.g. acme-insurance" required />
                <span className="text-muted text-mono-sm" style={{ fontSize: 10, marginTop: 4, display: "block" }}>Used in URLs and API routes. Must be unique.</span>
              </div>
            </section>
          </div>

          <div className="stack" style={{ flex: 1, gap: "var(--space-5)" }}>
            <section className="card" style={{ padding: "var(--space-6)" }}>
              <h2 style={{ font: "500 18px var(--serif)", margin: "0 0 var(--space-4)", letterSpacing: "-0.03em" }}>Summary</h2>
              <dl className="data-list">
                <dt>Name</dt>
                <dd className="text-mono-sm">{name || "—"}</dd>
                <dt>Slug</dt>
                <dd className="text-mono-sm">{slug || "—"}</dd>
              </dl>
            </section>

            {error && (
              <div className="card" style={{ padding: "var(--space-4)", border: "1px solid #704536", background: "#1a0e0a" }}>
                <p style={{ margin: 0, fontSize: 13, color: "#e89b79" }}>{error}</p>
              </div>
            )}

            <button className="btn btn-primary" type="submit" disabled={saving || !name || !slug} style={{ width: "100%", justifyContent: "center" }}>
              {saving ? <span className="spinner" /> : "Create agency"}
            </button>

            <button type="button" className="btn btn-secondary" onClick={() => router.push("/dashboard/admin/agencies")} style={{ width: "100%", justifyContent: "center" }}>
              Cancel
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}