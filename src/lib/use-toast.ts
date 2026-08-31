"use client";

import { useState, useCallback } from "react";

export interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

let toastId = 0;
let globalSetToasts: ((fn: (prev: Toast[]) => Toast[]) => void) | null = null;

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  globalSetToasts = setToasts;

  const show = useCallback((message: string, type: Toast["type"] = "info") => {
    const id = String(++toastId);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, show, dismiss };
}

export function showToast(message: string, type: Toast["type"] = "info") {
  if (globalSetToasts) {
    const id = String(++toastId);
    globalSetToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      globalSetToasts?.((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }
}
