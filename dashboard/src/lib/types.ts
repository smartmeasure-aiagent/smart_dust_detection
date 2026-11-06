export type DeviceInfo = {
  device_id: string | null;
  ip: string | null;
  rssi: number | null;
  uptime_s: number | null;
  fw: string | null;
  sensor_ok: boolean | null;
  sensor_failures: number;
  echo_idle: number | null;
  last_seen_age: number | null;
  online: boolean;
};

export type BinStatus = {
  distance: number | null;
  fill: number;
  status: string;
  updated: string;
  alert: boolean;
  ts: number | null;
  age: number | null; // seconds since the last ESP32 reading
  device: DeviceInfo;
};

export type Point = { ts: number; distance: number; fill: number };

export type EventKind = "FULL_ALERT" | "RESET" | "SENSOR_FAULT" | "SENSOR_RECOVERED";

export type EventItem = { ts: number; kind: EventKind | string; fill: number | null; detail: string };

export type Stats = {
  total_readings: number;
  collections_today: number;
  fills_today: number;
  fill_rate_per_min: number | null;
  eta_to_full_min: number | null;
  server_uptime_s: number;
  device_uptime_s: number | null;
  last_collection_ts: number | null;
  event_count: number;
};

export function formatDuration(s: number | null): string {
  if (s === null || s === undefined) return "--";
  if (s < 60) return `${Math.round(s)}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}

export const FULL_THRESHOLD = 80;
export const ALMOST_THRESHOLD = 50;
export const STALE_AFTER_S = 15;

export type Level = "good" | "warning" | "critical" | "idle";

export function levelFor(fill: number, hasReading: boolean): Level {
  if (!hasReading) return "idle";
  if (fill >= FULL_THRESHOLD) return "critical";
  if (fill >= ALMOST_THRESHOLD) return "warning";
  return "good";
}

export const levelColor: Record<Level, string> = {
  good: "var(--good)",
  warning: "var(--warning)",
  critical: "var(--critical)",
  idle: "var(--axis)",
};

export const formatTime = (ts: number) =>
  new Date(ts * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

// Short relative time, e.g. "now", "8s", "3m", "2h". `nowMs` lets callers pass a
// shared clock so many timestamps re-render in sync on each tick.
export function timeAgo(tsSec: number, nowMs: number = Date.now()): string {
  const s = Math.max(0, Math.round(nowMs / 1000 - tsSec));
  if (s < 2) return "now";
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}
