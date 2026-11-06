"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Sidebar from "@/components/Sidebar";
import StatusBar from "@/components/StatusBar";
import TopBar from "@/components/TopBar";
import { SCREENS } from "@/components/screens";
import { API_BASE, api } from "@/lib/api";
import { notificationPermission, raiseAlert, requestNotifications } from "@/lib/alerts";
import { LinkState, LiveBundle, ScreenProps, useFleet } from "@/lib/fleet";
import { navLabel } from "@/lib/nav";
import { BinStatus, EventItem, Point, Stats, STALE_AFTER_S, formatDuration } from "@/lib/types";

const ThreeBackground = dynamic(() => import("@/components/ThreeBackground"), { ssr: false });

const POLL_MS = 2000;

const LINK_MAP: Record<LinkState, { dot: string; text: string }> = {
  connecting: { dot: "var(--axis)", text: "Connecting…" },
  "server-offline": { dot: "var(--critical)", text: "Server offline" },
  waiting: { dot: "var(--warning)", text: "Waiting for ESP32" },
  "sensor-fault": { dot: "var(--critical)", text: "Sensor fault" },
  stale: { dot: "var(--warning)", text: "Signal stale" },
  live: { dot: "var(--good)", text: "Live" },
};

function readPref(key: string, fallback: boolean) {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : v === "1";
  } catch {
    return fallback;
  }
}

export default function App() {
  // ---- live backend state ----
  const [data, setData] = useState<BinStatus | null>(null);
  const [points, setPoints] = useState<Point[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [link, setLink] = useState<LinkState>("connecting");
  const [perm, setPerm] = useState<string>("default");
  const [sound, setSound] = useState(true);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [lastSync, setLastSync] = useState(0);
  const [now, setNow] = useState(0);

  // ---- shell navigation state ----
  const [active, setActive] = useState("dashboard");
  const [selectedBinId, setSelectedBinId] = useState("BIN-A1");
  const [menuOpen, setMenuOpen] = useState(false);
  const [testBanner, setTestBanner] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [theme, setTheme] = useState<"auto" | "light" | "dark">("auto");

  const wasFull = useRef(false);
  const soundRef = useRef(sound);
  useEffect(() => void (soundRef.current = sound), [sound]);

  useEffect(() => {
    setPerm(notificationPermission());
    setSound(readPref("dustbin.sound", true));
    setCollapsed(readPref("dustbin.rail", false));
    try {
      const t = localStorage.getItem("dustbin.theme");
      if (t === "light" || t === "dark" || t === "auto") setTheme(t);
    } catch {}
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // apply theme to <html data-theme>
  useEffect(() => {
    const el = document.documentElement;
    if (theme === "auto") delete el.dataset.theme;
    else el.dataset.theme = theme;
  }, [theme]);

  const onToggleCollapse = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("dustbin.rail", next ? "1" : "0");
      } catch {}
      return next;
    });
  }, []);

  const onCycleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "auto" ? "light" : prev === "light" ? "dark" : "auto";
      try {
        localStorage.setItem("dustbin.theme", next);
      } catch {}
      return next;
    });
  }, []);

  const refresh = useCallback(async () => {
    try {
      const t0 = performance.now();
      const s = (await fetch(api("/api/status"), { cache: "no-store" }).then((r) => r.json())) as BinStatus;
      setLatencyMs(Math.round(performance.now() - t0));
      const [h, st, ev] = await Promise.all([
        fetch(api("/api/history"), { cache: "no-store" }).then((r) => r.json() as Promise<Point[]>),
        fetch(api("/api/stats"), { cache: "no-store" }).then((r) => r.json() as Promise<Stats>).catch(() => null),
        fetch(api("/api/events?limit=50"), { cache: "no-store" }).then((r) => r.json() as Promise<EventItem[]>).catch(() => []),
      ]);
      setData(s);
      setPoints(h);
      setStats(st);
      setEvents(ev);
      setLastSync(Date.now());
      setLink(
        s.device?.online && s.device.sensor_ok === false
          ? "sensor-fault"
          : s.ts === null
            ? "waiting"
            : (s.age ?? 0) > STALE_AFTER_S
              ? "stale"
              : "live",
      );
      if (s.alert && !wasFull.current) {
        raiseAlert(`Dustbin is ${s.fill}% full — please collect now.`, { sound: soundRef.current, sticky: true });
      }
      wasFull.current = s.alert;
    } catch {
      setLink("server-offline");
      setLatencyMs(null);
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  // ---- derived ----
  const serverUp = link !== "server-offline" && link !== "connecting";
  const live = link === "live";
  const hasReading = !!data && data.ts !== null;
  const fill = hasReading ? data!.fill : 0;
  const full = !!data?.alert;

  // real bin snapshot fed into the fleet simulation (BIN-A1)
  const real = useMemo(
    () =>
      data
        ? {
            fill: data.ts != null ? data.fill : 0,
            online: !!data.device?.online,
            sensorOk: data.device?.sensor_ok !== false,
            distanceCm: data.distance ?? 40,
            lastUpdateS: data.age != null ? Math.round(data.age) : 9999,
          }
        : null,
    [data],
  );
  const bins = useFleet(real);

  // ---- actions ----
  const onReset = useCallback(async () => {
    try {
      await fetch(api("/api/reset"), { method: "POST" });
      wasFull.current = false;
      refresh();
    } catch {}
  }, [refresh]);

  const onTest = useCallback(() => {
    raiseAlert("Test alert: dustbin alerts are working.", { sound: soundRef.current, sticky: false });
    setTestBanner(true);
    setTimeout(() => setTestBanner(false), 4000);
  }, []);

  const onEnableNotif = useCallback(async () => setPerm(await requestNotifications()), []);

  const onToggleSound = useCallback(() => {
    setSound((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("dustbin.sound", next ? "1" : "0");
      } catch {}
      return next;
    });
  }, []);

  const liveBundle: LiveBundle = {
    data,
    points,
    stats,
    events,
    link,
    latencyMs,
    serverUp,
    live,
    perm,
    sound,
    onReset,
    onTest,
    onEnableNotif,
    onToggleSound,
  };

  const goto = useCallback((key: string) => {
    setActive(key);
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const screenProps: ScreenProps = {
    bins,
    live: liveBundle,
    now: now || Date.now(),
    theme,
    goto,
    selectedBinId,
    selectBin: setSelectedBinId,
  };

  const Active = SCREENS[active] ?? SCREENS.dashboard;

  const clock = now ? new Date(now).toLocaleTimeString([], { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "--:--:--";
  const syncPct = now && lastSync ? Math.min(100, ((now - lastSync) / POLL_MS) * 100) : 0;
  const syncAgo = now && lastSync ? (now - lastSync < 1500 ? "just now" : `${Math.round((now - lastSync) / 1000)}s ago`) : "—";
  const linkInfo = LINK_MAP[link];

  return (
    <div className="app-grid min-h-screen" style={{ ["--rail" as string]: collapsed ? "4.75rem" : "15.5rem" } as React.CSSProperties}>
      <ThreeBackground themeKey={theme} />
      <Sidebar active={active} onNavigate={goto} online={serverUp} open={menuOpen} onClose={() => setMenuOpen(false)} collapsed={collapsed} onToggleCollapse={onToggleCollapse} />

      <div className="flex min-h-screen flex-col">
        <TopBar
          title={navLabel(active)}
          clock={clock}
          live={live}
          latencyMs={latencyMs}
          syncPct={syncPct}
          linkText={linkInfo.text}
          linkDot={linkInfo.dot}
          onMenu={() => setMenuOpen(true)}
          theme={theme}
          onCycleTheme={onCycleTheme}
        />

        <main className="flex-1 px-4 py-6 sm:px-6 sm:py-7">
          {(full || testBanner) && (
            <div
              role="alert"
              className="mb-6 flex items-center gap-4 overflow-hidden rounded-2xl px-5 py-4 font-semibold text-white shadow-lg"
              style={{ background: "linear-gradient(120deg, var(--critical), #9f1239)" }}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 text-2xl" aria-hidden>
                ⚠
              </span>
              <div>
                <div className="font-display text-base tracking-tight">
                  {testBanner && !full ? "TEST ALERT — alerts are working" : "LIVE BIN FULL — COLLECT NOW"}
                </div>
                {full && <div className="text-sm font-normal opacity-90">Fill level {fill}% · last reading {data?.updated}</div>}
              </div>
            </div>
          )}

          <Active {...screenProps} />
        </main>

        <StatusBar
          apiBase={API_BASE}
          pollMs={POLL_MS}
          latencyMs={latencyMs}
          readings={stats?.total_readings ?? points.length}
          uptime={formatDuration(stats?.server_uptime_s ?? null)}
          live={live}
          syncAgo={syncAgo}
        />
      </div>
    </div>
  );
}
