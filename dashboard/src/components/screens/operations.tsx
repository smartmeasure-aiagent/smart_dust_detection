"use client";

import { useMemo, useState } from "react";
import Icon from "@/components/Icon";
import { Avatar, Badge, Bar, Cell, PageHeader, Panel, Row, Stat, Table } from "@/components/ui";
import { Bin, ScreenProps, TEAMS, binLevel } from "@/lib/fleet";
import { CREW } from "@/lib/mock";
import { levelColor } from "@/lib/types";

type Alert = { id: string; sev: "critical" | "warning" | "info"; icon: string; title: string; bin: string; detail: string; ago: string };

const SEV_COLOR: Record<string, string> = { critical: "var(--critical)", warning: "var(--warning)", info: "var(--brand-2)" };

function buildAlerts(bins: Bin[]): Alert[] {
  const out: Alert[] = [];
  bins.forEach((b) => {
    if (b.online && b.fill >= 80) out.push({ id: `${b.id}-full`, sev: "critical", icon: "warning", title: "Bin full — collection required", bin: b.name, detail: `${b.fill}% full · ${b.team}`, ago: `${b.lastUpdateS}s ago` });
    if (b.online && !b.sensorOk) out.push({ id: `${b.id}-sensor`, sev: "warning", icon: "diagnostics", title: "Ultrasonic sensor not responding", bin: b.name, detail: "Failed last reads — maintenance needed", ago: `${b.lastUpdateS}s ago` });
    if (b.online && b.battery < 20) out.push({ id: `${b.id}-batt`, sev: "warning", icon: "battery", title: "Low battery", bin: b.name, detail: `${b.battery}% remaining`, ago: "5m ago" });
    if (!b.online) out.push({ id: `${b.id}-off`, sev: "critical", icon: "wifi", title: "Device offline", bin: b.name, detail: "No heartbeat received", ago: " pending" });
  });
  return out.sort((a, b) => (a.sev === "critical" ? -1 : 1) - (b.sev === "critical" ? -1 : 1));
}

// ================= Alerts & Notifications =================
export function AlertsScreen({ bins, live }: ScreenProps) {
  const alerts = useMemo(() => buildAlerts(bins), [bins]);
  const [ack, setAck] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<string>("All");

  const active = alerts.filter((a) => !ack.has(a.id));
  const shown = active.filter((a) => filter === "All" || a.sev === filter.toLowerCase());
  const critical = active.filter((a) => a.sev === "critical").length;

  return (
    <>
      <PageHeader title="Alerts & Notifications" desc="Every condition that needs attention across the fleet, newest first">
        <button onClick={() => setAck(new Set(alerts.map((a) => a.id)))} className="btn btn-ghost !py-1.5 !text-xs">Acknowledge all</button>
      </PageHeader>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Active alerts" value={active.length} icon="alerts" color={active.length ? "var(--warning)" : "var(--good)"} />
        <Stat label="Critical" value={critical} icon="warning" color="var(--critical)" />
        <Stat label="Acknowledged" value={ack.size} icon="check" color="var(--good)" />
        <Stat label="Notifications" value={live.perm === "granted" ? "On" : "Off"} icon="notif" color={live.perm === "granted" ? "var(--good)" : "var(--muted)"} sub="desktop push" />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {["All", "Critical", "Warning", "Info"].map((f) => (
          <button key={f} onClick={() => setFilter(f)} className="btn !px-3 !py-1.5 !text-xs" style={filter === f ? { background: "var(--brand)", color: "#04120c" } : { background: "var(--surface)", border: "1px solid var(--border)", color: "var(--ink)" }}>{f}</button>
        ))}
      </div>

      <div className="space-y-2.5">
        {shown.map((a) => {
          const c = SEV_COLOR[a.sev];
          return (
            <div key={a.id} className="card-hover glass flex items-center gap-3 rounded-2xl p-3.5" style={{ border: `1px solid color-mix(in srgb, ${c} 22%, var(--border))` }}>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: `color-mix(in srgb, ${c} 16%, transparent)`, color: c }}>
                <Icon name={a.icon} className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold">{a.title}</span>
                  <Badge color={c}>{a.sev}</Badge>
                </div>
                <div className="truncate text-xs text-ink-2">{a.bin} · {a.detail}</div>
              </div>
              <span className="hidden shrink-0 font-mono text-[0.7rem] text-muted sm:block">{a.ago}</span>
              <button onClick={() => setAck((s) => new Set(s).add(a.id))} className="btn btn-ghost !px-3 !py-1.5 !text-xs">Ack</button>
            </div>
          );
        })}
        {shown.length === 0 && (
          <div className="glass flex flex-col items-center gap-2 rounded-2xl py-14 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full text-[color:var(--good)]" style={{ background: "color-mix(in srgb, var(--good) 14%, transparent)" }}><Icon name="check" className="h-6 w-6" /></span>
            <p className="text-sm font-semibold">All clear</p>
            <p className="text-xs text-muted">No active alerts match this filter.</p>
          </div>
        )}
      </div>
    </>
  );
}

// ================= Collection Management =================
export function CollectionScreen({ bins, live, selectBin, goto }: ScreenProps) {
  const queue = bins.filter((b) => b.online && b.fill >= 80).sort((a, b) => b.fill - a.fill);
  const [dispatched, setDispatched] = useState<Set<string>>(new Set());
  const completedToday = live.stats?.collections_today ?? 41;

  const routes = TEAMS.map((t) => {
    const teamBins = bins.filter((b) => b.team === t);
    const due = teamBins.filter((b) => b.online && b.fill >= 80);
    return { team: t, zone: teamBins[0]?.zone ?? "—", total: teamBins.length, due: due.length };
  });

  return (
    <>
      <PageHeader title="Collection Management" desc="Dispatch crews, track routes and clear full bins" />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Pending pickup" value={queue.length} icon="truck" color="var(--critical)" sub="80%+ full" />
        <Stat label="Dispatched" value={dispatched.size} icon="collection" color="var(--warning)" sub="en route" />
        <Stat label="Completed today" value={completedToday} icon="check" color="var(--good)" />
        <Stat label="Avg response" value="17m" icon="clock" color="var(--brand-2)" sub="full → collected" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <Panel title="Dispatch queue" subtitle="Bins awaiting collection, fullest first" icon="truck">
          {queue.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted">Nothing in the queue — all bins are below 80%.</p>
          ) : (
            <Table head={["Bin", "Zone", "Team", "Fill", "", ""]}>
              {queue.map((b) => {
                const done = dispatched.has(b.id);
                return (
                  <Row key={b.id}>
                    <Cell><button onClick={() => { selectBin(b.id); goto("bin-details"); }} className="font-semibold hover:underline">{b.name}</button><div className="text-[0.7rem] text-muted">{b.id}</div></Cell>
                    <Cell><span className="text-xs">{b.zone}</span></Cell>
                    <Cell><span className="text-xs">{b.team}</span></Cell>
                    <Cell><span className="font-mono font-bold" style={{ color: levelColor[binLevel(b)] }}>{b.fill}%</span></Cell>
                    <Cell><div className="w-20"><Bar pct={b.fill} color={levelColor[binLevel(b)]} /></div></Cell>
                    <Cell>
                      {done ? <Badge color="var(--warning)">En route</Badge> : <button onClick={() => setDispatched((s) => new Set(s).add(b.id))} className="btn btn-primary !px-3 !py-1.5 !text-xs">Dispatch</button>}
                    </Cell>
                  </Row>
                );
              })}
            </Table>
          )}
        </Panel>

        <Panel title="Routes by team" subtitle="Load across the five crews" icon="map">
          <div className="space-y-3">
            {routes.map((r) => (
              <div key={r.team} className="rounded-2xl p-3" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">{r.team}</span>
                  <Badge color={r.due ? "var(--warning)" : "var(--good)"}>{r.due} due</Badge>
                </div>
                <div className="mt-1 text-xs text-muted">{r.zone} zone · {r.total} bins assigned</div>
                <Bar pct={(r.due / Math.max(1, r.total)) * 100} color={r.due ? "var(--warning)" : "var(--good)"} className="mt-2" />
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}

// ================= Cleaning Team =================
export function TeamScreen({ bins }: ScreenProps) {
  const statusColor: Record<string, string> = { "On route": "var(--brand-2)", "On break": "var(--warning)", Available: "var(--good)", "Off shift": "var(--muted)" };
  const teamSummary = TEAMS.map((t) => {
    const members = CREW.filter((c) => c.team === t);
    const teamBins = bins.filter((b) => b.team === t);
    return { team: t, zone: teamBins[0]?.zone ?? "—", members: members.length, bins: teamBins.length, collections: members.reduce((s, m) => s + m.collectionsToday, 0) };
  });

  return (
    <>
      <PageHeader title="Cleaning Team" desc={`${CREW.length} field staff across ${TEAMS.length} crews`}>
        <button className="btn btn-primary !py-1.5 !text-xs"><Icon name="plus" className="mr-1 inline h-3.5 w-3.5" />Add member</button>
      </PageHeader>

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        {teamSummary.map((t) => (
          <Panel key={t.team} pad={false} className="!rounded-2xl">
            <div className="p-4">
              <div className="text-sm font-bold">{t.team}</div>
              <div className="text-xs text-muted">{t.zone} zone</div>
              <div className="mt-3 flex items-end justify-between">
                <div><div className="font-display text-2xl font-bold tabular-nums text-[color:var(--brand)]">{t.collections}</div><div className="text-[0.65rem] text-muted">collected today</div></div>
                <div className="text-right text-[0.7rem] text-muted">{t.members} staff<br />{t.bins} bins</div>
              </div>
            </div>
          </Panel>
        ))}
      </div>

      <Panel title="Crew roster" subtitle="Live status of every field member" icon="team">
        <Table head={["Member", "Team", "Zone", "Shift", "Collected", "Status", ""]}>
          {CREW.map((m) => (
            <Row key={m.name}>
              <Cell>
                <div className="flex items-center gap-2.5"><Avatar name={m.name} /><div><div className="font-semibold">{m.name}</div><div className="text-[0.7rem] text-muted">{m.role}</div></div></div>
              </Cell>
              <Cell><span className="text-xs">{m.team}</span></Cell>
              <Cell><span className="text-xs">{m.zone}</span></Cell>
              <Cell><span className="font-mono text-xs">{m.shift}</span></Cell>
              <Cell><span className="font-mono font-semibold tabular-nums">{m.collectionsToday}</span></Cell>
              <Cell><Badge color={statusColor[m.status]}>{m.status}</Badge></Cell>
              <Cell><a href={`tel:${m.phone.replace(/\s/g, "")}`} className="btn btn-ghost !px-2.5 !py-1.5 !text-xs"><Icon name="phone" className="h-3.5 w-3.5" /></a></Cell>
            </Row>
          ))}
        </Table>
      </Panel>
    </>
  );
}
