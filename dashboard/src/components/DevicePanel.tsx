import { BinStatus, STALE_AFTER_S } from "@/lib/types";

type State = "ok" | "warn" | "fail" | "unknown";

const STATE_STYLE: Record<State, { color: string; icon: string; label: string }> = {
  ok: { color: "var(--good)", icon: "✓", label: "OK" },
  warn: { color: "var(--warning)", icon: "!", label: "Check" },
  fail: { color: "var(--critical)", icon: "✕", label: "Fault" },
  unknown: { color: "var(--axis)", icon: "?", label: "Unknown" },
};

function signal(rssi: number | null) {
  if (rssi === null) return "";
  const q = rssi >= -60 ? "strong" : rssi >= -70 ? "good" : rssi >= -80 ? "weak" : "very weak";
  return `${rssi} dBm (${q})`;
}

function ago(s: number | null) {
  if (s === null) return "never";
  if (s < 60) return `${Math.round(s)} s ago`;
  return `${Math.round(s / 60)} min ago`;
}

// Walks the data path sensor -> ESP32 -> Wi-Fi -> API -> dashboard and shows where it breaks.
export default function DevicePanel({ data, serverUp }: { data: BinStatus | null; serverUp: boolean }) {
  const d = data?.device;
  const steps: { name: string; state: State; detail: string; hint?: string }[] = [];

  steps.push(
    serverUp
      ? { name: "FastAPI server", state: "ok", detail: "Reachable · /api/update and /api/heartbeat accepting data" }
      : { name: "FastAPI server", state: "fail", detail: "Not reachable", hint: "Start it: python app.py in smart-dustbin" },
  );

  if (!serverUp || !d) {
    steps.push({ name: "ESP32 + Wi-Fi", state: "unknown", detail: "Waiting for server" });
    steps.push({ name: "Ultrasonic sensor", state: "unknown", detail: "Waiting for server" });
  } else {
    if (d.last_seen_age === null) {
      steps.push({
        name: "ESP32 + Wi-Fi",
        state: "warn",
        detail: "No heartbeat received yet",
        hint: "Check the ESP32 is powered, flashed with fw 1.1.0+, and serverBase points to this PC",
      });
    } else if (!d.online) {
      steps.push({
        name: "ESP32 + Wi-Fi",
        state: "fail",
        detail: `Offline · last seen ${ago(d.last_seen_age)}`,
        hint: "Check power, Wi-Fi hotspot and that the PC IP has not changed",
      });
    } else {
      const uptime = d.uptime_s === null ? "" : ` · up ${Math.floor(d.uptime_s / 60)} min`;
      steps.push({
        name: "ESP32 + Wi-Fi",
        state: d.rssi !== null && d.rssi < -80 ? "warn" : "ok",
        detail: `${d.device_id ?? "device"} online · ${d.ip ?? "?"} · ${signal(d.rssi)}${uptime}${d.fw ? ` · fw ${d.fw}` : ""}`,
      });
    }

    if (d.sensor_ok === null || !d.online) {
      steps.push({ name: "Ultrasonic sensor", state: "unknown", detail: "No report from the ESP32" });
    } else if (d.sensor_ok) {
      steps.push({ name: "Ultrasonic sensor", state: "ok", detail: "Echo received · measuring distance" });
    } else {
      steps.push({
        name: "Ultrasonic sensor",
        state: "fail",
        detail: `Not responding · ${d.sensor_failures} failed reads in a row`,
        hint:
          d.echo_idle === 1
            ? "ECHO pin is stuck HIGH: check the 1k/2k divider and the AJ-SR04M mode setting"
            : "No echo pulse: check 5V/GND, TRIG→GPIO5, ECHO→divider→GPIO18, probe cable and mode setting",
      });
    }
  }

  const fresh = !!data && data.age !== null && data.age <= STALE_AFTER_S;
  steps.push(
    fresh
      ? { name: "Readings to dashboard", state: "ok", detail: `Receiving · latest ${ago(data!.age)}` }
      : {
          name: "Readings to dashboard",
          state: data?.ts ? "warn" : "fail",
          detail: data?.ts ? `Stale · latest ${ago(data.age)}` : "No sensor data has reached the app yet",
        },
  );

  return (
    <section className="topline rise-in glass h-full rounded-3xl p-5" style={{ animationDelay: "0.3s" }}>
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">Data pipeline</h2>
      <p className="mt-0.5 text-xs text-muted">Sensor → ESP32 → Wi-Fi → API → dashboard · heartbeat every 10 s</p>
      <ol className="mt-4 grid gap-3 md:grid-cols-2">
        {steps.map((s, i) => {
          const st = STATE_STYLE[s.state];
          return (
            <li
              key={s.name}
              className="card-hover flex gap-3 rounded-2xl p-3.5"
              style={{ background: "var(--surface)", border: `1px solid color-mix(in srgb, ${st.color} 22%, var(--border))` }}
            >
              <span className="flex flex-col items-center gap-1 pt-0.5">
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                  style={{ background: st.color, color: s.state === "warn" ? "#0b0b0b" : "#fff", boxShadow: `0 0 14px color-mix(in srgb, ${st.color} 55%, transparent)` }}
                  aria-hidden
                >
                  {st.icon}
                </span>
                {i < steps.length - 1 && <span className="hidden h-full w-px bg-line md:block" />}
              </span>
              <div className="min-w-0">
                <div className="text-sm font-semibold">
                  {s.name} <span className="font-normal" style={{ color: st.color }}>· {st.label}</span>
                </div>
                <div className="break-words text-sm text-ink-2">{s.detail}</div>
                {s.hint && <div className="mt-1 text-xs text-muted">{s.hint}</div>}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
