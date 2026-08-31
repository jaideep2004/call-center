"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

interface MembershipDetail {
  id: string;
  agency_id: string;
  user_id: string;
  role: string;
  status: string;
}

const ROLE_PERMISSIONS: Record<string, string[]> = {
  super_admin: ["Full access to all resources and settings", "Can manage agencies, users, and billing"],
  admin: ["Full access to agency resources", "Can manage members, settings, and reports"],
  agency: ["Full access to agency operations", "Can manage agents, leads, calls, wallet"],
  manager: ["View agents and monitor calls", "Assign leads, view reports"],
  finance: ["View wallet, revenue, calls, and reports"],
  agent: ["View leads and calls", "Recharge wallet, manage affiliate settings"],
};

export default function MembershipDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [membership, setMembership] = useState<MembershipDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/v1/memberships/${id}`).then(async (res) => {
      if (res.ok) {
        const b = await res.json();
        setMembership(b.data);
      }
      setLoading(false);
    });
  }, [id]);

  if (loading) return (
    <div className="dashboard-page">
      <div className="stack" style={{ gap: 12 }}>{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton skeleton-text" />)}</div>
    </div>
  );

  if (!membership) return (
    <div className="dashboard-page">
      <div className="dashboard-page-header"><h1>Membership not found</h1></div>
      <button className="btn btn-secondary" onClick={() => router.push("/dashboard/membership")}>Back</button>
    </div>
  );

  const permissions = ROLE_PERMISSIONS[membership.role] ?? ["Custom permissions"];

  return (
    <div className="dashboard-page">
      <div className="dashboard-page-header">
        <div>
          <p className="eyebrow"><i /> SETTINGS / MEMBERSHIP</p>
          <h1>Membership Detail</h1>
        </div>
        <button className="btn btn-secondary" onClick={() => router.push("/dashboard/membership")}>Back</button>
      </div>
      <div className="split" style={{ "--gap": "2rem" } as React.CSSProperties}>
        <div className="card" style={{ flex: 1 }}>
          <h2>Details</h2>
          <dl className="data-list">
            <dt>Membership ID</dt><dd className="text-mono-sm">{membership.id}</dd>
            <dt>User ID</dt><dd className="text-mono-sm">{membership.user_id}</dd>
            <dt>Agency ID</dt><dd className="text-mono-sm">{membership.agency_id}</dd>
          </dl>
        </div>
        <div className="card" style={{ flex: 1 }}>
          <h2>Role & Status</h2>
          <dl className="data-list">
            <dt>Role</dt><dd><span className="badge">{membership.role}</span></dd>
            <dt>Status</dt><dd><span className={`badge${membership.status === "active" ? " badge-success" : ""}`}>{membership.status}</span></dd>
          </dl>
          <h2 style={{ marginTop: "var(--space-5)" }}>Permissions</h2>
          <ul style={{ paddingLeft: "var(--space-4)", fontSize: 13, lineHeight: 1.8 }}>
            {permissions.map((p, i) => <li key={i}>{p}</li>)}
          </ul>
        </div>
      </div>
    </div>
  );
}
