import { apiHandler, ok, noContent, fail } from "@/server/api-utils";
import { calls, callEvents, agents } from "@/server/repositories";
import { ForbiddenError, ConflictError } from "@/server/errors";
import { validate, updateCallSchema } from "@/server/validate";
import { assertTransition, type CallState } from "@/domain/calls";
import type { CallRow } from "@/server/repositories/calls";
import type { NextResponse } from "next/server";

const PLATFORM_ROLES = ["admin"];

function scopeFor(context: { agencyId?: string | null; user?: { role?: string } }): string | undefined {
  const scope = context.agencyId ?? undefined;
  if (!scope && !PLATFORM_ROLES.includes(context.user?.role ?? "")) {
    throw new ForbiddenError("Agency scope required");
  }
  return scope;
}

interface CallAccessContext {
  user?: { role?: string } | null;
  membership?: { id: string } | null;
  isHead?: boolean;
}

/**
 * Plain agents may touch ONLY their own calls (unassigned ringing calls stay
 * visible so popup/accept flows never break). Returns the call, or a 40x
 * Response when the caller must not see it. Heads/admins bypass.
 */
async function requireCallAccess(
  id: string,
  scope: string | undefined,
  context: CallAccessContext,
): Promise<{ call: CallRow } | { error: NextResponse }> {
  const call = await calls.findById(id, scope).catch(() => null);
  if (!call) return { error: fail("Call not found", 404) };
  if (context.user?.role !== "admin" && !context.isHead) {
    const me = context.membership ? await agents.findByMembershipId(context.membership.id).catch(() => null) : null;
    if (!me) return { error: fail("Agent profile not found", 403) };
    if (call.agent_id && call.agent_id !== me.id) return { error: fail("Call not found", 404) };
  }
  return { call };
}

export const GET = apiHandler(async (req, context) => {
  const { params, agencyId, user, membership, isHead } = context;
  const { id } = await params;
  const scope = scopeFor({ agencyId, user });
  const access = await requireCallAccess(id, scope, { user, membership, isHead });
  if ("error" in access) return access.error;
  const events = await callEvents.findByCallId(id, scope);
  return ok({ ...access.call, events });
}, { resource: "calls", action: "view" });

export const PATCH = apiHandler(async (req, context) => {
  const { params, agencyId, user, membership, isHead } = context;
  const { id } = await params;
  const body = validate(updateCallSchema, await req.json());
  const scope = scopeFor({ agencyId, user });
  // Ownership mirrors GET: without this any agent could force a teammate's
  // call into missed/ended/connected via generic update (dedicated
  // accept/reject/hold/hangup routes carry their own checks).
  const access = await requireCallAccess(id, scope, { user, membership, isHead });
  if ("error" in access) return access.error;
  const current = access.call;

  if (body.state) {
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
