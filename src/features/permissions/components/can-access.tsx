"use client";

import { usePermission } from "../hooks/use-permission";
import type { Resource, Action } from "@/server/services/permission-data";

interface CanAccessProps {
  resource: Resource;
  action: Action;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function CanAccess({ resource, action, children, fallback = null }: CanAccessProps) {
  const { can } = usePermission();
  if (can(resource, action)) return <>{children}</>;
  return <>{fallback}</>;
}
