import { pool } from "@/server/db";
import { hashPhone } from "@/domain/phone";

/** App call started_at vs Retreaver start_time must be within 5 minutes. */
const MATCH_WINDOW_MS = 5 * 60_000;

interface RetreaverCandidate {
  id: string;
  caller_hash: string;
  dialed_hash: string;
  start_time: string | null;
}

interface AppCallCandidate {
  id: string;
  from_hash: string;
  to_number: string;
  started_at: string;
}

/**
 * Opportunistic link at ingestion time (called right after a Retreaver record
 * is stored): match an unmatched app call by caller_hash + dialed_hash (hashed
 * via pgcrypto digest on the DB side) within the time window. Returns true when
 * linked. Safe to call when the app call hasn't arrived yet — the scheduled
 * reconciliation job catches those later.
 */
export async function tryLinkRetreaverCall(input: {
  retreaverId: string;
  callerHash: string;
  dialedHash: string;
  startTime: string;
}): Promise<boolean> {
  const res = await pool.query(
    `SELECT c.id
     FROM app.calls c
     WHERE c.retreaver_call_id IS NULL
       AND c.from_hash = $1
       AND c.to_number IS NOT NULL
       AND c.started_at IS NOT NULL
       AND encode(digest(c.to_number, 'sha256'), 'hex') = $2
       AND ABS(EXTRACT(EPOCH FROM (c.started_at - $3::timestamptz))) < 300
     ORDER BY ABS(EXTRACT(EPOCH FROM (c.started_at - $3::timestamptz)))
     LIMIT 1`,
    [input.callerHash, input.dialedHash, input.startTime],
  );
  if (res.rowCount === 0) return false;
  await linkPair(res.rows[0].id as string, input.retreaverId);
  return true;
}

/**
 * Batch reconciliation (scheduled job, every 5 min). Picks up unmatched
 * Retreaver records and app calls from the recent window, groups them by
 * (caller_hash, dialed_hash), and links the temporally nearest pair. Runs in
 * JS so it doesn't depend on pgcrypto on the read side.
 */
export async function linkRetreaverCalls(sinceMinutes = 120): Promise<{ linked: number }> {
  const rRes = await pool.query<RetreaverCandidate>(
    `SELECT id, caller_hash, dialed_hash, start_time
     FROM app.retreaver_calls
     WHERE call_id IS NULL
       AND caller_hash IS NOT NULL AND dialed_hash IS NOT NULL AND start_time IS NOT NULL
       AND start_time > NOW() - ($1 * INTERVAL '1 minute')
     ORDER BY start_time DESC
     LIMIT 5000`,
    [sinceMinutes],
  );
  if (rRes.rowCount === 0) return { linked: 0 };

  const cRes = await pool.query<AppCallCandidate>(
    `SELECT id, from_hash, to_number, started_at
     FROM app.calls
     WHERE retreaver_call_id IS NULL
       AND from_hash IS NOT NULL AND to_number IS NOT NULL AND started_at IS NOT NULL
       AND started_at > NOW() - ($1 * INTERVAL '1 minute')`,
    [sinceMinutes],
  );

  const callsByKey = new Map<string, AppCallCandidate[]>();
  for (const c of cRes.rows) {
    const key = `${c.from_hash}:${hashPhone(c.to_number)}`;
    const arr = callsByKey.get(key) ?? [];
    arr.push(c);
    callsByKey.set(key, arr);
  }

  let linked = 0;
  for (const r of rRes.rows) {
    const candidates = callsByKey.get(`${r.caller_hash}:${r.dialed_hash}`) ?? [];
    if (candidates.length === 0) continue;
    const rTime = new Date(r.start_time!).getTime();
    let best: AppCallCandidate | null = null;
    let bestDist = Infinity;
    for (const c of candidates) {
      const dist = Math.abs(new Date(c.started_at).getTime() - rTime);
      if (dist < MATCH_WINDOW_MS && dist < bestDist) {
        bestDist = dist;
        best = c;
      }
    }
    if (!best) continue;
    await linkPair(best.id, r.id);
    linked += 1;
  }
  return { linked };
}

async function linkPair(callId: string, retreaverId: string) {
  await pool.query(
    `UPDATE app.retreaver_calls SET call_id = $1 WHERE id = $2 AND call_id IS NULL`,
    [callId, retreaverId],
  );
  await pool.query(
    `UPDATE app.calls SET retreaver_call_id = $1 WHERE id = $2 AND retreaver_call_id IS NULL`,
    [retreaverId, callId],
  );
  // Phase 2.2: the linked app call's campaign is authoritative (set from the
  // DID at creation) — adopt it when the Retreaver row never resolved one.
  await pool.query(
    `UPDATE app.retreaver_calls r SET campaign_id = c.campaign_id
      FROM app.calls c
      WHERE r.id = $1 AND r.campaign_id IS NULL AND c.id = $2`,
    [retreaverId, callId],
  );
}

/**
 * Phase 2.2 repair sweep. Rows ingested before a publisher's afid (or a
 * campaign's cid) was provisioned resolve NULL at ingest and the forward
 * sync window never revisits them. This re-resolves NULL attributions from
 * the stored raw payload (afid/cid travel in raw_redacted since this phase):
 * publisher by afid, campaign by Retreaver cid. Bounded to recent rows,
 * NULL-targeted, idempotent — safe on the 5-min link tick.
 */
export async function backfillAttribution(sinceDays = 7): Promise<{ publishers: number; campaigns: number }> {
  const pub = await pool.query(
    `UPDATE app.retreaver_calls r SET publisher_id = p.id
      FROM app.publishers p
      WHERE r.publisher_id IS NULL
        AND p.deleted_at IS NULL AND p.afid IS NOT NULL
        AND r.raw_redacted->>'afid' = p.afid
        AND r.created_at > NOW() - ($1 * INTERVAL '1 day')`,
    [sinceDays],
  );
  const camp = await pool.query(
    `UPDATE app.retreaver_calls r SET campaign_id = c.id
      FROM app.campaigns c
      WHERE r.campaign_id IS NULL
        AND c.retreaver_cid IS NOT NULL
        AND r.raw_redacted->>'cid' = c.retreaver_cid
        AND r.created_at > NOW() - ($1 * INTERVAL '1 day')`,
    [sinceDays],
  );
  return { publishers: pub.rowCount ?? 0, campaigns: camp.rowCount ?? 0 };
}
