import { query, queryOne, transaction } from "@/server/db";

export interface RtbReservationRow {
  id: string;
  campaign_id: string;
  publisher_id: string | null;
  rtb_uuid: string | null;
  caller_number: string | null;
  status: string;
  payout_cents: number | null;
  inbound_number: string | null;
  sip_address: string | null;
  expires_at: string | null;
  tags: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export class RtbReservationRepository {
  async create(data: {
    campaignId: string;
    publisherId?: string | null;
    rtbUuid?: string | null;
    callerNumber?: string | null;
    payoutCents?: number | null;
    inboundNumber?: string | null;
    sipAddress?: string | null;
    expiresAt?: string | null;
    tags?: Record<string, unknown>;
  }): Promise<RtbReservationRow> {
    const rows = await query<RtbReservationRow>(
      `INSERT INTO app.rtb_reservations
        (campaign_id, publisher_id, rtb_uuid, caller_number, status, payout_cents, inbound_number, sip_address, expires_at, tags)
       VALUES ($1, $2, $3, $4, 'reserved', $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        data.campaignId, data.publisherId ?? null, data.rtbUuid ?? null, data.callerNumber ?? null,
        data.payoutCents ?? null, data.inboundNumber ?? null, data.sipAddress ?? null,
        data.expiresAt ?? null, data.tags ?? {},
      ],
    );
    return rows[0];
  }

  async findById(id: string): Promise<RtbReservationRow | null> {
    return queryOne<RtbReservationRow>("SELECT * FROM app.rtb_reservations WHERE id = $1", [id]);
  }

  async findByRtbUuid(uuid: string): Promise<RtbReservationRow | null> {
    return queryOne<RtbReservationRow>("SELECT * FROM app.rtb_reservations WHERE rtb_uuid = $1", [uuid]);
  }

  async findByCampaign(campaignId: string, limit = 50): Promise<RtbReservationRow[]> {
    return query<RtbReservationRow>(
      "SELECT * FROM app.rtb_reservations WHERE campaign_id = $1 ORDER BY created_at DESC LIMIT $2",
      [campaignId, limit],
    );
  }

  async findExpiredReserved(): Promise<RtbReservationRow[]> {
    return query<RtbReservationRow>(
      `SELECT * FROM app.rtb_reservations WHERE status = 'reserved' AND expires_at IS NOT NULL AND expires_at < now()`,
    );
  }

  async setStatus(id: string, status: string, payload?: Record<string, unknown>): Promise<RtbReservationRow> {
    const row = await transaction(async (client) => {
      const updated = await queryOne<RtbReservationRow>(
        `UPDATE app.rtb_reservations SET status = $2, updated_at = now() WHERE id = $1 RETURNING *`,
        [id, status],
        client,
      );
      if (!updated) throw new Error(`Reservation ${id} not found`);
      await client.query(
        `INSERT INTO app.rtb_reservation_events (reservation_id, status, payload) VALUES ($1, $2, $3)`,
        [id, status, payload ?? {}],
      );
      return updated;
    });
    return row;
  }

  async eventsFor(reservationId: string): Promise<{ id: string; status: string; payload: Record<string, unknown>; created_at: string }[]> {
    return query(
      "SELECT * FROM app.rtb_reservation_events WHERE reservation_id = $1 ORDER BY created_at ASC",
      [reservationId],
    );
  }
}

export const rtbReservations = new RtbReservationRepository();
