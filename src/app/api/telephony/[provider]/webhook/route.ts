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
    // Pinpoint logging: raw Telnyx event (call.ringing vs call.cost vs
    // call.hangup collapse into one normalized type), which leg it belongs
    // to (agent legs carry our client_state; caller legs never do), and SIP
    // hangup diagnostics. This is what separates "INVITE went nowhere"
    // (agent leg: initiated → hangup 487, never ringing) from "contact
    // rejected" (486/603) or "caller abandoned" at a glance.
    const rawEventType = (parsed as { data?: { event_type?: unknown }; event_type?: unknown })?.data?.event_type
      ?? (parsed as { event_type?: unknown })?.event_type ?? null;
    const payloadNode = (parsed as { data?: { payload?: Record<string, unknown> } })?.data?.payload ?? {};
    console.info(JSON.stringify({
      event: "webhook_done", provider: normalized.provider, type: normalized.type,
      raw: rawEventType,
      leg: clientState ? "agent" : "caller",
      ...(normalized.type === "ended" ? {
        cause: payloadNode.hangup_cause ?? null,
        sip: payloadNode.sip_hangup_cause ?? null,
        src: payloadNode.hangup_source ?? null,
      } : {}),
      elapsedMs: Date.now() - startedAt, correlationId,
    }));
    return NextResponse.json({ accepted: true, correlationId, result }, { status: 202 });
  } catch (e: any) {
    dlog(`${providerName} error: ${e?.message ?? "unknown"}`);
    console.error(`[webhook:${providerName}]`, e?.message ?? e);
    return NextResponse.json({ error: "Malformed provider event" }, { status: 400 });
  }
}
