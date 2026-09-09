"use client";

import { Suspense, useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import DataTable from "@/components/data-table";
import type { Column } from "@/components/data-table";

interface Script {
  id: string;
  title: string;
  category: string;
  tags: string[];
  created_at: string;
}
const PAGE_SIZE = 10;

function ScriptsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") ?? "";
  const initialCat = searchParams.get("category") ?? "";
  const initialPage = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);

  const [scripts, setScripts] = useState<Script[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState(initialCat);
  const [searchInput, setSearchInput] = useState(initialQ);
  const [debouncedQ, setDebouncedQ] = useState(initialQ);
  const [page, setPage] = useState(initialPage);
  const hasMounted = useRef(false);

  const fetchScripts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (debouncedQ) params.set("search", debouncedQ);
    const res = await fetch(`/api/v1/scripts?${params}`);
    if (res.ok) {
      const body = await res.json();
      setScripts(body.data ?? []);
    }
    setLoading(false);
  }, [category, debouncedQ]);

  useEffect(() => { fetchScripts(); }, [fetchScripts]);

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
    if (category) p.set("category", category);
    if (page > 1) p.set("page", String(page));
    const qs = p.toString();
    if (qs === searchParams.toString()) return;
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
  }, [debouncedQ, category, page, router, searchParams]);

  const categories = useMemo(() => [...new Set(scripts.map((s) => s.category))].filter(Boolean) as string[], [scripts]);

  const filtered = useMemo(() => {
    if (!debouncedQ) return scripts;
    const q = debouncedQ;
    return scripts.filter((s) => s.title.toLowerCase().includes(q) || s.category.toLowerCase().includes(q) || s.tags.join(" ").toLowerCase().includes(q));
  }, [scripts, debouncedQ]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page]);

  const columns: Column<Script>[] = [
    { key: "title", header: "Title", render: (s) => <Link href={`/dashboard/scripts/${s.id}`} className="clickable" style={{ fontWeight: 500 }}>{s.title}</Link> },
    { key: "category", header: "Category", render: (s) => <span className="badge badge-info">{s.category}</span> },
    { key: "tags", header: "Tags", render: (s) => <span className="text-mono-sm">{s.tags.slice(0, 3).join(", ") || "\u2014"}</span> },
    { key: "created_at", header: "Created", render: (s) => <span className="text-mono-sm">{new Date(s.created_at).toLocaleDateString()}</span> },
  ];

  return (
    <div className="dashboard-page">
      <div className="dashboard-page-header">
        <div>
          <p className="eyebrow"><i /> OPERATIONS / SCRIPTS</p>
          <h1>Scripts</h1>
        </div>
        <div className="search-bar">
          <input className="input" type="search" placeholder="Search scripts..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} style={{ minWidth: 180 }} />
          <Link href="/dashboard/scripts/new" className="btn btn-primary" style={{ whiteSpace: "nowrap" }}>+ New Script</Link>
        </div>
      </div>
      <div className="filter-bar">
        <select className="select" value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} style={{ maxWidth: 180 }}>
            <option value="">All categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        <span className="text-mono-sm" style={{ marginLeft: "auto", color: "var(--muted)", fontSize: 11 }}>{filtered.length} scripts</span>
        {category && <button className="btn btn-ghost btn-sm" onClick={() => setCategory("")}>Clear</button>}
      </div>
      {loading ? (
        <div className="stack" style={{ gap: 12 }}>{Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton skeleton-text" />)}</div>
      ) : filtered.length === 0 ? (
        scripts.length === 0 ? (
          <div className="card card--spacious" style={{ textAlign: "center", padding: "var(--space-8) var(--space-6)" }}>
            <p style={{ font: "500 16px var(--serif)", margin: "0 0 8px" }}>No scripts yet</p>
            <p className="text-muted" style={{ fontSize: 12, margin: "0 0 var(--space-4)", maxWidth: 520, marginInline: "auto" }}>Create your first Final Expense script. Use chips like <code style={{ background: "rgba(168,85,247,0.12)", padding: "2px 6px", borderRadius: 6 }}>[Your Name]</code> <code style={{ background: "rgba(168,85,247,0.12)", padding: "2px 6px", borderRadius: 6 }}>[State]</code> <code style={{ background: "rgba(168,85,247,0.12)", padding: "2px 6px", borderRadius: 6 }}>[Beneficiary Name]</code> — they auto-fill during calls.</p>
            <Link href="/dashboard/scripts/new" className="btn btn-primary">+ Create Final Expense script →</Link>
            <p className="text-mono-sm" style={{ marginTop: 12, color: "var(--muted)", fontSize: 11 }}>Placeholders: [Your Name] · [Phone Number] · [NPN Number] · [State] · [Beneficiary Name]</p>
          </div>
        ) : (
          <div className="empty-state"><p>{`No scripts match "${debouncedQ}".`}</p><button className="btn btn-sm" onClick={() => { setSearchInput(""); setCategory(""); }} style={{ marginTop: 8 }}>Clear filters</button></div>
        )
      ) : (
        <DataTable
            columns={columns}
            data={paginated}
            emptyMessage="No scripts"
            page={page}
            totalPages={totalPages}
            total={filtered.length}
            onPageChange={setPage}
            sortBy="title"
            order="asc"
            onSort={() => {}}
          />
      )}
    </div>
  );
}

export default function ScriptsPage() {
  return (
    <Suspense fallback={<div className="dashboard-page"><div className="skeleton skeleton-text" /></div>}>
      <ScriptsInner />
    </Suspense>
  );
}
