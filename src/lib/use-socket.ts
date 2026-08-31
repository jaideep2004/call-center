"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

interface SocketState {
  connected: boolean;
  membershipId: string | null;
}

export function useSocket(membershipId: string | null): { socket: Socket | null; connected: boolean } {
  const [state, setState] = useState<SocketState>({ connected: false, membershipId: null });
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!membershipId) return;
    const socket = io(process.env.NEXT_PUBLIC_REALTIME_URL ?? "http://localhost:3001", {
      query: { membershipId },
      withCredentials: true,
    });
    socketRef.current = socket;
    socket.on("connect", () => setState({ connected: true, membershipId }));
    socket.on("disconnect", () => setState({ connected: false, membershipId }));
    return () => { socket.close(); socketRef.current = null; };
  }, [membershipId]);

  return { socket: socketRef.current, connected: state.connected };
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
