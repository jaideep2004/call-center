export type Role = "super_admin" | "admin" | "agency" | "manager" | "finance" | "agent" | "publisher";

export type Resource =
  | "agents" | "leads" | "calls" | "wallet" | "revenue"
  | "reports" | "cms" | "settings" | "support"
  | "membership" | "affiliate" | "agency" | "users"
  | "features" | "skills" | "publishers" | "publisher-portal";

export type Action =
  | "create" | "read" | "update" | "delete"
  | "manage" | "view" | "export"
  | "approve" | "assign" | "monitor"
  | "recharge" | "withdraw" | "accept";

export const permissionMatrix: Record<Role, Partial<Record<Resource, Action[]>>> = {
  super_admin: {
    agents: ["manage"], leads: ["manage"], calls: ["manage"], wallet: ["manage"],
    revenue: ["view"], reports: ["manage"], cms: ["manage"], settings: ["manage"],
    support: ["manage"], membership: ["manage"], affiliate: ["manage"], agency: ["manage"], users: ["manage"],
    features: ["manage"], skills: ["manage"], publishers: ["manage"],
  },
  admin: {
    agents: ["manage"], leads: ["manage"], calls: ["manage"], wallet: ["manage"],
    revenue: ["view"], reports: ["manage"], cms: ["manage"], settings: ["manage"],
    support: ["manage"], membership: ["manage"], affiliate: ["manage"], agency: ["view"], users: ["view"],
    features: ["manage"], skills: ["manage"], publishers: ["manage"],
  },
  agency: {
    agents: ["manage"], leads: ["manage"], calls: ["manage"], wallet: ["manage"],
    revenue: ["view"], reports: ["view"], membership: ["view"], support: ["manage"], settings: ["view"],
    features: ["view", "create"], skills: ["view"], publishers: ["view"], agency: ["manage"], users: ["manage"],
  },
  manager: {
    agents: ["view"], leads: ["assign", "view"], calls: ["monitor", "view"],
    wallet: ["view"], revenue: ["view"], reports: ["view"], support: ["view"],
    features: ["view", "create"], skills: ["view"], publishers: ["view"],
  },
  finance: {
    wallet: ["view"], revenue: ["view"], reports: ["view"], calls: ["view"],
    features: ["view", "create"], skills: ["view"], publishers: ["view"],
  },
  agent: {
    agents: ["view", "update"], leads: ["view"], calls: ["view", "accept", "update"], wallet: ["view", "recharge"],
    reports: ["view"], membership: ["view"], affiliate: ["manage"], settings: ["view"],
    features: ["view", "create"], skills: ["view"], agency: ["create"], support: ["view", "create"],
  },
  publisher: {
    publishers: ["view"], "publisher-portal": ["view"],
  },
};

const routeMap: Record<string, Resource> = {
  agents: "agents", leads: "leads", calls: "calls", wallet: "wallet",
  revenue: "revenue", reports: "reports", cms: "cms", settings: "settings",
  support: "support", membership: "membership", affiliate: "affiliate",
  agency: "agency", users: "users",
};

export function hasPermission(role: Role, resource: Resource, action: Action): boolean {
  const resourcePerms = permissionMatrix[role]?.[resource];
  if (!resourcePerms) return false;
  if (resourcePerms.includes("manage")) return true;
  return resourcePerms.includes(action);
}

export function canAccessRoute(role: Role, pathname: string): boolean {
  const segment = pathname.split("/").filter(Boolean)[0];
  const resource = routeMap[segment];
  if (!resource) return true;
  return hasPermission(role, resource, "view") || hasPermission(role, resource, "manage");
}

export function getPermittedResources(role: Role): Resource[] {
  return Object.keys(permissionMatrix[role] ?? {}) as Resource[];
}
