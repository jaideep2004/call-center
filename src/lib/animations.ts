"use client";

import { useLayoutEffect, useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Safe to register on both server (SSR) and client. gsap guards window access.
gsap.registerPlugin(ScrollTrigger);

export { gsap, ScrollTrigger };

export const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

/** True when the user prefers reduced motion (checked at call time). */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** True on tablet/mobile widths — used to reduce heavy effects. */
export function isSmallViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.innerWidth < 768;
}

/** Animate a numeric text node (counters). */
export function countTo(
  el: Element,
  to: number,
  opts: {
    duration?: number;
    format?: (v: number) => string;
    ease?: string;
  } = {}
) {
  const { duration = 1.5, ease = "power2.out", format = (v) => String(Math.round(v)) } = opts;
  const state = { v: 0 };
  return gsap.to(state, {
    v: to,
    duration,
    ease,
    onUpdate: () => {
      el.textContent = format(state.v);
    },
  });
}

/** Format a currency value like $14,250.00 */
export function formatMoney(v: number): string {
  return (
    "$" +
    v.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

/** Format seconds as m:ss like 11:42 */
export function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.round(totalSeconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
