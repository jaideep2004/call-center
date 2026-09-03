"use client";

import { useState, useEffect, useCallback } from "react";
import DataTable from "@/components/data-table";
import type { Column } from "@/components/data-table";
import { showToast } from "@/lib/use-toast";

interface AgentPlan {
  id: string;
  name: string;
  price_cents: number;
  call_allowance: number;
  features: Record<string, unknown>;
  active: boolean;
  billing_type: string;
}

const emptyForm = { name: "", priceCents: 0, callAllowance: 0 };

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<AgentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<AgentPlan | null>(null);
  const [name, setName] = useState("");
  const [priceCents, setPriceCents] = useState(0);
  const [callAllowance, setCallAllowance] = useState(0);
  const [billingType, setBillingType] = useState<'prepaid' | 'postpaid'>('prepaid');
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  useEffect(() => {
    fetch("/api/v1/agent-plans").then(async (res) => {
      if (res.ok) {
        const body = await res.json();
        setPlans(body.data ?? []);
      }
      setLoading(false);
    });
  }, []);

  const resetForm = useCallback(() => {
    setShowForm(false);
    setEditingPlan(null);
    setName(""); setPriceCents(0); setCallAllowance(0); setBillingType('prepaid');
  }, []);

  const openEditForm = (plan: AgentPlan) => {
    setEditingPlan(plan);
    setName(plan.name);
    setPriceCents(plan.price_cents);
    setCallAllowance(plan.call_allowance);
    setBillingType((plan.billing_type as 'prepaid' | 'postpaid') ?? 'prepaid');
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!name || callAllowance < 0) return;
    setSaving(true);
    try {
      const isEdit = !!editingPlan;
      const res = await fetch(
        isEdit ? `/api/v1/agent-plans/${editingPlan.id}` : "/api/v1/agent-plans",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, price_cents: priceCents, call_allowance: callAllowance, billing_type: billingType }),
        },
      );
      if (res.ok) {
        const body = await res.json();
        if (isEdit) {
          setPlans((prev) => prev.map((p) => p.id === editingPlan.id ? { ...p, ...body.data } : p));
          showToast("Plan updated", "success");
        } else {
          setPlans((prev) => [...prev, body.data]);
          showToast("Plan created", "success");
        }
        resetForm();
      } else {
        showToast(`Failed to ${isEdit ? "update" : "create"} plan`, "error");
      }
    } catch {
      showToast("Network error", "error");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (plan: AgentPlan) => {
    try {
      const res = await fetch(`/api/v1/agent-plans/${plan.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !plan.active }),
      });
      if (res.ok) {
        setPlans((prev) => prev.map((p) => p.id === plan.id ? { ...p, active: !p.active } : p));
        showToast(`Plan ${plan.active ? "deactivated" : "activated"}`, "success");
      } else {
        showToast("Failed to toggle plan", "error");
      }
    } catch {
      showToast("Network error toggling plan", "error");
    }
  };

  const deletePlan = async (plan: AgentPlan) => {
    // Soft-delete: API deactivates — renamed to Archive (additive, no DB migration)
    if (!window.confirm(`Archive "${plan.name}"? This will deactivate it.`)) return;
    try {
      const res = await fetch(`/api/v1/agent-plans/${plan.id}`, { method: "DELETE" });
      if (res.ok) {
        setPlans((prev) => prev.map((p) => p.id === plan.id ? { ...p, active: false } : p));
        showToast("Plan deactivated", "success");
      } else {
        showToast("Failed to delete plan", "error");
      }
    } catch {
      showToast("Network error deleting plan", "error");
    }
  };

    const columns: Column<AgentPlan>[] = [
    { key: "name", header: "Name", render: (p) => <strong>{p.name}</strong> },
    // Price stored as integer cents to avoid float drift (display via /100)
    { key: "price_cents", header: "Price", render: (p) => <span>${(p.price_cents / 100).toFixed(2)}</span> },
    { key: "call_allowance", header: "Call Allowance", render: (p) => p.call_allowance === 0 ? <span className="badge badge-info">Unlimited</span> : <span>{p.call_allowance}</span> },
    {
      key: "billing_type", header: "Billing",
      render: (p) => <span className={`badge ${p.billing_type === 'postpaid' ? 'badge-info' : 'badge-success'}`}>{p.billing_type ?? 'prepaid'}</span>,
    },
    {
      key: "active", header: "Status",
      render: (p) => <span className={`badge ${p.active ? "badge-success" : ""}`}>{p.active ? "Active" : "Inactive"}</span>,
    },
    {
      key: "actions", header: "", className: "actions-cell",
      render: (p) => (
        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
          <button className="btn btn-sm" onClick={() => openEditForm(p)}>Edit</button>
          <button className={`btn btn-sm ${p.active ? "" : "btn-primary"}`} onClick={() => toggleActive(p)}>
            {p.active ? "Deactivate" : "Activate"}
          </button>
          <button className="btn btn-sm btn-danger" onClick={() => deletePlan(p)}>Archive</button>
        </div>
      ),
    },
  ];

  if (loading) return (
    <div className="dashboard-page">
      <div className="stack" style={{ gap: 12 }}>{Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton skeleton-text" />)}</div>
    </div>
  );

  const totalPages = Math.max(1, Math.ceil(plans.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedPlans = plans.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="dashboard-page">
      <div className="dashboard-page-header">
        <div>
          <p className="eyebrow"><i /> ADMIN / SUBSCRIPTION PLANS</p>
          <h1>Agent Plans</h1>
        </div>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
          {showForm ? "Cancel" : "New Plan"}
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ padding: "var(--space-6)", maxWidth: 520 }}>
          <h2 style={{ font: "500 18px var(--serif)", margin: "0 0 var(--space-4)", letterSpacing: "-0.03em" }}>
            {editingPlan ? "Edit Plan" : "Create New Plan"}
          </h2>
          <div className="stack" style={{ gap: "var(--space-4)" }}>
            <div className="form-group">
              <label className="form-label">Plan Name</label>
              <input className="input" placeholder="e.g. Starter, Pro, Enterprise" value={name} onChange={(e) => setName(e.target.value)} />
              <span className="form-hint">A short name to identify this subscription tier.</span>
            </div>
            <div className="form-group">
              <label className="form-label">Price</label>
              <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
                <span style={{ font: "16px var(--sans)", color: "var(--muted)" }}>$</span>
                {/* cents: integer cents in state avoids float drift; display as dollars */}
                <input className="input" type="number" min="0" step="0.01" placeholder="0.00" value={priceCents ? (priceCents / 100).toFixed(2) : ""} onChange={(e) => setPriceCents(Math.round(parseFloat(e.target.value || "0") * 100))} style={{ maxWidth: 160 }} />
                <span className="text-muted" style={{ fontSize: 13 }}>USD / month</span>
              </div>
              <span className="form-hint">Set to $0.00 for a free plan. Stored as integer cents.</span>
            </div>
            <div className="form-group">
              <label className="form-label">Call Allowance</label>
              <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
                <input className="input" type="number" min="0" step="1" placeholder="0" value={callAllowance || ""} onChange={(e) => setCallAllowance(Number(e.target.value))} style={{ maxWidth: 120 }} />
                <span className="text-muted" style={{ fontSize: 13 }}>calls / month</span>
              </div>
              <span className="form-hint">The number of calls included each billing cycle. Use 0 for unlimited.</span>
            </div>
            <div className="form-group">
              <label className="form-label">Billing Type</label>
              <select className="input" value={billingType} onChange={(e) => setBillingType(e.target.value as 'prepaid' | 'postpaid')} style={{ maxWidth: 200 }}>
                <option value="prepaid">Prepaid</option>
                <option value="postpaid">Postpaid</option>
              </select>
              <span className="form-hint">Prepaid charges upfront; postpaid bills after usage.</span>
            </div>
            <div style={{ display: "flex", gap: "var(--space-3)", paddingTop: "var(--space-2)" }}>
              <button className="btn btn-primary" onClick={handleSave} disabled={!name || callAllowance < 0 || saving}>
                {saving ? "Saving..." : editingPlan ? "Update Plan" : "Create Plan"}
              </button>
              <button className="btn btn-ghost" onClick={resetForm}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <DataTable
        columns={columns}
        data={pagedPlans}
        emptyMessage="No plans created yet."
        page={safePage}
        totalPages={totalPages}
        total={plans.length}
        onPageChange={setPage}
        sortBy=""
        order="desc"
        onSort={() => {}}
      />
    </div>
  );
}
