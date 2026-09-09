"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { authClient } from "@/lib/auth-client";
import { useToast } from "@/lib/use-toast";
import { useSocket } from "@/lib/use-socket";
import Softphone from "@/components/softphone";
import "@/styles/dashboard.css";

function NotificationBadge({ membershipId }: { membershipId: string | null }) {
  const { socket } = useSocket(membershipId);
  const [count, setCount] = useState(0);

  const refresh = () => {
    fetch("/api/v1/notifications").then((res) => {
      if (!res.ok) return;
      res.json().then((body) => {
        const unread = (body.data ?? []).filter((n: { dispatched_at: string | null }) => !n.dispatched_at).length;
        setCount(unread);
      });
    }).catch(() => {});
  };

  useEffect(refresh, []);
  useEffect(() => {
    if (!socket) return;
    socket.on("notification:new", refresh);
    return () => { socket.off("notification:new", refresh); };
  }, [socket]);

  if (count === 0) return null;
  return <span className="badge badge-danger" style={{ marginLeft: 6, fontSize: 9 }}>{count}</span>;
}

const agentNav = [
  { label: "Command", href: "/dashboard", icon: "01" },
  { label: "Take Calls", href: "/dashboard/take-calls", icon: "01b" },
  { label: "Book Call", href: "/dashboard/onboarding", icon: "01c" },
  { label: "Calls", href: "/dashboard/calls", icon: "06" },
  // Finance group: Keep Subscriptions + Wallet consecutive + visually grouped (billing)
  { label: "My Wallet", href: "/dashboard/wallet/agent", icon: "07b" },
  { label: "Subscriptions", href: "/dashboard/agents/subscription", icon: "05f" },
  { label: "Reports", href: "/dashboard/reports", icon: "08" },
  { label: "Scripts", href: "/dashboard/scripts", icon: "05c" },
  { label: "Tutorials", href: "/dashboard/tutorials", icon: "05h" },
  { label: "Support", href: "/dashboard/support", icon: "09b" },
  { label: "Notifications", href: "/dashboard/notifications", icon: "09" },
  { label: "Settings", href: "/dashboard/settings", icon: "10" },
  { label: "Feature Requests", href: "/dashboard/feature-requests", icon: "11" },
];

const adminNavGroups = [
  {
    label: "PEOPLE", items: [
      { label: "Agencies", href: "/dashboard/admin/agencies", icon: "04" },
      { label: "Agents", href: "/dashboard/agents", icon: "05" },
      { label: "Leads", href: "/dashboard/leads", icon: "02" },
    ]
  },
  {
    label: "OPERATIONS", items: [
      { label: "Campaigns", href: "/dashboard/campaigns", icon: "03" },
      { label: "Publishers", href: "/dashboard/admin/publishers", icon: "03b" },
      { label: "Calls", href: "/dashboard/calls", icon: "06" },
      { label: "Disputes", href: "/dashboard/admin/disputes", icon: "06c" },
      { label: "Recordings", href: "/dashboard/recordings", icon: "06b" },
      { label: "Scripts", href: "/dashboard/scripts", icon: "05c" },
      { label: "Skills", href: "/dashboard/admin/skills", icon: "05d" },
    ]
  },
  {
    label: "FINANCE", items: [
      { label: "Plans", href: "/dashboard/admin/plans", icon: "05f" },
      { label: "Fees", href: "/dashboard/admin/fees", icon: "05g" },
      { label: "Revenue", href: "/dashboard/admin/revenue", icon: "08b" },
      { label: "Wallet", href: "/dashboard/wallet", icon: "07" },
    ]
  },
  {
    label: "SYSTEM", items: [
      { label: "Calendar", href: "/dashboard/admin/calendar", icon: "10c" },
      { label: "Reports", href: "/dashboard/reports", icon: "08" },
      { label: "Support", href: "/dashboard/admin/support", icon: "09b" },
      { label: "CMS", href: "/dashboard/admin/cms", icon: "11b" },
      { label: "Notifications", href: "/dashboard/notifications", icon: "09" },
      { label: "Settings", href: "/dashboard/settings", icon: "10" },
      { label: "System Settings", href: "/dashboard/admin/settings", icon: "10b" },
      { label: "Feature Requests", href: "/dashboard/feature-requests", icon: "11" },
    ]
  },
];

const publisherNav = [
  { label: "Overview", href: "/dashboard/publisher", icon: "01" },
  { label: "Campaigns", href: "/dashboard/publisher/campaigns", icon: "03" },
  { label: "Calls", href: "/dashboard/publisher/calls", icon: "06" },
  { label: "Payouts", href: "/dashboard/publisher/payouts", icon: "07" },
  { label: "Scripts", href: "/dashboard/scripts", icon: "05c" },
  { label: "Tutorials", href: "/dashboard/tutorials", icon: "05h" },
  { label: "Settings", href: "/dashboard/publisher/settings", icon: "10" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const user = session?.user;
  const [serverRole, setServerRole] = useState<string | null>(null);
  const role = serverRole ?? (user as { role?: string } | undefined)?.role;
  const isAdmin = role === "admin" || role === "super_admin";
  const isPublisher = role === "publisher";
  const initials = user?.name?.split(" ").map((n) => n[0]).join("").toUpperCase() ?? "??";
  const { toasts, dismiss } = useToast();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [membershipId, setMembershipId] = useState<string | null>(null);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [agentAvailability, setAgentAvailability] = useState<string>("offline");
  const [availToggling, setAvailToggling] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!user) return;
    const pendingInvite = localStorage.getItem("pending_invite");
    if (pendingInvite) {
      localStorage.removeItem("pending_invite");
      fetch(`/api/v1/invites/${pendingInvite}/accept`, { method: "POST" });
    }
    fetch("/api/v1/me").then(async (res) => {
      if (res.ok) {
        const body = await res.json();
        if (body.data.user?.role) setServerRole(body.data.user.role);
        setMembershipId(body.data.membership?.id ?? null);
        setAgentId(body.data.agentId ?? null);
        if (body.data.agentId) {
          const agentRes = await fetch(`/api/v1/agents/${body.data.agentId}`);
          if (agentRes.ok) {
            const agentBody = await agentRes.json();
            setAgentAvailability(agentBody.data.availability ?? "offline");
          }
        }
      }
    });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    if (isAdmin && pathname === "/dashboard") {
      router.replace("/dashboard/admin");
    } else if (isPublisher && pathname === "/dashboard") {
      router.replace("/dashboard/publisher");
    } else if (!isAdmin && pathname.startsWith("/dashboard/admin")) {
      router.replace("/dashboard");
    } else if (!isPublisher && pathname.startsWith("/dashboard/publisher")) {
      router.replace("/dashboard");
    }
  }, [user, isAdmin, isPublisher, pathname, router]);

  async function handleSignOut() {
    setDropdownOpen(false);
    try {
      await authClient.signOut();
    } catch {
      // If the sign-out API call fails (e.g. network error), the httpOnly
      // session cookie persists and middleware would redirect /login back
      // to /dashboard. Force-clear the cookie client-side, then hard reload.
      document.cookie = "better-auth.session_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
      document.cookie = "__session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
    } finally {
      window.location.href = "/login";
    }
  }

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  function renderNav() {
    if (isPublisher) {
      return (
        <nav>
          {publisherNav.map((item) => (
            <Link key={item.href} className={isActive(item.href) ? "active" : ""} href={item.href} title={item.label}>
              <b>{item.icon}</b>{item.label}
              {item.href === "/dashboard/notifications" && <NotificationBadge membershipId={membershipId} />}
            </Link>
          ))}
        </nav>
      );
    }
    if (isAdmin) {
      return (
        <nav>
          <Link className={isActive("/dashboard") ? "active" : ""} href="/dashboard" title="Command">
            <b>01</b>Command
          </Link>
          {adminNavGroups.map((group) => (
            <div key={group.label}>
              <span className="nav-section-label">{group.label}</span>
              {group.items.map((item) => (
                <Link key={item.href} className={isActive(item.href) ? "active" : ""} href={item.href} title={item.label}>
                  <b>{item.icon}</b>{item.label}
                  {item.href === "/dashboard/notifications" && <NotificationBadge membershipId={membershipId} />}
                </Link>
              ))}
            </div>
          ))}
          <Link
            className={
              pathname.startsWith("/dashboard/admin") &&
              !pathname.startsWith("/dashboard/admin/agencies") &&
              !pathname.startsWith("/dashboard/admin/dispositions") &&
              !pathname.startsWith("/dashboard/admin/skills") &&
              !pathname.startsWith("/dashboard/admin/publishers") &&
              !pathname.startsWith("/dashboard/admin/settings")
                ? "active admin-link" : "admin-link"
            }
            href="/dashboard/admin" title="Admin Console"
          >
            <b>AA</b>Admin
          </Link>
        </nav>
      );
    }
    const financeGrouped = new Set(["/dashboard/wallet/agent", "/dashboard/agents/subscription"]);
    const financeItems = agentNav.filter((i) => financeGrouped.has(i.href));
    const mainItems = agentNav.filter((i) => !financeGrouped.has(i.href));
    return (
      <nav>
        {mainItems.slice(0, 4).map((item) => (
          <Link key={item.href} className={isActive(item.href) ? "active" : ""} href={item.href} title={item.label}>
            <b>{item.icon}</b>{item.label}
            {item.href === "/dashboard/notifications" && <NotificationBadge membershipId={membershipId} />}
          </Link>
        ))}
        <div style={{ margin: "8px 0", padding: "8px 6px", border: "1px solid var(--line)", borderRadius: 10, background: "rgba(168,85,247,0.06)" }}>
          <span className="nav-section-label" style={{ marginBottom: 4, display: "block", fontSize: 9, letterSpacing: "0.12em" }}>BILLING</span>
          {financeItems.map((item) => (
            <Link key={item.href} className={isActive(item.href) ? "active" : ""} href={item.href} title={item.label} style={{ marginBottom: 2 }}>
              <b>{item.icon}</b>{item.label}
            </Link>
          ))}
        </div>
        {mainItems.slice(4).map((item) => (
          <Link key={item.href} className={isActive(item.href) ? "active" : ""} href={item.href} title={item.label}>
            <b>{item.icon}</b>{item.label}
            {item.href === "/dashboard/notifications" && <NotificationBadge membershipId={membershipId} />}
          </Link>
        ))}
      </nav>
    );
  }

  return (
    <div className="console" data-role={isAdmin ? "admin" : isPublisher ? "publisher" : "agent"} style={{position:"relative"}}>
      <div aria-hidden style={{position:"absolute", inset:"0 0 auto 0", height:1, background:"linear-gradient(90deg, transparent, rgba(168,85,247,.22), transparent)", pointerEvents:"none"}} />
      <aside className="sidebar">
        <Link className="wordmark" href="/" style={{letterSpacing:"3px"}}>COVERAGE CALLS<span>&#9650;</span></Link>
        <p className="agency">{isAdmin ? "ADMIN CONSOLE" : isPublisher ? "PUBLISHER PORTAL" : "OPERATIONS CONSOLE"}</p>
        {renderNav()}
        <div className="operator" ref={dropdownRef}>
          <button
            className="operator-trigger"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            aria-haspopup="true"
            aria-expanded={dropdownOpen}
          >
            <span className="avatar">{initials}</span>
            <div>
              <strong>{user?.name ?? "Operator"}</strong>
              <small>{user?.email ?? ""}</small>
            </div>
            <span className="online-dot" style={{ background: agentAvailability === "available" ? "var(--accent)" : "var(--muted)" }} />
            <span className={`chevron${dropdownOpen ? " open" : ""}`}>&#9662;</span>
          </button>
          {dropdownOpen && (
            <div className="operator-dropdown">
              <div className="dropdown-header">
                <span className="avatar">{initials}</span>
                <div>
                  <strong>{user?.name ?? "Operator"}</strong>
                  <small>{user?.email ?? ""}</small>
                  {role && <span className="badge" style={{ marginTop: 4, fontSize: 9, textTransform: "uppercase" }}>{role === "super_admin" ? "super admin" : role}</span>}
                </div>
              </div>
              <div className="dropdown-availability">
                <span className="online-dot" style={{ background: agentAvailability === "available" ? "var(--accent)" : "var(--muted)", width: 8, height: 8 }} />
                <span style={{ fontSize: 12 }}>{agentAvailability === "available" ? "Online" : "Offline"}</span>
                <button
                  className="btn btn-sm"
                  style={{ marginLeft: "auto", fontSize: 10 }}
                  disabled={availToggling || !agentId}
                  onClick={async () => {
                    if (!agentId || availToggling) return;
                    setAvailToggling(true);
                    const next = agentAvailability === "available" ? "offline" : "available";
                    const res = await fetch(`/api/v1/agents/${agentId}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ availability: next }),
                    });
                    if (res.ok) setAgentAvailability(next);
                    setAvailToggling(false);
                  }}
                >
                  {availToggling ? "..." : agentAvailability === "available" ? "Go Offline" : "Go Online"}
                </button>
              </div>
              <button className="dropdown-item" onClick={handleSignOut}>
                Sign out
              </button>
            </div>
          )}
        </div>
      </aside>
      <section className="console-main">
        {children}
      </section>
      <Softphone membershipId={membershipId} agentId={agentId} />
      {toasts.length > 0 && (
        <div style={{ position: "fixed", bottom: "var(--space-6)", right: "var(--space-6)", display: "flex", flexDirection: "column", gap: 8, zIndex: 9999 }}>
          {toasts.map((t) => (
            <div key={t.id} className={`toast ${t.type === "success" ? "toast-success" : t.type === "error" ? "toast-error" : t.type === "warning" ? "toast-warning" : "toast-info"}`} onClick={() => dismiss(t.id)} style={{ cursor: "pointer" }}>
              {t.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
