"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSocket, useSocketEvent } from "@/lib/use-socket";
import type { Socket } from "socket.io-client";
import { formatTimer } from "@/lib/format";
import { useTelnyxWebRTC } from "@/lib/use-telnyx-webrtc";
import { renderScriptTemplate } from "@/server/services/script-renderer";
import { showToast } from "@/lib/use-toast";
import { Minus, Expand } from "lucide-react";

interface IncomingCall {
  callId: string;
  campaignId: string;
  fromHash: string;
  callerState?: string | null;
}
interface ScriptPanel {
  title: string;
  content: string;
  category: string;
}
interface SoftphoneProps {
  membershipId: string | null;
  agentId?: string | null;
}
type CallState = "idle" | "ringing" | "connecting" | "connected" | "ended";

function useCallTimer(running: boolean) {
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setElapsed(0);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running]);
  return elapsed;
}

function formatPhone(raw: string): string {
  if (!raw || raw.length < 6) return raw;
  const clean = raw.replace(/[^0-9a-f]/gi, "");
  if (clean.length >= 12) return `+${clean.slice(0,1)} (${clean.slice(1,4)}) ${clean.slice(4,7)}-${clean.slice(7,11)}`;
  if (clean.length >= 10) return `(${clean.slice(0,3)}) ${clean.slice(3,6)}-${clean.slice(6,10)}`;
  return raw.slice(0, 12);
}

export default function Softphone({ membershipId, agentId }: SoftphoneProps) {
  const { socket } = useSocket(membershipId);
  const [callState, setCallState] = useState<CallState>("idle");
  const [incoming, setIncoming] = useState<IncomingCall | null>(null);
  const timerRunning = callState === "connected";
  const elapsed = useCallTimer(timerRunning);
  const [error, setError] = useState<string | null>(null);
  const [activeCallId, setActiveCallId] = useState<string | null>(null);
  // Browser-leg failure surfaced in the popup (e.g. this tab never received
  // the Telnyx INVITE). Distinct from server `error` so the agent knows the
  // bridge ran without a browser pickup.
  const [sdkError, setSdkError] = useState<string | null>(null);
  const [debug, setDebug] = useState<string[]>([]);
  const debugRef = useRef(debug);
  debugRef.current = debug;
  const addDebug = useCallback((msg: string) => {
    console.log("[softphone]", msg);
    setDebug((d) => [...d.slice(-19), `${new Date().toLocaleTimeString()} ${msg}`]);
  }, []);

  const webrtc = useTelnyxWebRTC(agentId);

  const [script, setScript] = useState<ScriptPanel | null>(null);
  const [scriptError, setScriptError] = useState<boolean>(false);
  const [agentProfile, setAgentProfile] = useState<{ name?: string; npn?: string; state?: string; code?: string }>({});
  // 4.2 states
  const [isHeld, setIsHeld] = useState(false);
  const [showDialer, setShowDialer] = useState(false);
  const [dialDigits, setDialDigits] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [notes, setNotes] = useState<{ id: string; body: string; created_at: string }[]>([]);
  const [savingNote, setSavingNote] = useState(false);
  const [savingDTMF, setSavingDTMF] = useState(false);
  const [holding, setHolding] = useState(false);
  const [isRecording, setIsRecording] = useState(true);
  const [showScriptModal, setShowScriptModal] = useState(false);
  // Minimize: collapse panels to floating chips so the agent can work in
  // other dashboard tabs mid-call. Layout persists across dashboard pages.
  const [callMinimized, setCallMinimized] = useState(false);
  const [scriptMinimized, setScriptMinimized] = useState(false);
  // Speaker (remote-audio output) volume. Applied to #remoteMedia below.
  const [volume, setVolume] = useState(0.9);
  // Auto-pickup (client billing concern): answer the moment a call rings so
  // the publisher's billable clock starts with an agent on the line, not a
  // ringing phone. Default ON; per-agent toggle persisted locally. Manual
  // Accept/Reject stay available regardless.
  const [autoAnswer, setAutoAnswer] = useState<boolean>(() => {
    try { return localStorage.getItem("cc-auto-answer") !== "off"; } catch { return true; }
  });
  const autoAcceptedRef = useRef<string | null>(null);
  useEffect(() => {
    try { localStorage.setItem("cc-auto-answer", autoAnswer ? "on" : "off"); } catch {}
  }, [autoAnswer]);

  useEffect(() => {
    const el = document.getElementById("remoteMedia") as HTMLAudioElement | null;
    if (el) el.volume = volume;
  }, [volume, callState]);

  useEffect(() => {
    if (!agentId) return;
    fetch(`/api/v1/agents/${agentId}`).then(async (res) => {
      if (!res.ok) return;
      const body = await res.json();
      const a = body.data;
      if (!a) return;
      setAgentProfile({
        name: a.user_name ?? "",
        npn: a.npn ?? "",
        state: Array.isArray(a.states) && a.states.length > 0 ? a.states[0] : "",
        code: a.display_code ?? a.id?.slice(0, 8) ?? "",
      });
    }).catch(() => {});
  }, [agentId]);

  useEffect(() => {
    if (!incoming || !incoming.campaignId || callState === "idle") return;
    let cancelled = false;
    setScriptError(false);
    fetch(`/api/v1/scripts?campaign_id=${encodeURIComponent(incoming.campaignId)}`).then(async (res) => {
      if (!res.ok) { if (!cancelled) setScriptError(true); return; }
      const body = await res.json();
      const rows = body.data ?? [];
      const picked = rows.length > 0 ? rows[0] : null;
      if (!cancelled) {
        if (picked) {
          setScript({ title: picked.title, content: picked.content, category: picked.category });
          setScriptError(false);
        } else {
          setScript(null);
        }
      }
    }).catch(() => { if (!cancelled) setScriptError(true); });
    return () => { cancelled = true; };
  }, [incoming?.campaignId, callState]);

  const renderedScript = (() => {
    if (!script) return null;
    return renderScriptTemplate(script.content, {
      agent_name: agentProfile.name,
      npn: agentProfile.npn,
      state: agentProfile.state,
      phone: formatPhone(incoming?.fromHash ?? ""),
    });
  })();

  // Script stays docked (left) on ringing — the overlay no longer blurs the
  // page and the script never auto-covers the call dialog (right). The
  // expanded modal opens only on demand via View script / Expand / Script.
  useEffect(() => {
    if (callState === "idle" || callState === "ended") {
      setShowScriptModal(false);
      setCallMinimized(false);
      setScriptMinimized(false);
      setIsHeld(false);
      setShowDialer(false);
      setDialDigits("");
      setNoteBody("");
      setNotes([]);
      setIsRecording(true);
      setSdkError(null);
      autoAcceptedRef.current = null;
    }
  }, [callState]);

  // fetch notes when connected
  useEffect(() => {
    if (callState !== "connected" || !incoming?.callId) return;
    fetch(`/api/v1/calls/${incoming.callId}/notes`).then(async (r) => {
      if (r.ok) {
        const b = await r.json();
        setNotes(b.data ?? []);
      }
    }).catch(() => {});
  }, [callState, incoming?.callId]);

  useSocketEvent<IncomingCall>(socket as Socket | null, "call:ringing", (data) => {
    setIncoming(data);
    setCallState("ringing");
    setActiveCallId(data.callId);
    setError(null);
    setSdkError(null);
  });

  useSocketEvent(socket as Socket | null, "call:connected", (data: any) => {
    setCallState("connected");
    setActiveCallId(data?.callId ?? activeCallId);
  });

  useSocketEvent(socket as Socket | null, "call:ended", () => {
    setCallState("ended");
    setTimeout(() => { setCallState("idle"); setIncoming(null); setActiveCallId(null); }, 3000);
  });

  useEffect(() => {
    if (!agentId || callState !== "idle") return;
    addDebug(`Polling started (agent=${agentId.slice(0,8)})`);
    let pollCount = 0;
    let pollDelay = 1500;
    // Cap at 5s (not 15s): this is the popup backstop when the socket event
    // is missed — an idle-open tab must never be more than ~5s behind reality.
    const MAX_POLL_DELAY = 5000;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;
    let isActive = true;

    const doPoll = async () => {
      if (!isActive) return;
      pollCount++;
      try {
        const res = await fetch(`/api/v1/calls?agent_id=${encodeURIComponent(agentId)}&state=ringing&limit=1`);
        if (!res.ok) { addDebug(`Poll #${pollCount}: HTTP ${res.status}`); pollDelay = Math.min(pollDelay * 2, MAX_POLL_DELAY); return; }
        const body = await res.json();
        const calls = body.data ?? [];
        if (calls.length > 0) {
          addDebug(`Poll #${pollCount}: found assigned call ${calls[0].id.slice(0,8)}`);
          pollDelay = 1500;
          setIncoming({ callId: calls[0].id, campaignId: calls[0].campaign_id, fromHash: calls[0].from_hash ?? "", callerState: calls[0].caller_state ?? null });
          setCallState("ringing");
          setActiveCallId(calls[0].id);
        } else {
          pollDelay = Math.min(pollDelay * 2, MAX_POLL_DELAY);
        }
      } catch (e: any) {
        addDebug(`Poll #${pollCount}: error ${e?.message}`);
        pollDelay = Math.min(pollDelay * 2, MAX_POLL_DELAY);
      }
      if (isActive) pollTimer = setTimeout(doPoll, pollDelay);
    };

    const handleVisibility = () => {
      if (document.hidden) {
        isActive = false;
        if (pollTimer) clearTimeout(pollTimer);
        addDebug("Polling paused (tab hidden)");
      } else if (callState === "idle") {
        isActive = true;
        pollDelay = 1500;
        addDebug("Polling resumed (tab visible)");
        pollTimer = setTimeout(doPoll, pollDelay);
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    pollTimer = setTimeout(doPoll, pollDelay);

    return () => {
      isActive = false;
      if (pollTimer) clearTimeout(pollTimer);
      document.removeEventListener("visibilitychange", handleVisibility);
      addDebug("Polling stopped");
    };
  }, [agentId, callState, addDebug]);

  // Fallback: poll for connected calls so UI recovers when state transitions without socket event
  useEffect(() => {
    if (!agentId || callState !== "connecting") return;
    addDebug(`Connect-poll started (agent=${agentId.slice(0,8)})`);
    let pollCount = 0;
    const interval = setInterval(async () => {
      pollCount++;
      try {
        const res = await fetch(`/api/v1/calls?agent_id=${encodeURIComponent(agentId)}&state=connected&limit=5`);
        if (!res.ok) return;
        const body = await res.json();
        const connected = body.data ?? [];
        if (connected.length > 0) {
          addDebug(`Connect-poll #${pollCount}: found connected`);
          setCallState("connected");
          setActiveCallId(connected[0].id);
          clearInterval(interval);
        }
      } catch { /* ignore */ }
    }, 1000);
    return () => { clearInterval(interval); };
  }, [agentId, callState, addDebug]);

  const accept = useCallback(async () => {
    if (!incoming) return;
    setError(null);
    setSdkError(null);
    setCallState("connecting");
    setShowScriptModal(false);
    const t0 = performance.now();
    // ZERO-DELAY connect: fire browser pickup AND server bridge concurrently.
    // Previously answer() was awaited before the POST, serializing media
    // negotiation (~seconds) in front of the bridge. Both race now; the
    // server retry loop bridges the moment the leg answers.
    const ans = webrtc.answer("remoteMedia");
    const acceptReq = fetch(`/api/v1/calls/${incoming.callId}/accept`, { method: "POST" });
    if (ans.ok) {
      addDebug(`SDK answer → leg ${(ans.callId ?? "?").slice(0, 8)}… + bridge POST fired together`);
    } else {
      // No browser leg to answer (this tab never got the INVITE, or a stale
      // call object). The bridge still runs server-side and will take the
      // normal missed path — but say so loudly instead of spinning silently.
      addDebug(`SDK answer SKIPPED (${ans.reason}) — bridge running without browser pickup`);
      setSdkError(
        ans.reason === "no-sdk-call"
          ? "Browser didn't receive this call — audio may be on another tab. If it fails, ask the caller to redial."
          : "Browser call isn't answerable — bridge running without browser pickup.",
      );
    }
    if (ans.ok) {
      try {
        await ans.settled;
        addDebug(`SDK answer settled at +${Math.round(performance.now() - t0)}ms`);
      } catch (e: any) {
        addDebug(`SDK answer FAILED: ${e?.message ?? e} — bridge continues`);
        setSdkError("Browser pickup failed — bridge continuing without it.");
      }
    }
    let res: Response | null = null;
    try {
      res = await acceptReq;
    } catch {
      res = null;
    }
    const t2 = performance.now();
    if (!res || !res.ok) {
      // Bridge failed AFTER the browser answered: hang up the browser leg or
      // it stays live in the tracker and blocks the next answer. (When the
      // browser never answered there is nothing to hang up — hangup() is a
      // safe no-op then.)
      addDebug(`Accept: bridge POST ${res ? `HTTP ${res.status}` : "threw"} at +${Math.round(t2 - t0)}ms — releasing browser leg`);
      try {
        webrtc.hangup();
      } catch { /* best-effort */ }
      setError("Failed to accept call");
      setCallState("idle");
      return;
    }
    addDebug(`Accept: bridge POST → HTTP ${res.status} at +${Math.round(t2 - t0)}ms`);
  }, [incoming, webrtc, addDebug]);

  const reject = useCallback(async () => {
    if (!incoming) return;
    setError(null);
    autoAcceptedRef.current = incoming.callId;
    webrtc.hangup();
    await fetch(`/api/v1/calls/${incoming.callId}/reject`, { method: "POST" });
    setCallState("idle");
    setIncoming(null);
    setActiveCallId(null);
  }, [incoming, webrtc]);

  // Auto-pickup: fire accept() once per ringing call while enabled. The ref
  // guard makes it idempotent across re-renders and StrictMode double-effects.
  // Covers both socket ringing and the polling fallback (both set `incoming`).
  useEffect(() => {
    if (!autoAnswer || !incoming || callState !== "ringing") return;
    if (autoAcceptedRef.current === incoming.callId) return;
    autoAcceptedRef.current = incoming.callId;
    addDebug("Auto-pickup ON — answering immediately (publisher bills from answer)");
    try {
      const el = document.getElementById("remoteMedia") as HTMLAudioElement | null;
      const p = el?.play?.() as unknown as Promise<void> | undefined;
      p?.catch?.(() => { addDebug("Audio autoplay blocked — click anywhere to enable audio"); });
    } catch { /* audio unlock is best-effort */ }
    void accept();
  }, [autoAnswer, incoming, callState, accept, addDebug]);

  const hangup = useCallback(async () => {
    const id = activeCallId || incoming?.callId;
    if (!id) return;
    webrtc.hangup();
    await fetch(`/api/v1/calls/${id}/hangup`, { method: "POST" });
    setCallState("ended");
    setTimeout(() => { setCallState("idle"); setIncoming(null); setActiveCallId(null); }, 3000);
  }, [incoming, activeCallId, webrtc]);

  const toggleMute = useCallback(() => {
    const next = webrtc.toggleMute();
    addDebug(next ? "Muted" : "Unmuted");
  }, [webrtc, addDebug]);

  const toggleHold = useCallback(async () => {
    const id = activeCallId || incoming?.callId;
    if (!id) return;
    setHolding(true);
    const wantHold = !isHeld;
    try {
      const res = await fetch(`/api/v1/calls/${id}/hold`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: wantHold ? "hold" : "unhold" }) });
      if (res.ok) {
        setIsHeld(wantHold);
        addDebug(wantHold ? "Held" : "Resumed");
        showToast(wantHold ? "Call held" : "Call resumed", "success");
      } else {
        // still toggle UI for demo
        setIsHeld(wantHold);
        showToast(wantHold ? "Hold (simulated)" : "Resume (simulated)", "success");
      }
    } catch {
      setIsHeld(wantHold);
    }
    setHolding(false);
  }, [activeCallId, incoming, isHeld, addDebug]);

  const sendDTMF = useCallback(async (digit: string) => {
    const id = activeCallId || incoming?.callId;
    if (!id) return;
    setSavingDTMF(true);
    // optimistic local echo
    setDialDigits((d) => (d + digit).slice(0, 20));
    webrtc.sendDTMF(digit);
    try {
      await fetch(`/api/v1/calls/${id}/dtmf`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ digits: digit }) });
    } catch {}
    setSavingDTMF(false);
  }, [activeCallId, incoming, webrtc]);

  const saveNote = useCallback(async () => {
    const id = activeCallId || incoming?.callId;
    const txt = noteBody.trim();
    if (!id || !txt) return;
    setSavingNote(true);
    try {
      const res = await fetch(`/api/v1/calls/${id}/notes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body: txt }) });
      if (res.ok) {
        const b = await res.json();
        setNotes((n) => [...n, b.data]);
        setNoteBody("");
        showToast("Note saved", "success");
        addDebug(`Note saved ${b.data.id.slice(0,8)}`);
      } else {
        const b = await res.json().catch(() => ({}));
        showToast(b.message ?? "Failed to save note", "error");
      }
    } catch {
      showToast("Network error saving note", "error");
    }
    setSavingNote(false);
  }, [activeCallId, incoming, noteBody, addDebug]);

  const [showDebug, setShowDebug] = useState(false);

  const webrtcIndicator = membershipId ? (
    <div style={{ position: "fixed", bottom: 12, right: 12, zIndex: 99999, display: "flex", alignItems: "center", gap: 6, background: "var(--bg-card)", border: "1px solid var(--line)", borderRadius: 20, padding: "4px 12px", fontSize: 10, fontFamily: "var(--mono)", opacity: 0.8 }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: webrtc.isReady ? "var(--green)" : webrtc.error ? "var(--red)" : "#ff9800" }} />
      {webrtc.isReady ? "WebRTC Connected" : webrtc.error ? "Error: " + webrtc.error : "WebRTC Connecting..."}
    </div>
  ) : null;

  if (!membershipId || callState === "idle") {
    if (debug.length > 0 && showDebug) {
      return (
        <>
          {webrtcIndicator}
          <div style={{ position: "fixed", bottom: 80, right: 16, zIndex: 9999, maxWidth: 480 }}>
            <div className="card" style={{ padding: 12, fontSize: 10, fontFamily: "var(--mono)", maxHeight: 300, overflow: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <strong style={{ color: "var(--acid)" }}>Softphone Debug</strong>
                <button className="btn btn-sm" onClick={() => setShowDebug(false)} style={{ padding: "2px 8px", fontSize: 9 }}>Hide</button>
              </div>
              {debug.map((d, i) => <div key={i} style={{ color: "var(--muted)", borderTop: "1px solid var(--line)", padding: "2px 0" }}>{d}</div>)}
            </div>
          </div>
    </>
  );
}
    if (debug.length > 0 && !showDebug) {
      return (
        <>
          {webrtcIndicator}
          <button className="btn btn-sm" onClick={() => setShowDebug(true)}
            style={{ position: "fixed", bottom: 80, right: 16, zIndex: 9999, padding: "4px 10px", fontSize: 9, opacity: 0.6 }}>
            Debug ({debug.length})
          </button>
        </>
      );
    }
    return webrtcIndicator ? <>{webrtcIndicator}</> : null;
  }

  return (
    <>
      {webrtcIndicator}
      {/* 4.2.2 centered script modal on ringing */}
      {showScriptModal && renderedScript && (
        <div style={{ position: "fixed", inset: 0, zIndex: 10000, display: "grid", placeItems: "center", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }} onClick={() => setShowScriptModal(false)}>
          <div className="card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640, width: "90%", maxHeight: "80vh", overflow: "auto", padding: 24, border: "1px solid rgba(168,85,247,0.3)", boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <strong style={{ fontSize: 14, color: "var(--acid)" }}>{script?.title ?? "Call Script"}</strong>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span className="badge" style={{ fontSize: 9 }}>{script?.category}</span>
                <button className="btn btn-sm btn-ghost" onClick={() => setShowScriptModal(false)} style={{ padding: "2px 8px" }}>Close</button>
              </div>
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.7, whiteSpace: "pre-wrap", fontFamily: "var(--mono)", background: "rgba(168,85,247,0.06)", border: "1px solid var(--line)", borderRadius: 8, padding: 16 }}>{renderedScript}</div>
            <p style={{ fontSize: 10, color: "var(--muted)", marginTop: 10 }}>Call controls stay visible on the right while you read.</p>
          </div>
        </div>
      )}
      <div className="softphone-overlay">
      {(renderedScript || scriptError) && callState !== "ended" && !showScriptModal && !scriptMinimized && (
        <div className="softphone-script-dock">
          <div className="card" style={{ padding: "var(--space-4)" }}>
            {scriptError ? (
              <p className="text-muted" style={{ fontSize: 11 }}>Script unavailable — no script found for this campaign.</p>
            ) : script ? (
              <>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
                  <strong style={{ fontSize: 12, color: "var(--acid)" }}>{script.title}</strong>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <span className="badge" style={{ fontSize: 9 }}>{script.category}</span>
                    <button className="btn btn-sm btn-ghost" onClick={() => setShowScriptModal(true)} style={{ fontSize: 9, padding: "2px 6px" }}>Expand</button>
                    <button className="softphone-min-btn" onClick={() => setScriptMinimized(true)} aria-label="Minimize script panel" title="Minimize"><Minus size={14} /></button>
                  </div>
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap", fontFamily: "var(--mono)" }}>{renderedScript}</div>
              </>
            ) : null}
          </div>
        </div>
      )}
      {scriptMinimized && (renderedScript || scriptError) && callState !== "ended" && (
        <button className="softphone-script-chip" onClick={() => setScriptMinimized(false)} aria-label="Restore script panel">
          <span className="softphone-script-chip-dot" />
          <span className="softphone-pill-text">{script?.title ?? "Script"}</span>
          <span style={{ color: "var(--acid)", fontSize: 10 }}>Restore ↑</span>
        </button>
      )}
      <div className={`softphone-dialog ${callState}`} style={callMinimized ? { display: "none" } : undefined}>
        {callState !== "ended" && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", padding: "4px 0" }}>
            <span style={{ fontSize: 9, color: "var(--muted)", display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: webrtc.isReady ? "var(--green)" : "var(--red)" }} />
              {webrtc.isReady ? "WebRTC" : "Connecting..."}
            </span>
            <button
              onClick={() => setAutoAnswer((v) => !v)}
              title={autoAnswer ? "Auto-pickup is ON — calls answer immediately (click to turn off)" : "Auto-pickup is OFF — you must Accept each call manually (click to turn on)"}
              aria-pressed={autoAnswer}
              style={{ fontSize: 9, padding: "2px 8px", borderRadius: 999, border: `1px solid ${autoAnswer ? "var(--green)" : "var(--line)"}`, background: "transparent", color: autoAnswer ? "var(--green)" : "var(--muted)", cursor: "pointer" }}
            >
              Auto {autoAnswer ? "ON" : "OFF"}
            </button>
            <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
              {isHeld && <span className="badge badge-warning" style={{ fontSize: 9 }}>ON HOLD</span>}
              {webrtc.isMuted && <span className="badge badge-danger" style={{ fontSize: 9 }}>MUTED</span>}
              {isRecording && callState === "connected" && <span className="badge" style={{ fontSize: 9, background: "rgba(239,68,68,0.15)", borderColor: "rgba(239,68,68,0.4)", color: "#ef4444" }}>● REC</span>}
              <button className="softphone-min-btn" onClick={() => setCallMinimized(true)} aria-label="Minimize call panel" title="Minimize"><Minus size={14} /></button>
            </span>
          </div>
        )}
        {callState === "ringing" && (
          <>
            <div className="softphone-ring-container">
              <div className="softphone-ring-outer" />
              <div className="softphone-ring-inner" />
              <div className="softphone-ring-icon">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
              </div>
            </div>
            <div className="softphone-body">
              <p className="softphone-status">Incoming Call</p>
              <p className="softphone-caller">{formatPhone(incoming?.fromHash ?? "")}</p>
              <p className="softphone-campaign">
                Campaign: {incoming?.campaignId?.slice(0, 8) ?? "—"}
                {incoming?.callerState ? ` · Caller State: ${incoming.callerState}` : ""}
              </p>
            </div>
            <div className="softphone-actions">
              <button className="softphone-btn softphone-btn-accept" onClick={accept}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                Accept
              </button>
              <button className="softphone-btn softphone-btn-reject" onClick={reject}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
                Reject
              </button>
            </div>
            {renderedScript && <button className="btn btn-sm btn-ghost" onClick={() => setShowScriptModal(true)} style={{ marginTop: 8, fontSize: 11 }}>View script</button>}
            <p style={{ marginTop: 6, fontSize: 10, color: "var(--muted)" }}>Mute · Speaker · Dialer appear here after you accept.</p>
          </>
        )}

        {callState === "connecting" && (
          <>
            <div className="softphone-ring-container">
              <div className="softphone-spinner-ring" />
              <div className="softphone-ring-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
              </div>
            </div>
            <div className="softphone-body">
              {/* Real browser-leg phase, not a static spinner label: the agent
                  sees Answering… only while the SDK leg is actually ringing /
                  answering / early media, otherwise Bridging…. */}
              <p className="softphone-status">
                {webrtc.sdkPhase === "ringing" || webrtc.sdkPhase === "answering" || webrtc.sdkPhase === "early"
                  ? "Answering…"
                  : "Bridging…"}
              </p>
              <p className="softphone-caller">{formatPhone(incoming?.fromHash ?? "")}</p>
              {sdkError && (
                <p style={{ marginTop: 6, fontSize: 11, color: "#fbbf24", lineHeight: 1.5 }}>{sdkError}</p>
              )}
              <button className="softphone-btn softphone-btn-hangup" onClick={hangup} style={{ marginTop: 10 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
                Cancel
              </button>
            </div>
          </>
        )}

        {callState === "connected" && (
          <>
            <div className="softphone-waveform">
              <span /><span /><span /><span /><span />
              <span /><span /><span /><span /><span />
            </div>
            <div className="softphone-body">
              <p className="softphone-status">Call Active {isHeld ? "(Held)" : ""}</p>
              <p className="softphone-caller">{formatPhone(incoming?.fromHash ?? "")}</p>
              {incoming?.callerState && (
                <p className="softphone-campaign">Caller State: {incoming.callerState}</p>
              )}
              <p className="softphone-timer">{formatTimer(elapsed)}</p>
            </div>
            {/* Controls: mute / hold / dialer / recording */}
            <div style={{ display: "flex", gap: 8, width: "100%", flexWrap: "wrap" }}>
              <button className={`btn btn-sm ${webrtc.isMuted ? "btn-danger" : "btn-secondary"}`} onClick={toggleMute} style={{ flex: 1, fontSize: 11 }}>
                {webrtc.isMuted ? "Unmute" : "Mute"}
              </button>
              <button className={`btn btn-sm ${isHeld ? "btn-warning" : "btn-secondary"}`} onClick={toggleHold} disabled={holding} style={{ flex: 1, fontSize: 11 }}>
                {holding ? "..." : isHeld ? "Resume" : "Hold"}
              </button>
              <button className={`btn btn-sm ${showDialer ? "btn-primary" : "btn-secondary"}`} onClick={() => setShowDialer((v) => !v)} style={{ flex: 1, fontSize: 11 }}>
                Dialer
              </button>
              <button className={`btn btn-sm ${isRecording ? "btn-danger" : "btn-secondary"}`} onClick={() => setIsRecording((v) => !v)} style={{ flex: 1, fontSize: 10 }} title="Toggle recording indicator">
                {isRecording ? "● REC" : "○ REC"}
              </button>
            </div>
            {/* Speaker: remote-audio output volume */}
            <div style={{ width: "100%", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 10, color: "var(--muted)", whiteSpace: "nowrap" }}>Speaker</span>
              <input type="range" min={0} max={1} step={0.05} value={volume} onChange={(e) => setVolume(Number(e.target.value))} style={{ flex: 1, accentColor: "var(--acid)" }} aria-label="Speaker volume" />
              <span style={{ fontSize: 10, color: "var(--muted)", fontFamily: "var(--mono)", minWidth: 34, textAlign: "right" }}>{Math.round(volume * 100)}%</span>
            </div>
            {showDialer && (
              <div style={{ width: "100%", background: "rgba(0,0,0,0.25)", border: "1px solid var(--line)", borderRadius: 8, padding: 10 }}>
                <div style={{ fontFamily: "var(--mono)", fontSize: 16, textAlign: "center", minHeight: 22, letterSpacing: 2, color: "var(--acid)", borderBottom: "1px solid var(--line)", paddingBottom: 6, marginBottom: 8 }}>{dialDigits || "—"}</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 }}>
                  {["1","2","3","4","5","6","7","8","9","*","0","#"].map((d) => (
                    <button key={d} className="btn btn-secondary" onClick={() => sendDTMF(d)} disabled={savingDTMF} style={{ padding: "10px 0", fontSize: 16, fontWeight: 600 }}>{d}</button>
                  ))}
                </div>
              </div>
            )}
            <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
              <textarea className="input textarea" placeholder="Notes for this call (visible to admin)..." value={noteBody} onChange={(e) => setNoteBody(e.target.value)} rows={2} style={{ fontSize: 12 }} maxLength={2000} />
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button className="btn btn-sm btn-primary" onClick={saveNote} disabled={savingNote || !noteBody.trim()} style={{ fontSize: 11 }}>{savingNote ? "Saving..." : "Save note"}</button>
                {notes.length > 0 && <span style={{ fontSize: 10, color: "var(--muted)" }}>{notes.length} note(s) saved</span>}
                {renderedScript && <button className="btn btn-sm btn-ghost" onClick={() => setShowScriptModal(true)} style={{ marginLeft: "auto", fontSize: 10 }}>Script</button>}
              </div>
              {notes.length > 0 && (
                <div style={{ maxHeight: 80, overflow: "auto", display: "flex", flexDirection: "column", gap: 4, borderTop: "1px solid var(--line)", paddingTop: 6 }}>
                  {notes.map((n) => (
                    <div key={n.id} style={{ fontSize: 10, color: "var(--muted)", fontFamily: "var(--mono)", background: "rgba(168,85,247,0.06)", padding: "4px 6px", borderRadius: 4 }}>{new Date(n.created_at).toLocaleTimeString()} — {n.body}</div>
                  ))}
                </div>
              )}
            </div>
            <div className="softphone-actions" style={{ marginTop: 8 }}>
              <button className="softphone-btn softphone-btn-hangup" onClick={hangup}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                Hang Up
              </button>
            </div>
          </>
        )}

        {callState === "ended" && (
          <div className="softphone-body">
            <p className="softphone-status softphone-ended">Call Ended</p>
            {elapsed > 0 && <p className="softphone-timer">{formatTimer(elapsed)}</p>}
            {notes.length > 0 && <p style={{ fontSize: 11, color: "var(--muted)" }}>{notes.length} note(s) saved for this call.</p>}
          </div>
        )}

        {error && <p className="softphone-error">{error}</p>}
      </div>
      {/* Minimized call chip: live status + key actions, survives dashboard navigation */}
      {callMinimized && callState !== "ended" && (
        <div
          className="softphone-pill"
          role="status"
          aria-label={callState === "ringing" ? "Incoming call minimized" : "Active call minimized"}
          style={{
            background: "rgba(20,12,40,0.92)",
            border: `1px solid ${callState === "ringing" ? "var(--amber)" : callState === "connected" ? "var(--green)" : "var(--line)"}`,
            boxShadow: "0 8px 28px rgba(0,0,0,0.45)",
          }}
        >
          <span
            className="softphone-pill-dot"
            aria-hidden
            style={{
              background:
                callState === "connected" ? "var(--green)"
                : callState === "ringing" ? "var(--amber)"
                : "var(--cyan)",
              boxShadow:
                callState === "connected" ? "0 0 8px var(--green)"
                : callState === "ringing" ? "0 0 8px var(--amber)"
                : "0 0 8px var(--cyan)",
            }}
          />
          <span className="softphone-pill-text">
            {callState === "ringing"
              ? `Incoming · ${formatPhone(incoming?.fromHash ?? "")}`
              : callState === "connecting"
                ? "Connecting…"
                : `${formatTimer(elapsed)} · ${formatPhone(incoming?.fromHash ?? "")}`}
          </span>
          {callState === "ringing" ? (
            <>
              <button className="btn btn-sm btn-primary" onClick={accept} style={{ fontSize: 10, padding: "4px 10px" }}>Accept</button>
              <button className="btn btn-sm btn-secondary" onClick={reject} style={{ fontSize: 10, padding: "4px 10px" }}>Reject</button>
            </>
          ) : (
            <button className="btn btn-sm btn-secondary" onClick={hangup} style={{ fontSize: 10, padding: "4px 10px" }}>Hang Up</button>
          )}
          <button className="softphone-min-btn" onClick={() => setCallMinimized(false)} aria-label="Expand call panel" title="Expand"><Expand size={14} /></button>
        </div>
      )}
      <audio id="remoteMedia" autoPlay />
    </div>
    </>
  );
}
