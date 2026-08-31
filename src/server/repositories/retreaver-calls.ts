import { query, queryOne } from "@/server/db";

export interface RetreaverCallRow {
  id: string;
  uuid: string;
  agency_id: string;
  campaign_id: string | null;
  publisher_id: string | null;
  caller: string | null;
  caller_hash: string | null;
  dialed_hash: string | null;
  start_time: string | null;
  call_id: string | null;
  status: string | null;
  connected: boolean | null;
  payout_cents: number | null;
  revenue_cents: number | null;
  recording_url: string | null;
  tags: Record<string, unknown>;
  raw_redacted: Record<string, unknown>;
  synced_at: string;
  created_at: string;
}

function cents(v: number | null | undefined): number | null {
  if (v === null || v === undefined || Number.isNaN(v)) return null;
  return Math.round(v * 100);
}

export class RetreaverCallRepository {
  async upsertByUuid(data: {
    uuid: string;
    agencyId: string;
    campaignId?: string | null;
    publisherId?: string | null;
    caller?: string | null;
    callerHash?: string | null;
    dialedHash?: string | null;
    startTime?: string | null;
    status?: string | null;
    connected?: boolean | null;
    payoutCents?: number | null;
    revenueCents?: number | null;
    recordingUrl?: string | null;
    tags?: Record<string, unknown>;
    raw?: Record<string, unknown>;
  }): Promise<RetreaverCallRow> {
    const rows = await query<RetreaverCallRow>(
      `INSERT INTO app.retreaver_calls
        (uuid, agency_id, campaign_id, publisher_id, caller, status, connected, payout_cents, revenue_cents, recording_url, tags, raw_redacted, caller_hash, dialed_hash, start_time, synced_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, now())
       ON CONFLICT (uuid) DO UPDATE SET
         campaign_id = COALESCE(EXCLUDED.campaign_id, app.retreaver_calls.campaign_id),
         publisher_id = COALESCE(EXCLUDED.publisher_id, app.retreaver_calls.publisher_id),
         caller = COALESCE(EXCLUDED.caller, app.retreaver_calls.caller),
         caller_hash = COALESCE(EXCLUDED.caller_hash, app.retreaver_calls.caller_hash),
         dialed_hash = COALESCE(EXCLUDED.dialed_hash, app.retreaver_calls.dialed_hash),
         start_time = COALESCE(EXCLUDED.start_time, app.retreaver_calls.start_time),
         status = COALESCE(EXCLUDED.status, app.retreaver_calls.status),
         connected = COALESCE(EXCLUDED.connected, app.retreaver_calls.connected),
         payout_cents = COALESCE(EXCLUDED.payout_cents, app.retreaver_calls.payout_cents),
         revenue_cents = COALESCE(EXCLUDED.revenue_cents, app.retreaver_calls.revenue_cents),
         recording_url = COALESCE(EXCLUDED.recording_url, app.retreaver_calls.recording_url),
         tags = EXCLUDED.tags,
         raw_redacted = EXCLUDED.raw_redacted,
         synced_at = now()
       RETURNING *`,
      [
        data.uuid, data.agencyId, data.campaignId ?? null, data.publisherId ?? null,
        data.caller ?? null, data.status ?? null, data.connected ?? null,
        data.payoutCents ?? null, data.revenueCents ?? null, data.recordingUrl ?? null,
        data.tags ?? {}, data.raw ?? {}, data.callerHash ?? null, data.dialedHash ?? null,
        data.startTime ?? null,
      ],
    );
    return rows[0];
  }

  async findByAgency(agencyId: string, limit = 50): Promise<RetreaverCallRow[]> {
    return query<RetreaverCallRow>(
      "SELECT * FROM app.retreaver_calls WHERE agency_id = $1 ORDER BY created_at DESC LIMIT $2",
      [agencyId, limit],
    );
  }

  async findByPublisher(publisherId: string, limit = 50): Promise<RetreaverCallRow[]> {
    return query<RetreaverCallRow>(
      "SELECT * FROM app.retreaver_calls WHERE publisher_id = $1 ORDER BY created_at DESC LIMIT $2",
      [publisherId, limit],
    );
  }

  async findByUuid(uuid: string): Promise<RetreaverCallRow | null> {
    return queryOne<RetreaverCallRow>("SELECT * FROM app.retreaver_calls WHERE uuid = $1", [uuid]);
  }

  async latestSyncedAt(): Promise<Date | null> {
    const row = await queryOne<{ synced_at: string }>(
      "SELECT MAX(synced_at) as synced_at FROM app.retreaver_calls",
    );
    return row?.synced_at ? new Date(row.synced_at) : null;
  }

  async marginSummary(agencyId: string): Promise<{ publisher_id: string | null; calls: string; payout_cents: string; revenue_cents: string }[]> {
    // When a Retreaver record is linked to an app call, true campaign revenue is
    // the invoice the agency charged (campaign price), falling back to the
    // revenue Retreaver reported for unlinked records.
    return query(
      `SELECT r.publisher_id, COUNT(*)::text as calls,
              COALESCE(SUM(r.payout_cents), 0)::text as payout_cents,
              COALESCE(SUM(COALESCE(i.total_cents, r.revenue_cents)), 0)::text as revenue_cents
       FROM app.retreaver_calls r
       LEFT JOIN app.calls c ON c.id = r.call_id
       LEFT JOIN app.invoices i ON i.call_id = c.id
       WHERE r.agency_id = $1 AND r.status = 'finished'
       GROUP BY r.publisher_id
       ORDER BY payout_cents DESC`,
      [agencyId],
    );
  }

  async reportByPublisher(agencyId: string): Promise<{
    publisher_id: string | null;
    publisher_name: string | null;
    calls: string;
    connected_calls: string;
    payout_cents: string;
    campaign_revenue_cents: string;
  }[]> {
    // Linked records report the invoice total (campaign price) as campaign
    // revenue; unlinked records fall back to Retreaver's reported revenue.
    return query(
      `SELECT r.publisher_id,
              p.name as publisher_name,
              COUNT(*)::text as calls,
              COUNT(*) FILTER (WHERE r.connected)::text as connected_calls,
              COALESCE(SUM(r.payout_cents), 0)::text as payout_cents,
              COALESCE(SUM(COALESCE(i.total_cents, r.revenue_cents)), 0)::text as campaign_revenue_cents
       FROM app.retreaver_calls r
       LEFT JOIN app.publishers p ON p.id = r.publisher_id
       LEFT JOIN app.calls c ON c.id = r.call_id
       LEFT JOIN app.invoices i ON i.call_id = c.id
       WHERE r.agency_id = $1 AND r.status = 'finished'
       GROUP BY r.publisher_id, p.name
       ORDER BY payout_cents DESC`,
      [agencyId],
    );
  }
}

export function payoutToCents(v: number | null | undefined): number | null {
  return cents(v);
}

export const retreaverCalls = new RetreaverCallRepository();
