"use client";
import { useEffect, useRef, useState } from "react";

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  accent?: string;
  className?: string;
  /** When true, svg fills container width (responsive). Defaults to false for backwards compat. */
  responsive?: boolean;
  /** Animate draw left-to-right on mount (900ms). Respects prefers-reduced-motion. */
  animate?: boolean;
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(m.matches);
    onChange();
    if (m.addEventListener) m.addEventListener("change", onChange);
    else m.addListener(onChange);
    return () => {
      if (m.removeEventListener) m.removeEventListener("change", onChange);
      else m.removeListener(onChange);
    };
  }, []);
  return reduced;
}

export default function Sparkline({ data, width = 200, height = 48, accent, className, responsive, animate = true }: SparklineProps) {
  const reduced = useReducedMotion();
  const pathRef = useRef<SVGPathElement | null>(null);
  const [len, setLen] = useState<number>(0);

  if (!data || data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const pad = 2;
  const w = width;
  const h = height;

  const points = data
    .map((v, i) => {
      const x = pad + (i / (data.length - 1)) * (w - pad * 2);
      const y = h - pad - ((v - min) / range) * (h - pad * 2);
      return `${x},${y}`;
    })
    .join(" ");

  // Build smooth polyline -> path for dash animation (use straight segments for tiny spark)
  const coords = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return [x, y] as const;
  });
  const d = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x} ${y}`).join(" ");
  const areaD = `M${pad},${h - pad} L${coords.map(([x, y]) => `${x} ${y}`).join(" L")} L${w - pad},${h - pad} Z`;
  const last = coords[coords.length - 1] ?? [w - pad, h / 2];

  // Approx length for dash if getTotalLength not yet available (fallback sum of segments)
  const approxLen = coords.slice(1).reduce((acc, [x, y], i) => {
    const [px, py] = coords[i];
    return acc + Math.hypot(x - px, y - py);
  }, 0) || w;

  useEffect(() => {
    if (reduced || !animate) return;
    const el = pathRef.current;
    if (el && typeof el.getTotalLength === "function") {
      try {
        const l = el.getTotalLength();
        if (l > 0) setLen(l);
        else setLen(approxLen);
      } catch {
        setLen(approxLen);
      }
    } else {
      setLen(approxLen);
    }
  }, [reduced, animate, approxLen, d]);

  const shouldAnimate = animate && !reduced && len > 0;
  const dashStyle: React.CSSProperties = shouldAnimate
    ? ({
        ["--spark-len" as string]: `${len}`,
        strokeDasharray: `${len}`,
        strokeDashoffset: `${len}`,
        animation: "cc-spark-draw 900ms ease-out forwards",
      } as React.CSSProperties)
    : {};

  return (
    <svg
      width={responsive ? "100%" : w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: "block", width: responsive ? "100%" : undefined, height: responsive ? h : undefined }}
      role="img"
      aria-label="Revenue trend sparkline"
    >
      <path d={areaD} fill={`var(${accent ?? "--accent"})`} fillOpacity={0.08} />
      <path
        ref={pathRef}
        d={d}
        stroke={`var(${accent ?? "--accent"})`}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        className={shouldAnimate ? "cc-spark-path" : undefined}
        style={shouldAnimate ? dashStyle : undefined}
      />
      <circle cx={last[0]} cy={last[1]} r={2.5} fill={`var(${accent ?? "--accent"})`} />
    </svg>
  );
}
