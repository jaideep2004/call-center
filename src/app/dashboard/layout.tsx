"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import {
  BarChart3, Bell, BookOpen, Building2, Calendar, CalendarPlus, Disc, FileText,
  GraduationCap, Landmark, Layers, LayoutDashboard, LayoutTemplate, LifeBuoy,
  Lightbulb, LogOut, Megaphone, Phone, PhoneCall, PhoneOff, Radio, Receipt, Scale, Settings,
  Shield, SlidersHorizontal, TrendingUp, UserPlus, Users, Wallet, Dot,
  type LucideIcon,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { showToast, useToast } from "@/lib/use-toast";
import { useSocket } from "@/lib/use-socket";
import Softphone from "@/components/softphone";
import "@/styles/dashboard.css";

/** Sidebar icon per legacy nav code (expanded: icon + label, collapsed rail: icon only). */
const NAV_ICONS: Record<string, LucideIcon> = {
  "01": LayoutDashboard, "01b": PhoneCall, "03": Megaphone, "01c": CalendarPlus,
  "06": Phone, "07b": Wallet, "05f": Layers, "05c": FileText, "05h": GraduationCap,
  "09b": LifeBuoy, "09": Bell, "10": Settings, "11": Lightbulb, "04": Building2,
  "05": Users, "02": UserPlus, "03b": Radio, "06c": Scale, "06b": Disc,
  "05g": Receipt, "08b": TrendingUp, "07": BookOpen, "10c": Calendar,
  "08": BarChart3, "11b": LayoutTemplate, "10b": SlidersHorizontal,
  "07c": Landmark, "AA": Shield, "04b": Users, "05e": SlidersHorizontal,
};

function NavIco({ code }: { code: string }) {
  const Ico = NAV_ICONS[code] ?? Dot;
  return <Ico size={16} strokeWidth={2} className="nav-ico" aria-hidden />;
}

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

interface BellNotification {
  id: string;
  topic: string;
  payload: Record<string, unknown>;
  occurred_at: string;
  dispatched_at: string | null;
}

/**
 * Fixed top-right bell rendered in ALL three dashboards (layout-level). The
 * endpoint is role-scoped server-side, so one component serves every role:
 * unread badge + dropdown with the latest ~10, mark-read on click,
 * mark-all-read, and a "View all" link.
 */
function NotificationBell({ membershipId }: { membershipId: string | null }) {
  const { socket } = useSocket(membershipId);
  const [items, setItems] = useState<BellNotification[]>([]);
  const [open, setOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  const refresh = () => {
    fetch("/api/v1/notifications").then((res) => {
      if (!res.ok) return;
      res.json().then((body) => setItems(body.data ?? []));
    }).catch(() => {});
  };

  useEffect(refresh, []);
  useEffect(() => {
    if (!socket) return;
    socket.on("notification:new", refresh);
    return () => { socket.off("notification:new", refresh); };
  }, [socket]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unread = items.filter((n) => !n.dispatched_at).length;
  // Unread first, then newest — cap the dropdown at ~10.
  const latest = [...items]
    .sort((a, b) => Number(!b.dispatched_at) - Number(!a.dispatched_at) || +new Date(b.occurred_at) - +new Date(a.occurred_at))
    .slice(0, 10);

  async function markRead(id: string) {
    const res = await fetch(`/api/v1/notifications/${id}`, { method: "PATCH" });
    if (res.ok) setItems((prev) => prev.map((n) => n.id === id ? { ...n, dispatched_at: new Date().toISOString() } : n));
  }

  async function markAllRead() {
    const res = await fetch("/api/v1/notifications/mark-all-read", { method: "POST" });
    if (res.ok) setItems((prev) => prev.map((n) => ({ ...n, dispatched_at: new Date().toISOString() })));
  }

  function summary(n: BellNotification): string {
    const p = n.payload ?? {};
    const text = (p.message ?? p.subject ?? p.title ?? "") as string;
    if (typeof text === "string" && text) return text.length > 80 ? `${text.slice(0, 80)}…` : text;
    return n.topic;
  }

  return (
    <div ref={bellRef} style={{ position: "relative" }}>
      <button
        type="button"
        className="btn btn-sm"
        onClick={() => { setOpen((v) => !v); if (!open) refresh(); }}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        title="Notifications"
        style={{ position: "relative", borderRadius: 9999, width: 36, height: 36, display: "grid", placeItems: "center", background: "transparent", border: "1px solid transparent" }}
      >
        <Bell size={16} aria-hidden />
        {unread > 0 && (
          <span className="badge badge-danger" style={{ position: "absolute", top: -6, right: -6, fontSize: 9, minWidth: 18, height: 18, display: "grid", placeItems: "center", borderRadius: 9999 }}>
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="card" style={{ position: "absolute", top: 44, right: 0, width: 340, maxWidth: "calc(100vw - 32px)", padding: 0, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderBottom: "1px solid var(--line)" }}>
            <strong style={{ fontSize: 13 }}>Notifications</strong>
            {unread > 0 && <button type="button" className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={markAllRead}>Mark all read</button>}
          </div>
          <div style={{ maxHeight: 360, overflowY: "auto" }}>
            {latest.length === 0 ? (
              <p className="text-muted" style={{ fontSize: 12, padding: "16px 14px", margin: 0 }}>No notifications yet.</p>
            ) : (
              latest.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => { if (!n.dispatched_at) void markRead(n.id); }}
                  style={{ display: "flex", gap: 10, width: "100%", textAlign: "left", padding: "10px 14px", background: n.dispatched_at ? "transparent" : "rgba(168,85,247,0.07)", border: "none", borderBottom: "1px solid var(--line)", cursor: "pointer", color: "var(--ink)" }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: "50%", marginTop: 5, flexShrink: 0, background: n.dispatched_at ? "var(--line)" : "var(--cyan)" }} />
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 12, fontWeight: n.dispatched_at ? 400 : 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{summary(n)}</span>
                    <span className="text-muted" style={{ display: "block", fontSize: 10, marginTop: 2 }}>{n.topic} · {new Date(n.occurred_at).toLocaleString()}</span>
                  </span>
                </button>
              ))
            )}
          </div>
          <Link href="/dashboard/notifications" onClick={() => setOpen(false)} className="btn btn-ghost btn-sm" style={{ width: "100%", justifyContent: "center", borderRadius: 0, borderTop: "1px solid var(--line)" }}>
            View all →
          </Link>
        </div>
      )}
    </div>
  );
}

/**
 * Sticky top-right action cluster beside the bell (all dashboards): logout
 * for everyone, Go Online/Offline for agents only. Surfaces the funding-gate
 * 422 message when an unfunded agent tries to go online.
 */
function TopActions({
  showOnline,
  agentId,
  agentAvailability,
  availToggling,
  onToggleAvailability,
  onSignOut,
}: {
  showOnline: boolean;
  agentId: string | null;
  agentAvailability: string;
  availToggling: boolean;
  onToggleAvailability: () => void;
  onSignOut: () => void;
}) {
  const online = agentAvailability === "available";
  const pill: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    borderRadius: 9999,
    height: 36,
    padding: "0 12px",
    fontSize: 11,
    fontWeight: 700,
    background: "transparent",
    border: "1px solid transparent",
    color: "var(--ink)",
    cursor: "pointer",
    whiteSpace: "nowrap",
  };
  return (
    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
      {showOnline && (
        <button
          type="button"
          onClick={onToggleAvailability}
          disabled={availToggling || !agentId}
          title={online ? "Go offline" : "Go online and start receiving calls"}
          aria-label={online ? "Go offline" : "Go online"}
          style={pill}
        >
          <span
            aria-hidden
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: online ? "var(--green)" : "var(--muted)",
              boxShadow: online ? "0 0 6px var(--green)" : "none",
            }}
          />
          {online ? <PhoneOff size={13} aria-hidden /> : <Phone size={13} aria-hidden />}
          {availToggling ? "…" : online ? "Online" : "Go Online"}
        </button>
      )}
      <button
        type="button"
        onClick={onSignOut}
        title="Log out"
        aria-label="Log out"
        style={{ ...pill, width: 36, padding: 0, justifyContent: "center" }}
      >
        <LogOut size={15} aria-hidden />
      </button>
    </div>
  );
}

const agentNav = [
  { label: "Command", href: "/dashboard", icon: "01" },
  { label: "Take Calls", href: "/dashboard/take-calls", icon: "01b" },
  { label: "Campaigns", href: "/dashboard/agent-campaigns", icon: "03" },
  { label: "Book Call", href: "/dashboard/onboarding", icon: "01c" },
  { label: "Calls", href: "/dashboard/calls", icon: "06" },
  // Finance group: Keep Subscriptions + Wallet consecutive + visually grouped (billing)
  { label: "My Wallet", href: "/dashboard/wallet/agent", icon: "07b" },
  { label: "Subscriptions", href: "/dashboard/agents/subscription", icon: "05f" },
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
      { label: "Users", href: "/dashboard/admin/users", icon: "04b" },
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
      { label: "Tutorials", href: "/dashboard/tutorials", icon: "05h" },
      { label: "Skills", href: "/dashboard/admin/skills", icon: "05e" },
    ]
  },
  {
    label: "FINANCE", items: [
      { label: "Plans", href: "/dashboard/admin/plans", icon: "05f" },
      { label: "Fees", href: "/dashboard/admin/fees", icon: "05g" },
      { label: "Revenue", href: "/dashboard/admin/revenue", icon: "08b" },
      { label: "Payments", href: "/dashboard/admin/payments", icon: "07c" },
      { label: "Ledger", href: "/dashboard/wallet", icon: "07" },
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
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const user = session?.user;
  const [serverRole, setServerRole] = useState<string | null>(null);
  const [isHead, setIsHead] = useState(false);
  const [roleReady, setRoleReady] = useState(false);
  const clientRole = (user as { role?: string } | undefined)?.role;
  // Server truth (DB) wins once loaded. Until roleReady resolves we render NO
  // role-specific nav — previously the agent nav painted first for admins
  // (wrong-role first paint on login). role === null → skeleton.
  const role = roleReady ? (serverRole ?? clientRole ?? null) : null;
  const isAdmin = role === "admin";
  const isPublisher = role === "publisher";
  const initials = user?.name?.split(" ").map((n) => n[0]).join("").toUpperCase() ?? "??";
  const { toasts, dismiss } = useToast();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => typeof window !== "undefined" && window.localStorage.getItem("cc-sidebar-collapsed") === "1",
  );
  function toggleSidebar() {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem("cc-sidebar-collapsed", next ? "1" : "0");
      } catch {
        /* storage unavailable (private mode) — collapse still works for the session */
      }
      return next;
    });
  }
  const [membershipId, setMembershipId] = useState<string | null>(null);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [agentAvailability, setAgentAvailability] = useState<string>("offline");
  const [availToggling, setAvailToggling] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Shared availability toggle (sidebar dropdown + sticky top-bar button).
  // Surfaces the funding-gate 422 so unfunded agents learn why they can't go online.
  // Device gate: going online requires the mic+speaker check (Take Calls
  // checklist), which is verified per-browser and stored under
  // cc-device-ready:<agentId>. Without it the agent would receive calls on
  // a browser with untested audio, so we block + redirect instead.
  function deviceVerified(): boolean {
    if (!agentId) return false;
    try {
      return window.localStorage.getItem(`cc-device-ready:${agentId}`) === "1";
    } catch {
      return false;
    }
  }
  async function toggleAvailability() {
    if (!agentId || availToggling) return;
    const next = agentAvailability === "available" ? "offline" : "available";
    if (next === "available" && !deviceVerified()) {
      showToast("Test your mic & speaker on Take Calls first", "warning");
      setDropdownOpen(false);
      router.push("/dashboard/take-calls");
      return;
    }
    setAvailToggling(true);
    try {
      const res = await fetch(`/api/v1/agents/${agentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ availability: next }),
      });
      if (res.ok) {
        setAgentAvailability(next);
      } else {
        const body = await res.json().catch(() => ({}));
        showToast(body.message ?? "Failed to update availability", "error");
      }
    } catch {
      showToast("Network error updating availability", "error");
    }
    setAvailToggling(false);
  }

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
        // Prefer explicit publisher linkage over stale role string
        if (body.data.publisherId) setServerRole("publisher");
        else if (body.data.publisher?.id) setServerRole("publisher");
        else if (body.data.user?.role) setServerRole(body.data.user.role);
        setIsHead(body.data.isHead === true);
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
      setRoleReady(true);
    }).catch(() => setRoleReady(true));
  }, [user]);

  useEffect(() => {
    if (!user || sessionPending || !roleReady) return;
    if (isAdmin && pathname === "/dashboard") {
      router.replace("/dashboard/admin");
    } else if (isPublisher && pathname === "/dashboard") {
      router.replace("/dashboard/publisher");
    } else if (!isAdmin && pathname.startsWith("/dashboard/admin")) {
      router.replace("/dashboard");
    } else if (!isPublisher && pathname.startsWith("/dashboard/publisher")) {
      router.replace("/dashboard");
    }
  }, [user, sessionPending, roleReady, isAdmin, isPublisher, pathname, router]);

  // Self-heal (mirrors Take Calls): an agent left online from an earlier
  // session whose mic+speaker check is missing on THIS browser is forced
  // offline once, so stale online presence can't receive calls with
  // untested audio. Skipped on the Take Calls page itself (it heals there
  // with full checklist context).
  const layoutHealDone = useRef(false);
  useEffect(() => {
    if (layoutHealDone.current) return;
    if (!agentId || isAdmin || isPublisher) return;
    if (agentAvailability !== "available") return;
    if (pathname.startsWith("/dashboard/take-calls")) return;
    let verified = false;
    try {
      verified = window.localStorage.getItem(`cc-device-ready:${agentId}`) === "1";
    } catch { /* storage unavailable — leave presence alone */ return; }
    if (verified) return;
    layoutHealDone.current = true;
    fetch(`/api/v1/agents/${agentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ availability: "offline" }),
    }).then(async (res) => {
      if (res.ok) {
        setAgentAvailability("offline");
        showToast("You were set offline — test mic & speaker on Take Calls to go back online", "warning");
      }
    }).catch(() => {});
  }, [agentId, agentAvailability, isAdmin, isPublisher, pathname]);

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
    // Role unknown (session/server still resolving): skeleton only, never a
    // wrong-role nav. Fixes the login flash where admins briefly saw the
    // agent sidebar.
    if (!roleReady || !role) {
      return (
        <nav aria-hidden>
          <div className="stack" style={{ gap: 8, padding: "4px 2px" }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="skeleton skeleton-text" style={{ height: 30 }} />
            ))}
          </div>
        </nav>
      );
    }
    if (isPublisher) {
      return (
        <nav>
          {publisherNav.map((item) => (
            <Link key={item.href} className={isActive(item.href) ? "active" : ""} href={item.href} title={item.label}>
              <NavIco code={item.icon} /><span className="nav-label">{item.label}</span>
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
            <NavIco code="01" /><span className="nav-label">Command</span>
          </Link>
          {adminNavGroups.map((group) => (
            <div key={group.label}>
              <span className="nav-section-label">{group.label}</span>
              {group.items.map((item) => (
                <Link key={item.href} className={isActive(item.href) ? "active" : ""} href={item.href} title={item.label}>
                  <NavIco code={item.icon} /><span className="nav-label">{item.label}</span>
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
            <NavIco code="AA" /><span className="nav-label">Admin</span>
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
            <NavIco code={item.icon} /><span className="nav-label">{item.label}</span>
            {item.href === "/dashboard/notifications" && <NotificationBadge membershipId={membershipId} />}
          </Link>
        ))}
        <div style={{ margin: "8px 0", padding: "8px 6px", border: "1px solid var(--line)", borderRadius: 10, background: "rgba(168,85,247,0.06)" }}>
          <span className="nav-section-label" style={{ marginBottom: 4, display: "block", fontSize: 9, letterSpacing: "0.12em" }}>BILLING</span>
          {financeItems.map((item) => (
            <Link key={item.href} className={isActive(item.href) ? "active" : ""} href={item.href} title={item.label} style={{ marginBottom: 2 }}>
              <NavIco code={item.icon} /><span className="nav-label">{item.label}</span>
            </Link>
          ))}
          {isHead && (
            <Link className={isActive("/dashboard/wallet/pool") ? "active" : ""} href="/dashboard/wallet/pool" title="Pool Wallet" style={{ marginBottom: 2 }}>
              <NavIco code="07c" /><span className="nav-label">Pool Wallet</span>
            </Link>
          )}
        </div>
        {mainItems.slice(4).map((item) => (
          <Link key={item.href} className={isActive(item.href) ? "active" : ""} href={item.href} title={item.label}>
            <NavIco code={item.icon} /><span className="nav-label">{item.label}</span>
            {item.href === "/dashboard/notifications" && <NotificationBadge membershipId={membershipId} />}
          </Link>
        ))}
      </nav>
    );
  }

  return (
    <div className="console" data-role={isAdmin ? "admin" : isPublisher ? "publisher" : "agent"} style={{position:"relative"}}>
      <div aria-hidden style={{position:"absolute", inset:"0 0 auto 0", height:1, background:"linear-gradient(90deg, transparent, rgba(168,85,247,.22), transparent)", pointerEvents:"none"}} />
      <aside className={sidebarCollapsed ? "sidebar sidebar--collapsed" : "sidebar"}>
        <div className="sidebar-top">
          <Link href="/" aria-label="Coverage Calls home" className="sidebar-brand" style={{ display: "inline-flex", alignItems: "center", padding: "0 10px" }}>
            <img src="/images/coveragecallsfinal.png" alt="Coverage Calls" className="sidebar-logo-full" style={{ height: 28, width: "auto", objectFit: "contain", display: "block" }} />
            <img src="/images/coveragefavicon.png" alt="Coverage Calls" className="sidebar-logo-mark" style={{ height: 32, width: 32, objectFit: "contain", display: "none" }} />
          </Link>
          <button
            type="button"
            className="sidebar-collapse-btn"
            onClick={toggleSidebar}
            aria-expanded={!sidebarCollapsed}
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? "»" : "«"}
          </button>
        </div>
        <p className="agency">{!roleReady || !role ? "CONSOLE" : isAdmin ? "ADMIN CONSOLE" : isPublisher ? "PUBLISHER PORTAL" : "OPERATIONS CONSOLE"}</p>
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
                  {role && <span className="badge" style={{ marginTop: 4, fontSize: 9, textTransform: "uppercase" }}>{isHead ? "agency head" : role}</span>}
                </div>
              </div>
                {!isAdmin && !isPublisher && (
                <div className="dropdown-availability">
                  <span className="online-dot" style={{ background: agentAvailability === "available" ? "var(--accent)" : "var(--muted)", width: 8, height: 8 }} />
                  <span style={{ fontSize: 12 }}>{agentAvailability === "available" ? "Online" : "Offline"}</span>
                    <button
                      className="btn btn-sm"
                      style={{ marginLeft: "auto", fontSize: 10 }}
                      disabled={availToggling || !agentId}
                      onClick={toggleAvailability}
                    >
                      {availToggling ? "..." : agentAvailability === "available" ? "Go Offline" : "Go Online"}
                    </button>
                </div>
                )}
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
      {/* Single header capsule (all dashboards): online toggle + logout + bell
          share one pill background instead of three floating buttons. */}
      {user && (
        <div
          style={{
            position: "fixed",
            top: 14,
            right: 16,
            zIndex: 9000,
            display: "flex",
            alignItems: "center",
            gap: 2,
            background: "rgba(20,12,40,0.88)",
            border: "1px solid var(--line)",
            borderRadius: 9999,
            padding: "4px 6px",
            backdropFilter: "blur(12px)",
            boxShadow: "0 8px 28px rgba(0,0,0,0.45)",
          }}
        >
          <TopActions
            showOnline={!isAdmin && !isPublisher}
            agentId={agentId}
            agentAvailability={agentAvailability}
            availToggling={availToggling}
            onToggleAvailability={toggleAvailability}
            onSignOut={handleSignOut}
          />
          <NotificationBell membershipId={membershipId} />
        </div>
      )}
      {!isAdmin && !isPublisher && <Softphone membershipId={membershipId} agentId={agentId} />}
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
