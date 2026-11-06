"use client";

import { useEffect, useRef, useState } from "react";
import { ALMOST_THRESHOLD, FULL_THRESHOLD, Point, formatTime } from "@/lib/types";

const H = 240;
const PAD = { l: 36, r: 16, t: 14, b: 26 };
const Y_TICKS = [0, 25, 50, 75, 100];

export default function HistoryChart({ points }: { points: Point[] }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(640);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (points.length === 0) {
    return (
      <div ref={wrap} className="flex h-[240px] items-center justify-center rounded-lg border border-dashed border-line text-sm text-muted">
        No readings yet — waiting for the ESP32 to report
      </div>
    );
  }

  const t0 = points[0].ts;
  const t1 = points[points.length - 1].ts;
  const span = Math.max(t1 - t0, 1);
  const x = (t: number) => PAD.l + ((t - t0) / span) * (w - PAD.l - PAD.r);
  const y = (f: number) => PAD.t + (1 - f / 100) * (H - PAD.t - PAD.b);
  const path = points.map((p, i) => `${i ? "L" : "M"}${x(p.ts).toFixed(1)},${y(p.fill).toFixed(1)}`).join("");
  const area = `${path} L${x(t1).toFixed(1)},${(H - PAD.b).toFixed(1)} L${x(t0).toFixed(1)},${(H - PAD.b).toFixed(1)} Z`;
  const last = points[points.length - 1];
  const active = hover === null ? null : points[hover];

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    const mx = ((e.clientX - e.currentTarget.getBoundingClientRect().left) / e.currentTarget.clientWidth) * w;
    let best = 0;
    for (let i = 1; i < points.length; i++) {
      if (Math.abs(x(points[i].ts) - mx) < Math.abs(x(points[best].ts) - mx)) best = i;
    }
    setHover(best);
  }

  const xTicks = points.length > 1 ? [t0, t0 + span / 2, t1] : [t0];

  return (
    <div ref={wrap} className="relative">
      <svg
        viewBox={`0 0 ${w} ${H}`}
        width="100%"
        height={H}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
        className="touch-none select-none"
        role="img"
        aria-label="Fill percentage over time"
      >
        <defs>
          <linearGradient id="area-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--series)" stopOpacity="0.38" />
            <stop offset="100%" stopColor="var(--series)" stopOpacity="0" />
          </linearGradient>
          <filter id="line-glow" x="-10%" y="-20%" width="120%" height="160%">
            <feGaussianBlur stdDeviation="2.5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {Y_TICKS.map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={w - PAD.r} y1={y(t)} y2={y(t)} stroke={t === 0 ? "var(--axis)" : "var(--grid)"} strokeWidth="1" />
            <text x={PAD.l - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--muted)">
              {t}%
            </text>
          </g>
        ))}
        {[
          { v: FULL_THRESHOLD, label: "Full 80%", color: "var(--critical)" },
          { v: ALMOST_THRESHOLD, label: "Almost full 50%", color: "var(--warning)" },
        ].map((r) => (
          <g key={r.v}>
            <line x1={PAD.l} x2={w - PAD.r} y1={y(r.v)} y2={y(r.v)} stroke={r.color} strokeDasharray="5 4" strokeWidth="1.5" />
            <text x={w - PAD.r} y={y(r.v) - 5} textAnchor="end" fontSize="11" fill="var(--ink-2)">
              {r.label}
            </text>
          </g>
        ))}
        {xTicks.map((t, i) => (
          <text
            key={i}
            x={x(t)}
            y={H - 6}
            textAnchor={i === 0 ? "start" : i === xTicks.length - 1 ? "end" : "middle"}
            fontSize="11"
            fill="var(--muted)"
          >
            {formatTime(t)}
          </text>
        ))}
        <path className="chart-area" d={area} fill="url(#area-grad)" />
        <path className="chart-line" pathLength={1} d={path} fill="none" stroke="var(--series)" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" filter="url(#line-glow)" />
        {active && <line x1={x(active.ts)} x2={x(active.ts)} y1={PAD.t} y2={H - PAD.b} stroke="var(--muted)" strokeWidth="1" />}
        {(active ? [active] : [last]).map((p) => (
          <circle key={p.ts} cx={x(p.ts)} cy={y(p.fill)} r="5" fill="var(--series)" stroke="var(--surface)" strokeWidth="2" />
        ))}
        {!active && (
          <text x={x(last.ts) - 8} y={y(last.fill) - 10} textAnchor="end" fontSize="12" fontWeight="600" fill="var(--ink)">
            {last.fill}%
          </text>
        )}
      </svg>
      {active && (
        <div
          className="chart-tip pointer-events-none absolute top-2 rounded-md border border-line bg-surface px-3 py-2 text-xs shadow-lg"
          style={{ left: Math.min(Math.max(x(active.ts) / w, 0.12), 0.82) * 100 + "%", transform: "translateX(-50%)" }}
        >
          <div className="text-muted">{formatTime(active.ts)}</div>
          <div className="font-semibold text-ink">{active.fill}% full</div>
          <div className="text-ink-2">{active.distance} cm to waste</div>
        </div>
      )}
    </div>
  );
}
