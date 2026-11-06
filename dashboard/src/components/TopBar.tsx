"use client";

import Icon from "@/components/Icon";

type Theme = "auto" | "light" | "dark";

type Props = {
  title: string;
  clock: string;
  live: boolean;
  latencyMs: number | null;
  syncPct: number;
  linkText: string;
  linkDot: string;
  onMenu: () => void;
  theme: Theme;
  onCycleTheme: () => void;
};

export default function TopBar({ title, clock, live, latencyMs, syncPct, linkText, linkDot, onMenu, theme, onCycleTheme }: Props) {
  const themeIcon = theme === "light" ? "sun" : theme === "dark" ? "moon" : "auto";
  return (
    <header className="chrome sticky top-0 z-20 border-b">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 sm:px-6">
        <button onClick={onMenu} className="btn btn-ghost !p-2 lg:hidden" aria-label="Open menu">
          <Icon name="monitoring" className="h-4 w-4" />
        </button>

        <div className="flex items-baseline gap-2.5">
          <span className="hidden text-[0.66rem] font-semibold uppercase tracking-wider text-muted sm:inline">Live monitor /</span>
          <span className="font-display text-sm font-bold tracking-tight sm:text-[0.95rem]">{title}</span>
        </div>

        <div className="ml-auto flex items-center gap-2.5 sm:gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-line px-2.5 py-1.5 text-xs font-medium" style={{ background: "var(--surface)" }}>
            <span className={`h-2 w-2 rounded-full ${live ? "dot-live" : ""}`} style={{ background: linkDot }} />
            <span className="hidden sm:inline">{linkText}</span>
            {latencyMs != null && <span className="font-mono text-[0.68rem] text-muted">{latencyMs}ms</span>}
          </span>

          <button onClick={onCycleTheme} className="hover-lift inline-flex items-center justify-center rounded-full border border-line p-2 text-ink-2 transition-colors hover:text-[color:var(--brand)]" style={{ background: "var(--surface)" }} aria-label={`Theme: ${theme}`} title={`Theme: ${theme} (click to change)`}>
            <Icon name={themeIcon} className="h-4 w-4" />
          </button>

          <span className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5" style={{ background: "var(--surface)" }}>
            <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--brand-2)]" />
            <time className="font-mono text-sm font-semibold tabular-nums tracking-tight" suppressHydrationWarning>
              {clock}
            </time>
          </span>
        </div>
      </div>

      <div className="sync-track h-[2px] w-full">
        <div className="sync-fill h-full" style={{ width: `${Math.round(syncPct)}%` }} />
      </div>
    </header>
  );
}
