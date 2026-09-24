"use client";

import { useState, useEffect, useCallback, useSyncExternalStore } from "react";
import { SdkCallTracker, type SdkPhase } from "./telnyx-call-tracker";

export interface SipCredentials {
  sipUser: string;
  sipPassword: string;
  sipRealm: string;
}

export type AnswerFailureReason = "no-sdk-call" | "not-answerable" | "answer-threw";

export interface AnswerResult {
  ok: boolean;
  reason?: AnswerFailureReason;
  /** SDK leg ID that was (or would be) answered, short-logged by callers. */
  callId: string | null;
  /** Resolves when the SDK answer command settles. Already resolved on failure. */
  settled: Promise<unknown>;
}

interface Snapshot {
  isReady: boolean;
  error: string | null;
  phase: SdkPhase;
  callId: string | null;
}

interface Shared {
  agentId: string;
  client: any | null;
  call: any | null;
  tracker: SdkCallTracker;
  isReady: boolean;
  error: string | null;
  refs: number;
  teardownTimer: ReturnType<typeof setTimeout> | null;
  snapshot: Snapshot;
  dead: boolean;
}

/**
 * SINGLE TelnyxRTC client per agent, shared by every hook instance.
 *
 * Why: Softphone (answers calls) and Take Calls (status pill) used to create
 * two independent clients with the same SIP credentials. The inbound INVITE
 * could land on the client that never answers, while the answering client
 * held no call object — the server then bridged an unanswered leg (422
 * `call-not-answered` × retries → missed). One client also survives page
 * navigation, closing the missed-INVITE-during-navigation race.
 */
let shared: Shared | null = null;
/** In-flight creation (dedup: concurrent mounters share one client). */
let creating: { agentId: string; promise: Promise<Shared> } | null = null;
/** Render subscribers — global, so instances that mount before the client
 *  exists still re-render once it connects (a per-entry set would miss them). */
const subscribers = new Set<() => void>();
/** Grace before disconnecting an unreferenced client (covers StrictMode
 *  double-effects and navigation gaps where refs briefly hit zero). */
const TEARDOWN_GRACE_MS = 30_000;

/**
 * Stable empty snapshot. getSnapshot/getServerSnapshot MUST return cached
 * values — returning a fresh object literal each call makes React see a
 * changed snapshot on every read → infinite re-render loop.
 */
const EMPTY_SNAPSHOT: Snapshot = { isReady: false, error: null, phase: "idle", callId: null };

function getServerSnapshot(): Snapshot {
  return EMPTY_SNAPSHOT;
}

function wlog(agentId: string, msg: string) {
  console.log(`[webrtc:${agentId.slice(0, 8)}] ${msg}`);
}

function emitAll() {
  for (const l of subscribers) {
    try {
      l();
    } catch {
      /* listener must never break the client */
    }
  }
}

function emit(s: Shared) {
  s.snapshot = { isReady: s.isReady, error: s.error, phase: s.tracker.currentPhase, callId: s.tracker.currentCallId };
  emitAll();
}

function teardown(s: Shared) {
  if (s.dead) return;
  s.dead = true;
  if (s.teardownTimer) {
    clearTimeout(s.teardownTimer);
    s.teardownTimer = null;
  }
  wlog(s.agentId, "teardown (no subscribers left)");
  try {
    s.client?.off?.("telnyx.ready");
    s.client?.off?.("telnyx.notification");
    s.client?.off?.("telnyx.error");
    s.client?.disconnect?.();
  } catch {
    /* best-effort */
  }
  s.client = null;
  s.call = null;
  if (shared === s) shared = null;
}

function retain(s: Shared) {
  if (s.dead) return;
  if (s.teardownTimer) {
    clearTimeout(s.teardownTimer);
    s.teardownTimer = null;
  }
  s.refs += 1;
}

function release(s: Shared) {
  s.refs = Math.max(0, s.refs - 1);
  if (s.refs > 0 || s.dead) return;
  if (s.teardownTimer) return;
  s.teardownTimer = setTimeout(() => {
    s.teardownTimer = null;
    if (s.refs === 0) teardown(s);
  }, TEARDOWN_GRACE_MS);
}

async function createShared(agentId: string): Promise<Shared> {
  const s: Shared = {
    agentId,
    client: null,
    call: null,
    tracker: new SdkCallTracker(),
    isReady: false,
    error: null,
    refs: 0,
    teardownTimer: null,
    snapshot: { ...EMPTY_SNAPSHOT },
    dead: false,
  };
  const res = await fetch("/api/v1/me/sip-credentials");
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || "Failed to get SIP credentials");
  }
  const body = await res.json();
  const creds = body.data as SipCredentials | undefined;
  if (!creds) throw new Error("No SIP credentials returned");

  const { TelnyxRTC } = await import("@telnyx/webrtc");
  const client = new TelnyxRTC({ login: creds.sipUser, password: creds.sipPassword });

  client.on("telnyx.ready", () => {
    if (s.dead) return;
    wlog(agentId, "client ready (SIP registered)");
    s.isReady = true;
    s.error = null;
    emit(s);
  });

  client.on("telnyx.notification", (notification: any) => {
    if (s.dead) return;
    const call = notification?.call;
    if (notification?.type !== "callUpdate" || !call) return;
    const id = String(call.id ?? call.callId ?? "");
    const state = String(call.state ?? "");
    const changed = s.tracker.onNotification(id || null, state);
    if (changed) {
      const phase = s.tracker.currentPhase;
      wlog(agentId, `leg ${id.slice(0, 12) || "?"} state=${state} → phase=${phase}`);
      if (phase === "ended") {
        if (s.call && (!id || String(s.call.id ?? s.call.callId ?? "") === id)) s.call = null;
      } else {
        s.call = call;
      }
      emit(s);
    } else {
      // No state change — still log stale clears loudly; they are the
      // fingerprint of the back-to-back-call race.
      if (state.toLowerCase() === "hangup" || state.toLowerCase() === "destroy") {
        wlog(agentId, `stale ${state} for leg ${id.slice(0, 12) || "?"} ignored (tracking ${String(s.tracker.currentCallId ?? "none").slice(0, 12)})`);
      }
    }
  });

  client.on("telnyx.error", (e: any) => {
    if (s.dead) return;
    const msg = typeof e === "string" ? e : e?.message || JSON.stringify(e);
    console.error("[WebRTC SDK error]", e);
    wlog(agentId, `sdk error: ${msg}`);
    s.error = msg;
    emit(s);
  });

  client.remoteElement = "remoteMedia";
  s.client = client;
  wlog(agentId, "connecting client…");
  client.connect();
  return s;
}

/** One client per agentId; concurrent callers share the in-flight creation. */
async function getOrCreate(agentId: string): Promise<Shared> {
  if (shared && !shared.dead && shared.agentId === agentId) return shared;
  let active = creating && creating.agentId === agentId ? creating : null;
  if (!active) {
    if (shared && !shared.dead) teardown(shared);
    const p = createShared(agentId);
    active = { agentId, promise: p };
    creating = active;
    try {
      await p;
    } finally {
      if (creating === active) creating = null;
    }
  }
  const s = await active.promise;
  if (!shared || shared.dead || shared.agentId !== agentId) {
    shared = s;
  }
  return shared;
}

function failedEntry(agentId: string, message: string): Shared {
  return {
    agentId,
    client: null,
    call: null,
    tracker: new SdkCallTracker(),
    isReady: false,
    error: message,
    refs: 0,
    teardownTimer: null,
    snapshot: { isReady: false, error: message, phase: "idle", callId: null },
    dead: false,
  };
}

export function useTelnyxWebRTC(agentId: string | null | undefined) {
  const key = agentId ?? null;

  const subscribe = useCallback((_notify: () => void) => {
    subscribers.add(_notify);
    return () => {
      subscribers.delete(_notify);
    };
  }, []);

  const getSnapshot = useCallback((): Snapshot => {
    if (!key || !shared || shared.agentId !== key || shared.dead) {
      return EMPTY_SNAPSHOT;
    }
    return shared.snapshot;
  }, [key]);

  const snap = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Attach/detach this instance. Softphone stays mounted for the whole agent
  // session, so the client persists across page navigation. Instances share
  // one ref-counted client — Take Calls included (it keeps the client alive
  // and reads status from the same snapshot).
  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    let mine: Shared | null = null;
    (async () => {
      try {
        mine = await getOrCreate(key);
        if (cancelled || mine.dead || mine.agentId !== key) {
          if (mine) release(mine);
          mine = null;
          return;
        }
        retain(mine);
        emitAll();
      } catch (e: any) {
        if (cancelled) return;
        // Publish init failure through a live entry so the UI shows it.
        const message = e?.message || "WebRTC init failed";
        wlog(key, `init FAILED: ${message}`);
        if (!shared || shared.dead || shared.agentId !== key) {
          shared = failedEntry(key, message);
        } else {
          shared.error = message;
          emit(shared);
        }
        mine = shared;
        retain(mine);
        emitAll();
      }
    })();
    return () => {
      cancelled = true;
      if (mine) {
        release(mine);
        mine = null;
      }
    };
  }, [key]);

  const [isMuted, setIsMuted] = useState(false);

  const answer = useCallback(
    (remoteElement?: HTMLElement | string): AnswerResult => {
      const s = shared;
      const none: AnswerResult = { ok: false, reason: "no-sdk-call", callId: null, settled: Promise.resolve() };
      if (!key || !s || s.dead || s.agentId !== key) return none;
      const decision = s.tracker.decideAnswer();
      if (!decision.ok) {
        wlog(key, `answer SKIPPED reason=${decision.reason} tracked=${String(decision.callId ?? "none").slice(0, 12)} — server bridge will run alone`);
        return { ok: false, reason: decision.reason, callId: decision.callId, settled: Promise.resolve() };
      }
      const call = s.call;
      if (!call || String(call.id ?? call.callId ?? "") !== decision.callId) {
        // Tracker says a call is live but the object is gone/skewed — never
        // answer blind. This is the exact 422-loop precondition.
        wlog(key, `answer REFUSED object-mismatch tracked=${decision.callId.slice(0, 12)} — server bridge will run alone`);
        return { ok: false, reason: "no-sdk-call", callId: decision.callId, settled: Promise.resolve() };
      }
      wlog(key, `answer START leg=${decision.callId.slice(0, 12)} phase=${s.tracker.currentPhase}`);
      try {
        const p = remoteElement ? call.answer({ remoteElement }) : call.answer();
        const settled = Promise.resolve(p).then(
          () => wlog(key, `answer COMMAND OK leg=${decision.callId.slice(0, 12)}`),
          (e: any) => {
            wlog(key, `answer COMMAND FAILED leg=${decision.callId.slice(0, 12)}: ${e?.message ?? e}`);
            throw e;
          },
        );
        return { ok: true, callId: decision.callId, settled };
      } catch (e: any) {
        wlog(key, `answer THREW leg=${decision.callId.slice(0, 12)}: ${e?.message ?? e}`);
        return { ok: false, reason: "answer-threw", callId: decision.callId, settled: Promise.resolve() };
      }
    },
    [key],
  );

  const hangupCall = useCallback(() => {
    const s = shared;
    if (!key || !s || s.dead || s.agentId !== key) return;
    const id = s.tracker.currentCallId;
    wlog(key, `hangup leg=${String(id ?? "none").slice(0, 12)}`);
    try {
      s.call?.hangup?.();
    } catch {
      /* best-effort */
    }
    s.call = null;
    s.tracker.reset();
    setIsMuted(false);
    emit(s);
  }, [key]);

  const toggleMute = useCallback(() => {
    const s = shared;
    const call: any = s && !s.dead ? s.call : null;
    const next = !isMuted;
    try {
      if (call?.muteAudio && call?.unmuteAudio) {
        if (next) call.muteAudio();
        else call.unmuteAudio();
      } else if (call?.localStream) {
        call.localStream.getAudioTracks().forEach((t: MediaStreamTrack) => {
          t.enabled = !next;
        });
      } else {
        const el = document.getElementById("remoteMedia") as HTMLAudioElement | null;
        const stream = el?.srcObject as MediaStream | null;
        if (stream) stream.getAudioTracks().forEach((t) => {
          t.enabled = !next;
        });
      }
    } catch {}
    setIsMuted(next);
    return next;
  }, [isMuted]);

  const sendDTMF = useCallback((digits: string) => {
    const s = shared;
    const call: any = s && !s.dead ? s.call : null;
    try {
      if (call?.dtmf) call.dtmf(digits);
      else if (call?.sendDigits) call.sendDigits(digits);
      else if (call?.sendDTMF) call.sendDTMF(digits);
    } catch {}
  }, []);

  return {
    isReady: snap.isReady,
    error: snap.error,
    sdkCallState: snap.phase,
    sdkPhase: snap.phase,
    telnyxCallId: snap.callId,
    sdkCallId: snap.callId,
    isMuted,
    answer,
    hangup: hangupCall,
    toggleMute,
    sendDTMF,
  };
}
