/**
 * Pure call-tracking logic for the Telnyx WebRTC agent leg.
 *
 * Extracted from the hook so the two hardest bugs in the connect path are
 * unit-testable without a browser or the Telnyx SDK:
 *
 * 1. Stale-event race — a previous call's late `hangup`/`destroy` must never
 *    clear the *current* call's ref. Every clear is ID-matched.
 * 2. Wrong state strings — the SDK (@telnyx/webrtc 2.x) reports
 *    ringing/answering/early/active/hangup/destroy. There is NO `answered`
 *    SDK state (that is a server webhook event name). Answering is only
 *    allowed from an answerable phase.
 */

export type SdkPhase = "idle" | "ringing" | "answering" | "early" | "active" | "ended";

/** SDK `call.state` (lowercase Verto state names) → our phase. Unknown states map to null (ignored). */
export function mapSdkPhase(sdkState: unknown): SdkPhase | null {
  switch (typeof sdkState === "string" ? sdkState.toLowerCase() : "") {
    case "ringing":
      return "ringing";
    case "answering":
      return "answering";
    case "early":
      return "early";
    case "active":
      return "active";
    case "held":
    case "hold":
      return "active";
    case "hangup":
    case "destroy":
    case "purge":
      return "ended";
    default:
      return null;
  }
}

/** Phases in which `call.answer()` is meaningful. */
export function isAnswerablePhase(phase: SdkPhase): boolean {
  return phase === "ringing" || phase === "answering" || phase === "early";
}

export type AnswerDecision =
  | { ok: true; callId: string }
  | { ok: false; reason: "no-sdk-call" | "not-answerable"; callId: string | null };

/**
 * Tracks exactly one live SDK call by ID. Late events for any other call ID
 * are recorded as stale and ignored — they must never mutate current state.
 */
export class SdkCallTracker {
  private callId: string | null = null;
  private phase: SdkPhase = "idle";
  private staleEvents = 0;

  get currentCallId(): string | null {
    return this.callId;
  }

  get currentPhase(): SdkPhase {
    return this.phase;
  }

  get staleCount(): number {
    return this.staleEvents;
  }

  /** Returns true when this event changed tracked state. */
  onNotification(callId: string | null | undefined, sdkState: unknown): boolean {
    const phase = mapSdkPhase(sdkState);
    if (!phase) return false;
    if (phase === "ended") {
      // ID-matched clear: a previous call's late hangup must not kill the current call.
      if (callId != null && this.callId != null && callId !== this.callId) {
        this.staleEvents += 1;
        return false;
      }
      if (this.callId == null && this.phase === "idle") return false;
      this.callId = null;
      this.phase = "ended";
      return true;
    }
    // Any live phase (re)places the tracked call — a new ringing supersedes.
    if (this.callId !== callId || this.phase !== phase) {
      this.callId = callId ?? null;
      this.phase = phase;
      return true;
    }
    return false;
  }

  decideAnswer(): AnswerDecision {
    if (this.callId == null || this.phase === "idle" || this.phase === "ended") {
      return { ok: false, reason: "no-sdk-call", callId: this.callId };
    }
    if (!isAnswerablePhase(this.phase)) {
      return { ok: false, reason: "not-answerable", callId: this.callId };
    }
    return { ok: true, callId: this.callId };
  }

  /** Local hangup: forget the tracked call regardless of trailing events. */
  reset(): void {
    this.callId = null;
    this.phase = "idle";
  }
}
