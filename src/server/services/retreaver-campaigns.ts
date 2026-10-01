import { retreaver } from "@/domain/providers/retreaver";
import { campaigns, phoneNumbers, agencies } from "@/server/repositories";
import { getAppBaseUrl } from "@/server/app-url";

export const BUYER_TIMER_SECONDS = 10;
export const SALE_TIMER_SECONDS = 15;

export function retreaverWebhookUrl(): string {
  const token = process.env.RETREAVER_WEBHOOK_SECRET;
  if (!token) throw new Error("RETREAVER_WEBHOOK_SECRET is required to deploy campaigns");
  const base = getAppBaseUrl();
  return `${base}/api/webhooks/retreaver?token=${encodeURIComponent(token)}`;
}

function campaignCid(id: string): string {
  return id.replace(/-/g, "").slice(0, 8);
}

function retreaverConfigured(): boolean {
  if (!retreaver.configured()) {
    throw new Error("Retreaver integration is not configured (RETREAVER_API_KEY / RETREAVER_COMPANY_ID missing)");
  }
  return true;
}

// Option A timers: buyer is billed after 10s, publisher is paid after 15s.
// Both timers fire our webhook; Retreaver only fires the highest applicable one per call.
export async function deployCampaign(campaignId: string) {
  retreaverConfigured();
  const campaign = await campaigns.findById(campaignId);
  const number = await phoneNumbers.findByCampaign(campaignId);
  if (!number) {
    throw new Error("Campaign has no phone number — add one before deploying to Retreaver");
  }
  const webhook = retreaverWebhookUrl();
  const cid = campaign.retreaver_cid ?? campaignCid(campaign.id);
  const payload = {
    name: campaign.name,
    record_calls: true,
    timers: [
      { seconds: BUYER_TIMER_SECONDS, url: webhook },
      { seconds: SALE_TIMER_SECONDS, url: webhook },
    ],
    menuOptions: [{ option: "1", targetNumber: number.e164 }],
  };

  if (campaign.retreaver_cid) {
    await retreaver.updateCampaign(cid, payload);
  } else {
    await retreaver.createCampaign({ cid, ...payload });
    await campaigns.linkRetreaverCid(campaign.id, cid);
  }
  return campaigns.findById(campaignId);
}

export async function getCampaignRetreaverNumbers(campaignId: string) {
  retreaverConfigured();
  const campaign = await campaigns.findById(campaignId);
  if (!campaign.retreaver_cid) return [];
  return retreaver.listNumbers({ cid: campaign.retreaver_cid });
}

export async function syncRetreaverCampaigns(options: { agencyId?: string | null } = {}): Promise<{ created: number; updated: number; archived: number; total: number }> {
  retreaverConfigured();
  const remote = await retreaver.listCampaigns();
  // The list endpoint omits `paused` — only the per-campaign detail endpoint reports it.
  const pausedByCid = new Map<string, boolean>();
  await Promise.all(
    remote.map(async (c) => {
      if (!c.cid) return;
      try {
        pausedByCid.set(c.cid, Boolean((await retreaver.getCampaign(c.cid)).paused));
      } catch {
        // Leave unknown; sync still proceeds with name/creation handling.
      }
    }),
  );

  let agencyId = options.agencyId ?? null;
  let created = 0;
  let updated = 0;

  for (const remoteCampaign of remote) {
    if (!remoteCampaign.cid || !remoteCampaign.name) continue;
    const remotePaused = pausedByCid.get(remoteCampaign.cid) ?? false;
    const existing = await campaigns.findByRetreaverCid(remoteCampaign.cid);
    if (existing) {
      let changed = false;
      if (existing.name !== remoteCampaign.name) {
        await campaigns.update(existing.id, { name: remoteCampaign.name });
        changed = true;
      }
      // Pause state is human-controlled on BOTH sides — the sync NEVER flips
      // a local active<->paused status. (Client decision: the wallet auto-pause
      // sweep is OFF, and this mirroring was the remaining vector that kept
      // re-pausing campaigns minutes after a human unpaused them — the local
      // row was overwritten from the still-paused Retreaver side every 10min.)
      // A drift is logged so the mismatch is visible instead of silent; the
      // human resolves it in whichever dashboard should win.
      const desired = remotePaused ? "paused" : "active";
      const placeholder = existing.status === "draft" && (existing.price_cents ?? 0) <= 1;
      if (placeholder && existing.status !== desired) {
        // One-time adoption: a price-less local draft takes the remote state
        // on first sync. Real (priced) drafts and every active/paused row are
        // never touched.
        await campaigns.update(existing.id, { status: desired });
        changed = true;
      } else if (
        (existing.status === "active" || existing.status === "paused") &&
        existing.status !== desired
      ) {
        console.info(JSON.stringify({
          event: "retreaver_status_drift",
          campaignId: existing.id,
          local: existing.status,
          retreaver: desired,
          action: "kept_local",
        }));
      }
      if (changed) updated++;
      continue;
    }
    if (!agencyId) {
      const first = await agencies.findMany({ pagination: { page: 1, limit: 1 }, sortBy: "created_at", order: "asc" });
      agencyId = first.rows[0]?.id ?? null;
    }
    if (!agencyId) continue;
    // Live on Retreaver already → active (or paused). No buyer price: Retreaver's
    // campaigns API doesn't expose money fields, so it stays null until the admin
    // sets it. Real money (payout/revenue) comes per call via the Retreaver sync.
    const row = await campaigns.create({
      agency_id: agencyId,
      name: remoteCampaign.name,
      routing_strategy: "round_robin",
      status: remotePaused ? "paused" : "active",
    });
    await campaigns.linkRetreaverCid(row.id, remoteCampaign.cid);
    created++;
  }

  // Mirror Retreaver-side deletions: a linked local campaign whose cid no
  // longer exists remotely was deleted over there — archive it here so it
  // stops routing and leaves active views (history is kept). Pure-local
  // campaigns (no cid) and terminal statuses are never touched. Skipped
  // entirely when Retreaver returns an empty list, since that is
  // indistinguishable from an API failure — archiving everything would be
  // the catastrophic misread.
  let archived = 0;
  const liveRemote = remote.filter((c) => c.cid && c.name);
  if (liveRemote.length > 0) {
    const remoteCids = new Set(liveRemote.map((c) => c.cid as string));
    const linked = await campaigns.findRetreaverLinked();
    for (const local of linked) {
      if (!local.retreaver_cid || remoteCids.has(local.retreaver_cid)) continue;
      if (local.status !== "active" && local.status !== "paused") continue;
      await campaigns.update(local.id, { status: "archived" });
      archived++;
    }
  }

  return { created, updated, archived, total: remote.length };
}
