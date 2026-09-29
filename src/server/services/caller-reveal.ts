import { decryptSecret } from "@/server/crypto";
import type { CallRow } from "@/server/repositories/calls";

export interface CallerReveal {
  revealed: boolean;
  caller_number: string | null;
}

/** Elapsed connected seconds (live calls measured to now). */
export function connectedSecondsOf(call: Pick<CallRow, "connected_at" | "ended_at">, nowMs = Date.now()): number {
  if (!call.connected_at) return 0;
  const endMs = call.ended_at ? new Date(call.ended_at).getTime() : nowMs;
  return Math.max(0, Math.round((endMs - new Date(call.connected_at).getTime()) / 1000));
}

/**
 * Post-buffer reveal gate: the caller number unlocks once the conversation
 * has crossed the campaign's buffer_seconds. Pre-buffer (or missing escrow)
 * stays masked — the raw number is never exposed.
 */
export function callerRevealFor(
  call: Pick<CallRow, "connected_at" | "ended_at" | "caller_number_encrypted">,
  bufferSeconds: number,
  nowMs = Date.now(),
): CallerReveal {
  if (!call.caller_number_encrypted) return { revealed: false, caller_number: null };
  const buffer = Number.isFinite(bufferSeconds) && bufferSeconds > 0 ? bufferSeconds : 0;
  if (connectedSecondsOf(call, nowMs) <= buffer) return { revealed: false, caller_number: null };
  try {
    return { revealed: true, caller_number: decryptSecret(call.caller_number_encrypted) };
  } catch {
    return { revealed: false, caller_number: null };
  }
}
