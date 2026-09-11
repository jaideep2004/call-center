"use client";

import { useEffect, useState, useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  BarChart,
  Bar,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

// Respect prefers-reduced-motion: disables recharts animation
function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(m.matches);
    onChange();
    // Safari <14 fallback
    if (m.addEventListener) m.addEventListener("change", onChange);
    else m.addListener(onChange);
    return () => {
      if (m.removeEventListener) m.removeEventListener("change", onChange);
      else m.removeListener(onChange);
    };
  }, []);
  return reduced;
}

const TOOLTIP_STYLE: React.CSSProperties = {
  background: "#1F1037",
  border: "1px solid #3A225D",
  borderRadius: 8,
  fontSize: 12,
  color: "#FAFAFC",
} as unknown as React.CSSProperties;

const PIE_COLORS = [
  "var(--accent)",
  "#7C3AED",
  "#06B6D4",
  "#F59E0B",
  "#10B981",
  "#3B82F6",
  "#EF4444",
  "#8B5CF6",
];

type NameValue = { name: string; value: number };
type TrendPoint = { name: string; value: number };

function EmptyChart({ height, label }: { height: number; label: string }) {
  return (
    <div
      className="mini-chart-empty"
      style={{
        height,
        display: "grid",
        placeItems: "center",
        border: "1px dashed var(--line)",
        borderRadius: 12,
        background: "rgba(31,16,55,0.5)",
        color: "var(--muted)",
        font: "11px var(--mono)",
        letterSpacing: "0.4px",
        textAlign: "center",
        padding: "0 12px",
      }}
      role="img"
      aria-label={label}
    >
      {label}
    </div>
  );
}

// ── Mini Pie: disposition / state / campaign distribution ──
// 140-180px height, glass bento, accent via var(--accent)
export function MiniPie({
  data,
  height = 160,
  ariaLabel = "distribution pie chart",
  showLegend = true,
}: {
  data: NameValue[];
  height?: number;
  ariaLabel?: string;
  showLegend?: boolean;
}) {
  const reduced = useReducedMotion();
  const h = Math.max(140, Math.min(180, height));
  const filtered = useMemo(() => (data ?? []).filter((d) => d.value > 0), [data]);
  const total = useMemo(() => filtered.reduce((a, b) => a + b.value, 0), [filtered]);
  if (!filtered.length || total === 0) return <EmptyChart height={h} label="No data yet" />;

  return (
    <div className="mini-chart-wrap" style={{ height: h }} role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height={h}>
        <PieChart margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
          <Pie
            data={filtered}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={h < 160 ? 52 : 62}
            innerRadius={0}
            paddingAngle={1.5}
            isAnimationActive={!reduced}
            animationDuration={reduced ? 0 : 900}
            animationBegin={0}
            stroke="rgba(0,0,0,0.18)"
            strokeWidth={1}
          >
            {filtered.map((_, i) => (
              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={TOOLTIP_STYLE as never}
            labelStyle={{ color: "#9ab0a8" } as never}
            formatter={(v: unknown, name: unknown) => [String(v), String(name)] as [string, string]}
          />
        </PieChart>
      </ResponsiveContainer>
      {showLegend && (
        <div className="mini-chart-legend" aria-hidden>
          {filtered.slice(0, 6).map((d, i) => (
            <span key={d.name} className="mini-chart-legend-item">
              <i style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
              {d.name} · {d.value}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Mini Donut: agent availability / outcome share ──
export function MiniDonut({
  data,
  height = 160,
  ariaLabel = "availability donut chart",
  centerLabel,
}: {
  data: NameValue[];
  height?: number;
  ariaLabel?: string;
  centerLabel?: string;
}) {
  const reduced = useReducedMotion();
  const h = Math.max(140, Math.min(180, height));
  const filtered = useMemo(() => (data ?? []).filter((d) => d.value > 0), [data]);
  const total = useMemo(() => filtered.reduce((a, b) => a + b.value, 0), [filtered]);
  if (!filtered.length || total === 0) return <EmptyChart height={h} label="No data yet" />;

  return (
    <div className="mini-chart-wrap mini-chart-wrap--donut" style={{ height: h }} role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height={h}>
        <PieChart margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
          <Pie
            data={filtered}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={h < 160 ? 42 : 48}
            outerRadius={h < 160 ? 60 : 68}
            paddingAngle={2}
            isAnimationActive={!reduced}
            animationDuration={reduced ? 0 : 950}
            stroke="rgba(0,0,0,0.2)"
          >
            {filtered.map((_, i) => (
              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={TOOLTIP_STYLE as never}
            formatter={(v: unknown, n: unknown) => [String(v), String(n)] as [string, string]}
          />
        </PieChart>
      </ResponsiveContainer>
      {centerLabel && (
        <div className="mini-donut-center" aria-hidden>
          <strong>{centerLabel}</strong>
          <small>{total} total</small>
        </div>
      )}
      <div className="mini-chart-legend" aria-hidden>
        {filtered.map((d, i) => (
          <span key={d.name} className="mini-chart-legend-item">
            <i style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
            {d.name} · {d.value}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Mini Line: 7-day call volume / payout trend ──
export function MiniLine({
  data,
  height = 160,
  ariaLabel = "trend line chart",
  color = "var(--accent)",
  showGrid = false,
  showDots = false,
  compact = false,
}: {
  data: TrendPoint[];
  height?: number;
  ariaLabel?: string;
  color?: string;
  showGrid?: boolean;
  showDots?: boolean;
  compact?: boolean;
}) {
  const reduced = useReducedMotion();
  const h = compact ? height : Math.max(140, Math.min(180, height));
  const hasData = useMemo(() => data?.some((d) => d.value > 0) ?? false, [data]);
  if (!data || data.length < 2) return <EmptyChart height={h} label="Not enough data" />;
  if (!hasData) return <EmptyChart height={h} label="No activity yet" />;

  return (
    <div className="mini-chart-wrap" style={{ height: h }} role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height={h}>
        <LineChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
          {showGrid && <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />}
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#8a9791", fontFamily: "var(--mono)" }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={8} />
          <YAxis tick={{ fontSize: 10, fill: "#8a9791" }} tickLine={false} axisLine={false} width={30} allowDecimals={false} />
          <Tooltip contentStyle={TOOLTIP_STYLE as never} labelStyle={{ color: "#9ab0a8" } as never} />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={showDots ? { r: 2, strokeWidth: 0, fill: color } : false}
            activeDot={{ r: 4, strokeWidth: 0, fill: color }}
            isAnimationActive={!reduced}
            animationDuration={reduced ? 0 : 1100}
            animationEasing="ease-out"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Mini Bar: revenue / payout / qualified vs total ──
export function MiniBar({
  data,
  height = 160,
  ariaLabel = "bar chart",
  color = "var(--accent)",
  layout = "vertical",
}: {
  data: TrendPoint[];
  height?: number;
  ariaLabel?: string;
  color?: string;
  layout?: "vertical" | "horizontal";
}) {
  const reduced = useReducedMotion();
  const h = Math.max(140, Math.min(180, height));
  const hasData = useMemo(() => data?.some((d) => d.value > 0) ?? false, [data]);
  if (!data || data.length === 0) return <EmptyChart height={h} label="No data yet" />;
  if (!hasData) return <EmptyChart height={h} label="No activity yet" />;

  const isHorizontal = layout === "horizontal";

  return (
    <div className="mini-chart-wrap" style={{ height: h }} role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height={h}>
        {isHorizontal ? (
          <BarChart data={data} margin={{ left: 0, right: 8, top: 4, bottom: 0 }} barCategoryGap="28%">
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#8a9791", fontFamily: "var(--mono)" }} tickLine={false} axisLine={false} interval={0} />
            <YAxis tick={{ fontSize: 10, fill: "#8a9791" }} tickLine={false} axisLine={false} width={32} allowDecimals={false} />
            <Tooltip contentStyle={TOOLTIP_STYLE as never} cursor={{ fill: "rgba(255,255,255,0.04)" } as never} />
            <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} isAnimationActive={!reduced} animationDuration={reduced ? 0 : 900} />
          </BarChart>
        ) : (
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 12, top: 2, bottom: 2 }} barCategoryGap="24%">
            <XAxis type="number" tick={{ fontSize: 10, fill: "#8a9791" }} tickLine={false} axisLine={false} allowDecimals={false} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#c8c0de", fontFamily: "var(--sans)" }} tickLine={false} axisLine={false} width={86} />
            <Tooltip contentStyle={TOOLTIP_STYLE as never} cursor={{ fill: "rgba(255,255,255,0.04)" } as never} />
            <Bar dataKey="value" fill={color} radius={[0, 4, 4, 0]} isAnimationActive={!reduced} animationDuration={reduced ? 0 : 900} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

// Convenience: bento card wrapper (glass, 2026)
export function MiniChartCard({
  title,
  subtitle,
  children,
  action,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="mini-chart-card">
      <div className="mini-chart-card-head">
        <div>
          <span className="mini-chart-label">{title}</span>
          {subtitle && <span className="mini-chart-subtitle">{subtitle}</span>}
        </div>
        {action}
      </div>
      <div className="mini-chart-card-body">{children}</div>
    </div>
  );
}
