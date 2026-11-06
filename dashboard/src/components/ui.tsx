"use client";

import React from "react";
import Icon from "@/components/Icon";
import { levelColor, Level } from "@/lib/types";

// ---- Count-up animated number ----
// Static value (animations removed per preference). Kept as a component so
// call sites don't change; just renders the formatted number.
export function AnimatedNumber({ value, format }: { value: number; duration?: number; format?: (v: number) => string; flash?: boolean }) {
  return <>{format ? format(value) : Math.round(value).toLocaleString()}</>;
}

// ---- Panel: the standard glass card used everywhere ----
export function Panel({
  title,
  subtitle,
  icon,
  right,
  children,
  className = "",
  pad = true,
  delay,
}: {
  title?: string;
  subtitle?: string;
  icon?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  pad?: boolean;
  delay?: string;
}) {
  return (
    <section className={`topline rise-in glass rounded-3xl ${pad ? "p-5" : ""} ${className}`} style={delay ? { animationDelay: delay } : undefined}>
      {(title || right) && (
        <div className={`flex items-start justify-between gap-3 ${pad ? "" : "p-5 pb-0"}`}>
          <div className="flex items-start gap-2.5">
            {icon && (
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[color:var(--brand)]" style={{ background: "color-mix(in srgb, var(--brand) 14%, transparent)" }}>
                <Icon name={icon} className="h-4 w-4" />
              </span>
            )}
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">{title}</h2>
              {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
            </div>
          </div>
          {right}
        </div>
      )}
      <div className={title ? "mt-4" : ""}>{children}</div>
    </section>
  );
}

// ---- Page header: title + description + actions, shown atop each screen ----
export function PageHeader({ title, desc, children }: { title: string; desc?: string; children?: React.ReactNode }) {
  return (
    <div className="rise-in mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-[1.7rem]">{title}</h1>
        {desc && <p className="mt-1 text-sm text-ink-2">{desc}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

// ---- Stat card ----
export function Stat({ label, value, sub, color = "var(--brand)", icon }: { label: string; value: React.ReactNode; sub?: string; color?: string; icon?: string }) {
  return (
    <div className="card-hover glass relative overflow-hidden rounded-2xl p-3.5">
      <div className="flex items-center gap-2">
        {icon && (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style={{ background: `color-mix(in srgb, ${color} 16%, transparent)`, color }}>
            <Icon name={icon} className="h-4 w-4" />
          </span>
        )}
        <span className="text-[0.68rem] font-semibold uppercase tracking-wider text-muted">{label}</span>
      </div>
      <div className="mt-2 font-display text-2xl font-bold tabular-nums leading-none" style={{ color }}>
        {value}
      </div>
      {sub && <div className="mt-1 text-[0.7rem] text-muted">{sub}</div>}
    </div>
  );
}

// ---- Colored badge / pill ----
export function Badge({ color, children, solid = false }: { color: string; children: React.ReactNode; solid?: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold"
      style={
        solid
          ? { background: color, color: "#04120c" }
          : { background: `color-mix(in srgb, ${color} 14%, transparent)`, color, border: `1px solid color-mix(in srgb, ${color} 32%, transparent)` }
      }
    >
      {children}
    </span>
  );
}

export const LEVEL_COLOR = levelColor;

export function levelBadge(level: Level, label: string) {
  return <Badge color={LEVEL_COLOR[level]}>{label}</Badge>;
}

// ---- Thin progress / fill bar ----
export function Bar({ pct, color = "var(--brand)", className = "" }: { pct: number; color?: string; className?: string }) {
  return (
    <div className={`h-2 w-full overflow-hidden rounded-full ${className}`} style={{ background: "var(--track)" }}>
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: color }} />
    </div>
  );
}

// ---- Mini waste-bin that fills to the given percentage (card fill indicator) ----
export function BinFill({ pct, color = "var(--brand)", online = true }: { pct: number; color?: string; online?: boolean }) {
  const p = Math.max(0, Math.min(100, online ? pct : 0));
  const clipId = React.useId();
  const W = 48, H = 60;
  const topY = 16, botY = 56;
  const fillY = topY + (1 - p / 100) * (botY - topY);
  const bodyPath = `M8 ${topY} L40 ${topY} L35 ${botY} L13 ${botY} Z`;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="shrink-0" role="img" aria-label={`${Math.round(p)} percent full`}>
      <defs>
        <clipPath id={clipId}><path d={bodyPath} /></clipPath>
      </defs>
      {/* lid + handle */}
      <rect x={6} y={9} width={36} height={5} rx={2} fill="var(--axis)" />
      <rect x={19} y={5.5} width={10} height={3} rx={1.5} fill="var(--axis)" />
      {/* empty track */}
      <path d={bodyPath} fill="var(--track)" />
      {/* fill */}
      {online && p > 0 && (
        <g clipPath={`url(#${clipId})`}>
          <rect x={0} y={fillY} width={W} height={botY - fillY} fill={color} opacity={0.92} />
        </g>
      )}
      {/* ribs for the bin look */}
      <g clipPath={`url(#${clipId})`} opacity={0.14} stroke="var(--ink)" strokeWidth={1}>
        <line x1={18} y1={topY} x2={19} y2={botY} />
        <line x1={24} y1={topY} x2={24} y2={botY} />
        <line x1={30} y1={topY} x2={29} y2={botY} />
      </g>
      <path d={bodyPath} fill="none" stroke="var(--border)" strokeWidth={1.5} />
    </svg>
  );
}

// ---- Sparkline from a number[] ----
export function Spark({ data, color = "var(--brand)", w = 120, h = 32 }: { data: number[]; color?: string; w?: number; h?: number }) {
  if (data.length < 2) return <svg width={w} height={h} />;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const span = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / span) * (h - 4) - 2}`).join(" ");
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline className="chart-line" pathLength={1} points={pts} fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ---- Donut chart ----
export function Donut({ segments, size = 128, label, value }: { segments: { value: number; color: string }[]; size?: number; label?: string; value?: string }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const r = size / 2 - 10;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--track)" strokeWidth={12} />
        {segments.map((s, i) => {
          const len = (s.value / total) * c;
          const el = <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.color} strokeWidth={12} strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset} strokeLinecap="round" />;
          offset += len;
          return el;
        })}
      </svg>
      {(label || value) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {value && <span className="font-display text-xl font-bold tabular-nums">{value}</span>}
          {label && <span className="text-[0.62rem] uppercase tracking-wider text-muted">{label}</span>}
        </div>
      )}
    </div>
  );
}

// ---- Simple vertical bar chart ----
export function BarChart({ data, color = "var(--brand)", height = 150 }: { data: { label: string; value: number }[]; color?: string; height?: number }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end gap-2" style={{ height }}>
      {data.map((d) => (
        <div key={d.label} className="flex flex-1 flex-col items-center gap-1.5">
          <div className="flex w-full flex-1 items-end">
            <div
              className="bar-grow group relative w-full rounded-t-md transition-all duration-500"
              style={{ height: `${(d.value / max) * 100}%`, background: `linear-gradient(${color}, color-mix(in srgb, ${color} 30%, transparent))`, minHeight: 3 }}
              title={`${d.label}: ${d.value}`}
            >
              <span className="absolute -top-5 left-1/2 -translate-x-1/2 font-mono text-[0.6rem] text-muted opacity-0 transition group-hover:opacity-100">{d.value}</span>
            </div>
          </div>
          <span className="text-[0.6rem] text-muted">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

// ---- Toggle switch (visual only) ----
export function Toggle({ on, onClick }: { on: boolean; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className="relative h-6 w-11 shrink-0 rounded-full transition-colors"
      style={{ background: on ? "var(--brand)" : "var(--track)" }}
    >
      <span className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all" style={{ left: on ? "1.5rem" : "0.125rem" }} />
    </button>
  );
}

// ---- Table scaffolding ----
export function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="w-full">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="text-[0.66rem] uppercase tracking-wider text-muted">
            {head.map((h) => (
              <th key={h} className="px-2 pb-2 font-semibold">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="stagger">{children}</tbody>
      </table>
    </div>
  );
}

export function Row({ children }: { children: React.ReactNode }) {
  return <tr className="border-t border-line transition-colors hover:bg-[color:var(--surface)]">{children}</tr>;
}

export function Cell({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-2 py-2.5 align-middle ${className}`}>{children}</td>;
}

// ---- Avatar from initials ----
export function Avatar({ name, color = "var(--brand)" }: { name: string; color?: string }) {
  const initials = name.replace(/\(.*\)/, "").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold" style={{ background: `color-mix(in srgb, ${color} 18%, transparent)`, color }}>
      {initials}
    </span>
  );
}
