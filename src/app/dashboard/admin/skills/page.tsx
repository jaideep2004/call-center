"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import DataTable from "@/components/data-table";
import type { Column } from "@/components/data-table";
import { showToast } from "@/lib/use-toast";

interface Skill {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  sort: number;
  created_at: string;
}

const PAGE_SIZE = 10;

export default function AdminSkillsPage() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [sort, setSort] = useState("0");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | "active" | "disabled">("");
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState("sort");
  const [order, setOrder] = useState<"asc" | "desc">("asc");

  const fetchSkills = useCallback(async () => {
    const res = await fetch("/api/v1/skills");
    if (res.ok) {
      const body = await res.json();
      setSkills(body.data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchSkills(); }, [fetchSkills]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/v1/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), sort: parseInt(sort) || 0 }),
      });
      const body = await res.json();
      if (res.ok) {
        setName("");
        setSort("0");
        showToast("Skill created", "success");
        fetchSkills();
      } else {
        setError(body.message ?? "Failed to create skill");
        showToast(body.message ?? "Failed to create skill", "error");
      }
    } catch {
      setError("Network error");
      showToast("Network error creating skill", "error");
    }
    setCreating(false);
  }

  async function toggleActive(skill: Skill) {
    const res = await fetch(`/api/v1/skills/${skill.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !skill.active }),
    });
    if (res.ok) {
      const body = await res.json();
      setSkills((prev) => prev.map((s) => (s.id === skill.id ? body.data : s)));
      showToast(skill.active ? "Skill disabled" : "Skill enabled", "success");
    } else {
      showToast("Failed to update skill", "error");
    }
  }

  async function handleDelete(skill: Skill) {
    if (!confirm(`Delete skill "${skill.name}"? Agents already tagged with it will keep the tag.`)) return;
    const res = await fetch(`/api/v1/skills/${skill.id}`, { method: "DELETE" });
    if (res.ok) {
      setSkills((prev) => prev.filter((s) => s.id !== skill.id));
      showToast("Skill deleted", "success");
    } else {
      showToast("Failed to delete skill", "error");
    }
  }

  const filtered = useMemo(() => {
    let out = [...skills];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      out = out.filter((s) => s.name.toLowerCase().includes(q) || s.slug.toLowerCase().includes(q));
    }
    if (statusFilter === "active") out = out.filter((s) => s.active);
    if (statusFilter === "disabled") out = out.filter((s) => !s.active);
    out.sort((a, b) => {
      let cmp = 0;
      if (sortBy === "name") cmp = a.name.localeCompare(b.name);
      else if (sortBy === "slug") cmp = a.slug.localeCompare(b.slug);
      else if (sortBy === "sort") cmp = a.sort - b.sort;
      else if (sortBy === "created_at") cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      else if (sortBy === "active") cmp = Number(a.active) - Number(b.active);
      return order === "asc" ? cmp : -cmp;
    });
    return out;
  }, [skills, search, statusFilter, sortBy, order]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  useEffect(() => { setPage(1); }, [search, statusFilter]);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [totalPages, page]);

  function handleSort(field: string) {
    if (sortBy === field) setOrder((o) => (o === "asc" ? "desc" : "asc"));
    else { setSortBy(field); setOrder("asc"); }
  }

  const columns: Column<Skill>[] = [
    { key: "name", header: "Name", sortable: true, render: (s) => <span className="text-mono-sm" style={{ fontWeight: 500 }}>{s.name}</span> },
    { key: "slug", header: "Slug", sortable: true, render: (s) => <span className="text-mono-sm">{s.slug}</span> },
    { key: "sort", header: "Sort", sortable: true, render: (s) => <span className="text-mono-sm">{s.sort}</span> },
    { key: "active", header: "Status", sortable: true, render: (s) => <span className={`badge ${s.active ? "badge-success" : ""}`}>{s.active ? "Active" : "Disabled"}</span> },
    { key: "created_at", header: "Created", sortable: true, render: (s) => <span className="text-mono-sm">{new Date(s.created_at).toLocaleDateString()}</span> },
    {
      key: "actions", header: "Actions", className: "actions-cell",
      render: (s) => (
        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
          <button className="btn btn-sm btn-secondary" onClick={() => toggleActive(s)}>{s.active ? "Disable" : "Enable"}</button>
          <button className="btn btn-sm btn-danger" onClick={() => handleDelete(s)}>Delete</button>
        </div>
      ),
    },
  ];

  return (
    <div className="dashboard-page">
      <div className="dashboard-page-header">
        <div>
          <p className="eyebrow"><i /> ADMIN / SKILLS</p>
          <h1>Skills</h1>
        </div>
      </div>

      <section className="card" style={{ padding: "var(--space-6)", marginBottom: "var(--space-5)" }}>
        <h2 style={{ font: "500 18px var(--serif)", margin: "0 0 var(--space-4)", letterSpacing: "-0.03em" }}>Add Skill</h2>
        <form onSubmit={handleCreate} style={{ display: "flex", gap: "var(--space-3)", alignItems: "flex-end", flexWrap: "wrap" }}>
          <div className="form-group" style={{ flex: 2, minWidth: 220 }}>
            <label className="form-label" htmlFor="skill-name">Skill name</label>
            <input id="skill-name" className="input" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. final_expense" required maxLength={100} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="skill-sort">Sort</label>
            <input id="skill-sort" className="input" type="number" min="0" value={sort} onChange={(e) => setSort(e.target.value)} style={{ maxWidth: 90 }} />
          </div>
          <button className="btn btn-primary" type="submit" disabled={creating || !name.trim()}>
            {creating ? <span className="spinner" /> : "Add Skill"}
          </button>
        </form>
        {error && <p className="form-error" style={{ marginTop: 8 }}>{error}</p>}
        <p className="text-muted" style={{ fontSize: 11, marginTop: 8 }}>
          Skills appear in agent profiles and campaign targeting. Disabling a skill hides it from new selections but keeps existing tags.
        </p>
      </section>

      <div className="filter-bar" style={{ marginBottom: "var(--space-4)" }}>
        <input className="input" type="search" placeholder="Search name or slug…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ maxWidth: 300 }} />
        <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} style={{ maxWidth: 160 }}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="disabled">Disabled</option>
        </select>
        <span className="text-mono-sm">{filtered.length} skills</span>
      </div>

      {loading ? (
        <div className="stack" style={{ gap: 12 }}>{Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton skeleton-text" />)}</div>
      ) : skills.length === 0 ? (
        <p className="text-muted">No skills yet. Add your first skill above.</p>
      ) : filtered.length === 0 ? (
        <div className="empty-state"><p>No skills match &quot;{search}&quot;.</p></div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <DataTable
            columns={columns}
            data={paged}
            loading={false}
            emptyMessage="No skills found."
            page={page}
            totalPages={totalPages}
            total={filtered.length}
            onPageChange={setPage}
            sortBy={sortBy}
            order={order}
            onSort={handleSort}
          />
        </div>
      )}
    </div>
  );
}
