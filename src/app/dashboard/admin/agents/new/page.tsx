"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { showToast } from "@/lib/use-toast";
import { useSkills } from "@/features/skills/use-skills";

interface Agency {
  id: string;
  name: string;
  slug: string;
}

interface User {
  id: string;
  name: string;
  email: string;
}

const STATE_OPTIONS = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];
const LICENSE_OPTIONS = ["P&C", "Health", "Life", "Auto"];

export default function AdminNewAgentPage() {
  const router = useRouter();
  const { names: SKILL_OPTIONS } = useSkills();
  const [agencyId, setAgencyId] = useState("");
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [userId, setUserId] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [priority, setPriority] = useState("100");
  const [states, setStates] = useState<string[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [licenses, setLicenses] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [agRes, userRes] = await Promise.all([
        fetch("/api/v1/agencies"),
        fetch("/api/v1/users"),
      ]);
      if (agRes.ok) {
        const agBody = await agRes.json();
        setAgencies(agBody.data ?? []);
        if (agBody.data?.[0]) setAgencyId(agBody.data[0].id);
      }
      if (userRes.ok) {
        const userBody = await userRes.json();
        setUsers(userBody.data ?? []);
      }
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  function toggleList(list: string[], value: string, setter: (v: string[]) => void) {
    setter(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!agencyId || !userId) { setError("Agency and user are required"); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/v1/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agency_id: agencyId,
          user_id: userId,
          priority: parseInt(priority) || 100,
          states,
          skills,
          licenses,
        }),
      });
      if (res.ok) {
        const body = await res.json();
        showToast("Agent created", "success");
        router.push(`/dashboard/admin/agents?id=${body.data.id}`);
      } else {
        const b = await res.json();
        setError(b.message ?? "Failed to create agent");
        showToast(b.message ?? "Failed to create agent", "error");
      }
    } catch {
      setError("Network error");
      showToast("Network error creating agent", "error");
    }
    setSaving(false);
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-page-header">
        <div>
          <p className="eyebrow"><i /> ADMIN / AGENTS / NEW</p>
          <h1>Create Agent</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="split" style={{ "--gap": "var(--space-6)" } as React.CSSProperties}>

          <div className="stack" style={{ flex: 2, gap: "var(--space-5)" }}>

            <section className="card" style={{ padding: "var(--space-6)" }}>
              <h2 className="card-section-title">Agent Profile</h2>

              <div className="form-group">
                <label className="form-label" htmlFor="admin-agency">Agency</label>
                {loading ? (
                  <div className="skeleton skeleton-text" style={{ width: "100%" }} />
                ) : (
                  <select id="admin-agency" className="input select" value={agencyId} onChange={(e) => setAgencyId(e.target.value)} required>
                    {agencies.map((a) => (
                      <option key={a.id} value={a.id}>{a.name} ({a.slug})</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="admin-user">User</label>
                {loading ? (
                  <div className="skeleton skeleton-text" style={{ width: "100%" }} />
                ) : (
                  <select id="admin-user" className="input select" value={userId} onChange={(e) => setUserId(e.target.value)} required>
                    <option value="">Select a user...</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>{u.name || u.email} &mdash; {u.email}</option>
                    ))}
                  </select>
                )}
                <span className="form-hint">Membership with &quot;agent&quot; role will be auto-created if needed.</span>
              </div>

              <div className="form-row">
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label" htmlFor="admin-priority">Routing priority</label>
                  <input id="admin-priority" className="input" type="number" min="1" value={priority} onChange={(e) => setPriority(e.target.value)} style={{ maxWidth: 120 }} />
                  <span className="form-hint">Lower = higher priority. Default: 100.</span>
                </div>
              </div>
            </section>

            <section className="card" style={{ padding: "var(--space-6)" }}>
              <h2 className="card-section-title">Licenses &amp; Skills</h2>

              <div className="form-group">
                <label className="form-label">Licenses</label>
                <div className="toggle-group">
                  {LICENSE_OPTIONS.map((l) => (
                    <button key={l} type="button" className={licenses.includes(l) ? "toggle-btn active" : "toggle-btn"} onClick={() => toggleList(licenses, l, setLicenses)}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Skills</label>
                <div className="toggle-group">
                  {SKILL_OPTIONS.map((s) => (
                    <button key={s} type="button" className={skills.includes(s) ? "toggle-btn active" : "toggle-btn"} onClick={() => toggleList(skills, s, setSkills)}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <section className="card" style={{ padding: "var(--space-6)" }}>
              <h2 className="card-section-title">State Coverage</h2>
              <div className="toggle-group" style={{ gap: 4 }}>
                {STATE_OPTIONS.map((s) => (
                  <button key={s} type="button" className={states.includes(s) ? "toggle-btn active" : "toggle-btn"} onClick={() => toggleList(states, s, setStates)}>
                    {s}
                  </button>
                ))}
              </div>
              <span className="form-hint" style={{ marginTop: 8, display: "block" }}>Toggle states. Empty = all states eligible.</span>
            </section>

          </div>

          <div className="stack" style={{ flex: 1, gap: "var(--space-5)" }}>

            <section className="card" style={{ padding: "var(--space-6)" }}>
              <h2 className="card-section-title">Summary</h2>
              {loading ? (
                <div className="skeleton skeleton-text" style={{ width: "100%" }} />
              ) : (
                <dl className="data-list">
                  <dt>Agency</dt>
                  <dd>{agencies.find(a => a.id === agencyId)?.name || "—"}</dd>
                  <dt>User</dt>
                  <dd>{userId ? (users.find(u => u.id === userId)?.name || users.find(u => u.id === userId)?.email || userId.slice(0, 8)) : "—"}</dd>
                  <dt>Priority</dt>
                  <dd>{priority || "100"}</dd>
                  <dt>Licenses</dt>
                  <dd>{licenses.length ? licenses.join(", ") : "None"}</dd>
                  <dt>Skills</dt>
                  <dd>{skills.length ? skills.join(", ") : "None"}</dd>
                  <dt>States</dt>
                  <dd>{states.length ? states.length + " selected" : "All eligible"}</dd>
                </dl>
              )}
            </section>

            {error && (
              <div className="error-banner">
                <p>{error}</p>
              </div>
            )}

            <button className="btn btn-primary btn-lg" type="submit" disabled={saving || !agencyId || !userId} style={{ width: "100%", justifyContent: "center" }}>
              {saving ? <span className="spinner" /> : "Create Agent"}
            </button>

            <button type="button" className="btn btn-ghost" onClick={() => router.push("/dashboard/admin")} style={{ width: "100%", justifyContent: "center" }}>
              Cancel
            </button>

          </div>
        </div>
      </form>
    </div>
  );
}
