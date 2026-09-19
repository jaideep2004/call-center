import { apiHandler, ok, created, fail } from "@/server/api-utils";
import { validate, reserveRtbSchema } from "@/server/validate";
import { getEligibleOffers } from "@/server/services/eligibility";
import { reserveRtbReservation } from "@/server/services/retreaver-rtb";
import { rtbReservations } from "@/server/repositories";

export const runtime = "nodejs";

/**
 * POST /api/v1/rtb/reserve — marketplace pre-selection (P1.3).
 * Runs buyer-offer eligibility BEFORE Retreaver picks a winner, then makes
 * exactly ONE reserve call for the publisher campaign. Empty pool ->
 * `no-target` without ever touching Retreaver (never blind-route).
 * Winner selection stays in Retreaver (Route-By-Bid); Node runs no bid loop.
 *
 * P1.5 idempotency: redelivery with the same `idempotency_key` returns the
 * original reservation (`deduped: true`) without re-running eligibility or
 * reserving again. Empty-pool no-targets are NOT stamped — a retry
 * re-evaluates the pool fresh (buyers may have come online).
 */
export const POST = apiHandler(async (req) => {
  const body = validate(reserveRtbSchema, await req.json());
  if (body.idempotency_key) {
    const existing = await rtbReservations.findByClientKey(body.idempotency_key);
    if (existing) {
      return ok(
        {
          status: existing.status === "no_target" ? "no-target" : "reserved",
          reservation: existing,
          deduped: true,
        },
        "Duplicate ping — returning original reservation",
      );
    }
  }
  const { eligible, rejected, caller_state } = await getEligibleOffers({
    publisher_campaign_id: body.publisher_campaign_id,
    caller_number: body.caller_number,
    caller_state: body.caller_state,
    publisher_payout_min_cents: body.publisher_payout_min_cents,
    publisher_payout_max_cents: body.publisher_payout_max_cents,
  });
  if (eligible.length === 0) {
    return ok(
      { status: "no-target", caller_state, eligible: [], rejected },
      "No eligible buyer for this ping",
    );
  }
  const reservation = await reserveRtbReservation({
    campaignId: body.publisher_campaign_id,
    callerNumber: body.caller_number,
    tags: body.tags,
  });
  if (!reservation) return fail("Reservation not found after create", 500);
  if (body.idempotency_key) {
    // Best-effort stamp; a concurrent duplicate's conflict is harmless (both
    // hold valid reservations, Retreaver confirms each uuid at most once).
    await rtbReservations.setClientKey(reservation.id, body.idempotency_key).catch(() => false);
  }
  return created(
    {
      status: "reserved",
      caller_state,
      eligible_offer_ids: eligible.map((e) => e.campaign_id),
      eligible,
      rejected,
      reservation,
    },
    "RTB reservation created for eligible pool",
  );
}, { resource: "publishers", action: "manage" });
