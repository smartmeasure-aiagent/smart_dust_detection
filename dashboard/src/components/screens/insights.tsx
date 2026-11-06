"use client";

import { useMemo } from "react";
import Icon from "@/components/Icon";
import { Badge, BarChart, Cell, Donut, PageHeader, Panel, Row, Stat, Table } from "@/components/ui";
import { ScreenProps, ZONES } from "@/lib/fleet";

const WEEK = [
  { label: "Mon", value: 52 },
  { label: "Tue", value: 61 },
  { label: "Wed", value: 48 },
  { label: "Thu", value: 67 },
  { label: "Fri", value: 73 },
  { label: "Sat", value: 81 },
  { label: "Sun", value: 41 },
];

const HOURS = [2, 1, 1, 0, 1, 3, 8, 14, 19, 12, 9, 11, 16, 13, 10, 8, 12, 18, 21, 15, 9, 6, 4, 3].map((v, i) => ({ label: `${i}`, value: v }));

const REPORTS = [
  { name: "Weekly collection summary", period: "Wk 44 · Oct 27 – Nov 2", size: "214 KB", type: "PDF" },
  { name: "Monthly fill & diversion report", period: "October 2026", size: "1.1 MB", type: "PDF" },
  { name: "Device uptime & SLA", period: "October 2026", size: "88 KB", type: "CSV" },
  { name: "Voice assistant call log", period: "Last 30 days", size: "342 KB", type: "CSV" },
];

export function AnalyticsScreen({ bins }: ScreenProps) {
  const dist = useMemo(() => {
    const g = bins.filter((b) => b.online && b.fill < 50).length;
    const w = bins.filter((b) => b.online && b.fill >= 50 && b.fill < 80).length;
    const c = bins.filter((b) => b.online && b.fill >= 80).length;
    const o = bins.filter((b) => !b.online).length;
    return [
      { value: g, color: "var(--good)", label: "Available" },
      { value: w, color: "var(--warning)", label: "Almost full" },
      { value: c, color: "var(--critical)", label: "Full" },
      { value: o, color: "var(--axis)", label: "Offline" },
    ];
  }, [bins]);

  const zonePerf = ZONES.map((z, i) => ({ label: z.slice(0, 3), value: [73, 81, 64, 69, 58][i] }));

  return (
    <>
      <PageHeader title="Analytics & Reports" desc="Collection performance, utilisation and environmental impact">
        <button className="btn btn-primary !py-1.5 !text-xs"><Icon name="download" className="mr-1 inline h-3.5 w-3.5" />Export</button>
      </PageHeader>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Stat label="Collections (7d)" value="423" icon="truck" color="var(--brand)" sub="+8% WoW" />
        <Stat label="Avg fill at pickup" value="86%" icon="bin" color="var(--brand-2)" sub="target ≥ 80%" />
        <Stat label="Diversion rate" value="38%" icon="leaf" color="var(--good)" sub="recycling + organic" />
        <Stat label="Distance saved" value="312 km" icon="map" color="var(--accent)" sub="vs fixed routes" />
        <Stat label="CO₂ avoided" value="1.8 t" icon="leaf" color="var(--good)" sub="this month" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <Panel title="Collections this week" subtitle="Across all zones" icon="analytics">
          <BarChart data={WEEK} color="var(--brand)" height={180} />
        </Panel>
        <Panel title="Fleet fill distribution" subtitle="Current snapshot" icon="bin">
          <div className="flex items-center gap-5">
            <Donut segments={dist} value={`${bins.length}`} label="bins" />
            <div className="space-y-2">
              {dist.map((d) => (
                <div key={d.label} className="flex items-center gap-2 text-sm">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
                  <span className="text-ink-2">{d.label}</span>
                  <span className="ml-auto font-mono font-semibold">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <Panel title="Collections by hour" subtitle="Typical daily pattern" icon="clock">
          <BarChart data={HOURS} color="var(--brand-2)" height={140} />
        </Panel>
        <Panel title="Zone performance" subtitle="Avg fill at collection (%)" icon="map">
          <BarChart data={zonePerf} color="var(--accent)" height={140} />
        </Panel>
      </div>

      <Panel title="Generated reports" subtitle="Scheduled exports, ready to download" icon="download" className="mt-5">
        <Table head={["Report", "Period", "Type", "Size", ""]}>
          {REPORTS.map((r) => (
            <Row key={r.name}>
              <Cell><span className="font-semibold">{r.name}</span></Cell>
              <Cell><span className="text-xs text-muted">{r.period}</span></Cell>
              <Cell><Badge color={r.type === "PDF" ? "var(--critical)" : "var(--brand-2)"}>{r.type}</Badge></Cell>
              <Cell><span className="font-mono text-xs">{r.size}</span></Cell>
              <Cell><button className="btn btn-ghost !px-3 !py-1.5 !text-xs"><Icon name="download" className="h-3.5 w-3.5" /></button></Cell>
            </Row>
          ))}
        </Table>
      </Panel>
    </>
  );
}
