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
    // NEXT_PUBLIC_REALTIME_URL is baked at BUILD time — a bundle built for
    // localhost silently points production browsers at their own machine and
    // no popup ever arrives. Heal it at runtime: on a public host, a
    // localhost URL is rewritten to this host (same gateway port).
    const configured = process.env.NEXT_PUBLIC_REALTIME_URL ?? "http://localhost:3001";
    let resolved = configured;
    try {
      const host = window.location.hostname;
      const u = new URL(configured);
      if ((host === "localhost" || host === "127.0.0.1") !== (u.hostname === "localhost" || u.hostname === "127.0.0.1")) {
        u.hostname = host;
        resolved = u.toString().replace(/\/$/, "");
      }
    } catch { /* keep configured */ }
    setUrl(resolved);
    const socket = io(resolved, {
      query: { membershipId },
      withCredentials: true,
    });
    socketRef.current = socket;
    socket.on("connect", () => setState({ connected: true, membershipId }));
    socket.on("disconnect", () => setState({ connected: false, membershipId }));
    return () => { socket.close(); socketRef.current = null; };
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
