"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { showToast } from "@/lib/use-toast";
import { useSkills } from "@/features/skills/use-skills";

interface AgentDetail {
  id: string;
  membership_id: string;
  approval_status: string;
  availability: string;
  priority: number;
  states: string[];
  zip_prefixes: string[];
  licenses: string[];
  skills: string[];
  endpoint_types: string[];
  npn: string | null;
  last_assigned_at: string | null;
  user_name: string;
  user_email: string;
}

export default function AgentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { names: SKILL_OPTIONS } = useSkills();
  const [agent, setAgent] = useState<AgentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingSkills, setEditingSkills] = useState(false);
  const [skillsDraft, setSkillsDraft] = useState<string[]>([]);
  const [npn, setNpn] = useState("");
  const [softwareFee, setSoftwareFee] = useState("");

  useEffect(() => { fetch(`/api/v1/agents/${id}`).then(async (res) => {
      if (res.ok) {
        const body = await res.json();
        setAgent(body.data);
        setNpn(body.data.npn ?? "");
        setSoftwareFee(body.data.software_fee_cents != null ? String(body.data.software_fee_cents / 100) : "");
      }
      setLoading(false);
    });
  }, [id]);

  async function updateApproval(status: string) {
    try {
      const res = await fetch(`/api/v1/agents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approval_status: status }),
      });
      const body = await res.json();
      if (res.ok) {
        setAgent(body.data);
        showToast(`Agent ${status}`, "success");
      } else {
        showToast(body.message ?? "Failed", "error");
      }
    } catch {
      showToast("Network error", "error");
    }
  }

  function toggleSkill(skill: string) {
    setSkillsDraft((prev) => prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]);
  }

  async function saveSkills() {
    try {
      const res = await fetch(`/api/v1/agents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skills: skillsDraft }),
      });
      const body = await res.json();
      if (res.ok) {
        setAgent(body.data);
        setEditingSkills(false);
        showToast("Skills updated", "success");
      } else {
        showToast(body.message ?? "Failed", "error");
      }
    } catch {
      showToast("Network error", "error");
    }
  }

  async function saveNpn() {
    try {
      const res = await fetch(`/api/v1/agents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ npn: npn.trim() }),
      });
      const body = await res.json();
      if (res.ok) {
        setAgent(body.data);
        showToast("NPN updated", "success");
      } else {
        showToast(body.message ?? "Failed", "error");
      }
    } catch {
      showToast("Network error", "error");
    }
  }

  async function saveSoftwareFee() {
    try {
      const res = await fetch(`/api/v1/agents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ software_fee_cents: Math.round((parseFloat(softwareFee) || 0) * 100) }),
      });
      const body = await res.json();
      if (res.ok) {
        setAgent(body.data);
        showToast("Software Access fee updated", "success");
      } else {
        showToast(body.message ?? "Failed", "error");
      }
    } catch {
      showToast("Network error", "error");
    }
  }

  if (loading) return (
    <div className="dashboard-page">
      <div className="stack" style={{ gap: 12 }}>{Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton skeleton-text" />)}</div>
    </div>
  );

  if (!agent) return (
    <div className="dashboard-page">
      <div className="dashboard-page-header"><h1>Agent not found</h1></div>
      <button className="btn btn-secondary" onClick={() => router.push("/dashboard/agents")}>Back to agents</button>
    </div>
  );

  return (
    <div className="dashboard-page">
      <div className="dashboard-page-header">
        <div>
          <p className="eyebrow"><i /> OPERATIONS / AGENT</p>
          <h1>{agent.user_name || `Agent ${agent.membership_id.slice(0, 8)}`}</h1>
        </div>
        <button className="btn btn-secondary" onClick={() => router.push("/dashboard/agents")}>Back</button>
      </div>

      <div className="split" style={{ "--gap": "2rem" } as React.CSSProperties}>
        <div className="stack" style={{ flex: 1, gap: "var(--space-5)" }}>
          <section className="card" style={{ padding: "var(--space-6)" }}>
            <h2 style={{ font: "500 18px var(--serif)", margin: "0 0 var(--space-4)", letterSpacing: "-0.03em" }}>Profile</h2>
            <dl className="data-list">
              <dt>Name</dt><dd>{agent.user_name || "—"}</dd>
              <dt>Email</dt><dd className="text-mono-sm">{agent.user_email || "—"}</dd>
              <dt>Membership</dt><dd className="text-mono-sm">{agent.membership_id}</dd>
              <dt>Priority</dt><dd className="text-mono-sm">{agent.priority}</dd>
              <dt>NPN</dt>
              <dd>
                <div className="stack-h" style={{ gap: 6 }}>
                  <input
                    className="input"
                    value={npn}
                    onChange={(e) => setNpn(e.target.value)}
                    placeholder="Not set"
                    style={{ maxWidth: 170, fontSize: 12, padding: "4px 8px" }}
                  />
                  <button className="btn btn-sm btn-secondary" onClick={saveNpn}>Save</button>
                </div>
              </dd>
              <dt>Software Access</dt>
              <dd>
                <div className="stack-h" style={{ gap: 6 }}>
                  <span className="text-mono-sm">$</span>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={softwareFee}
                    onChange={(e) => setSoftwareFee(e.target.value)}
                    placeholder="50.00"
                    style={{ maxWidth: 110, fontSize: 12, padding: "4px 8px" }}
                  />
                  <span className="text-muted" style={{ fontSize: 10 }}>/month (prepaid)</span>
                  <button className="btn btn-sm btn-secondary" onClick={saveSoftwareFee}>Save</button>
                </div>
              </dd>
              <dt>Last assigned</dt><dd className="text-mono-sm">{agent.last_assigned_at ? new Date(agent.last_assigned_at).toLocaleString() : "Never"}</dd>
            </dl>
          </section>

          <section className="card" style={{ padding: "var(--space-6)" }}>
            <h2 style={{ font: "500 18px var(--serif)", margin: "0 0 var(--space-4)", letterSpacing: "-0.03em" }}>Approval</h2>
            <div className="stack" style={{ gap: 8 }}>
              <span className={`badge${agent.approval_status === "approved" ? " badge-success" : ""}${agent.approval_status === "rejected" ? " badge-danger" : ""}${agent.approval_status === "suspended" ? " badge-warning" : ""}`}>
                {agent.approval_status}
              </span>
              <div className="split" style={{ gap: 8 } as React.CSSProperties}>
                {agent.approval_status !== "approved" && <button className="btn btn-primary" onClick={() => updateApproval("approved")}>Approve</button>}
                {agent.approval_status !== "rejected" && <button className="btn btn-secondary" onClick={() => updateApproval("rejected")}>Reject</button>}
                {agent.approval_status === "approved" && <button className="btn btn-secondary" onClick={() => updateApproval("suspended")}>Suspend</button>}
              </div>
            </div>
          </section>

          <section className="card" style={{ padding: "var(--space-6)" }}>
            <h2 style={{ font: "500 18px var(--serif)", margin: "0 0 var(--space-4)", letterSpacing: "-0.03em" }}>Availability</h2>
            <div className="stack" style={{ gap: 8 }}>
              <span className="badge">{agent.availability}</span>
            </div>
          </section>
        </div>

        <div className="stack" style={{ flex: 2, gap: "var(--space-5)" }}>
          <section className="card" style={{ padding: "var(--space-6)" }}>
            <div className="split" style={{ alignItems: "center", marginBottom: "var(--space-4)" } as React.CSSProperties}>
              <h2 style={{ font: "500 18px var(--serif)", margin: 0, letterSpacing: "-0.03em" }}>Capabilities</h2>
              {!editingSkills && (
                <button className="btn btn-sm btn-secondary" onClick={() => { setSkillsDraft([...agent.skills]); setEditingSkills(true); }}>Edit skills</button>
              )}
            </div>
            {editingSkills ? (
              <div className="stack" style={{ gap: "var(--space-3)" }}>
                <div className="stack-h" style={{ gap: 6, flexWrap: "wrap" }}>
                  {SKILL_OPTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={skillsDraft.includes(s) ? "badge badge-success" : "badge"}
                      onClick={() => toggleSkill(s)}
                      style={{ cursor: "pointer", border: 0, fontFamily: "var(--mono)", fontSize: 10 }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <div className="split" style={{ gap: 8 } as React.CSSProperties}>
                  <button className="btn btn-primary btn-sm" onClick={saveSkills}>Save</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => setEditingSkills(false)}>Cancel</button>
                </div>
              </div>
            ) : (
              <dl className="data-list">
                <dt>Skills</dt><dd className="text-mono-sm">{agent.skills?.length ? agent.skills.join(", ") : "None"}</dd>
                <dt>Licenses</dt><dd className="text-mono-sm">{agent.licenses?.length ? agent.licenses.join(", ") : "None"}</dd>
                <dt>States</dt><dd className="text-mono-sm">{agent.states?.length ? agent.states.join(", ") : "Any"}</dd>
                <dt>Endpoint types</dt><dd className="text-mono-sm">{agent.endpoint_types?.length ? agent.endpoint_types.join(", ") : "None"}</dd>
              </dl>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
