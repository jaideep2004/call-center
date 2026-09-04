"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { showToast } from "@/lib/use-toast";
import { useSkills } from "@/features/skills/use-skills";

export default function NewAgentPage() {
  const router = useRouter();
  const { names: SKILL_OPTIONS } = useSkills();
  const [email, setEmail] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  function toggleSkill(skill: string) {
    setSkills((prev) => prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setSaving(true);
    try {
      const res = await fetch("/api/v1/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitee_email: email }),
      });
      const body = await res.json();
      if (res.ok) {
        showToast("Invite sent!", "success");
        router.push("/dashboard/agents");
      } else {
        showToast(body.message ?? "Failed to send invite", "error");
      }
    } catch {
      showToast("Network error", "error");
    }
    setSaving(false);
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-page-header">
        <div>
          <p className="eyebrow"><i /> OPERATIONS / AGENTS / INVITE</p>
          <h1>Invite Agent</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="split" style={{ gap: "var(--space-6)" } as React.CSSProperties}>
          <div className="stack" style={{ flex: 2, gap: "var(--space-5)" }}>
            <section className="card card--form">
              <h2 style={{ font: "500 18px var(--serif)", margin: 0, letterSpacing: "-0.03em" }}>Agent Email</h2>
              <div className="form-group">
                <label className="form-label" htmlFor="email">Email address</label>
                <input
                  id="email"
                  className="input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="agent@agency.com"
                  required
                  autoComplete="off"
                />
                <span className="text-muted text-mono-sm" style={{ fontSize: 10, marginTop: 4, display: "block" }}>
                  An invite email will be sent to this address.
                </span>
              </div>
            </section>

            <section className="card card--form">
              <h2 style={{ font: "500 18px var(--serif)", margin: 0, letterSpacing: "-0.03em" }}>Vertical</h2>
              <div className="form-group">
                <label className="form-label">Select vertical for this agent</label>
                <div className="stack-h" style={{ gap: 8, flexWrap: "wrap", marginTop: 4 }}>
                  {SKILL_OPTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={skills.includes(s) ? "badge badge-success" : "badge"}
                      onClick={() => toggleSkill(s)}
                      style={{ cursor: "pointer", border: 0, fontFamily: "var(--mono)", fontSize: 10 }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <span className="text-muted text-mono-sm" style={{ fontSize: 10, marginTop: 6, display: "block" }}>
                  Vertical can also be changed after the agent registers.
                </span>
              </div>
            </section>
          </div>

          <div className="stack" style={{ flex: 1, gap: "var(--space-4)" }}>
            <section className="card card--form">
              <h2 style={{ font: "500 18px var(--serif)", margin: 0, letterSpacing: "-0.03em" }}>Summary</h2>
              <dl className="data-list">
                <dt>Email</dt>
                <dd className="text-mono-sm">{email || "—"}</dd>
                <dt>Skills</dt>
                <dd className="text-mono-sm">{skills.length ? skills.join(", ") : "None selected"}</dd>
              </dl>
            </section>

            <button className="btn btn-primary" type="submit" disabled={saving || !email} style={{ width: "100%", justifyContent: "center" }}>
              {saving ? <span className="spinner" /> : "Send invite"}
            </button>

            <button type="button" className="btn btn-secondary" onClick={() => router.push("/dashboard/agents")} style={{ width: "100%", justifyContent: "center" }}>
              Cancel
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
