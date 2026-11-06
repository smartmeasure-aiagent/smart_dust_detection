"use client";

type Props = {
  apiBase: string;
  pollMs: number;
  latencyMs: number | null;
  readings: number;
  uptime: string;
  live: boolean;
  syncAgo: string;
};

function Cell({ label, children, color }: { label: string; children: React.ReactNode; color?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span className="text-[0.62rem] uppercase tracking-wider text-muted">{label}</span>
      <span className="font-mono text-[0.72rem] font-semibold" style={color ? { color } : undefined}>
        {children}
      </span>
    </span>
  );
}

export default function StatusBar({ apiBase, pollMs, latencyMs, readings, uptime, live, syncAgo }: Props) {
  const host = apiBase.replace(/^https?:\/\//, "") || "same-origin";
  return (
    <footer className="chrome sticky bottom-0 z-20 mt-6 border-t">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 sm:px-6">
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
          <span className={`h-2 w-2 rounded-full ${live ? "dot-live" : ""}`} style={{ background: live ? "var(--good)" : "var(--critical)" }} />
          <span className="text-[0.72rem] font-bold uppercase tracking-wider" style={{ color: live ? "var(--good)" : "var(--critical)" }}>
            {live ? "Streaming" : "Disconnected"}
          </span>
        </span>
        <span className="h-3.5 w-px bg-line" />
        <Cell label="API">{host}</Cell>
        <span className="hidden h-3.5 w-px bg-line sm:block" />
        <Cell label="poll" >{pollMs / 1000}s</Cell>
        <span className="hidden h-3.5 w-px bg-line sm:block" />
        <Cell label="latency" color={latencyMs != null && latencyMs > 500 ? "var(--warning)" : undefined}>
          {latencyMs != null ? `${latencyMs}ms` : "—"}
        </Cell>
        <span className="hidden h-3.5 w-px bg-line md:block" />
        <span className="hidden md:inline"><Cell label="synced">{syncAgo}</Cell></span>
        <span className="hidden h-3.5 w-px bg-line md:block" />
        <span className="hidden md:inline"><Cell label="readings">{readings.toLocaleString()}</Cell></span>
        <span className="hidden h-3.5 w-px bg-line lg:block" />
        <span className="hidden lg:inline"><Cell label="uptime">{uptime}</Cell></span>
        <span className="ml-auto hidden whitespace-nowrap font-mono text-[0.66rem] text-muted sm:inline">smart-dustbin · v1.2</span>
      </div>
    </footer>
  );
}
