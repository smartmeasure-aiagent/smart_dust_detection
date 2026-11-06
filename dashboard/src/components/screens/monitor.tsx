"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import HistoryChart from "@/components/HistoryChart";
import EventStream from "@/components/EventStream";
import Icon from "@/components/Icon";
import { AnimatedNumber, Badge, Bar, BarChart, BinFill, Panel, PageHeader, Spark, Stat } from "@/components/ui";
import { Bin, ScreenProps, ZONES, binLevel, binStatusLabel } from "@/lib/fleet";
import { sampleEvents, sampleHistory } from "@/lib/mock";
import { EventItem, Point, formatDuration, levelColor, levelFor } from "@/lib/types";

const LeafletMap = dynamic(() => import("@/components/LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[460px] w-full items-center justify-center lg:h-[560px]" style={{ background: "var(--surface)" }}>
      <span className="text-sm text-muted">Loading map…</span>
    </div>
  ),
});

const BinModel = dynamic(() => import("@/components/BinModel"), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center" style={{ width: 220, height: 220 }}><span className="text-xs text-muted">Loading 3D bin…</span></div>,
});

// ---- shared fleet aggregates ----
function useFleetStats(bins: Bin[]) {
  return useMemo(() => {
    const online = bins.filter((b) => b.online);
    const needs = online.filter((b) => b.fill >= 80);
    const faults = online.filter((b) => !b.sensorOk);
    const avg = online.length ? Math.round(online.reduce((s, b) => s + b.fill, 0) / online.length) : 0;
    return { total: bins.length, online: online.length, offline: bins.length - online.length, needs: needs.length, faults: faults.length, avg };
  }, [bins]);
}

function binColor(b: Bin) {
  return levelColor[binLevel(b)];
}

// ================= Dashboard =================
export function DashboardScreen({ bins, live, now }: ScreenProps) {
  const fs = useFleetStats(bins);
  const liveBin = bins.find((b) => b.isReal);
  const hasReading = !!live.data && live.data.ts !== null;
  // when no live ESP32 is reporting, fall back to the simulated BIN-A1 so the
  // hero bin still shows a lively value instead of a flat 0%
  const binOnline = hasReading || !!liveBin?.online;
  const fill = hasReading ? live.data!.fill : liveBin?.fill ?? 0;
  const level = levelFor(fill, binOnline);
  const collectionsToday = live.stats?.collections_today ?? 41;
  // sample data so the chart + event stream are never empty. Generated on the
  // client only (after mount) so SSR and first render match — Date.now() during
  // render would cause a hydration mismatch.
  const [demo, setDemo] = useState<{ points: Point[]; events: EventItem[] } | null>(null);
  useEffect(() => {
    const n = Date.now();
    setDemo({ points: sampleHistory(n), events: sampleEvents(n) });
  }, []);
  const chartPoints = live.points.length ? live.points : demo?.points ?? live.points;
  const streamEvents = live.events.length ? live.events : demo?.events ?? live.events;
  const conn = {
    live: { c: "var(--good)", t: "Live telemetry" },
    stale: { c: "var(--warning)", t: "Reconnecting…" },
    waiting: { c: "var(--warning)", t: "Connecting…" },
    connecting: { c: "var(--axis)", t: "Connecting…" },
    "sensor-fault": { c: "var(--critical)", t: "Sensor fault" },
    "server-offline": { c: "var(--critical)", t: "Backend offline" },
  }[live.link];

  const byZone = ZONES.map((z) => ({ label: z.slice(0, 3), value: bins.filter((b) => b.zone === z && b.online && b.fill >= 80).length }));

  return (
    <>
      <PageHeader title="Operations Dashboard" desc="Fleet-wide status with the live sensor bin in focus">
        <Badge color={conn.c}>
          <span className={`h-1.5 w-1.5 rounded-full ${live.live ? "dot-live" : ""}`} style={{ background: conn.c }} />
          {conn.t}
        </Badge>
      </PageHeader>

      <div className="stagger mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Total bins" value={<AnimatedNumber value={fs.total} />} icon="bin" sub={`${fs.online} online · ${fs.offline} offline`} />
        <Stat label="Needs collection" value={<AnimatedNumber value={fs.needs} />} icon="warning" color="var(--critical)" sub="80%+ full" />
        <Stat label="Avg fill" value={<AnimatedNumber value={fs.avg} format={(v) => `${Math.round(v)}%`} />} icon="trend" color="var(--brand-2)" sub="online bins" />
        <Stat label="Collections today" value={<AnimatedNumber value={collectionsToday} />} icon="truck" color="var(--accent)" sub={`${live.stats?.fills_today ?? 41} fills`} />
        <Stat label="Sensor faults" value={<AnimatedNumber value={fs.faults} />} icon="diagnostics" color={fs.faults ? "var(--warning)" : "var(--good)"} sub="active" />
        <Stat label="Server uptime" value={formatDuration(live.stats?.server_uptime_s ?? null)} icon="device" color="var(--brand)" sub="backend" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <Panel title="Live sensor bin" subtitle={`${liveBin?.name ?? "BIN-A1"} · real ESP32 device`} icon="bin" delay="0.05s"
          right={<Badge color={levelColor[level]}>{binOnline ? binStatusLabel({ ...(liveBin as Bin), fill, online: true }) : "Waiting"}</Badge>}>
          <div className="flex flex-col items-center gap-5 sm:flex-row sm:gap-6">
            <BinModel fill={fill} color={levelColor[level]} online={binOnline} size={200} />
            <div className="text-center sm:text-left">
              <p className="max-w-[12rem] text-sm text-ink-2">
                {hasReading ? `${live.data!.distance} cm from sensor to waste` : binOnline ? "Simulated demo bin — connect the ESP32 for live data" : "No reading from the ESP32 yet"}
              </p>
              <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
                <button onClick={live.onReset} className="btn btn-ghost !px-3 !py-1.5 !text-xs">Mark collected</button>
                <button onClick={live.onTest} className="btn btn-ghost !px-3 !py-1.5 !text-xs">Test alert</button>
              </div>
            </div>
          </div>
        </Panel>

        <EventStream events={streamEvents} now={now} />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <Panel title="Live bin — fill over time" subtitle={`Last ${live.points.length} readings`} icon="analytics" delay="0.1s">
          <HistoryChart points={chartPoints} />
        </Panel>
        <Panel title="Full bins by zone" subtitle="Across the simulated fleet" icon="map" delay="0.15s">
          <BarChart data={byZone} color="var(--brand-2)" />
          <div className="mt-4 space-y-2">
            {bins.filter((b) => b.online && b.fill >= 80).slice(0, 4).map((b) => (
              <div key={b.id} className="flex items-center gap-3">
                <span className="w-24 shrink-0 truncate text-xs font-medium">{b.name}</span>
                <Bar pct={b.fill} color={binColor(b)} />
                <span className="w-9 shrink-0 text-right font-mono text-xs" style={{ color: binColor(b) }}>{b.fill}%</span>
              </div>
            ))}
            {bins.filter((b) => b.online && b.fill >= 80).length === 0 && <p className="text-sm text-muted">No bins need collection right now.</p>}
          </div>
        </Panel>
      </div>
    </>
  );
}

// ================= Bin Monitoring =================
export function MonitoringScreen({ bins, selectBin, goto }: ScreenProps) {
  const [q, setQ] = useState("");
  const [zone, setZone] = useState<string>("All");
  const [status, setStatus] = useState<string>("All");

  const filtered = bins.filter((b) => {
    if (zone !== "All" && b.zone !== zone) return false;
    const label = binStatusLabel(b);
    if (status !== "All" && label !== status) return false;
    if (q && !(`${b.name} ${b.id} ${b.sector}`.toLowerCase().includes(q.toLowerCase()))) return false;
    return true;
  });

  function open(b: Bin) {
    selectBin(b.id);
    goto("bin-details");
  }

  return (
    <>
      <PageHeader title="Bin Monitoring" desc={`${bins.length} smart bins across ${ZONES.length} zones — live fill, power and connectivity`}>
        <div className="flex items-center gap-2 rounded-xl border border-line px-3 py-2" style={{ background: "var(--surface)" }}>
          <Icon name="search" className="h-4 w-4 text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search bins…" className="w-36 bg-transparent text-sm outline-none placeholder:text-muted" />
        </div>
      </PageHeader>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {["All", ...ZONES].map((z) => (
          <button key={z} onClick={() => setZone(z)} className="btn !px-3 !py-1.5 !text-xs" style={zone === z ? { background: "var(--brand)", color: "#04120c" } : { background: "var(--surface)", border: "1px solid var(--border)", color: "var(--ink)" }}>
            {z}
          </button>
        ))}
        <span className="mx-1 h-4 w-px bg-line" />
        {["All", "Available", "Almost full", "Full", "Offline", "Sensor fault"].map((s) => (
          <button key={s} onClick={() => setStatus(s)} className="btn !px-3 !py-1.5 !text-xs" style={status === s ? { background: "var(--brand-2)", color: "#04120c" } : { background: "var(--surface)", border: "1px solid var(--border)", color: "var(--ink)" }}>
            {s}
          </button>
        ))}
      </div>

      <div className="stagger grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((b) => {
          const c = binColor(b);
          return (
            <button key={b.id} onClick={() => open(b)} className="card-hover glass topline rounded-2xl p-4 text-left">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate font-display text-sm font-bold">{b.name}</div>
                  <div className="text-xs text-muted">{b.id} · {b.sector}</div>
                </div>
                {b.isReal && <Badge color="var(--brand)">LIVE</Badge>}
              </div>
              <div className="mt-3 flex items-end justify-between gap-2">
                <div>
                  <span className="font-display text-3xl font-extrabold tabular-nums" style={{ color: c }}>{b.online ? b.fill : "--"}<span className="text-base text-ink-2">%</span></span>
                  <div className="mt-1.5"><Badge color={c}>{binStatusLabel(b)}</Badge></div>
                </div>
                <BinFill pct={b.fill} color={c} online={b.online} />
              </div>
              {b.online && b.fill >= 90 && (
                <div className="collect-strip mt-3" title="Garbage collection in progress">
                  <span className="collect-truck" aria-hidden>🚛</span>
                </div>
              )}
              <div className="mt-3 flex items-center justify-between text-[0.7rem] text-muted">
                <span className="inline-flex items-center gap-1"><Icon name="battery" className="h-3.5 w-3.5" />{b.battery}%</span>
                <span className="inline-flex items-center gap-1"><Icon name="wifi" className="h-3.5 w-3.5" />{b.online ? `${b.rssi}dBm` : "offline"}</span>
                <span className="inline-flex items-center gap-1"><Icon name="clock" className="h-3.5 w-3.5" />{b.online ? `${b.lastUpdateS}s` : "—"}</span>
              </div>
            </button>
          );
        })}
      </div>
      {filtered.length === 0 && <p className="py-12 text-center text-sm text-muted">No bins match these filters.</p>}
    </>
  );
}

// ================= Bin Details =================
export function BinDetailsScreen({ bins, selectedBinId, goto, live, selectBin }: ScreenProps) {
  const b = bins.find((x) => x.id === selectedBinId) ?? bins[0];
  const c = binColor(b);
  const n = bins.length;
  const idx = bins.findIndex((x) => x.id === b.id);
  const prevId = bins[(idx - 1 + n) % n].id;
  const nextId = bins[(idx + 1) % n].id;
  const battColor = b.battery < 20 ? "var(--critical)" : b.battery < 40 ? "var(--warning)" : "var(--good)";
  // synthetic recent history for the sparkline
  const hist = useMemo(() => {
    const out: number[] = [];
    let v = Math.max(5, b.fill - 30);
    for (let i = 0; i < 24; i++) {
      v += Math.random() * 6;
      if (v > 100) v = Math.random() * 12 + 4;
      out.push(Math.round(v));
    }
    out[out.length - 1] = b.online ? b.fill : out[out.length - 1];
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [b.id, b.fill, b.online]);

  const specs: [string, string][] = [
    ["Bin ID", b.id],
    ["Type", b.type],
    ["Capacity", `${b.capacityL} L`],
    ["Zone / Sector", `${b.zone} · ${b.sector}`],
    ["Assigned team", b.team],
    ["Coordinates", `${b.x.toFixed(1)}, ${b.y.toFixed(1)}`],
    ["Sensor distance", `${b.distanceCm} cm`],
    ["Temperature", b.online ? `${b.tempC} °C` : "—"],
    ["Fill rate", `${b.fillRate} %/h`],
    ["Firmware", b.isReal ? "1.2.1 (live)" : "1.4.0"],
  ];

  return (
    <>
      <PageHeader title={b.name} desc={`${b.id} · ${b.sector}, ${b.zone} zone`}>
        <div className="flex items-center gap-1">
          <button onClick={() => selectBin(prevId)} className="btn btn-ghost !p-1.5" aria-label="Previous bin" title="Previous bin"><Icon name="chevron" className="h-4 w-4 rotate-180" /></button>
          <button onClick={() => selectBin(nextId)} className="btn btn-ghost !p-1.5" aria-label="Next bin" title="Next bin"><Icon name="chevron" className="h-4 w-4" /></button>
        </div>
        <button onClick={() => goto("monitoring")} className="btn btn-ghost !py-1.5 !text-xs">All bins</button>
        <button onClick={b.isReal ? live.onReset : undefined} className="btn btn-primary !py-1.5 !text-xs">Dispatch collection</button>
      </PageHeader>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]">
        <Panel title="Fill level" subtitle="Live 3D view — waste rises with the real reading" icon="bin" right={<Badge color={c}>{binStatusLabel(b)}</Badge>}>
          <div className="flex flex-col items-center gap-4 py-2">
            <BinModel fill={b.fill} color={c} online={b.online} size={230} />
            {b.isReal && (
              <span className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold" style={{ background: "color-mix(in srgb, var(--brand) 13%, transparent)", color: "var(--brand)" }}>
                <span className="relative flex h-2.5 w-2.5 items-center justify-center">
                  {live.live && <span className="ping-ring absolute inline-block h-2.5 w-2.5 rounded-full" style={{ border: "1px solid var(--brand)" }} />}
                  <span className="h-2 w-2 rounded-full" style={{ background: "var(--brand)" }} />
                </span>
                Live ESP32 device
              </span>
            )}
          </div>
        </Panel>

        <div className="grid gap-5">
          <div className="stagger grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Battery" value={b.online || b.battery ? <AnimatedNumber value={b.battery} format={(v) => `${Math.round(v)}`} /> : "--"} sub="%" icon="battery" color={battColor} />
            <Stat label="Signal" value={b.online ? <AnimatedNumber value={b.rssi} format={(v) => `${Math.round(v)}`} /> : "--"} sub="dBm" icon="wifi" color="var(--brand-2)" />
            <Stat label="Distance" value={b.online ? <AnimatedNumber value={b.distanceCm} format={(v) => v.toFixed(0)} /> : "--"} sub="cm" icon="monitoring" color="var(--brand)" />
            <Stat label="Temperature" value={b.online ? <AnimatedNumber value={b.tempC} format={(v) => `${Math.round(v)}`} /> : "--"} sub="°C" icon="diagnostics" color="var(--accent)" />
          </div>

          <div className="flex flex-wrap gap-2.5">
            <span className="inline-flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-xs" style={{ background: "var(--surface)" }}>
              <span className={`h-2 w-2 rounded-full ${b.online && b.sensorOk ? "dot-live" : ""}`} style={{ background: b.online ? (b.sensorOk ? "var(--good)" : "var(--critical)") : "var(--axis)", transition: "background 0.4s ease" }} />
              Sensor <strong style={{ color: b.online ? (b.sensorOk ? "var(--good)" : "var(--critical)") : "var(--muted)" }}>{b.online ? (b.sensorOk ? "Responding" : "Fault") : "—"}</strong>
            </span>
            <span className="inline-flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-xs" style={{ background: "var(--surface)" }}>
              <span className={`h-2 w-2 rounded-full ${b.online ? "dot-live" : ""}`} style={{ background: b.online ? "var(--good)" : "var(--critical)", transition: "background 0.4s ease" }} />
              {b.online ? <>Online · last seen {b.lastUpdateS}s ago</> : "Offline"}
            </span>
          </div>

          <Panel title="Fill trend" subtitle="Last ~24 readings" icon="analytics">
            <div className="flex items-center gap-4">
              <Spark key={b.id} data={hist} color={c} w={260} h={60} />
              <div className="text-sm">
                <div className="font-display text-2xl font-bold" style={{ color: c }}>
                  <AnimatedNumber value={b.fillRate} format={(v) => v.toFixed(1)} /> %/h
                </div>
                <div className="text-xs text-muted">avg fill rate</div>
              </div>
            </div>
          </Panel>

          <Panel title="Specifications" icon="device">
            <dl className="stagger grid grid-cols-2 gap-x-6 gap-y-2.5 sm:grid-cols-2">
              {specs.map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-2 border-b border-line pb-1.5">
                  <dt className="text-xs text-muted">{k}</dt>
                  <dd className="font-mono text-xs font-semibold">{v}</dd>
                </div>
              ))}
            </dl>
          </Panel>
        </div>
      </div>
    </>
  );
}

// ================= Live Map =================
export function LiveMapScreen({ bins, theme, selectBin, goto }: ScreenProps) {
  const [zoneFilter, setZoneFilter] = useState<string>("All");
  const shown = bins.filter((b) => zoneFilter === "All" || b.zone === zoneFilter);
  const sorted = [...shown].sort((a, b) => (b.online ? b.fill : -1) - (a.online ? a.fill : -1));
  const dark = theme === "dark" || (theme === "auto" && typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  function open(id: string) {
    selectBin(id);
    goto("bin-details");
  }

  return (
    <>
      <PageHeader title="Live Map" desc="Real-time bin locations on the city map — colour shows fill, full bins pulse">
        <div className="flex flex-wrap items-center gap-1.5">
          {["All", ...ZONES].map((z) => (
            <button key={z} onClick={() => setZoneFilter(z)} className="btn !px-2.5 !py-1 !text-xs" style={zoneFilter === z ? { background: "var(--brand)", color: "#04120c" } : { background: "var(--surface)", border: "1px solid var(--border)", color: "var(--ink)" }}>{z}</button>
          ))}
        </div>
      </PageHeader>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,8fr)_minmax(0,4fr)]">
        <Panel icon="map" title="City view" subtitle={`${shown.length} bins · live`} pad={false}>
          <div className="relative p-2">
            <div className="overflow-hidden rounded-2xl ring-1 ring-[color:var(--border)]">
              <LeafletMap bins={shown} dark={dark} onSelect={open} />
            </div>
            {/* floating legend */}
            <div className="glass pointer-events-none absolute bottom-5 left-5 z-[500] flex flex-col gap-1.5 rounded-xl px-3 py-2.5 text-[0.7rem]">
              <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: "var(--good)" }} />Available</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: "var(--warning)" }} />Almost full</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: "var(--critical)" }} />Full · collect</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: "var(--axis)" }} />Offline</span>
            </div>
          </div>
        </Panel>

        <Panel title="Bins by priority" subtitle="Highest fill first" icon="monitoring">
          <div className="-mr-2 max-h-[460px] space-y-2 overflow-y-auto overflow-x-hidden pr-2">
            {sorted.map((b) => {
              const c = binColor(b);
              return (
                <button key={b.id} onClick={() => open(b.id)} className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition-colors hover:bg-[color:var(--surface)]" style={{ border: "1px solid var(--border)" }}>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ background: `color-mix(in srgb, ${c} 16%, transparent)`, color: c }}>
                    <Icon name="pin" className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{b.name}</div>
                    <div className="text-[0.7rem] text-muted">{b.zone} · {b.team}</div>
                  </div>
                  <span className="font-mono text-sm font-bold" style={{ color: c }}>{b.online ? `${b.fill}%` : "off"}</span>
                </button>
              );
            })}
          </div>
        </Panel>
      </div>
    </>
  );
}
