"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface DeviceOption {
  deviceId: string;
  label: string;
}

interface DeviceTestProps {
  compact?: boolean;
  onReadyChange?: (ready: boolean) => void;
  agentId?: string | null;
}

export default function DeviceTest({ compact = false, onReadyChange, agentId }: DeviceTestProps) {
  const [mics, setMics] = useState<DeviceOption[]>([]);
  const [speakers, setSpeakers] = useState<DeviceOption[]>([]);
  const [micId, setMicId] = useState("");
  const [speakerId, setSpeakerId] = useState("");
  const [micLevel, setMicLevel] = useState(0);
  const [micActive, setMicActive] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasTestedMic, setHasTestedMic] = useState(false);
  const [hasTestedSpeaker, setHasTestedSpeaker] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const meterBufRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef(0);
  const oscRef = useRef<OscillatorNode | null>(null);

  // hydrate hasTested from localStorage per agent
  useEffect(() => {
    if (!agentId) return;
    try {
      const key = `cc-device-ready:${agentId}`;
      const raw = localStorage.getItem(key);
      if (raw === "1" || raw === "true") {
        // we optimistically mark both as tested; actual ready still requires devices enumerated
        setHasTestedMic(true);
        setHasTestedSpeaker(true);
      } else if (raw === "0" || raw === "false") {
        // explicit not-ready; keep false (default)
      }
    } catch {}
  }, [agentId]);

  const enumerate = async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    const devices = await navigator.mediaDevices.enumerateDevices();
    const micList = devices
      .filter((d) => d.kind === "audioinput")
      .map((d) => ({ deviceId: d.deviceId, label: d.label || "Default microphone" }));
    const speakerList = devices
      .filter((d) => d.kind === "audiooutput")
      .map((d) => ({ deviceId: d.deviceId, label: d.label || "Default speaker" }));
    setMics(micList);
    setSpeakers(speakerList);
    setMicId((cur) => (cur && micList.some((m) => m.deviceId === cur) ? cur : micList[0]?.deviceId ?? ""));
    setSpeakerId((cur) => (cur && speakerList.some((s) => s.deviceId === cur) ? cur : speakerList[0]?.deviceId ?? ""));
  };

  const meterLoop = () => {
    const analyser = analyserRef.current;
    if (!analyser) return;
    if (!meterBufRef.current || meterBufRef.current.length !== analyser.fftSize) {
      meterBufRef.current = new Uint8Array(analyser.fftSize);
    }
    analyser.getByteTimeDomainData(meterBufRef.current);
    let sum = 0;
    for (let i = 0; i < meterBufRef.current.length; i++) {
      const v = (meterBufRef.current[i] - 128) / 128;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / meterBufRef.current.length);
    setMicLevel(Math.min(100, Math.round(rms * 4 * 100)));
    rafRef.current = requestAnimationFrame(meterLoop);
  };

  const stopMic = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    analyserRef.current = null;
    if (ctxRef.current && ctxRef.current.state !== "closed") {
      void ctxRef.current.close();
    }
    ctxRef.current = null;
    setMicActive(false);
    setMicLevel(0);
  }, []);

  const startMic = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Mic access is not available in this browser. Use HTTPS (or localhost) in Chrome, Edge or Firefox.");
      return;
    }
    setError(null);
    setChecking(true);
    try {
      stopMic();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: micId ? { deviceId: micId } : true,
      });
      streamRef.current = stream;
      const ctx = new AudioContext();
      ctxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      analyserRef.current = analyser;
      setMicActive(true);
      setHasTestedMic(true);
      await enumerate();
      rafRef.current = requestAnimationFrame(meterLoop);
    } catch (e) {
      setError(
        e instanceof DOMException && e.name === "NotAllowedError"
          ? "Microphone permission was blocked. Allow mic access for this site in your browser settings and try again."
          : `Microphone failed to start: ${String(e).slice(0, 120)}`,
      );
    } finally {
      setChecking(false);
    }
  };

  const playTone = async () => {
    setError(null);
    try {
      const ctx = ctxRef.current ?? new AudioContext();
      ctxRef.current = ctx;
      await ctx.resume();
      const sinkable = ctx as AudioContext & { setSinkId?: (id: string) => Promise<void> };
      if (speakerId && typeof sinkable.setSinkId === "function") {
        try {
          await sinkable.setSinkId(speakerId);
        } catch {
          // keep default output
        }
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      const now = ctx.currentTime;
      const beeps: [number, number][] = [
        [0, 0.25],
        [0.45, 0.25],
        [0.9, 0.3],
      ];
      for (const [start, dur] of beeps) {
        gain.gain.setValueAtTime(0.0001, now + start);
        gain.gain.exponentialRampToValueAtTime(0.5, now + start + 0.03);
        gain.gain.setValueAtTime(0.5, now + start + dur - 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
      }
      osc.start(now);
      osc.stop(now + 1.4);
      osc.onended = () => {
        oscRef.current = null;
        setPlaying(false);
      };
      oscRef.current = osc;
      setPlaying(true);
      setHasTestedSpeaker(true);
    } catch {
      setError("Could not play the test sound. Check your speaker settings and try again.");
    }
  };

  const stopTone = () => {
    oscRef.current?.stop();
    oscRef.current?.disconnect();
    oscRef.current = null;
    setPlaying(false);
  };

  useEffect(() => {
    void enumerate();
    const onChange = () => {
      void enumerate();
    };
    navigator.mediaDevices?.addEventListener("devicechange", onChange);
    return () => {
      navigator.mediaDevices?.removeEventListener("devicechange", onChange);
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (ctxRef.current && ctxRef.current.state !== "closed") {
        void ctxRef.current.close();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const micLabel = mics.find((m) => m.deviceId === micId)?.label ?? "No microphone found";
  const speakerLabel = speakers.find((s) => s.deviceId === speakerId)?.label ?? "No speaker found";
  const sinkSupported = typeof window !== "undefined" && typeof AudioContext !== "undefined" &&
    "setSinkId" in (AudioContext.prototype as unknown as Record<string, unknown>);

  const micOk = mics.length > 0;
  const speakerOk = speakers.length > 0;
  const deviceReady = micOk && speakerOk && hasTestedMic && hasTestedSpeaker;
  const devicesDetected = micOk && speakerOk;

  // emit readiness + persist
  useEffect(() => {
    onReadyChange?.(deviceReady);
    if (agentId) {
      try {
        const key = `cc-device-ready:${agentId}`;
        localStorage.setItem(key, deviceReady ? "1" : "0");
      } catch {}
    }
  }, [deviceReady, onReadyChange, agentId]);

  let statusLabel: string;
  if (deviceReady) statusLabel = "Mic & speaker verified";
  else if (!micOk && !speakerOk) statusLabel = "No audio devices found";
  else if (!micOk) statusLabel = "No microphone detected";
  else if (!speakerOk) statusLabel = "No speaker detected";
  else if (!hasTestedMic && !hasTestedSpeaker) statusLabel = "Devices found — test mic & speaker";
  else if (!hasTestedMic) statusLabel = "Speaker tested — now test mic";
  else if (!hasTestedSpeaker) statusLabel = "Mic tested — now test speaker";
  else statusLabel = "Devices found";

  const badgeTone = deviceReady ? "rgba(70,95,87,0.16)" : !devicesDetected ? "rgba(239,68,68,0.08)" : "rgba(245,158,11,0.10)";
  const badgeBorder = deviceReady ? "rgba(34,197,94,0.28)" : !devicesDetected ? "rgba(239,68,68,0.22)" : "rgba(245,158,11,0.22)";
  const dotColor = deviceReady ? "var(--success, #22c55e)" : !devicesDetected ? "var(--error, #ef4444)" : "var(--warning, #f59e0b)";

  return (
    <div className="stack" style={{ gap: "var(--space-4)" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 12px",
          borderRadius: 8,
          border: `1px solid ${badgeBorder}`,
          background: badgeTone,
        }}>
        <span
          className="pulse-dot"
          style={{ width: 8, height: 8, borderRadius: 999, background: dotColor, boxShadow: deviceReady ? "0 0 10px rgba(34,197,94,0.45)" : "none", display: "inline-block" }}
        />
        <span className="text-mono-sm" style={{ fontSize: 11, letterSpacing: 0.4, fontWeight: deviceReady ? 600 : 400 }}>{statusLabel}</span>
        {deviceReady && <span className="badge badge-success" style={{ marginLeft: "auto", fontSize: 9, padding: "2px 6px" }}>READY</span>}
        {!deviceReady && devicesDetected && <span className="text-mono-sm" style={{ marginLeft: "auto", fontSize: 10, color: "var(--muted)" }}>{hasTestedMic ? "✓ mic" : "○ mic"} · {hasTestedSpeaker ? "✓ speaker" : "○ speaker"}</span>}
      </div>
      <div className="stack" style={{ gap: "var(--space-3)" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <select
            className="input"
            value={micId}
            onChange={(e) => setMicId(e.target.value)}
            disabled={mics.length === 0}
            aria-label="Microphone"
            style={{ maxWidth: 240, flex: "1 1 160px" }}>
            {mics.length === 0 && <option value="">No microphones detected</option>}
            {mics.map((m) => (
              <option key={m.deviceId} value={m.deviceId}>
                {m.label}
              </option>
            ))}
          </select>
          <button className="btn btn-sm" onClick={startMic} disabled={checking} aria-label={micActive ? "Restart mic check" : "Start mic check"}>
            {checking ? "Starting..." : micActive ? "Restart mic" : hasTestedMic ? "Retest mic" : "Start mic check"}
          </button>
          {micActive && (
            <button className="quiet-button" onClick={stopMic} style={{ fontSize: 12 }}>
              Stop
            </button>
          )}
          {hasTestedMic && <span className="badge badge-success" style={{ fontSize: 9 }}>✓ TESTED</span>}
        </div>

        {micActive && (
          <div className="stack" style={{ gap: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span className="text-mono-sm" style={{ fontSize: 11 }}>
                <span className="pulse-dot" style={{ marginRight: 6, width: 6, height: 6, borderRadius: 999, background: "var(--acid)", display: "inline-block" }} />
                Listening: {micLabel}
              </span>
              <span className="text-mono-sm" style={{ fontSize: 11 }}>{micLevel}%</span>
            </div>
            <div
              style={{
                height: 8,
                borderRadius: 999,
                background: "rgba(10,16,15,0.6)",
                border: "1px solid var(--line)",
                overflow: "hidden",
              }}>
              <div
                style={{
                  height: "100%",
                  width: `${micLevel}%`,
                  background: micLevel > 8 ? "var(--acid)" : "var(--warning, #f59e0b)",
                  transition: "width 80ms linear",
                }}
              />
            </div>
            <p className="text-muted" style={{ fontSize: 11, margin: 0 }}>
              Speak now — the bar should move. Say something for 3–5 seconds.
            </p>
          </div>
        )}

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <select
            className="input"
            value={speakerId}
            onChange={(e) => setSpeakerId(e.target.value)}
            disabled={speakers.length === 0}
            aria-label="Speaker"
            style={{ maxWidth: 240, flex: "1 1 160px" }}>
            {speakers.length === 0 && <option value="">No speakers detected</option>}
            {speakers.map((s) => (
              <option key={s.deviceId} value={s.deviceId}>
                {s.label}
              </option>
            ))}
          </select>
          {!playing ? (
            <button className="btn btn-sm" onClick={playTone} aria-label="Play test sound">
              {hasTestedSpeaker ? "Replay sound" : "Play test sound"}
            </button>
          ) : (
            <button className="btn btn-sm" onClick={stopTone} aria-label="Stop sound">
              Stop sound
            </button>
          )}
          {hasTestedSpeaker && <span className="badge badge-success" style={{ fontSize: 9 }}>✓ TESTED</span>}
        </div>

        {playing && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="pulse-dot" style={{ width: 6, height: 6, borderRadius: 999, background: "var(--acid)", display: "inline-block" }} />
            <span className="text-mono-sm" style={{ fontSize: 11 }}>
              Playing on: {speakerLabel}
            </span>
            {!sinkSupported && (
              <span className="text-muted text-mono-sm" style={{ fontSize: 10 }}>
                (browser does not support choosing a speaker — sound goes to system default)
              </span>
            )}
          </div>
        )}

        {!compact && !micActive && mics.length > 0 && !playing && (
          <p className="text-muted text-mono-sm" style={{ fontSize: 10, margin: 0 }}>
            Devices: {mics.map((m) => m.label).join(" · ") || "—"} (mic) ·{" "}
            {speakers.map((s) => s.label).join(" · ") || "—"} (speaker)
          </p>
        )}

        {error && (
          <p className="text-mono-sm" style={{ fontSize: 11, color: "var(--error, #ef4444)", margin: 0, padding: "8px 10px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.22)", borderRadius: 8 }}>
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
