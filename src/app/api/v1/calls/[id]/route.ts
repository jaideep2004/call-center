import { apiHandler, ok, noContent, fail } from "@/server/api-utils";
import { calls, callEvents, agents, campaigns } from "@/server/repositories";
import { ForbiddenError, ConflictError } from "@/server/errors";
import { validate, updateCallSchema } from "@/server/validate";
import { assertTransition, type CallState } from "@/domain/calls";
import { callerRevealFor } from "@/server/services/caller-reveal";
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
  // Fetch unscoped: platform-agency calls (00000000) belong to no member
  // agency, so an agency-scoped lookup 404s agents on their OWN assigned
  // calls (notes/hold/dtmf all broke this way). Authorization below keeps the
  // boundary: admin bypass, heads confined to their agency, agents to their
  // own (or unassigned ringing) calls.
  const call = await calls.findById(id).catch(() => null);
  if (!call) return { error: fail("Call not found", 404) };
  if (context.user?.role !== "admin" && !context.isHead) {
    const me = context.membership ? await agents.findByMembershipId(context.membership.id).catch(() => null) : null;
    if (!me) return { error: fail("Agent profile not found", 403) };
    if (call.agent_id && call.agent_id !== me.id) return { error: fail("Call not found", 404) };
  } else if (context.isHead && scope && call.agency_id !== scope) {
    return { error: fail("Call not found", 404) };
  }
  return { call };
}

export const GET = apiHandler(async (req, context) => {
  const { params, agencyId, user, membership, isHead } = context;
  const { id } = await params;
  const scope = scopeFor({ agencyId, user });
  const access = await requireCallAccess(id, scope, { user, membership, isHead });
  if ("error" in access) return access.error;
  // Access already enforced above; sub-reads must not re-scope agents off
  // their own platform-agency calls (same 404 class as the call lookup).
  const privileged = user?.role === "admin" || isHead;
  const events = await callEvents.findByCallId(id, privileged ? scope : undefined);
  // Post-buffer caller reveal (Option A escrow): entitled viewers are admin,
  // heads, and the assigned agent (visibility already enforced above). Every
  // reveal is logged for audit.
  const campaign = await campaigns.findById(access.call.campaign_id, privileged ? scope : undefined).catch(() => null);
  const reveal = callerRevealFor(access.call, campaign?.buffer_seconds ?? 30);
  if (reveal.revealed) {
    console.info(JSON.stringify({
      event: "caller_revealed",
      callId: id.slice(0, 8),
      viewer: user?.id?.slice(0, 8) ?? "unknown",
      role: user?.role ?? "unknown",
    }));
  }
  const { caller_number_encrypted: _escrow, ...rest } = access.call as CallRow & { caller_number_encrypted?: string | null };
  void _escrow;
  return ok({ ...rest, events, caller_revealed: reveal.revealed, caller_number: reveal.caller_number });
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
