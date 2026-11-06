"use client";

export type TickerItem = { text: string; color: string };

export default function Ticker({ items }: { items: TickerItem[] }) {
  if (!items.length) return null;
  const Row = ({ k }: { k: string }) => (
    <div className="marquee-row" aria-hidden={k === "b"}>
      {items.map((it, i) => (
        <span key={`${k}-${i}`} className="inline-flex items-center gap-2 text-xs font-medium text-ink-2">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: it.color }} />
          {it.text}
        </span>
      ))}
    </div>
  );
  return (
    <div className="chrome marquee border-b">
      <div className="marquee-track">
        <Row k="a" />
        <Row k="b" />
      </div>
    </div>
  );
}
