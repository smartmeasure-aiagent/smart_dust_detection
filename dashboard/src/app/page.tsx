"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import BinGauge from "@/components/BinGauge";
import DevicePanel from "@/components/DevicePanel";
import HistoryChart from "@/components/HistoryChart";
import { api } from "@/lib/api";
import { notificationPermission, raiseAlert, requestNotifications } from "@/lib/alerts";
import { BinStatus, Level, Point, Stats, STALE_AFTER_S, formatDuration, formatTime, levelColor, levelFor } from "@/lib/types";

const POLL_MS = 2000;

type Link = "connecting" | "server-offline" | "waiting" | "sensor-fault" | "stale" | "live";

const LEVEL_LABEL: Record<Level, { icon: string; text: string }> = {
  good: { icon: "✓", text: "Available" },
  warning: { icon: "!", text: "Almost full" },
  critical: { icon: "⚠", text: "Full — collect now" },
  idle: { icon: "…", text: "Waiting for sensor" },
};

function readPref(key: string, fallback: boolean) {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : v === "1";
  } catch {
    return fallback;
  }
}

export default function Dashboard() {
  const [data, setData] = useState<BinStatus | null>(null);
  const [points, setPoints] = useState<Point[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [link, setLink] = useState<Link>("connecting");
  const [perm, setPerm] = useState<string>("default");
  const [sound, setSound] = useState(true);
  const [showTable, setShowTable] = useState(false);
  const [testBanner, setTestBanner] = useState(false);
  const wasFull = useRef(false);
  const soundRef = useRef(sound);

  useEffect(() => {
    soundRef.current = sound;
  }, [sound]);

  useEffect(() => {
    setPerm(notificationPermission());
    setSound(readPref("dustbin.sound", true));
  }, []);

  const refresh = useCallback(async () => {
    try {
      const [s, h, st] = await Promise.all([
        fetch(api("/api/status"), { cache: "no-store" }).then((r) => r.json() as Promise<BinStatus>),
        fetch(api("/api/history"), { cache: "no-store" }).then((r) => r.json() as Promise<Point[]>),
        fetch(api("/api/stats"), { cache: "no-store" }).then((r) => r.json() as Promise<Stats>).catch(() => null),
      ]);
      setData(s);
      setPoints(h);
      setStats(st);
      setLink(
        s.device?.online && s.device.sensor_ok === false
          ? "sensor-fault"
          : s.ts === null
            ? "waiting"
            : (s.age ?? 0) > STALE_AFTER_S
              ? "stale"
              : "live",
      );
      // Alert once per transition into FULL; re-arms when the bin is emptied.
      if (s.alert && !wasFull.current) {
        raiseAlert(`Dustbin is ${s.fill}% full — please collect now.`, { sound: soundRef.current, sticky: true });
      }
      wasFull.current = s.alert;
    } catch {
      setLink("server-offline");
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  const hasReading = !!data && data.ts !== null;
  const fill = hasReading ? data.fill : 0;
  const level = levelFor(fill, hasReading);
  const full = !!data?.alert;

  function toggleSound() {
    const next = !sound;
    setSound(next);
    try {
      localStorage.setItem("dustbin.sound", next ? "1" : "0");
    } catch {}
  }

  function testAlert() {
    raiseAlert("Test alert: dustbin alerts are working.", { sound, sticky: false });
    setTestBanner(true);
    setTimeout(() => setTestBanner(false), 4000);
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-7 sm:px-6 sm:py-12">
      <header className="rise-in mb-7 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <LogoMark />
          <div>
            <h1 className="font-display text-2xl font-extrabold leading-none tracking-tight sm:text-[2rem]">
              <span className="gradient-text text-glow">Smart Dustbin</span>
            </h1>
            <p className="mt-1.5 text-sm text-ink-2">Alert System · ESP32 ultrasonic fill-level monitor</p>
          </div>
        </div>
        <LinkBadge link={link} age={data?.age ?? null} />
      </header>

      {(full || testBanner) && (
        <div
          role="alert"
          className="pulse-glow rise-in mb-7 flex items-center gap-4 overflow-hidden rounded-2xl px-5 py-4 font-semibold text-white shadow-lg"
          style={{ background: "linear-gradient(120deg, var(--critical), #9f1239)" }}
        >
          <span className="pulse-soft flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 text-2xl" aria-hidden>
            ⚠
          </span>
          <div>
            <div className="font-display text-lg tracking-tight">
              {testBanner && !full ? "TEST ALERT — alerts are working" : "DUSTBIN FULL — COLLECT NOW"}
            </div>
            {full && <div className="text-sm font-normal opacity-90">Fill level {fill}% · last reading {data?.updated}</div>}
          </div>
        </div>
      )}

      <KpiStrip stats={stats} level={level} fill={fill} hasReading={hasReading} />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <section className="topline card-hover rise-in glass rounded-3xl p-6" style={{ animationDelay: "0.05s" }}>
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">Fill level</h2>
            <StatusPill level={level} />
          </div>
          <div className="mt-3 flex items-center gap-4">
            <div className="h-56 w-44 shrink-0 sm:h-64 sm:w-56" style={{ filter: "drop-shadow(0 18px 30px var(--glow))" }}>
              <BinGauge fill={fill} level={level} />
            </div>
            <div>
              <div className="font-display text-6xl font-extrabold tabular-nums tracking-tight sm:text-7xl" style={{ color: levelColor[level] }}>
                {hasReading ? fill : "--"}
                <span className="text-3xl text-ink-2">%</span>
              </div>
              <p className="mt-2 max-w-[11rem] text-sm text-ink-2">
                {hasReading ? `${data.distance} cm from sensor to waste` : "No reading received yet"}
              </p>
            </div>
          </div>
        </section>

        <div className="grid gap-5">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Tile label="Distance" value={hasReading ? `${data.distance} cm` : "--"} accent="brand" delay="0.1s" />
            <Tile
              label="Last update"
              value={hasReading ? data.updated : "--"}
              sub={hasReading && data.age !== null ? `${Math.round(data.age)} s ago` : undefined}
              accent="brand-2"
              delay="0.15s"
            />
            <Tile label="Readings" value={String(points.length)} sub="this session" accent="accent" delay="0.2s" />
          </div>

          <section className="topline rise-in glass rounded-3xl p-5" style={{ animationDelay: "0.25s" }}>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">Alerts</h2>
            <p className="mt-1.5 text-sm text-ink-2">
              Desktop notification, sound and banner when the bin reaches 80%. Stands in for the voice call during
              prototype testing.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2.5">
              <button onClick={async () => setPerm(await requestNotifications())} className="btn btn-primary">
                {perm === "granted" ? "Notifications on" : "Enable notifications"}
              </button>
              <button onClick={testAlert} className="btn btn-ghost">
                Test alert
              </button>
              <button
                onClick={async () => {
                  await fetch(api("/api/reset"), { method: "POST" });
                  wasFull.current = false;
                  refresh();
                }}
                className="btn btn-ghost"
              >
                Reset readings
              </button>
              <button onClick={toggleSound} aria-pressed={sound} className="btn btn-ghost">
                Sound: {sound ? "🔊 on" : "🔇 off"}
              </button>
              <span className="text-xs text-muted">
                Desktop notifications: {perm === "unsupported" ? "not supported in this browser" : perm}
              </span>
            </div>
          </section>
        </div>
      </div>

      <DevicePanel data={data} serverUp={link !== "server-offline" && link !== "connecting"} />

      <section className="topline rise-in glass mt-5 rounded-3xl p-5" style={{ animationDelay: "0.35s" }}>
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">Fill level over time</h2>
            <p className="mt-0.5 text-xs text-muted">Last {points.length} readings · resets when the server restarts</p>
          </div>
          <button onClick={() => setShowTable((v) => !v)} className="btn btn-ghost !px-3 !py-1.5 !text-xs">
            {showTable ? "Show chart" : "Show table"}
          </button>
        </div>
        {showTable ? <ReadingsTable points={points} /> : <HistoryChart points={points} />}
      </section>

      <footer className="mt-7 text-center text-xs text-muted">
        <span className="inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
          <Band color="var(--good)" text="below 50% available" />
          <Band color="var(--warning)" text="50–79% almost full" />
          <Band color="var(--critical)" text="80%+ full" />
        </span>
      </footer>
    </main>
  );
}

function KpiStrip({ stats, level, fill, hasReading }: { stats: Stats | null; level: Level; fill: number; hasReading: boolean }) {
  const rate = stats?.fill_rate_per_min;
  const eta = stats?.eta_to_full_min;
  const items = [
    {
      icon: "truck",
      label: "Collections today",
      value: stats ? String(stats.collections_today) : "--",
      sub: stats ? `${stats.fills_today} fills` : undefined,
      color: "var(--brand)",
    },
    {
      icon: "trend",
      label: "Fill rate",
      value: rate != null ? `${rate > 0 ? "+" : ""}${rate}%` : "--",
      sub: "per min",
      color: "var(--brand-2)",
    },
    {
      icon: "clock",
      label: "Est. time to full",
      value: hasReading && fill >= 80 ? "Full" : eta != null ? `${eta}` : "--",
      sub: hasReading && fill >= 80 ? "collect now" : eta != null ? "min" : "steady",
      color: level === "critical" ? "var(--critical)" : level === "warning" ? "var(--warning)" : "var(--accent)",
    },
    {
      icon: "pulse",
      label: "Total readings",
      value: stats ? stats.total_readings.toLocaleString() : "--",
      sub: stats ? `${stats.event_count} events` : undefined,
      color: "var(--brand)",
    },
    {
      icon: "server",
      label: "Server uptime",
      value: stats ? formatDuration(stats.server_uptime_s) : "--",
      sub: stats?.device_uptime_s != null ? `device ${formatDuration(stats.device_uptime_s)}` : undefined,
      color: "var(--brand-2)",
    },
  ];
  return (
    <div className="rise-in mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" style={{ animationDelay: "0.03s" }}>
      {items.map((it, i) => (
        <div key={it.label} className="card-hover glass relative overflow-hidden rounded-2xl p-3.5" style={{ animationDelay: `${0.04 * i}s` }}>
          <div className="flex items-center gap-2">
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
              style={{ background: `color-mix(in srgb, ${it.color} 16%, transparent)`, color: it.color }}
            >
              <KpiIcon name={it.icon} />
            </span>
            <span className="text-[0.68rem] font-semibold uppercase tracking-wider text-muted">{it.label}</span>
          </div>
          <div className="mt-2 font-display text-2xl font-bold tabular-nums leading-none" style={{ color: it.color }}>
            {it.value}
          </div>
          {it.sub && <div className="mt-1 text-[0.7rem] text-muted">{it.sub}</div>}
        </div>
      ))}
    </div>
  );
}

function KpiIcon({ name }: { name: string }) {
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const paths: Record<string, React.ReactNode> = {
    truck: (
      <>
        <path d="M3 6h11v9H3z" {...p} />
        <path d="M14 9h4l3 3v3h-7z" {...p} />
        <circle cx="7" cy="18" r="1.6" {...p} />
        <circle cx="17" cy="18" r="1.6" {...p} />
      </>
    ),
    trend: (
      <>
        <path d="M3 17l5-5 4 3 6-7" {...p} />
        <path d="M17 8h4v4" {...p} />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="8.5" {...p} />
        <path d="M12 7.5V12l3 2" {...p} />
      </>
    ),
    pulse: <path d="M3 12h4l2-6 4 12 2-6h6" {...p} />,
    server: (
      <>
        <rect x="3.5" y="4" width="17" height="6" rx="1.5" {...p} />
        <rect x="3.5" y="14" width="17" height="6" rx="1.5" {...p} />
        <path d="M7 7h.01M7 17h.01" {...p} />
      </>
    ),
  };
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      {paths[name]}
    </svg>
  );
}

function Band({ color, text }: { color: string; text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      {text}
    </span>
  );
}

function LogoMark() {
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src="/logo-icon.png"
      alt="Smart Dustbin Alert System"
      className="h-14 w-14 shrink-0 object-contain sm:h-16 sm:w-16"
      style={{ filter: "drop-shadow(0 8px 18px var(--glow))" }}
    />
  );
}

function StatusPill({ level }: { level: Level }) {
  const { icon, text } = LEVEL_LABEL[level];
  const c = levelColor[level];
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold"
      style={{ background: `color-mix(in srgb, ${c} 14%, transparent)`, color: c, border: `1px solid color-mix(in srgb, ${c} 35%, transparent)` }}
    >
      <span
        className="flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold"
        style={{ background: c, color: level === "warning" ? "#0b0b0b" : "#fff" }}
        aria-hidden
      >
        {icon}
      </span>
      {text}
    </span>
  );
}

function LinkBadge({ link, age }: { link: Link; age: number | null }) {
  const map: Record<Link, { dot: string; text: string }> = {
    connecting: { dot: "var(--axis)", text: "Connecting…" },
    "server-offline": { dot: "var(--critical)", text: "Server offline" },
    waiting: { dot: "var(--warning)", text: "Server up · waiting for ESP32" },
    "sensor-fault": { dot: "var(--critical)", text: "ESP32 online · sensor not responding" },
    stale: { dot: "var(--warning)", text: `ESP32 silent for ${Math.round(age ?? 0)} s` },
    live: { dot: "var(--good)", text: "Live" },
  };
  const { dot, text } = map[link];
  return (
    <span className="glass inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium">
      <span className={`h-2.5 w-2.5 rounded-full ${link === "live" ? "dot-live" : ""}`} style={{ background: dot }} />
      {text}
    </span>
  );
}

function Tile({ label, value, sub, accent, delay }: { label: string; value: string; sub?: string; accent: "brand" | "brand-2" | "accent"; delay: string }) {
  const bar = `var(--${accent})`;
  return (
    <div className="card-hover rise-in glass relative overflow-hidden rounded-2xl p-4 last:col-span-2 sm:last:col-span-1" style={{ animationDelay: delay }}>
      <span className="absolute inset-y-0 left-0 w-1" style={{ background: `linear-gradient(var(--${accent}), transparent)` }} />
      <div className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</div>
      <div className="mt-1 font-display text-2xl font-bold tabular-nums" style={{ color: bar }}>
        {value}
      </div>
      {sub && <div className="text-xs text-muted">{sub}</div>}
    </div>
  );
}

function ReadingsTable({ points }: { points: Point[] }) {
  const rows = [...points].reverse().slice(0, 50);
  if (rows.length === 0) return <p className="py-10 text-center text-sm text-muted">No readings yet</p>;
  return (
    <div className="max-h-[240px] overflow-auto rounded-xl">
      <table className="w-full text-left text-sm tabular-nums">
        <thead className="sticky top-0 bg-[color:var(--surface-solid)]/80 text-xs uppercase tracking-wide text-muted backdrop-blur">
          <tr>
            <th className="py-2 font-semibold">Time</th>
            <th className="py-2 font-semibold">Fill</th>
            <th className="py-2 font-semibold">Distance</th>
            <th className="py-2 font-semibold">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => {
            const lv = levelFor(p.fill, true);
            return (
              <tr key={p.ts} className="border-t border-line">
                <td className="py-1.5">{formatTime(p.ts)}</td>
                <td className="py-1.5 font-semibold" style={{ color: levelColor[lv] }}>
                  {p.fill}%
                </td>
                <td className="py-1.5">{p.distance} cm</td>
                <td className="py-1.5 text-ink-2">{LEVEL_LABEL[lv].text}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
