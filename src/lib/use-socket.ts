"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

interface SocketState {
  connected: boolean;
  membershipId: string | null;
}

export function useSocket(membershipId: string | null): { socket: Socket | null; connected: boolean; url: string } {
  const [state, setState] = useState<SocketState>({ connected: false, membershipId: null });
  const [url, setUrl] = useState<string>("");
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!membershipId) return;
    let cancelled = false;
    let socket: Socket | null = null;
    // NEXT_PUBLIC_REALTIME_URL is baked at BUILD time and goes stale on any
    // port/env change (the :3001-vs-:3002 outage: gateway moved, browsers kept
    // dialing the old port, zero popups). The server tells us the live URL at
    // runtime via a relative fetch (always the right host); the baked value is
    // only a fallback, healed to this host when it points at localhost.
    const configured = process.env.NEXT_PUBLIC_REALTIME_URL ?? "http://localhost:3001";
    const heal = (raw: string): string => {
      try {
        const host = window.location.hostname;
        const u = new URL(raw);
        if ((host === "localhost" || host === "127.0.0.1") !== (u.hostname === "localhost" || u.hostname === "127.0.0.1")) {
          u.hostname = host;
          return u.toString().replace(/\/$/, "");
        }
        return raw;
      } catch { return raw; }
    };
    (async () => {
      let resolved = heal(configured);
      try {
        const res = await fetch("/api/v1/realtime/url");
        if (res.ok) {
          const body = await res.json();
          if (typeof body.data?.url === "string" && body.data.url) resolved = body.data.url;
        }
      } catch { /* keep fallback */ }
      if (cancelled) return;
      setUrl(resolved);
      socket = io(resolved, {
        query: { membershipId },
        withCredentials: true,
      });
      socketRef.current = socket;
      socket.on("connect", () => setState({ connected: true, membershipId }));
      socket.on("disconnect", () => setState({ connected: false, membershipId }));
    })();
    return () => { cancelled = true; socket?.close(); if (socketRef.current === socket) socketRef.current = null; };
  }, [membershipId]);

  return { socket: socketRef.current, connected: state.connected, url };
}

export function useSocketEvent<T = unknown>(
  socket: Socket | null,
  event: string,
  handler: (data: T) => void,
) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;
  useEffect(() => {
    if (!socket) return;
    const cb = (data: T) => handlerRef.current(data);
    socket.on(event, cb);
    return () => { socket.off(event, cb); };
  }, [socket, event]);
}
