"use client";

import { useMemo } from "react";

function seededHeights(bars: number): number[] {
  // Deterministic pseudo-random wave pattern (seeded) so SSR matches client.
  const out: number[] = [];
  let seed = 7;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let i = 0; i < bars; i++) {
    // A gentle envelope so the wave reads as a "call" not noise.
    const env = 0.35 + 0.65 * Math.sin((i / (bars - 1)) * Math.PI);
    out.push(Math.round((0.28 + 0.72 * rand()) * env * 100));
  }
  return out;
}

/**
 * Pre-rendered call waveform: mostly static bars with a soft luminous
 * sweep traveling across. No music-player animation.
 */
export function Waveform({ bars = 30, className = "" }: { bars?: number; className?: string }) {
  const heights = useMemo(() => seededHeights(bars), [bars]);

  return (
    <div className={`waveform ${className}`} aria-hidden="true">
      <div className="waveform-bars">
        {heights.map((h, i) => (
          <span key={i} style={{ height: `${h}%` }} />
        ))}
      </div>
      <div className="waveform-sweep" />
    </div>
  );
}
