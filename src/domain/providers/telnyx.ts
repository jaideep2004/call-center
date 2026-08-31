import { createPublicKey, verify } from "node:crypto";
import Telnyx from "telnyx";
import type { TelephonyProvider, ProviderEventType, NormalizedProviderEvent } from "@/domain/telephony";

function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required environment variable: ${key}`);
  return val;
}

function resolveEventType(webhook: Record<string, unknown>): string {
  const meta = webhook.metadata as Record<string, unknown> | undefined;
  if (meta?.event) {
    const inner = meta.event as Record<string, unknown>;
    return String(inner.event_type ?? "");
  }
  const data = webhook.data as Record<string, unknown> | undefined;
  if (data?.event_type) return String(data.event_type);
  if (webhook.event_type) return String(webhook.event_type);
  return String(data?.event_type ?? "");
}

function resolveCallControlId(webhook: Record<string, unknown>): string {
  const meta = webhook.metadata as Record<string, unknown> | undefined;
  if (meta?.event) {
    const inner = meta.event as Record<string, unknown>;
    const p = inner.payload as Record<string, unknown> | undefined;
    if (p?.call_control_id) return String(p.call_control_id);
  }
  const data = webhook.data as Record<string, unknown> | undefined;
  if (data?.payload) {
    const p = data.payload as Record<string, unknown>;
    if (p.call_control_id) return String(p.call_control_id);
  }
  return String(data?.call_control_id ?? webhook.call_leg_id ?? "");
}

function getFromField(webhook: Record<string, unknown>): string {
  const meta = webhook.metadata as Record<string, unknown> | undefined;
  if (meta?.event) {
    const inner = meta.event as Record<string, unknown>;
    const p = inner.payload as Record<string, unknown> | undefined;
    if (p?.from) return String(p.from);
  }
  const data = webhook.data as Record<string, unknown> | undefined;
  if (data?.payload) {
    const p = data.payload as Record<string, unknown>;
    if (p.from) return String(p.from);
  }
  return String(data?.from ?? "");
}

function getToField(webhook: Record<string, unknown>): string {
  const meta = webhook.metadata as Record<string, unknown> | undefined;
  if (meta?.event) {
    const inner = meta.event as Record<string, unknown>;
    const p = inner.payload as Record<string, unknown> | undefined;
    if (p?.to) return String(p.to);
  }
  const data = webhook.data as Record<string, unknown> | undefined;
  if (data?.payload) {
    const p = data.payload as Record<string, unknown>;
    if (p.to) return String(p.to);
  }
  return String(data?.to ?? "");
}

function getEventId(webhook: Record<string, unknown>): string {
  const meta = webhook.metadata as Record<string, unknown> | undefined;
  if (meta?.event) {
    const inner = meta.event as Record<string, unknown>;
    if (inner.id) return String(inner.id);
  }
  const data = webhook.data as Record<string, unknown> | undefined;
  if (data?.id) return String(data.id);
  return String(webhook.id ?? `${Date.now()}`);
}

function getOccurredAt(webhook: Record<string, unknown>): string {
  const meta = webhook.metadata as Record<string, unknown> | undefined;
  if (meta?.event) {
    const inner = meta.event as Record<string, unknown>;
    if (inner.occurred_at) return String(inner.occurred_at);
  }
  const data = webhook.data as Record<string, unknown> | undefined;
  if (data?.occurred_at) return String(data.occurred_at);
  return String(webhook.occurred_at ?? new Date().toISOString());
}

function keyToPem(base64Key: string): string {
  const cleaned = base64Key.replace(/-/g, "+").replace(/_/g, "/");
  let raw: Buffer;
  try {
    raw = Buffer.from(cleaned, "base64");
  } catch {
    throw new Error("Invalid base64 public key");
  }
  if (raw.length === 32) {
    const prefix = Buffer.from("MCowBQYDK2VwAyEA", "base64");
    raw = Buffer.concat([prefix, raw]);
  }
  const b64 = raw.toString("base64");
  const lines: string[] = ["-----BEGIN PUBLIC KEY-----"];
  for (let i = 0; i < b64.length; i += 64) lines.push(b64.slice(i, i + 64));
  lines.push("-----END PUBLIC KEY-----");
  return lines.join("\n");
}

const TELNYX_EVENT_MAP: Record<string, ProviderEventType> = {
  "call.initiated": "inbound",
  "call.ringing": "ringing",
  "call.answered": "connected",
  "call.hangup": "ended",
  "call.machine.detection.ended": "connected",
  "recording.saved": "recording_ready",
  // Webhook v2 format prefixes recording events with "call."
  "call.recording.saved": "recording_ready",
  // Bridge success is reflected by acceptCall's state update; these must not kill the call.
  "call.bridged": "ringing",
  // Billing event fired at call end; harmless once the call is terminal.
  "call.cost": "ringing",
};

function getClient(): Telnyx {
  const apiKey = requireEnv("TELNYX_API_KEY");
  return new Telnyx({ apiKey });
}

export const telnyxProvider: TelephonyProvider = {
  name: "telnyx",
  capabilities: { webRtc: true, pstn: true, recordings: true },

  async verifyWebhook({ payload, signature, timestamp }) {
    if (!signature || !timestamp) return false;
    const publicKeyB64 = requireEnv("TELNYX_PUBLIC_KEY");
    try {
      const publicKeyPem = keyToPem(publicKeyB64);
      const sigBuf = Buffer.from(signature, "base64");
      const keyObj = createPublicKey(publicKeyPem);
      return verify(null, Buffer.from(`${timestamp}|${payload}`), keyObj, sigBuf);
    } catch (e: any) {
      console.error("verifyWebhook error:", e?.message ?? e);
      return false;
    }
  },

  normalizeEvent(payload: unknown): NormalizedProviderEvent {
    const webhook = payload as Record<string, unknown>;
    const eventType = resolveEventType(webhook);
    const type = TELNYX_EVENT_MAP[eventType] ?? "ended";
    return {
      provider: "telnyx",
      eventId: getEventId(webhook),
      type,
      providerCallId: resolveCallControlId(webhook),
      occurredAt: getOccurredAt(webhook),
      from: getFromField(webhook),
      to: getToField(webhook),
      raw: webhook,
    };
  },

  async ring({ callId, agentId, endpoint, from, to }) {
    const client = getClient();
    const connectionId = requireEnv("TELNYX_CONNECTION_ID");
    if (!to) throw new Error("Telnyx ring requires a destination address (to)");
    if (!from) throw new Error("Telnyx ring requires a source address (from)");
    const result = await (client.calls as any).dial({
      to,
      from,
      connection_id: connectionId,
      timeout_secs: 30,
      client_state: Buffer.from(JSON.stringify({ callId, agentId }), "utf-8").toString("base64"),
    });
    return { providerAttemptId: String((result as any).data?.call_control_id ?? "") };
  },

  async answer({ callId }) {
    const client = getClient();
    try {
      await (client.calls.actions as any).answer(callId, {});
    } catch (e: any) {
      console.error("answer() failed:", e?.message ?? e);
      throw e;
    }
  },

  async bridge({ callId, providerAttemptId }) {
    const client = getClient();
    try {
      console.log(`[telnyx bridge] target=${callId?.slice(0,12)} source=${providerAttemptId?.slice(0,12)}`);
      const result = await (client.calls.actions as any).bridge(providerAttemptId, {
        call_control_id: callId,
      });
      console.log(`[telnyx bridge] result:`, JSON.stringify(result));
    } catch (e: any) {
      console.error(`[telnyx bridge] failed:`, e?.message ?? e, e?.status, e?.raw?.body ?? "");
      throw e;
    }
  },

  async cancel({ providerAttemptId }) {
    const client = getClient();
    try {
      await (client.calls.actions as any).hangup(providerAttemptId);
    } catch (err: any) {
      if (err?.status !== 404) throw err;
    }
  },

  async fetchRecording({ providerCallId, recordingId }) {
    const client = getClient();
    let rec: any = null;
    if (recordingId) {
      const result = await (client.recordings as any).retrieve(recordingId);
      rec = (result as any)?.data;
    } else if (providerCallId) {
      const result = await (client.recordings as any).list({
        "filter[call_leg_id]": providerCallId,
      });
      rec = (result as any)?.data?.[0];
    }
    if (!rec) throw new Error(`No recording found (recordingId=${recordingId ?? "?"}, providerCallId=${providerCallId ?? "?"})`);
    const dl = rec.download_urls ?? {};
    const url = dl.mp3 ?? dl.wav ?? dl.media ?? rec.media_url ?? rec.url ?? "";
    if (!url) throw new Error(`Recording ${rec.id} has no downloadable URL`);
    return {
      url,
      contentType: typeof dl.mp3 === "string" ? "audio/mpeg" : "audio/wav",
      durationSeconds: rec.duration_millis != null ? Math.round(rec.duration_millis / 1000) : undefined,
    };
  },

  async hold({ callId }: { callId: string }) {
    const client = getClient();
    await (client.calls.actions as any).hold(callId, {});
  },
  async unhold({ callId }: { callId: string }) {
    const client = getClient();
    await (client.calls.actions as any).unhold(callId, {});
  },
  async sendDTMF({ callId, digits }: { callId: string; digits: string }) {
    const client = getClient();
    await (client.calls.actions as any).send_dtmf(callId, { digits });
  },
};
