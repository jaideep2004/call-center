"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

interface ModalProps {
  label: string;
  onClose: () => void;
  children: React.ReactNode;
  zIndex?: number;
}

/**
 * Shared modal overlay (portal).
 *
 * WHY portal: `.dashboard-page` keeps `animation: dashIn … both` whose final
 * keyframe `transform: translateY(0)` is non-`none`, plus `.card:hover`
 * translate transforms and several `backdrop-filter` layers — every one of
 * these makes an in-flow `position:fixed` overlay size/clip relative to the
 * page container instead of the viewport (the cut-off modal bug).
 * Portaling to `document.body` escapes every such containing block.
 * Handles: backdrop click to close, Escape to close, body scroll lock,
 * and focusing the first text field on open.
 */
export default function Modal({ label, onClose, children, zIndex = 1000 }: ModalProps) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeRef.current();
    }
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = window.setTimeout(() => {
      wrapRef.current?.querySelector<HTMLElement>("input, select, textarea")?.focus();
    }, 0);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      window.clearTimeout(t);
    };
  }, []);

  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label}
      onClick={(e) => {
        if (e.target === e.currentTarget) closeRef.current();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "grid",
        placeItems: "center",
        zIndex,
        padding: 16,
        overflowY: "auto",
      }}
    >
      <div ref={wrapRef} style={{ width: "100%", display: "grid", placeItems: "center", margin: "auto" }}>
        {children}
      </div>
    </div>,
    document.body,
  );
}
