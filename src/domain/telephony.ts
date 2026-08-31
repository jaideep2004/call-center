export type ProviderEventType = "inbound" | "ringing" | "accepted" | "connected" | "ended" | "recording_ready";
export interface NormalizedProviderEvent {
  provider: string; eventId: string; type: ProviderEventType; providerCallId: string;
  occurredAt: string; from?: string; to?: string; raw: Record<string, unknown>;
  /** Set for outbound/agent legs (decoded from provider client_state): the internal call this leg belongs to. */
  callId?: string;
  agentId?: string;
}

/**
 * Decodes the base64 JSON client_state attached to outbound (agent) legs.
 * Returns the internal call/agent context, or an empty object when malformed.
 */
export function decodeClientState(clientState: string): { callId?: string; agentId?: string } {
  try {
    const parsed = JSON.parse(Buffer.from(clientState, "base64").toString("utf-8"));
    return {
      callId: typeof parsed?.callId === "string" ? parsed.callId : undefined,
      agentId: typeof parsed?.agentId === "string" ? parsed.agentId : undefined,
    };
  } catch {
    return {};
  }
}
export interface TelephonyProvider {
  name: string;
  capabilities: { webRtc: boolean; pstn: boolean; recordings: boolean };
  verifyWebhook(input: { payload: string; signature: string | null; timestamp: string | null }): Promise<boolean>;
  normalizeEvent(payload: unknown): NormalizedProviderEvent;
  ring(input: {
    callId: string;
    agentId: string;
    endpoint: "webrtc" | "pstn";
    from?: string;
    to?: string;
  }): Promise<{ providerAttemptId: string }>;
  answer(input: { callId: string }): Promise<void>;
  bridge(input: { callId: string; providerAttemptId: string }): Promise<void>;
  cancel(input: { providerAttemptId: string }): Promise<void>;
  fetchRecording(input: { providerCallId?: string; recordingId?: string }): Promise<{ url: string; contentType: string; durationSeconds?: number }>;
  hold?(input: { callId: string }): Promise<void>;
  unhold?(input: { callId: string }): Promise<void>;
  sendDTMF?(input: { callId: string; digits: string }): Promise<void>;
}

export const mockProvider: TelephonyProvider = {
  name: "mock",
  capabilities: { webRtc: true, pstn: true, recordings: true },
  async verifyWebhook() { return true; },
  normalizeEvent(payload) {
    const event = payload as Record<string, unknown>;
    return { provider: "mock", eventId: String(event.eventId), type: event.type as ProviderEventType,
      providerCallId: String(event.callId), occurredAt: String(event.occurredAt ?? new Date().toISOString()),
      from: event.from as string | undefined, to: event.to as string | undefined, raw: event };
  },
  async ring({ callId, agentId }) { return { providerAttemptId: `mock_${callId}_${agentId}` }; },
  async answer() {}, async bridge() {}, async cancel() {},
  async fetchRecording({ providerCallId, recordingId }) { return { url: `mock://recordings/${providerCallId ?? recordingId}`, contentType: "audio/wav", durationSeconds: 30 }; },
};
