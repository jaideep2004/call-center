"use client";

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  accent?: string;
  className?: string;
}

export default function Sparkline({ data, width = 200, height = 48, accent, className }: SparklineProps) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const pad = 2;

  const points = data
    .map((v, i) => {
      const x = pad + (i / (data.length - 1)) * (width - pad * 2);
      const y = height - pad - ((v - min) / range) * (height - pad * 2);
      return `${x},${y}`;
    })
    .join(" ");

  const areaPoints = `${pad},${height - pad} ${points} ${width - pad},${height - pad}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: "block" }}
    >
      <polygon points={areaPoints} fill={`var(${accent ?? "--accent"})`} fillOpacity={0.08} />
      <polyline
        points={points}
        stroke={`var(${accent ?? "--accent"})`}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={points.split(" ").at(-1)?.split(",")[0] ?? width - pad} cy={points.split(" ").at(-1)?.split(",")[1] ?? 0} r={2.5} fill={`var(${accent ?? "--accent"})`} />
    </svg>
  );
}
