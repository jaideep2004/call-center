import { apiHandler, ok, noContent } from "@/server/api-utils";
import { calls, callEvents } from "@/server/repositories";
import { ForbiddenError, ConflictError } from "@/server/errors";
import { validate, updateCallSchema } from "@/server/validate";
import { assertTransition, type CallState } from "@/domain/calls";

const PLATFORM_ROLES = ["super_admin", "admin"];

function scopeFor(context: { agencyId?: string | null; user?: { role?: string } }): string | undefined {
  const scope = context.agencyId ?? undefined;
  if (!scope && !PLATFORM_ROLES.includes(context.user?.role ?? "")) {
    throw new ForbiddenError("Agency scope required");
  }
  return scope;
}

export const GET = apiHandler(async (req, { params, agencyId, user }) => {
  const { id } = await params;
  const scope = scopeFor({ agencyId, user });
  const [call, events] = await Promise.all([
    calls.findById(id, scope),
    callEvents.findByCallId(id, scope),
  ]);
  return ok({ ...call, events });
}, { resource: "calls", action: "view" });

export const PATCH = apiHandler(async (req, { params, agencyId, user }) => {
  const { id } = await params;
  const body = validate(updateCallSchema, await req.json());
  const scope = scopeFor({ agencyId, user });

  if (body.state) {
    const current = await calls.findById(id, scope);
    assertTransition(current.state as CallState, body.state as CallState);
    const extra: Record<string, unknown> = { ...body };
    delete extra.state;
    const claimed = await calls.claimState(id, current.state, body.state, current.agency_id, extra);
    if (!claimed) throw new ConflictError("Call state changed concurrently");
    return ok(claimed, "Call updated");
  }

  const call = await calls.update(id, body, scope);
  return ok(call, "Call updated");
}, { resource: "calls", action: "update" });

export const DELETE = apiHandler(async (req, { params, agencyId, user }) => {
  const { id } = await params;
  const scope = scopeFor({ agencyId, user });
  await calls.softDelete(id, scope);
  return noContent();
}, { resource: "calls", action: "delete" });
