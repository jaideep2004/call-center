"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { showToast } from "@/lib/use-toast";

interface Agency {
  id: string;
  name: string;
  slug: string;
  status: string;
  currency: string;
  recording_retention_days: number;
  created_at: string;
  parent_agency_id?: string | null;
}

export default function AgencyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [agency, setAgency] = useState<Agency | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [status, setStatus] = useState("active");
  const [currency, setCurrency] = useState("USD");
  const [retention, setRetention] = useState("90");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/v1/agencies/${id}`).then(async (res) => {
      if (res.ok) {
        const b = await res.json();
        const a: Agency = b.data;
        setAgency(a);
        setName(a.name);
        setSlug(a.slug);
        setStatus(a.status);
        setCurrency(a.currency);
        setRetention(String(a.recording_retention_days));
      } else {
        showToast("Agency not found", "error");
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !slug) { setError("Name and slug required"); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/v1/agencies/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          slug: slug.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, ""),
          status,
          currency: currency.toUpperCase().slice(0,3),
          recording_retention_days: parseInt(retention) || 90,
        }),
      });
      const body = await res.json();
      if (res.ok) {
        setAgency(body.data);
        showToast("Agency updated", "success");
      } else {
        setError(body.message ?? "Failed to update");
        showToast(body.message ?? "Failed to update", "error");
      }
    } catch {
      setError("Network error");
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!confirm(`Delete agency "${agency?.name}"? This soft-deletes it. Campaigns will remain but agency will be hidden.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/v1/agencies/${id}`, { method: "DELETE" });
      if (res.ok || res.status === 204) {
        showToast("Agency deleted", "success");
        router.push("/dashboard/admin/agencies");
      } else {
        const b = await res.json().catch(()=>({message:"Failed"}));
        showToast(b.message ?? "Failed to delete", "error");
      }
    } catch {
      showToast("Network error", "error");
    }
    setDeleting(false);
  }

  if (loading) return <div className="dashboard-page"><div className="stack" style={{gap:12}}>{Array.from({length:4}).map((_,i)=><div key={i} className="skeleton skeleton-text"/>)}</div></div>;
  if (!agency) return <div className="dashboard-page"><div className="dashboard-page-header"><div><p className="eyebrow"><i/> ADMIN / AGENCIES</p><h1>Agency not found</h1></div><Link href="/dashboard/admin/agencies" className="btn btn-secondary">Back to agencies</Link></div></div>;

  return (
    <div className="dashboard-page">
      <div className="dashboard-page-header">
        <div>
          <p className="eyebrow"><i/> ADMIN / AGENCIES / {agency.slug}</p>
          <h1>{agency.name}</h1>
          <p className="text-muted" style={{fontSize:12, margin:"6px 0 0"}}>Agency {agency.id.slice(0,8)} · Created {new Date(agency.created_at).toLocaleDateString()}</p>
        </div>
        <div style={{display:"flex", gap:8}}>
          <Link href="/dashboard/admin/agencies" className="btn btn-secondary">Back</Link>
          <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>{deleting ? "Deleting..." : "Delete"}</button>
        </div>
      </div>

      <form onSubmit={handleSave}>
        <div className="split" style={{["--gap" as string]:"var(--space-6)"}}>
          <div className="stack" style={{flex:2, gap:"var(--space-5)"}}>
            <section className="card" style={{padding:"var(--space-6)"}}>
              <h2 style={{font:"500 18px var(--serif)", margin:"0 0 var(--space-4)", letterSpacing:"-0.03em"}}>Agency Details</h2>
              <div className="form-group">
                <label className="form-label" htmlFor="name">Agency Name</label>
                <input id="name" className="input" value={name} onChange={(e)=>setName(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="slug">Slug</label>
                <input id="slug" className="input" value={slug} onChange={(e)=>setSlug(e.target.value)} required />
                <span className="text-muted text-mono-sm" style={{fontSize:10, marginTop:4, display:"block"}}>Lowercase alphanumeric + hyphens, unique.</span>
              </div>
              <div className="split" style={{gap:"var(--space-4)"} as React.CSSProperties}>
                <div className="form-group" style={{flex:1}}>
                  <label className="form-label" htmlFor="status">Status</label>
                  <select id="status" className="input" value={status} onChange={(e)=>setStatus(e.target.value)}>
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="suspended">Suspended</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
                <div className="form-group" style={{flex:1}}>
                  <label className="form-label" htmlFor="currency">Currency</label>
                  <input id="currency" className="input" value={currency} onChange={(e)=>setCurrency(e.target.value)} maxLength={3} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="retention">Recording Retention (days)</label>
                <input id="retention" className="input" type="number" min={1} max={3650} value={retention} onChange={(e)=>setRetention(e.target.value)} />
              </div>
              {error && <p className="form-error" style={{marginTop:12, color:"#e89b79", fontSize:12}}>{error}</p>}
            </section>
          </div>
          <div className="stack" style={{flex:1, gap:"var(--space-5)"}}>
            <section className="card" style={{padding:"var(--space-6)"}}>
              <h2 style={{font:"500 18px var(--serif)", margin:"0 0 var(--space-4)", letterSpacing:"-0.03em"}}>Summary</h2>
              <dl className="data-list">
                <dt>ID</dt><dd className="text-mono-sm">{agency.id}</dd>
                <dt>Name</dt><dd className="text-mono-sm">{name || "—"}</dd>
                <dt>Slug</dt><dd className="text-mono-sm">{slug || "—"}</dd>
                <dt>Status</dt><dd><span className={`badge ${status==="active"?"badge-success": status==="suspended"?"badge-danger":""}`}>{status}</span></dd>
                <dt>Currency</dt><dd className="text-mono-sm">{currency}</dd>
                <dt>Retention</dt><dd className="text-mono-sm">{retention} days</dd>
                <dt>Created</dt><dd className="text-mono-sm">{new Date(agency.created_at).toLocaleString()}</dd>
              </dl>
            </section>
            <button className="btn btn-primary" type="submit" disabled={saving} style={{width:"100%", justifyContent:"center"}}>{saving ? "Saving..." : "Save changes"}</button>
            <Link href="/dashboard/admin/agencies" className="btn btn-secondary" style={{width:"100%", justifyContent:"center"}}>Cancel</Link>
          </div>
        </div>
      </form>
    </div>
  );
}
