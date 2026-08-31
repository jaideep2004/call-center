import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getTelephonyProvider } from "@/server/telephony-registry";
import { processProviderEvent } from "@/server/services/call-orchestrator";
import { decodeClientState } from "@/domain/telephony";

export const runtime = "nodejs";

const DEBUG = process.env.WEBHOOK_DEBUG === "1";

// One concise log line per event, only when WEBHOOK_DEBUG=1.
// Never writes files and never logs full payloads or signatures (PII).
function dlog(msg: string) {
  if (DEBUG) console.log("[webhook]", msg);
}

const PROVIDER_SIG_HEADERS: Record<string, { sig: string; ts: string }> = {
  mock: { sig: "x-telephony-signature", ts: "x-telephony-timestamp" },
  telnyx: { sig: "telnyx-signature-ed25519", ts: "telnyx-timestamp" },
};

export async function GET() {
  return NextResponse.json({ ok: true, message: "Webhook endpoint ready (use POST)" });
}

export async function POST(request: Request, context: { params: Promise<{ provider: string }> }) {
  const startedAt = Date.now();
  const { provider: providerName } = await context.params;
  let provider;
  try { provider = getTelephonyProvider(providerName); } catch { return NextResponse.json({ error: "Unknown provider" }, { status: 404 }); }
  const headerMap = PROVIDER_SIG_HEADERS[providerName] ?? { sig: "x-telephony-signature", ts: "x-telephony-timestamp" };
  const payload = await request.text();
  const sig = request.headers.get(headerMap.sig);
  const ts = request.headers.get(headerMap.ts);
  const verified = await provider.verifyWebhook({
    payload,
    signature: sig,
    timestamp: ts,
  });
  if (!verified) {
    dlog(`${providerName} rejected (invalid signature, ${payload.length}b payload)`);
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
  }
  try {
    const parsed = JSON.parse(payload);
    const normalized = provider.normalizeEvent(parsed);
    const clientState = parsed?.data?.payload?.client_state;
    if (clientState) {
      // Outbound (agent) leg: decode our own context; skip only foreign legs we did not dial.
      const context = decodeClientState(clientState);
      if (!context.callId) {
        dlog(`${providerName} skipped outbound leg (no call context in client_state)`);
        return NextResponse.json({ skipped: true }, { status: 200 });
      }
      normalized.callId = context.callId;
      normalized.agentId = context.agentId;
    }
    const result = await processProviderEvent(normalized);
    const correlationId = createHash("sha256").update(`${normalized.provider}:${normalized.eventId}`).digest("hex").slice(0, 16);
    console.info(JSON.stringify({
      event: "webhook_done", provider: normalized.provider, type: normalized.type,
      elapsedMs: Date.now() - startedAt, correlationId,
    }));
    return NextResponse.json({ accepted: true, correlationId, result }, { status: 202 });
  } catch (e: any) {
    dlog(`${providerName} error: ${e?.message ?? "unknown"}`);
    return NextResponse.json({ error: "Malformed provider event" }, { status: 400 });
  }
}
