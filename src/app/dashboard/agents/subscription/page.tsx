"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { showToast } from "@/lib/use-toast";

interface AgentPlan {
  id: string;
  name: string;
  price_cents: number;
  call_allowance: number;
  features: Record<string, unknown>;
  active: boolean;
}

interface Subscription {
  id: string;
  plan_id: string;
  status: string;
  calls_used: number;
  start_date: string;
  end_date: string | null;
  auto_renew: boolean;
}

export default function AgentSubscriptionPage() {
  return (
    <Suspense fallback={<div className="dashboard-page"><div className="stack" style={{ gap: 12 }}>{Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton skeleton-text" />)}</div></div>}>
      <AgentSubscriptionContent />
    </Suspense>
  );
}

function AgentSubscriptionContent() {
  const searchParams = useSearchParams();
  const { data: session } = authClient.useSession();
  const user = session?.user;

  const [plans, setPlans] = useState<AgentPlan[]>([]);
  const [mySubs, setMySubs] = useState<Subscription[]>([]);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    fetch("/api/v1/me").then(async (res) => {
      if (res.ok) {
        const body = await res.json();
        setAgentId(body.data.agentId ?? null);
      }
    });
  }, [user]);

  useEffect(() => {
    Promise.all([
      fetch("/api/v1/agent-plans?active=true").then(r => r.ok ? r.json() : { data: [] }),
      agentId ? fetch(`/api/v1/agent-subscriptions?agent_id=${agentId}`).then(r => r.ok ? r.json() : { data: [] }) : Promise.resolve({ data: [] }),
    ]).then(([plansBody, subsBody]) => {
      setPlans(plansBody.data ?? []);
      setMySubs(subsBody.data ?? []);
      setLoading(false);
    });
  }, [agentId]);

  const handleFreeSubscribe = async (planId: string) => {
    setSubscribing(planId);
    setError(null);
    try {
      const res = await fetch("/api/v1/agent-subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_id: planId }),
      });
      const body = await res.json();
      if (res.ok) {
        setMySubs((prev) => [body.data, ...prev]);
        showToast("Subscribed", "success");
      } else {
        setError(body.message ?? "Failed to subscribe");
        showToast(body.message ?? "Failed to subscribe", "error");
      }
    } catch {
      setError("Network error");
      showToast("Network error", "error");
    } finally {
      setSubscribing(null);
    }
  };

  const handlePaidSubscribe = async (planId: string) => {
    setSubscribing(planId);
    setError(null);
    try {
      const res = await fetch("/api/v1/agent-subscriptions/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_id: planId }),
      });
      const body = await res.json();
      if (res.ok && body.data?.url) {
        window.location.href = body.data.url;
      } else {
        setError(body.message ?? "Failed to create checkout");
        showToast(body.message ?? "Failed to create checkout", "error");
        setSubscribing(null);
      }
    } catch {
      setError("Network error");
      showToast("Network error", "error");
      setSubscribing(null);
    }
  };

  if (loading) return (
    <div className="dashboard-page">
      <div className="stack" style={{ gap: 12 }}>{Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton skeleton-text" />)}</div>
    </div>
  );

  const activeSub = mySubs.find((s) => s.status === "active");
  const activePlan = activeSub ? plans.find((p) => p.id === activeSub.plan_id) : null;

  return (
    <div className="dashboard-page">
      <div className="dashboard-page-header">
        <div>
          <p className="eyebrow"><i /> AGENT / SUBSCRIPTION</p>
          <h1>My Subscription</h1>
        </div>
      </div>

      {searchParams.get("subscribe") === "success" && (
        <div className="card" style={{ borderColor: "var(--accent)", padding: "var(--space-5)" }}>
          <p style={{ color: "var(--accent)", fontWeight: 600 }}>&checkmark; Payment successful! Your subscription is now active.</p>
        </div>
      )}

      {error && <p className="form-error">{error}</p>}

      {activeSub && activePlan ? (
        <div className="card" style={{ padding: "var(--space-6)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <p className="form-label" style={{ fontSize: 11, letterSpacing: "0.08em", margin: "0 0 var(--space-2)" }}>CURRENT PLAN</p>
              <h2 style={{ font: "500 28px var(--serif)", margin: 0, letterSpacing: "-0.03em" }}>{activePlan.name}</h2>
              <p className="text-muted" style={{ marginTop: 4 }}>${(activePlan.price_cents / 100).toFixed(2)} / month &middot; {activePlan.call_allowance} calls included</p>
            </div>
            <span className={`badge ${activeSub.status === "active" ? "badge-success" : ""}`} style={{ fontSize: 11, textTransform: "uppercase" }}>{activeSub.status}</span>
          </div>
          <div style={{ marginTop: "var(--space-5)", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "var(--space-4)" }}>
            <div>
              <p className="text-mono-sm" style={{ margin: "0 0 4px", color: "var(--muted)" }}>CALLS USED</p>
              <p style={{ font: "500 22px var(--mono)", margin: 0 }}>{activeSub.calls_used} / {activePlan.call_allowance}</p>
              {activePlan.call_allowance > 0 && (
                <progress style={{ marginTop: 8, width: "100%", height: 4 }} value={activeSub.calls_used} max={activePlan.call_allowance}></progress>
              )}
            </div>
            <div>
              <p className="text-mono-sm" style={{ margin: "0 0 4px", color: "var(--muted)" }}>START DATE</p>
              <p style={{ font: "500 18px var(--mono)", margin: 0 }}>{new Date(activeSub.start_date).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-mono-sm" style={{ margin: "0 0 4px", color: "var(--muted)" }}>RENEWAL</p>
              <p style={{ font: "500 18px var(--mono)", margin: 0 }}>{activeSub.auto_renew ? "Auto" : "Manual"}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: "var(--space-5)", textAlign: "center" }}>
          <p className="text-muted" style={{ margin: 0 }}>No active subscription. Choose a plan below to get started.</p>
        </div>
      )}

      {plans.length > 0 && (
        <div>
          <h2 style={{ font: "500 18px var(--serif)", margin: "0 0 var(--space-4)", letterSpacing: "-0.03em" }}>
            {activeSub ? "Upgrade or Change Plan" : "Available Plans"} 
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "var(--space-4)" }}>
            {plans.map((p) => {
              const isCurrentPlan = activeSub?.plan_id === p.id;
              const isFree = p.price_cents === 0;
              return (
                <div key={p.id} className="card" style={{
                  padding: "var(--space-6)",
                  display: "flex", flexDirection: "column",
                  borderColor: isCurrentPlan ? "var(--accent)" : undefined,
                  position: "relative",
                }}>
                  {isCurrentPlan && (
                    <span style={{ position: "absolute", top: 10, right: 10, fontSize: 10, letterSpacing: "1px", textTransform: "uppercase", color: "var(--accent)" }}>Active</span>
                  )}
                  <h3 style={{ font: "500 20px var(--serif)", margin: "0 0 var(--space-1)", letterSpacing: "-0.03em" }}>{p.name}</h3>
                  <p style={{ font: "600 36px/1 var(--mono)", margin: "var(--space-3) 0 var(--space-1)", letterSpacing: "-0.05em" }}>
                    ${(p.price_cents / 100).toFixed(2)}
                    <span style={{ fontSize: 14, fontWeight: 400, color: "var(--muted)", letterSpacing: 0 }}>/mo</span>
                  </p>
                  <p className="text-muted" style={{ margin: "0 0 var(--space-4)" }}>{p.call_allowance.toLocaleString()} calls / month</p>
                  <div style={{ flex: 1 }} />
                  {isCurrentPlan ? (
                    <button className="btn btn-ghost" disabled style={{ width: "100%" }}>Current Plan</button>
                  ) : isFree ? (
                    <button
                      className="btn btn-primary"
                      style={{ width: "100%" }}
                      onClick={() => handleFreeSubscribe(p.id)}
                      disabled={subscribing === p.id}
                    >
                      {subscribing === p.id ? "Subscribing..." : "Subscribe — Free"}
                    </button>
                  ) : (
                    <button
                      className="btn btn-primary"
                      style={{ width: "100%" }}
                      onClick={() => handlePaidSubscribe(p.id)}
                      disabled={subscribing === p.id}
                    >
                      {subscribing === p.id ? "Redirecting..." : `Subscribe — $${(p.price_cents / 100).toFixed(2)}`}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
