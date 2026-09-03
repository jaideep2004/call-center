"use client";
interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  accent?: string;
  className?: string;
  /** When true, svg fills container width (responsive). Defaults to false for backwards compat. */
  responsive?: boolean;
}

export default function Sparkline({ data, width = 200, height = 48, accent, className, responsive }: SparklineProps) {
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

  const areaPoints = `${pad},${h - pad} ${points} ${w - pad},${h - pad}`;
  const last = points.split(" ").at(-1)?.split(",") ?? [String(w - pad), "0"];

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
      <polygon points={areaPoints} fill={`var(${accent ?? "--accent"})`} fillOpacity={0.08} />
      <polyline
        points={points}
        stroke={`var(${accent ?? "--accent"})`}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={last[0]} cy={last[1]} r={2.5} fill={`var(${accent ?? "--accent"})`} />
    </svg>
  );
}
