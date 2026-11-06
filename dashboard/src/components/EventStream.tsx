"use client";

import { EventItem, formatTime, timeAgo } from "@/lib/types";

const KIND: Record<string, { color: string; icon: string; label: string }> = {
  FULL_ALERT: { color: "var(--critical)", icon: "⚠", label: "Bin full" },
  RESET: { color: "var(--brand)", icon: "↺", label: "Collected · reset" },
  SENSOR_FAULT: { color: "var(--warning)", icon: "✕", label: "Sensor fault" },
  SENSOR_RECOVERED: { color: "var(--good)", icon: "✓", label: "Sensor recovered" },
};

const fallback = { color: "var(--axis)", icon: "•", label: "Event" };

export default function EventStream({ events, now }: { events: EventItem[]; now: number }) {
  return (
    <section id="feed" className="topline rise-in glass flex flex-col rounded-3xl p-5" style={{ animationDelay: "0.2s" }}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">Live event stream</h2>
          <p className="mt-0.5 text-xs text-muted">Collections, alerts and sensor faults as they happen</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-wider"
          style={{ color: "var(--critical)", background: "color-mix(in srgb, var(--critical) 12%, transparent)" }}>
          <span className="h-1.5 w-1.5 rounded-full dot-live" style={{ background: "var(--critical)" }} />
          Live
        </span>
      </div>

      {events.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-12 text-center">
          <span className="text-2xl opacity-40">📡</span>
          <p className="text-sm text-muted">Listening for events…</p>
          <p className="max-w-xs text-xs text-muted">Fill, collection and sensor events will appear here the moment they occur.</p>
        </div>
      ) : (
        <ol className="-mr-2 max-h-[340px] space-y-2 overflow-y-auto overflow-x-hidden pr-2">
          {events.map((e, i) => {
            const k = KIND[e.kind] ?? fallback;
            return (
              <li
                key={e.ts}
                className={`flex items-start gap-3 rounded-2xl p-3 ${i === 0 ? "feed-in" : ""}`}
                style={{ background: "var(--surface)", border: `1px solid color-mix(in srgb, ${k.color} 20%, var(--border))` }}
              >
                <span
                  className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sm font-bold"
                  style={{ background: `color-mix(in srgb, ${k.color} 16%, transparent)`, color: k.color }}
                  aria-hidden
                >
                  {k.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-semibold" style={{ color: k.color }}>
                      {k.label}
                    </span>
                    <span className="shrink-0 font-mono text-[0.68rem] text-muted" title={formatTime(e.ts)}>
                      {timeAgo(e.ts, now)}
                    </span>
                  </div>
                  <div className="break-words text-xs text-ink-2">
                    {e.detail}
                    {e.fill != null && <span className="font-mono text-muted"> · {e.fill}%</span>}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
