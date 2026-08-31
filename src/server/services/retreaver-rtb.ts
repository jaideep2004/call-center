import { retreaver } from "@/domain/providers/retreaver";
import { campaigns, publishers, phoneNumbers, rtbReservations, bidOverrides } from "@/server/repositories";
import { decryptSecret } from "@/server/crypto";

export async function reserveRtbReservation(data: {
  campaignId: string;
  callerNumber?: string;
  tags?: Record<string, string>;
}) {
  const campaign = await campaigns.findById(data.campaignId);
  if (!campaign.rtb_enabled) throw new Error("Campaign RTB bidding is not enabled");
  if (!campaign.rtb_postback_key_encrypted) throw new Error("Campaign has no RTB postback key configured");
  if (!campaign.publisher_id) throw new Error("Campaign has no publisher assigned");

  const publisher = await publishers.findById(campaign.publisher_id);
  if (publisher.retreaver_status !== "active" || !publisher.afid) {
    throw new Error("Publisher is not active on Retreaver");
  }

  const phone = await phoneNumbers.findByCampaign(campaign.id);
  const inboundNumber = phone?.e164 ?? undefined;
  const key = decryptSecret(campaign.rtb_postback_key_encrypted);
  const callerNumber = data.callerNumber ?? "anonymous";

  // Manual bid override (payout_cents) wins over the publisher's fixed price.
  const override = await bidOverrides.findLatest(campaign.id).catch(() => null);
  const payoutCents = override?.payout_cents ?? publisher.fixed_price_cents ?? 0;

  const reservation = await retreaver.reserveRtb({
    key,
    publisherId: publisher.afid,
    callerNumber,
    ...(inboundNumber ? { inboundNumber } : {}),
    ...(data.tags ? { tags: data.tags } : {}),
  });

  const row = await rtbReservations.create({
    campaignId: campaign.id,
    publisherId: publisher.id,
    rtbUuid: reservation.uuid,
    callerNumber,
    payoutCents,
    inboundNumber: inboundNumber ?? null,
    sipAddress: reservation.sip_address ?? null,
    expiresAt: reservation.expires_at ?? null,
    tags: data.tags ?? {},
  });

  const status = reservation.status === "no_target" ? "no_target" : "reserved";
  await rtbReservations.setStatus(row.id, status, {
    rtb_uuid: reservation.uuid,
    retreaver_payout: reservation.retreaver_payout,
    retreaver_seconds: reservation.retreaver_seconds,
  });
  return rtbReservations.findById(row.id);
}

export async function confirmRtbReservation(reservationId: string) {
  const row = await rtbReservations.findById(reservationId);
  if (!row) throw new Error("Reservation not found");
  if (!row.rtb_uuid) throw new Error("Reservation has no Retreaver uuid");
  if (row.status !== "reserved") throw new Error(`Cannot confirm reservation in status ${row.status}`);

  const campaign = await campaigns.findById(row.campaign_id);
  if (!campaign.rtb_postback_key_encrypted) throw new Error("Campaign has no RTB postback key configured");
  const key = decryptSecret(campaign.rtb_postback_key_encrypted);

  const result = await retreaver.confirmRtb(row.rtb_uuid, key);
  const status = result.status === "confirmed" ? "confirmed" : "no_target";
  return rtbReservations.setStatus(row.id, status, { provider_status: result.status });
}

export async function expireStaleRtbReservations(): Promise<number> {
  const stale = await rtbReservations.findExpiredReserved();
  for (const row of stale) {
    await rtbReservations.setStatus(row.id, "expired", { reason: "expires_at passed" });
  }
  return stale.length;
}
