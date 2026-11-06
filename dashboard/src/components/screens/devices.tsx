"use client";

import { useMemo, useState } from "react";
import DevicePanel from "@/components/DevicePanel";
import Icon from "@/components/Icon";
import { Badge, Bar, Cell, Donut, PageHeader, Panel, Row, Stat, Table } from "@/components/ui";
import { ScreenProps } from "@/lib/fleet";

function batteryColor(p: number) {
  return p < 20 ? "var(--critical)" : p < 40 ? "var(--warning)" : "var(--good)";
}
function signalColor(r: number) {
  return r < -78 ? "var(--critical)" : r < -70 ? "var(--warning)" : "var(--good)";
}

// ================= Device Health =================
export function DeviceHealthScreen({ bins }: ScreenProps) {
  const stats = useMemo(() => {
    const online = bins.filter((b) => b.online);
    const avgBatt = Math.round(bins.reduce((s, b) => s + b.battery, 0) / bins.length);
    const weak = online.filter((b) => b.rssi < -75).length;
    const low = bins.filter((b) => b.battery < 20).length;
    return { onlinePct: Math.round((online.length / bins.length) * 100), avgBatt, weak, low };
  }, [bins]);

  const fw = [
    { value: bins.filter((b) => b.isReal).length, color: "var(--brand)", label: "1.2.1" },
    { value: bins.filter((b) => !b.isReal).length, color: "var(--brand-2)", label: "1.4.0" },
  ];

  return (
    <>
      <PageHeader title="Device Health" desc="Power, connectivity and firmware across every ESP32 unit" />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Fleet online" value={`${stats.onlinePct}%`} icon="wifi" color={stats.onlinePct > 85 ? "var(--good)" : "var(--warning)"} sub={`${bins.length} devices`} />
        <Stat label="Avg battery" value={`${stats.avgBatt}%`} icon="battery" color={batteryColor(stats.avgBatt)} />
        <Stat label="Weak signal" value={stats.weak} icon="signal" color={stats.weak ? "var(--warning)" : "var(--good)"} sub="< −75 dBm" />
        <Stat label="Low battery" value={stats.low} icon="battery" color={stats.low ? "var(--critical)" : "var(--good)"} sub="< 20%" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,8fr)_minmax(0,4fr)]">
        <Panel title="Device roster" subtitle="Live power & link status" icon="device">
          <Table head={["Device", "Battery", "Signal", "Firmware", "Uptime", "Status"]}>
            {bins.map((b) => (
              <Row key={b.id}>
                <Cell>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{b.name}</span>
                    {b.isReal && <Badge color="var(--brand)">LIVE</Badge>}
                  </div>
                  <div className="text-[0.7rem] text-muted">{b.id}</div>
                </Cell>
                <Cell>
                  <div className="flex items-center gap-2"><div className="w-14"><Bar pct={b.battery} color={batteryColor(b.battery)} /></div><span className="font-mono text-xs">{b.battery}%</span></div>
                </Cell>
                <Cell><span className="font-mono text-xs" style={{ color: b.online ? signalColor(b.rssi) : "var(--muted)" }}>{b.online ? `${b.rssi} dBm` : "—"}</span></Cell>
                <Cell><span className="font-mono text-xs">{b.isReal ? "1.2.1" : "1.4.0"}</span></Cell>
                <Cell><span className="font-mono text-xs text-muted">{b.online ? `${Math.round((100 - b.lastUpdateS) / 4 + 6)}h` : "—"}</span></Cell>
                <Cell><Badge color={b.online ? (b.sensorOk ? "var(--good)" : "var(--warning)") : "var(--critical)"}>{b.online ? (b.sensorOk ? "Healthy" : "Sensor") : "Offline"}</Badge></Cell>
              </Row>
            ))}
          </Table>
        </Panel>

        <div className="grid gap-5">
          <Panel title="Firmware versions" icon="device">
            <div className="flex items-center gap-5">
              <Donut segments={fw} value={`${bins.length}`} label="units" size={112} />
              <div className="space-y-2">
                {fw.map((f) => (
                  <div key={f.label} className="flex items-center gap-2 text-sm"><span className="h-2.5 w-2.5 rounded-full" style={{ background: f.color }} /><span className="text-ink-2">v{f.label}</span><span className="ml-auto font-mono font-semibold">{f.value}</span></div>
                ))}
              </div>
            </div>
            <button className="btn btn-ghost mt-4 w-full !text-xs">Push firmware update</button>
          </Panel>
          <Panel title="Maintenance queue" icon="warning">
            <div className="space-y-2">
              {bins.filter((b) => !b.online || b.battery < 20 || !b.sensorOk).map((b) => (
                <div key={b.id} className="flex items-center gap-2 rounded-xl p-2.5 text-sm" style={{ border: "1px solid var(--border)" }}>
                  <Icon name="warning" className="h-4 w-4 text-[color:var(--warning)]" />
                  <span className="truncate">{b.name}</span>
                  <span className="ml-auto text-[0.7rem] text-muted">{!b.online ? "offline" : !b.sensorOk ? "sensor" : "battery"}</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}

// ================= Sensor Diagnostics =================
export function DiagnosticsScreen({ bins, live }: ScreenProps) {
  const [testing, setTesting] = useState(false);
  const liveBin = bins.find((b) => b.isReal);

  return (
    <>
      <PageHeader title="Sensor Diagnostics" desc="Ultrasonic sensor health and the live data pipeline">
        <button onClick={() => { setTesting(true); setTimeout(() => setTesting(false), 2200); }} className="btn btn-primary !py-1.5 !text-xs">
          <Icon name={testing ? "refresh" : "play"} className={`mr-1 inline h-3.5 w-3.5 ${testing ? "animate-spin" : ""}`} />{testing ? "Running self-test…" : "Run self-test"}
        </button>
      </PageHeader>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Sensors OK" value={bins.filter((b) => b.online && b.sensorOk).length} icon="check" color="var(--good)" />
        <Stat label="Faults" value={bins.filter((b) => b.online && !b.sensorOk).length} icon="warning" color="var(--warning)" />
        <Stat label="Live bin fill" value={live.data?.ts != null ? `${live.data.fill}%` : "--"} icon="bin" color="var(--brand)" sub={liveBin?.name} />
        <Stat label="Backend latency" value={live.latencyMs != null ? `${live.latencyMs}ms` : "—"} icon="diagnostics" color="var(--brand-2)" />
      </div>

      <div className="mb-5">
        <DevicePanel data={live.data} serverUp={live.serverUp} />
      </div>

      <Panel title="Sensor readout — all bins" subtitle="Echo quality, failed reads and measured distance" icon="diagnostics">
        <Table head={["Bin", "Sensor", "Failed reads", "Echo idle", "Distance", "Reading"]}>
          {bins.map((b) => (
            <Row key={b.id}>
              <Cell><span className="font-semibold">{b.name}</span><div className="text-[0.7rem] text-muted">{b.id}</div></Cell>
              <Cell><Badge color={b.online ? (b.sensorOk ? "var(--good)" : "var(--critical)") : "var(--axis)"}>{b.online ? (b.sensorOk ? "Responding" : "No echo") : "Offline"}</Badge></Cell>
              <Cell><span className="font-mono text-xs">{b.sensorOk ? 0 : Math.floor(Math.random() * 4) + 2}</span></Cell>
              <Cell><span className="font-mono text-xs">{b.online ? (b.sensorOk ? "0" : "1") : "—"}</span></Cell>
              <Cell><span className="font-mono text-xs">{b.online ? `${b.distanceCm} cm` : "—"}</span></Cell>
              <Cell><span className="font-mono font-semibold tabular-nums">{b.online ? `${b.fill}%` : "—"}</span></Cell>
            </Row>
          ))}
        </Table>
      </Panel>
    </>
  );
}
