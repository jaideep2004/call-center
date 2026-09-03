"use client";

import { useState, useCallback } from "react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

let toastId = 0;
let globalSetToasts: ((fn: (prev: Toast[]) => Toast[]) => void) | null = null;
const MAX_TOASTS = 3;
const DURATION_MS: Record<ToastType, number> = { success: 4000, error: 6000, warning: 5000, info: 4000 };

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  globalSetToasts = setToasts;

  const show = useCallback((message: string, type: ToastType = "info") => {
    const id = String(++toastId);
    setToasts((prev) => {
      const next = [...prev, { id, message, type }];
      return next.length > MAX_TOASTS ? next.slice(next.length - MAX_TOASTS) : next;
    });
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, DURATION_MS[type] ?? 4000);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, show, dismiss };
}

export function showToast(message: string, type: ToastType = "info") {
  if (!globalSetToasts) {
    // Fallback before provider mounted (e.g. early errors)
    if (typeof window !== "undefined") console.warn(`[toast:${type}] ${message}`);
    return;
  }
  const id = String(++toastId);
  globalSetToasts((prev) => {
    const next = [...prev, { id, message, type }];
    return next.length > MAX_TOASTS ? next.slice(next.length - MAX_TOASTS) : next;
  });
  setTimeout(() => {
    globalSetToasts?.((prev) => prev.filter((t) => t.id !== id));
  }, DURATION_MS[type] ?? 4000);
}
