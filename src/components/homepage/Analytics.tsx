"use client";

import Link from "next/link";
import { useRef } from "react";
import {
  gsap,
  ScrollTrigger,
  useIsomorphicLayoutEffect,
  prefersReducedMotion,
  countTo,
  formatMoney,
  formatTime,
} from "@/lib/animations";

const checklist = [
  "Live call & agent activity",
  "Earnings, billable calls & commissions",
  "Call outcomes & quality scores",
  "Drill-down by campaign, agent, or date",
];

const metrics = [
  { label: "Total Earnings", value: 14250, format: (v: number) => formatMoney(v), delta: "16.8% vs yesterday" },
  { label: "Billable Calls", value: 186, format: (v: number) => String(Math.round(v)), delta: "12.4% vs yesterday" },
  { label: "Answered Calls", value: 212, format: (v: number) => String(Math.round(v)), delta: "9.7% vs yesterday" },
  { label: "Avg. Talk Time", value: 702, format: (v: number) => formatTime(v), delta: "6.1% vs yesterday" },
];

const campaigns = [
  { name: "Medicare Advantage", amount: "$4,250" },
  { name: "ACA Health", amount: "$4,150" },
  { name: "Final Expense", amount: "$2,840" },
  { name: "Life Insurance", amount: "$1,010" },
];

// Chart geometry
const CW = 620;
const CH = 200;
const PAD_L = 34;
const PAD_R = 14;
const PAD_T = 16;
const PAD_B = 26;
const Y_MAX = 80;

function xAt(i: number, n: number) {
  return PAD_L + (i * (CW - PAD_L - PAD_R)) / (n - 1);
}
function yAt(v: number) {
  return CH - PAD_B - (v / Y_MAX) * (CH - PAD_T - PAD_B);
}

const series = [
  { name: "Answered", color: "#A855F7", data: [18, 26, 20, 24, 30, 42, 58, 64, 55, 47, 38, 30] },
  { name: "Billable", color: "#60A5FA", data: [10, 14, 12, 16, 20, 30, 42, 48, 40, 33, 26, 18] },
  { name: "Revenue", color: "#FB7185", data: [12, 18, 22, 28, 34, 46, 56, 60, 52, 44, 34, 26] },
];

const xLabels = ["12 AM", "4 AM", "8 AM", "12 PM", "4 PM", "8 PM", "12 AM"];

export function Analytics() {
  const root = useRef<HTMLElement>(null);

  useIsomorphicLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const reduced = prefersReducedMotion();
      if (reduced) return;

      const tl = gsap.timeline({
        scrollTrigger: { trigger: root.current, start: "top 70%", once: true },
        defaults: { ease: "power3.out" },
      });

      // Text reveal
      tl.from(".an-eyebrow", { y: 12, opacity: 0, duration: 0.5 })
        .from(".an-heading", { y: 32, opacity: 0, duration: 0.8 }, "-=0.2")
        .from(".an-body", { y: 18, opacity: 0, duration: 0.7 }, "-=0.4")
        .from(".an-list li", { y: 10, opacity: 0, stagger: 0.08, duration: 0.5 }, "-=0.3")
        .from(".an-link", { y: 10, opacity: 0, duration: 0.5 }, "-=0.2");

      // 13.3 metric counters (play once)
      const tween = tl.from(
        ".an-panel",
        { y: 24, opacity: 0, stagger: 0.08, duration: 0.7 },
        "-=0.5"
      );
      metrics.forEach((m, i) => {
        const el = root.current?.querySelector(`.metric-value[data-metric="${i}"]`);
        if (!el) return;
        tween.call(() => {
          countTo(el, m.value, { duration: 1.6, format: m.format });
        }, undefined, "<+0.35");
      });

      // 13.4 line chart draws left → right
      tl.from(".chart-grid-lines", { opacity: 0, duration: 0.4 }, "<+0.4")
        .to(".chart-series", {
          strokeDashoffset: 0,
          stagger: 0.45,
          duration: 0.9,
          ease: "power1.inOut",
        }, "<+0.15");

      // bright point at the latest value of the answered line
      tl.fromTo(
        ".chart-end-dot",
        { scale: 0, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.5, ease: "back.out(2)" },
        "<+0.5"
      );

      // 13.5 top campaigns rows
      tl.from(".campaign-row", { x: 10, opacity: 0, stagger: 0.1, duration: 0.55 }, "-=0.3");
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section className="analytics" ref={root}>
      <div className="an-bg" aria-hidden="true" />

      <div className="an-inner">
        <div className="an-copy">
          <p className="section-eyebrow an-eyebrow">BUILT FOR VISIBILITY</p>
          <h2 className="section-heading an-heading">
            Track every call. <em>Every dollar.</em>
          </h2>
          <p className="an-body">
            Know what&rsquo;s happening across your team and campaigns in real time.
          </p>
          <ul className="check-list an-list">
            {checklist.map((item) => (
              <li key={item}>
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M3 8.5 6.2 11.7 13 4.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {item}
              </li>
            ))}
          </ul>
          <Link className="text-link-arrow an-link" href="/dashboard">
            Start full dashboard <span aria-hidden="true">→</span>
          </Link>
        </div>

        <div className="an-dash">
          <div className="metric-grid">
            {metrics.map((m, i) => (
              <div key={m.label} className="an-panel metric-card">
                <span className="metric-label">{m.label}</span>
                <strong className="metric-value" data-metric={i}>
                  {m.format(m.value)}
                </strong>
                <small className="metric-delta">
                  <svg width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M8 12V4M8 4 4.5 7.5M8 4l3.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {m.delta}
                </small>
              </div>
            ))}
          </div>

          <div className="an-bottom">
            <div className="an-panel chart-panel">
              <div className="panel-head-row">
                <h3>Call Activity</h3>
                <div className="chart-legend">
                  {series.map((s) => (
                    <span key={s.name}>
                      <i style={{ background: s.color }} />
                      {s.name}
                    </span>
                  ))}
                </div>
              </div>
              <svg className="an-chart" viewBox={`0 0 ${CW} ${CH}`} role="img" aria-label="Call activity line chart">
                {[0, 20, 40, 60, 80].map((v) => (
                  <g key={v}>
                    <line
                      className="chart-grid-lines"
                      x1={PAD_L}
                      x2={CW - PAD_R}
                      y1={yAt(v)}
                      y2={yAt(v)}
                      stroke="rgba(168,85,247,0.12)"
                      strokeWidth="1"
                    />
                    <text x={PAD_L - 8} y={yAt(v) + 3.5} textAnchor="end" fontSize="9" fill="#9A90B5">
                      {v}
                    </text>
                  </g>
                ))}
                {xLabels.map((label, i) => (
                  <text
                    key={`${label}-${i}`}
                    x={xAt(i * 2, 12)}
                    y={CH - 8}
                    textAnchor="middle"
                    fontSize="9"
                    fill="#9A90B5"
                  >
                    {label}
                  </text>
                ))}
                {series.map((s) => {
                  const pts = s.data.map((v, i) => `${xAt(i, s.data.length)},${yAt(v)}`).join(" ");
                  const area = `${PAD_L},${CH - PAD_B} ${pts} ${xAt(s.data.length - 1, s.data.length)},${CH - PAD_B}`;
                  return (
                    <g key={s.name}>
                      <polygon points={area} fill={s.color} opacity="0.07" />
                      <polyline
                        className="chart-series"
                        points={pts}
                        fill="none"
                        stroke={s.color}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        pathLength={1}
                        strokeDasharray={1}
                        strokeDashoffset={1}
                      />
                    </g>
                  );
                })}
                <circle
                  className="chart-end-dot"
                  cx={xAt(series[0].data.length - 1, series[0].data.length)}
                  cy={yAt(series[0].data[series[0].data.length - 1])}
                  r="3.5"
                  fill="#F6E7FF"
                  stroke="#A855F7"
                  strokeWidth="2"
                />
              </svg>
            </div>

            <div className="an-panel campaigns-panel">
              <h3>Top Campaigns</h3>
              <ul className="campaign-list">
                {campaigns.map((c) => (
                  <li key={c.name} className="campaign-row">
                    <span className="campaign-name">
                      <i className="campaign-dot" aria-hidden="true" />
                      {c.name}
                    </span>
                    <strong>{c.amount}</strong>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
