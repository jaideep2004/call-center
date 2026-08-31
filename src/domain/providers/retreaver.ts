import { hashPhone as hashPhoneNormalized } from "../phone";

const API_BASE = "https://api.retreaver.com";
const RTB_BASE = "https://rtb.retreaver.com";
const DATA_BASE = "https://retreaverdata.com";

export class RetreaverError extends Error {
  constructor(
    message: string,
    public status: number,
    public provider: string,
  ) {
    super(message);
  }
}

function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required environment variable: ${key}`);
  return val;
}

function configured(): boolean {
  return Boolean(process.env.RETREAVER_API_KEY && process.env.RETREAVER_COMPANY_ID);
}

export function hashPhone(phone: string): string {
  return hashPhoneNormalized(phone);
}

async function request(
  base: string,
  path: string,
  options: { method?: string; params?: Record<string, string | number | undefined>; body?: unknown; timeoutMs?: number } = {},
): Promise<{ status: number; body: unknown; link?: string | null }> {
  const { method = "GET", params = {}, body, timeoutMs = 20_000 } = options;
  const url = new URL(path, base);
  if (configured()) {
    url.searchParams.set("api_key", requireEnv("RETREAVER_API_KEY"));
    url.searchParams.set("company_id", requireEnv("RETREAVER_COMPANY_ID"));
  }
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  }

  const res = await fetch(url.toString(), {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(timeoutMs),
  }).catch((err) => {
    throw new RetreaverError(`Retreaver ${method} ${path} failed: ${String(err).slice(0, 200)}`, 408, "retreaver");
  });

  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    // non-JSON error body
  }

  if (!res.ok) {
    throw new RetreaverError(
      `Retreaver ${method} ${path} failed: ${res.status} ${JSON.stringify(json).slice(0, 300)}`,
      res.status,
      "retreaver",
    );
  }

  return { status: res.status, body: json, link: res.headers.get("Link") };
}

function unwrapList<T>(body: unknown): T[] {
  if (Array.isArray(body)) return body as T[];
  if (body && typeof body === "object" && Array.isArray((body as Record<string, unknown>)[Object.keys(body)[0]])) {
    return (body as Record<string, unknown>)[Object.keys(body)[0]] as T[];
  }
  return [];
}

export interface RetreaverAffiliate {
  afid: string;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
}

export interface RetreaverCallRecord {
  uuid: string;
  caller: string | null;
  caller_zip: string | null;
  caller_state: string | null;
  caller_city: string | null;
  caller_country: string | null;
  afid: string | null;
  cid: string | null;
  sid: string | null;
  dialed_number: string | null;
  status: string | null;
  connected: boolean | null;
  converted: boolean | null;
  payout: number | null;
  revenue: number | null;
  profit_gross: string | null;
  profit_net: number | null;
  total_duration: number | null;
  recording_url: string | null;
  tags: Record<string, string> | null;
  start_time: string | null;
  end_time: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface RetreaverRtbReservation {
  uuid: string;
  status: string;
  retreaver_payout: number | null;
  retreaver_seconds: number | null;
  inbound_number: string | null;
  sip_address: string | null;
  expires_at: string | null;
  retreaver_ping_shield?: boolean;
}

export interface RetreaverCampaign {
  cid: string | null;
  name: string | null;
  record_calls: boolean;
  paused?: boolean;
  timers: { timer?: { id: number; seconds: number; url: string } }[];
  menu_options: { menu_option?: { id: number; option: string; target_number: string | null; target_cid: string | null } }[];
  created_at: string;
  updated_at: string;
}

export interface RetreaverCampaignInput {
  cid?: string;
  name: string;
  record_calls?: boolean;
  timers: { seconds: number; url: string }[];
  menuOptions: { option: string; targetNumber: string }[];
}

export interface RetreaverNumber {
  id: number;
  number: string | null;
  toll_free: boolean;
  afid: string | null;
  cid: string | null;
  sid: string | null;
  created_at: string;
  updated_at: string;
}

export const retreaver = {
  configured,

  async checkConnection(): Promise<{ latencyMs: number }> {
    const start = Date.now();
    await request(API_BASE, "/api/v1/affiliates.json", { params: { per_page: 1 } });
    return { latencyMs: Date.now() - start };
  },

  async listAffiliates(): Promise<RetreaverAffiliate[]> {
    const { body } = await request(API_BASE, "/api/v1/affiliates.json");
    return unwrapList<{ affiliate: RetreaverAffiliate }>(body).map((a) => a.affiliate);
  },

  async getAffiliate(afid: string): Promise<RetreaverAffiliate> {
    const { body } = await request(API_BASE, `/api/v1/affiliates/afid/${encodeURIComponent(afid)}.json`);
    const obj = (body as Record<string, unknown>)?.affiliate as RetreaverAffiliate;
    if (!obj) throw new RetreaverError(`Affiliate ${afid} not found`, 404, "retreaver");
    return obj;
  },

  async createAffiliate(data: { afid: string; first_name?: string; last_name?: string; company_name?: string }): Promise<RetreaverAffiliate> {
    const { body } = await request(API_BASE, "/api/v1/affiliates.json", {
      method: "POST",
      body: { affiliate: data },
    });
    return ((body as Record<string, unknown>)?.affiliate as RetreaverAffiliate);
  },

  async updateAffiliate(afid: string, data: { first_name?: string; last_name?: string; company_name?: string }): Promise<RetreaverAffiliate> {
    const { body } = await request(API_BASE, `/api/v1/affiliates/afid/${encodeURIComponent(afid)}.json`, {
      method: "PUT",
      body: { affiliate: data },
    });
    return ((body as Record<string, unknown>)?.affiliate as RetreaverAffiliate);
  },

  async fetchCalls(params: { created_at_start?: string; updated_at_start?: string; page?: number; per_page?: number } = {}): Promise<{ calls: RetreaverCallRecord[]; nextPage: number | null }> {
    const { body, link } = await request(API_BASE, "/api/v2/calls.json", {
      timeoutMs: 60_000,
      params: {
        created_at_start: params.created_at_start,
        updated_at_start: params.updated_at_start,
        sort_by: params.updated_at_start ? "updated_at" : "created_at",
        per_page: params.per_page ?? 100,
        page: params.page ?? 1,
      },
    });
    const calls = unwrapList<{ call: RetreaverCallRecord }>(body).map((c) => c.call);
    let nextPage: number | null = null;
    if (link) {
      const next = /<([^>]+)>;\s*rel="next"/.exec(link);
      if (next) {
        const u = new URL(next[1]);
        nextPage = parseInt(u.searchParams.get("page") ?? "", 10) || null;
      }
    }
    return { calls, nextPage };
  },

  async listCampaigns(): Promise<RetreaverCampaign[]> {
    const campaigns: RetreaverCampaign[] = [];
    let page: number | null = 1;
    while (page && page <= 40) {
      const { body, link } = await request(API_BASE, "/campaigns.json", { params: { page } });
      campaigns.push(...unwrapList<{ campaign: RetreaverCampaign }>(body).map((c) => c.campaign));
      const next = link ? /<([^>]+)>;\s*rel="next"/.exec(link) : null;
      page = next ? parseInt(new URL(next[1]).searchParams.get("page") ?? "", 10) || null : null;
    }
    return campaigns;
  },

  async listNumbers(params: { cid?: string } = {}): Promise<RetreaverNumber[]> {
    const numbers: RetreaverNumber[] = [];
    let page: number | null = 1;
    while (page && page <= 40) {
      const { body, link } = await request(API_BASE, "/numbers.json", {
        params: { page, client_cid: params.cid },
      });
      numbers.push(...unwrapList<{ number: RetreaverNumber }>(body).map((n) => n.number));
      const next = link ? /<([^>]+)>;\s*rel="next"/.exec(link) : null;
      page = next ? parseInt(new URL(next[1]).searchParams.get("page") ?? "", 10) || null : null;
    }
    return numbers;
  },

  async getCampaign(cid: string): Promise<RetreaverCampaign> {
    const { body } = await request(API_BASE, `/campaigns/cid/${encodeURIComponent(cid)}.json`);
    const obj = (body as Record<string, unknown>)?.campaign as RetreaverCampaign;
    if (!obj) throw new RetreaverError(`Campaign ${cid} not found`, 404, "retreaver");
    return obj;
  },

  async createCampaign(data: RetreaverCampaignInput): Promise<RetreaverCampaign> {
    const { body } = await request(API_BASE, "/campaigns.json", {
      method: "POST",
      body: {
        campaign: {
          ...(data.cid ? { cid: data.cid } : {}),
          name: data.name,
          record_calls: data.record_calls ?? true,
          timers_attributes: data.timers.map((t) => ({ seconds: t.seconds, url: t.url })),
          menu_options_attributes: data.menuOptions.map((m) => ({ option: m.option, target_number: m.targetNumber })),
        },
      },
    });
    return (body as Record<string, unknown>)?.campaign as RetreaverCampaign;
  },

  async updateCampaign(cid: string, data: Omit<RetreaverCampaignInput, "cid">): Promise<RetreaverCampaign> {
    const { body } = await request(API_BASE, `/campaigns/cid/${encodeURIComponent(cid)}.json`, {
      method: "PUT",
      body: {
        campaign: {
          name: data.name,
          record_calls: data.record_calls ?? true,
          destroy_nested: true,
          timers_attributes: data.timers.map((t) => ({ seconds: t.seconds, url: t.url })),
          menu_options_attributes: data.menuOptions.map((m) => ({ option: m.option, target_number: m.targetNumber })),
        },
      },
    });
    return (body as Record<string, unknown>)?.campaign as RetreaverCampaign;
  },

  async reserveRtb(data: {
    key: string;
    publisherId: string;
    callerNumber: string;
    inboundNumber?: string;
    tags?: Record<string, string>;
  }): Promise<RetreaverRtbReservation> {
    const { body } = await request(RTB_BASE, "/rtbs.json", {
      method: "POST",
      body: {
        key: data.key,
        publisher_id: data.publisherId,
        caller_number: data.callerNumber,
        ...(data.inboundNumber ? { inbound_number: data.inboundNumber } : {}),
        ...data.tags,
      },
    });
    return body as RetreaverRtbReservation;
  },

  async confirmRtb(uuid: string, key: string): Promise<{ status: string }> {
    const { body } = await request(RTB_BASE, `/rtbs/${encodeURIComponent(uuid)}.json`, {
      method: "PUT",
      body: { key, status: "confirmed" },
    });
    return body as { status: string };
  },

  async writeCallData(data: { key: string; callerNumber?: string; callUuid?: string; tags?: Record<string, string> }): Promise<unknown> {
    return request(DATA_BASE, "/data_writing", {
      method: "POST",
      body: {
        key: data.key,
        ...(data.callerNumber ? { caller_number: data.callerNumber } : {}),
        ...(data.callUuid ? { call_uuid: data.callUuid } : {}),
        ...data.tags,
      },
    });
  },
};
