"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import "@/styles/auth.css";

export default function SetupPage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const user = session?.user;
  const [promoting, setPromoting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  async function handlePromote() {
    if (!user) return;
    setPromoting(true);
    setResult(null);
    try {
      const res = await fetch("/api/v1/setup/make-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id, role: "super_admin" }),
      });
      const json = await res.json();
      if (json.success) {
        setResult({ ok: true, message: "Promoted to Super Admin! Redirecting to dashboard..." });
        setTimeout(() => router.push("/dashboard"), 1500);
      } else {
        setResult({ ok: false, message: json.message ?? "Failed to promote" });
      }
    } catch {
      setResult({ ok: false, message: "Network error" });
    } finally {
      setPromoting(false);
    }
  }

  if (isPending) {
    return (
      <div className="auth-shell">
        <div className="card auth-card" style={{ textAlign: "center", padding: "3rem" }}>
          <div className="spinner" style={{ margin: "0 auto" }} />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="auth-shell">
        <div className="card auth-card">
          <div className="auth-header">
            <a className="wordmark" href="/">COVERAGE CALLS<span>&#9650;</span></a>
          </div>
          <h1>Setup</h1>
          <p className="auth-subtitle">You need to sign in first.</p>
          <a href="/login" className="btn btn-primary" style={{ textAlign: "center", display: "block" }}>Sign in</a>
        </div>
      </div>
    );
  }

  const initials = user.name?.split(" ").map((n) => n[0]).join("").toUpperCase() ?? "??";

  return (
    <div className="auth-shell">
      <div className="card auth-card">
        <div className="auth-header">
          <a className="wordmark" href="/">COVERAGE CALLS<span>&#9650;</span></a>
        </div>
        <h1>Welcome, {user.name?.split(" ")[0] ?? "there"}.</h1>
        <p className="auth-subtitle">One more step — promote yourself to admin.</p>

        <div className="auth-form">
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px", border: "1px solid var(--line)", borderRadius: 8, marginBottom: 20 }}>
            <span className="avatar" style={{ width: 40, height: 40, fontSize: 14, background: "#2a184c", display: "grid", placeItems: "center", borderRadius: "50%", color: "var(--cyan)" }}>
              {initials}
            </span>
            <div>
              <strong style={{ fontSize: 14 }}>{user.name}</strong>
              <small style={{ display: "block", marginTop: 3, color: "var(--muted)", fontSize: 12 }}>{user.email}</small>
              <small style={{ display: "block", marginTop: 2, color: "var(--muted)", fontSize: 10, fontFamily: "var(--mono)" }}>ID: {user.id}</small>
            </div>
          </div>

          {result && (
            <div className={`${result.ok ? "auth-success" : "auth-error"}`} style={{ marginBottom: 16 }}>
              {result.message}
            </div>
          )}

          <button className="btn btn-primary" onClick={handlePromote} disabled={promoting} style={{ width: "100%" }}>
            {promoting ? <span className="spinner" /> : "Promote to Super Admin"}
          </button>

          <div className="auth-footer" style={{ marginTop: 16 }}>
            <a href="/dashboard" style={{ color: "var(--cyan)", fontSize: 12 }}>Skip &rarr; try dashboard anyway</a>
          </div>
        </div>
      </div>
    </div>
  );
}
