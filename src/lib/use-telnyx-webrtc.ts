"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export interface SipCredentials {
  sipUser: string;
  sipPassword: string;
  sipRealm: string;
}

export function useTelnyxWebRTC(agentId: string | null | undefined) {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sdkCallState, setSdkCallState] = useState<string>("idle");
  const [telnyxCallId, setTelnyxCallId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const clientRef = useRef<any>(null);
  const sdkCallRef = useRef<any>(null);
  const telnyxCallIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!agentId) return;

    let mounted = true;

    async function init() {
      try {
        const res = await fetch("/api/v1/me/sip-credentials");
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || "Failed to get SIP credentials");
        }
        const body = await res.json();
        const creds: SipCredentials | undefined = body.data;
        if (!creds) throw new Error("No SIP credentials returned");

        const { TelnyxRTC } = await import("@telnyx/webrtc");

        const client = new TelnyxRTC({
          login: creds.sipUser,
          password: creds.sipPassword,
        });

        client.on("telnyx.ready", () => {
          if (mounted) setIsReady(true);
        });

        client.on("telnyx.notification", (notification: any) => {
          if (!mounted) return;
          const call = notification.call;
          if (notification.type === "callUpdate" && call) {
            sdkCallRef.current = call;

            if (call.state === "ringing") {
              telnyxCallIdRef.current = call.id;
              setTelnyxCallId(call.id);
              setSdkCallState("ringing");
            } else if (call.state === "answered") {
              setSdkCallState("connected");
            } else if (call.state === "hangup") {
              setSdkCallState("ended");
              sdkCallRef.current = null;
              telnyxCallIdRef.current = null;
            }
          }
        });

        client.on("telnyx.error", (e: any) => {
          console.error("[WebRTC SDK error]", e);
          const msg = typeof e === "string" ? e : e?.message || JSON.stringify(e);
          if (mounted) setError(msg);
        });

        client.remoteElement = "remoteMedia";
        clientRef.current = client;
        client.connect();
      } catch (e: any) {
        if (mounted) setError(e?.message || "WebRTC init failed");
      }
    }

    init();

    return () => {
      mounted = false;
      const c = clientRef.current;
      if (c) {
        c.off("telnyx.ready");
        c.off("telnyx.notification");
        c.off("telnyx.error");
        c.disconnect();
        clientRef.current = null;
      }
    };
  }, [agentId]);

  const answer = useCallback((remoteElement?: HTMLElement | string): Promise<unknown> | undefined => {
    const call = sdkCallRef.current;
    if (!call) return undefined;
    if (remoteElement) {
      return call.answer({ remoteElement });
    }
    return call.answer();
  }, []);

  const hangupCall = useCallback(() => {
    sdkCallRef.current?.hangup();
    sdkCallRef.current = null;
    telnyxCallIdRef.current = null;
    setIsMuted(false);
  }, []);

  const toggleMute = useCallback(() => {
    const call: any = sdkCallRef.current;
    const next = !isMuted;
    try {
      if (call?.muteAudio && call?.unmuteAudio) {
        if (next) call.muteAudio(); else call.unmuteAudio();
      } else if (call?.localStream) {
        call.localStream.getAudioTracks().forEach((t: MediaStreamTrack) => { t.enabled = !next; });
      } else {
        // fallback: toggle tracks on remoteMedia element if it has srcObject
        const el = document.getElementById("remoteMedia") as HTMLAudioElement | null;
        const stream = el?.srcObject as MediaStream | null;
        if (stream) stream.getAudioTracks().forEach((t) => { t.enabled = !next; });
      }
    } catch {}
    setIsMuted(next);
    return next;
  }, [isMuted]);

  const sendDTMF = useCallback((digits: string) => {
    const call: any = sdkCallRef.current;
    try {
      if (call?.dtmf) call.dtmf(digits);
      else if (call?.sendDigits) call.sendDigits(digits);
      else if (call?.sendDTMF) call.sendDTMF(digits);
    } catch {}
  }, []);

  return { isReady, error, sdkCallState, telnyxCallId, isMuted, answer, hangup: hangupCall, toggleMute, sendDTMF };
}