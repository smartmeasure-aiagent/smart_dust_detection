"use client";

// Static circular arc gauge (animations removed per preference).
export default function CircularGauge({
  value,
  color,
  statusLabel,
  live,
  hasReading,
  size = 190,
}: {
  value: number;
  color: string;
  statusLabel: string;
  live: boolean;
  hasReading: boolean;
  size?: number;
}) {
  const stroke = 13;
  const r = (size - stroke - 8) / 2;
  const cx = size / 2;
  const C = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value));
  const off = hasReading ? C * (1 - v / 100) : C;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="var(--track)" strokeWidth={stroke} />
        <circle
          cx={cx}
          cy={cx}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={off}
          transform={`rotate(-90 ${cx} ${cx})`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="font-display text-5xl font-extrabold tabular-nums leading-none" style={{ color }}>
          {hasReading ? Math.round(v) : "--"}
          <span className="text-2xl text-ink-2">%</span>
        </div>
        <div className="mt-1 text-xs font-semibold" style={{ color }}>
          {statusLabel}
        </div>
        {live && hasReading && (
          <div className="mt-1.5 inline-flex items-center gap-1.5 text-[0.6rem] font-bold uppercase tracking-wider text-muted">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--good)" }} />
            Live
          </div>
        )}
      </div>
    </div>
  );
}
