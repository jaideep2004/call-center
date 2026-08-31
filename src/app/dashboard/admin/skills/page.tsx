"use client";

import { useState, useEffect, useCallback } from "react";
import { showToast } from "@/lib/use-toast";

interface Skill {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  sort: number;
  created_at: string;
}

export default function AdminSkillsPage() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [sort, setSort] = useState("0");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

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

      {loading ? (
        <div className="stack" style={{ gap: 12 }}>{Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton skeleton-text" />)}</div>
      ) : skills.length === 0 ? (
        <p className="text-muted">No skills yet. Add your first skill above.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Slug</th>
              <th>Sort</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {skills.map((s) => (
              <tr key={s.id}>
                <td className="text-mono-sm">{s.name}</td>
                <td className="text-mono-sm">{s.slug}</td>
                <td className="text-mono-sm">{s.sort}</td>
                <td><span className={`badge ${s.active ? "badge-success" : ""}`}>{s.active ? "Active" : "Disabled"}</span></td>
                <td className="text-mono-sm">{new Date(s.created_at).toLocaleDateString()}</td>
                <td>
                  <button className="btn btn-sm btn-secondary" onClick={() => toggleActive(s)}>{s.active ? "Disable" : "Enable"}</button>
                  <button className="btn btn-sm btn-danger" onClick={() => handleDelete(s)} style={{ marginLeft: 8 }}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
