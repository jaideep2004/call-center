import { NextResponse } from "next/server";
import { evaluatePing } from "@/server/services/ping-evaluator";

export const runtime = "nodejs";

/**
 * Retreaver Ping-Post entry point. The publisher sends a ping before
 * forwarding the call; we respond accept/reject within the ping window.
 * Tolerant parameter parsing covers the common Retreaver field variants.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const expected = process.env.RETREAVER_WEBHOOK_SECRET;
  if (!expected || token !== expected) {
    return NextResponse.json({ status: "rejected", reason: "unauthorized" }, { status: 401 });
  }

  const caller =
    url.searchParams.get("caller_phone_number") ??
    url.searchParams.get("phone_number") ??
    url.searchParams.get("caller_number") ?? null;
  const did =
    url.searchParams.get("inbound_number") ??
    url.searchParams.get("target_number") ??
    url.searchParams.get("did") ?? "";

  const result = await evaluatePing({ did, caller });

  if (result.decision === "reject") {
    return NextResponse.json(
      {
        status: "rejected",
        reason: result.reason,
        state: result.state ?? undefined,
        campaign_id: result.campaignId ?? undefined,
      },
      { status: 200 },
    );
  }

  return NextResponse.json({
    status: "accepted",
    state: result.state ?? undefined,
    campaign_id: result.campaignId,
    agent_id: result.agentId,
  }, { status: 200 });
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    // fall back to query params only
  }

  const token =
    url.searchParams.get("token") ??
    (typeof body.token === "string" ? body.token : null);
  const expected = process.env.RETREAVER_WEBHOOK_SECRET;
  if (!expected || token !== expected) {
    return NextResponse.json({ status: "rejected", reason: "unauthorized" }, { status: 401 });
  }

  const pick = (...keys: string[]): string | null => {
    for (const key of keys) {
      const q = url.searchParams.get(key);
      if (q) return q;
      const b = body[key];
      if (typeof b === "string" && b) return b;
    }
    return null;
  };

  const caller = pick("caller_phone_number", "phone_number", "caller_number");
  const did = pick("inbound_number", "target_number", "did") ?? "";

  const result = await evaluatePing({ did, caller });

  if (result.decision === "reject") {
    return NextResponse.json(
      {
        status: "rejected",
        reason: result.reason,
        state: result.state ?? undefined,
        campaign_id: result.campaignId ?? undefined,
      },
      { status: 200 },
    );
  }

  return NextResponse.json({
    status: "accepted",
    state: result.state ?? undefined,
    campaign_id: result.campaignId,
    agent_id: result.agentId,
  }, { status: 200 });
}
