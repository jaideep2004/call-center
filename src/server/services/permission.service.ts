import { ForbiddenError } from "@/server/errors";
import { hasPermission as checkPermission } from "./permission-data";
export type { Role, Resource, Action } from "./permission-data";
export { hasPermission as checkPermission, canAccessRoute, getPermittedResources } from "./permission-data";

export function assertPermission(role: string, resource: string, action: string): void {
  if (!checkPermission(role as never, resource as never, action as never)) {
    throw new ForbiddenError(`Missing permission: ${resource}:${action} for role ${role}`);
  }
}
