"use client";

import { Suspense, useState, useEffect, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import DataTable from "@/components/data-table";
import type { Column } from "@/components/data-table";
import { showToast } from "@/lib/use-toast";

interface Invite {
  id: string;
  invitee_email: string;
  token: string;
  status: string;
  created_at: string;
  expires_at: string;
}
const PAGE_SIZE = 10;

function RecruitInner() {
  const { data: session } = authClient.useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") ?? "";
  const initialPage = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);

  const [invites, setInvites] = useState<Invite[]>([]);
  const [subAgencies, setSubAgencies] = useState<any[]>([]);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCreateSub, setShowCreateSub] = useState(false);
  const [subName, setSubName] = useState("");
  const [subSlug, setSubSlug] = useState("");
  const [subCommission, setSubCommission] = useState(10);
  const [searchInput, setSearchInput] = useState(initialQ);
  const [debouncedQ, setDebouncedQ] = useState(initialQ);
  const [page, setPage] = useState(initialPage);
  const [subQ, setSubQ] = useState("");
  const hasMounted = useRef(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/v1/invites").then(r => r.ok ? r.json() : { data: [] }),
      fetch("/api/v1/agencies").then(r => r.ok ? r.json() : { data: [] }),
    ]).then(([invitesBody, agenciesBody]) => {
      setInvites(invitesBody.data ?? []);
      setSubAgencies((agenciesBody.data ?? []).filter((a: any) => a.parent_agency_id));
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

  const handleSendInvite = async () => {
    if (!email) return;
    setSending(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/v1/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitee_email: email }),
      });
      const body = await res.json();
      if (res.ok) {
        setInvites((prev) => [body.data, ...prev]);
        setEmail("");
        setSuccess("Invite sent!");
        showToast("Invite sent!", "success");
      } else {
        setError(body.message ?? "Failed to send invite");
        showToast(body.message ?? "Failed to send invite", "error");
      }
    } catch {
      setError("Network error");
      showToast("Network error", "error");
    } finally {
      setSending(false);
    }
  };

  const handleCreateSub = async () => {
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/agencies/sub", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: subName, slug: subSlug, commission_rate: subCommission }),
      });
      const body = await res.json();
      if (res.ok) {
        setSubAgencies((prev) => [...prev, body.data]);
        setShowCreateSub(false);
        setSubName("");
        setSubSlug("");
        setSuccess("Sub-agency created!");
        showToast("Sub-agency created!", "success");
      } else {
        setError(body.message ?? "Failed to create sub-agency");
        showToast(body.message ?? "Failed to create sub-agency", "error");
      }
    } catch {
      setError("Network error");
      showToast("Network error", "error");
    } finally {
      setSending(false);
    }
  };

  if (loading) return (
    <div className="dashboard-page">
      <div className="stack" style={{ gap: 12 }}>{Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton skeleton-text" />)}</div>
    </div>
  );

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const filteredInvites = useMemo(() => {
    if (!debouncedQ) return invites;
    const q = debouncedQ;
    return invites.filter((inv) => inv.invitee_email.toLowerCase().includes(q) || inv.status.toLowerCase().includes(q));
  }, [invites, debouncedQ]);

  const filteredSubs = useMemo(() => {
    if (!subQ.trim()) return subAgencies;
    const q = subQ.trim().toLowerCase();
    return subAgencies.filter((a) => a.name.toLowerCase().includes(q) || a.slug.toLowerCase().includes(q));
  }, [subAgencies, subQ]);

  const totalPages = Math.max(1, Math.ceil(filteredInvites.length / PAGE_SIZE));
  const paginatedInvites = useMemo(() => filteredInvites.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filteredInvites, page]);

  const inviteColumns: Column<Invite>[] = [
    { key: "invitee_email", header: "Email", render: (inv) => <span className="text-mono-sm" style={{ fontWeight: 500 }}>{inv.invitee_email}</span> },
    { key: "status", header: "Status", render: (inv) => <span className={`badge${inv.status === "accepted" ? " badge-success" : inv.status === "pending" ? " badge-warning" : inv.status === "expired" ? " badge-danger" : ""}`}>{inv.status}</span> },
    { key: "token", header: "Link", render: (inv) => <span className="text-mono-sm" style={{ fontSize: 10 }}>{origin}/register?invite={inv.token.slice(0, 8)}…</span> },
    { key: "created_at", header: "Date", render: (inv) => <span className="text-mono-sm">{new Date(inv.created_at).toLocaleDateString()}</span> },
  ];

  const subColumns: Column<any>[] = [
    { key: "name", header: "Name", render: (a) => <span style={{ fontWeight: 500 }}>{a.name}</span> },
    { key: "slug", header: "Slug", render: (a) => <span className="text-mono-sm">{a.slug}</span> },
    { key: "commission_rate", header: "Commission", render: (a) => <span className="badge badge-info">{a.commission_rate}%</span> },
  ];

  return (
    <div className="dashboard-page">
      <div className="dashboard-page-header">
        <div>
          <p className="eyebrow"><i /> AGENT / RECRUIT</p>
          <h1>Recruit</h1>
        </div>
        <div className="search-bar">
          <input className="input" type="search" placeholder="Search invites..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} style={{ maxWidth: 180 }} />
        </div>
      </div>

      {error && <p className="form-error">{error}</p>}
      {success && <p className="form-success" style={{ color: "var(--acid)" }}>{success}</p>}

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: "var(--space-3)", flexWrap: "wrap" }}>
          <h2>Sub-Agencies</h2>
          <div className="filter-bar filter-bar--plain" style={{ flex: "1 1 220px", maxWidth: 320, justifyContent: "flex-end" }}>
            <input className="input" type="search" placeholder="Search sub-agencies..." value={subQ} onChange={(e) => setSubQ(e.target.value)} style={{ maxWidth: 260 }} />
          </div>
        </div>
        {filteredSubs.length === 0 ? (
          <p className="text-muted" style={{ padding: "var(--space-3) 0", fontSize: 12 }}>{subAgencies.length === 0 ? "No sub-agencies yet. Create one below." : `No sub-agencies match "${subQ}".`}</p>
        ) : (
          <DataTable
              columns={subColumns as any}
              data={filteredSubs}
              emptyMessage="No sub-agencies"
              page={1}
              totalPages={1}
              total={filteredSubs.length}
              onPageChange={() => {}}
              sortBy="name"
              order="asc"
              onSort={() => {}}
            />
        )}
        <button className="btn btn-primary btn-sm" style={{ marginTop: "var(--space-4)" }} onClick={() => setShowCreateSub(!showCreateSub)}>
          {showCreateSub ? "Cancel" : "Create Sub-Agency"}
        </button>
        {showCreateSub && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)", marginTop: "var(--space-4)", padding: "var(--space-4)", border: "1px solid var(--line)", borderRadius: "var(--radius-sm)", background: "rgba(20,10,38,0.4)" }}>
            <div className="form-group">
              <label className="form-label">Agency name</label>
              <input className="input" placeholder="Acme Sub" value={subName} onChange={(e) => setSubName(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Slug</label>
              <input className="input" placeholder="acme-sub" value={subSlug} onChange={(e) => setSubSlug(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Commission Rate (%)</label>
              <input className="input" type="number" min={0} max={100} value={subCommission} onChange={(e) => setSubCommission(Number(e.target.value))} />
            </div>
            <div style={{ display: "flex", alignItems: "flex-end" }}>
              <button className="btn btn-primary btn-sm" onClick={handleCreateSub} disabled={sending || !subName || !subSlug} style={{ height: 42, width: "100%" }}>Create</button>
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <h2>Send Invite</h2>
        <div className="filter-bar filter-bar--plain" style={{ marginTop: "var(--space-3)", padding: 0, gap: "var(--space-3)" }}>
          <input className="input" type="email" placeholder="email@example.com" value={email} onChange={(e) => setEmail(e.target.value)} style={{ flex: 1 }} />
          <button className="btn btn-primary btn-sm" onClick={handleSendInvite} disabled={sending || !email} style={{ height: 38, whiteSpace: "nowrap" }}>{sending ? "Sending..." : "Send Invite"}</button>
        </div>
      </div>

      <div className="card">
        <h2>Invites Sent ({filteredInvites.length})</h2>
        {filteredInvites.length === 0 ? (
          <div className="empty-state"><p>{invites.length === 0 ? "No invites sent yet. Send your first invite above." : `No invites match "${debouncedQ}".`}</p></div>
        ) : (
          <DataTable
              columns={inviteColumns}
              data={paginatedInvites}
              emptyMessage="No invites"
              page={page}
              totalPages={totalPages}
              total={filteredInvites.length}
              onPageChange={setPage}
              sortBy="created_at"
              order="desc"
              onSort={() => {}}
            />
        )}
      </div>
    </div>
  );
}

export default function RecruitPage() {
  return (
    <Suspense fallback={<div className="dashboard-page"><div className="skeleton skeleton-text" /></div>}>
      <RecruitInner />
    </Suspense>
  );
}
