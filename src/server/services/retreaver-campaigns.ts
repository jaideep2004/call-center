import { retreaver } from "@/domain/providers/retreaver";
import { campaigns, phoneNumbers, agencies } from "@/server/repositories";

export const BUYER_TIMER_SECONDS = 10;
export const SALE_TIMER_SECONDS = 15;

export function retreaverWebhookUrl(): string {
  const token = process.env.RETREAVER_WEBHOOK_SECRET;
  if (!token) throw new Error("RETREAVER_WEBHOOK_SECRET is required to deploy campaigns");
  const base = (process.env.APP_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:30001").replace(/\/+$/, "");
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

export async function syncRetreaverCampaigns(options: { agencyId?: string | null } = {}): Promise<{ created: number; updated: number; total: number }> {
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
      // Mirror the Retreaver pause state for synced (linked) campaigns. Terminal local
      // statuses (completed/archived) and drafts with a real price are left untouched.
      const desired = remotePaused ? "paused" : "active";
      const mirrorable = existing.status === "active" || existing.status === "paused";
      const placeholder = existing.status === "draft" && (existing.price_cents ?? 0) <= 1;
      if ((mirrorable || placeholder) && existing.status !== desired) {
        await campaigns.update(existing.id, { status: desired });
        changed = true;
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

  return { created, updated, total: remote.length };
}
