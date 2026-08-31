"use client";

import { authClient } from "@/lib/auth-client";
import {
  hasPermission,
  canAccessRoute as checkRoute,
  getPermittedResources,
} from "@/server/services/permission-data";
import type { Role, Resource, Action } from "@/server/services/permission-data";

export function usePermission() {
  const { data: session } = authClient.useSession();
  const user = session?.user as { role?: Role } | undefined;
  const role = user?.role ?? null;

  function can(resource: Resource, action: Action): boolean {
    if (!role) return false;
    return hasPermission(role, resource, action);
  }

  function canAccessRoute(pathname: string): boolean {
    if (!role) return false;
    return checkRoute(role, pathname);
  }

  function permittedResources(): Resource[] {
    if (!role) return [];
    return getPermittedResources(role);
  }

  return { role, can, canAccessRoute, permittedResources, isLoaded: role !== null };
}
