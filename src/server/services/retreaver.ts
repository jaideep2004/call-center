import { retreaver, RetreaverError, type RetreaverCallRecord } from "@/domain/providers/retreaver";
import { hashPhone } from "@/domain/phone";
import { tryLinkRetreaverCall } from "@/server/services/retreaver-link";
import { publishers, retreaverCalls, phoneNumbers, campaigns } from "@/server/repositories";

/** Retreaver can report timestamps as ISO strings or epoch seconds/milliseconds. */
function parseRetreaverTime(value: string | null | undefined): string | null {
  if (!value) return null;
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) {
    const ms = numeric < 1e12 ? numeric * 1000 : numeric;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function linkableFields(call: RetreaverCallRecord) {
  return {
    callerHash: call.caller ? hashPhone(call.caller) : null,
    dialedHash: call.dialed_number ? hashPhone(call.dialed_number) : null,
    startTime: parseRetreaverTime(call.start_time),
  };
}

export interface RetreaverConnectionStatus {
  configured: boolean;
  ok: boolean;
  latency_ms: number | null;
  message: string;
}

export async function checkRetreaverConnection(): Promise<RetreaverConnectionStatus> {
  if (!retreaver.configured()) {
    return {
      configured: false,
      ok: false,
      latency_ms: null,
      message: "Retreaver not configured (RETREAVER_API_KEY / RETREAVER_COMPANY_ID missing)",
    };
  }
  try {
    const { latencyMs } = await retreaver.checkConnection();
    return { configured: true, ok: true, latency_ms: latencyMs, message: "Connected" };
  } catch (error) {
    if (error instanceof RetreaverError) {
      const detail = error.status === 401
        ? "invalid API key"
        : error.status === 403
          ? "API key does not match company_id"
          : error.status === 429
            ? "rate limited"
            : `Retreaver error ${error.status}`;
      return { configured: true, ok: false, latency_ms: null, message: detail };
    }
    return { configured: true, ok: false, latency_ms: null, message: String(error).slice(0, 200) };
  }
}

function retreaverConfigured(): boolean {
  if (!retreaver.configured()) {
    throw new Error("Retreaver integration is not configured (RETREAVER_API_KEY / RETREAVER_COMPANY_ID missing)");
  }
  return true;
}

export async function provisionPublisher(publisherId: string) {
  retreaverConfigured();
  const publisher = await publishers.findById(publisherId);
  const afid = publisher.afid ?? publisher.id;
  try {
    if (publisher.afid) {
      await retreaver.updateAffiliate(publisher.afid, { company_name: publisher.name });
    } else {
      await retreaver.createAffiliate({ afid, company_name: publisher.name });
    }
    await publishers.update(publisherId, { afid, retreaver_status: "active" });
  } catch (error) {
    await publishers.update(publisherId, { retreaver_status: "error" }).catch(() => undefined);
    throw error;
  }
  return publishers.findById(publisherId);
}

export async function setPublisherStatus(publisherId: string, status: "paused" | "active") {
  const publisher = await publishers.findById(publisherId);
  if (publisher.retreaver_status === "unprovisioned" && status === "active") {
    throw new Error("Publisher must be provisioned on Retreaver before activation");
  }
  return publishers.updateRetreaverStatus(publisherId, status);
}

async function resolveCallTargets(call: RetreaverCallRecord) {
  const phone = call.dialed_number ? await phoneNumbers.findByE164(call.dialed_number) : null;
  const publisher = call.afid ? await publishers.findByAfid(call.afid) : null;

  // Campaign resolution: cid (Retreaver campaign id) > dialed number > single-campaign auto-link
  let campaign = call.cid ? await campaigns.findByRetreaverCid(call.cid) : null;

  if (!campaign && phone?.campaign_id) {
    campaign = await campaigns.findById(phone.campaign_id).catch(() => null);
  }

  if (!campaign && publisher) {
    const publisherCampaigns = await campaigns.findByPublisher(publisher.id);
    if (publisherCampaigns.length === 1) {
      campaign = publisherCampaigns[0];
    }
  }

  // Auto-link on first sight when the cid is unambiguous (idempotent, never overwrites a set cid)
  if (campaign && call.cid && !campaign.retreaver_cid) {
    campaign = await campaigns.linkRetreaverCid(campaign.id, call.cid).catch(() => campaign);
  }

  return {
    agencyId: phone?.agency_id ?? campaign?.agency_id ?? null,
    campaignId: campaign?.id ?? null,
    publisherId: publisher?.id ?? null,
  };
}

function toStoredCall(call: RetreaverCallRecord) {
  return {
    caller: call.caller ?? null,
    status: call.status ?? null,
    connected: call.connected ?? null,
    payoutCents: call.payout === null || call.payout === undefined ? null : Math.round(call.payout * 100),
    revenueCents: call.revenue === null || call.revenue === undefined ? null : Math.round(call.revenue * 100),
    recordingUrl: call.recording_url ?? null,
    tags: call.tags ?? {},
  };
}

export async function syncRetreaverCalls(options: { maxPages?: number; sinceDays?: number } = {}): Promise<{ stored: number; skipped: number; truncated: boolean }> {
  retreaverConfigured();
  const maxPages = options.maxPages ?? 20;
  const sinceDays = options.sinceDays ?? 30;
  let since = await retreaverCalls.latestSyncedAt();
  if (!since) {
    since = new Date(Date.now() - sinceDays * 86_400_000);
  }
  const overlap = new Date(since.getTime() - 5 * 60_000).toISOString();
  let stored = 0;
  let skipped = 0;
  let pages = 0;
  let page: number | null = 1;
  while (page && pages < maxPages) {
    pages++;
    const { calls, nextPage } = await retreaver.fetchCalls({
      updated_at_start: overlap,
      page,
      per_page: 100,
    });
    for (const call of calls) {
      const { agencyId, campaignId, publisherId } = await resolveCallTargets(call);
      if (!agencyId) {
        skipped++;
        continue;
      }
      const { callerHash, dialedHash, startTime } = linkableFields(call);
      const storedRow = await retreaverCalls.upsertByUuid({
        uuid: call.uuid,
        agencyId,
        campaignId,
        publisherId,
        ...toStoredCall(call),
        callerHash,
        dialedHash,
        startTime,
        raw: { caller_zip: call.caller_zip, caller_state: call.caller_state, caller_city: call.caller_city, cid: call.cid, sid: call.sid },
      });
      stored++;
      // Opportunistic link — the app call may already be in the DB. Anything
      // missed here is picked up by the scheduled reconciliation job.
      if (storedRow && callerHash && dialedHash && startTime) {
        await tryLinkRetreaverCall({ retreaverId: storedRow.id, callerHash, dialedHash, startTime }).catch(() => undefined);
      }
    }
    page = nextPage;
  }
  return { stored, skipped, truncated: pages >= maxPages };
}

export async function handleRetreaverWebhook(req: Request): Promise<{ stored: boolean }> {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  const expected = process.env.RETREAVER_WEBHOOK_SECRET;
  if (!expected || token !== expected) {
    throw new Error("Invalid Retreaver webhook token");
  }

  const queryFields: Record<string, string> = {};
  for (const [key, value] of url.searchParams) {
    if (key !== "token") queryFields[key] = value;
  }

  let fields = queryFields;
  if (Object.keys(queryFields).length === 0) {
    const body = await req.json().catch(() => ({}));
    fields = { ...fields, ...(body as Record<string, unknown>) } as Record<string, string>;
  }

  const uuid = fields.uuid;
  if (!uuid) throw new Error("Missing uuid in Retreaver webhook payload");
  if (!fields.status && fields.payout === undefined) {
    return { stored: false };
  }

  const call: RetreaverCallRecord = {
    uuid,
    caller: fields.caller ?? null,
    caller_zip: null,
    caller_state: null,
    caller_city: null,
    caller_country: null,
    afid: fields.afid ?? null,
    cid: fields.cid ?? null,
    sid: fields.sid ?? null,
    dialed_number: fields.dialed_number ?? null,
    status: fields.status ?? null,
    connected: fields.connected === undefined ? null : fields.connected === "1" || fields.connected === "true",
    converted: fields.converted === undefined ? null : fields.converted === "1" || fields.converted === "true",
    payout: fields.payout === undefined ? null : Number(fields.payout),
    revenue: fields.revenue === undefined ? null : Number(fields.revenue),
    profit_gross: null,
    profit_net: null,
    total_duration: fields.total_duration === undefined ? null : Number(fields.total_duration),
    recording_url: fields.recording_url ?? null,
    tags: null,
    start_time: fields.start_time ?? null,
    end_time: fields.end_time ?? null,
    created_at: fields.created_at ?? null,
    updated_at: fields.updated_at ?? null,
  };

  const { agencyId, campaignId, publisherId } = await resolveCallTargets(call);
  if (!agencyId) {
    return { stored: false };
  }
  const { callerHash, dialedHash, startTime } = linkableFields(call);
  const storedRow = await retreaverCalls.upsertByUuid({
    uuid: call.uuid,
    agencyId,
    campaignId,
    publisherId,
    ...toStoredCall(call),
    callerHash,
    dialedHash,
    startTime,
    raw: { caller_zip: call.caller_zip, caller_state: call.caller_state, caller_city: call.caller_city, cid: call.cid, sid: call.sid },
  });
  if (storedRow && callerHash && dialedHash && startTime) {
    await tryLinkRetreaverCall({ retreaverId: storedRow.id, callerHash, dialedHash, startTime }).catch(() => undefined);
  }
  return { stored: true };
}
