import { ALMOST_THRESHOLD, FULL_THRESHOLD, Level, levelColor } from "@/lib/types";

// Side view of the bin; waste rises with the fill %, with an animated wave surface
// and rising "dust" bubbles for a living, collection-in-progress feel.
const TOP = 46,
  BOTTOM = 226,
  BODY_H = BOTTOM - TOP;
const BODY = "M40 46 L160 46 L148 226 Q147 232 140 232 L60 232 Q53 232 52 226 Z";

// One tiled sine wave, 60px period, spanning wider than the bin so it can scroll seamlessly.
function wavePath(amp: number, bottom: number) {
  const period = 60;
  let d = "M-80 0";
  for (let x = -80; x <= 320; x += 6) {
    const y = amp * Math.sin((x / period) * Math.PI * 2);
    d += ` L${x} ${y.toFixed(2)}`;
  }
  d += ` L320 ${bottom} L-80 ${bottom} Z`;
  return d;
}

const BUBBLES = [
  { x: 72, r: 2.6, dur: 3.4, delay: 0 },
  { x: 100, r: 3.4, dur: 4.2, delay: 1.1 },
  { x: 128, r: 2.2, dur: 3.0, delay: 2.2 },
  { x: 88, r: 2, dur: 3.8, delay: 2.8 },
  { x: 114, r: 2.8, dur: 4.6, delay: 0.6 },
];

export default function BinGauge({ fill, level }: { fill: number; level: Level }) {
  const wasteTop = BOTTOM - (BODY_H * fill) / 100;
  const markY = (pct: number) => BOTTOM - (BODY_H * pct) / 100;
  const color = levelColor[level];
  const hasWaste = fill > 0;

  return (
    <svg viewBox="0 0 230 250" className="h-full w-full" role="img" aria-label={`Bin ${fill}% full`}>
      <defs>
        <clipPath id="bin-body">
          <path d={BODY} />
        </clipPath>
        <linearGradient id="waste-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.95" />
          <stop offset="100%" stopColor={color} stopOpacity="0.55" />
        </linearGradient>
        <linearGradient id="bin-shine" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.14" />
          <stop offset="18%" stopColor="#fff" stopOpacity="0" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <filter id="waste-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* lid + ultrasonic sensor */}
      <rect x="28" y="28" width="144" height="11" rx="5" fill="var(--axis)" />
      <rect x="86" y="18" width="28" height="11" rx="4" fill="var(--muted)" />
      <circle cx="100" cy="24" r="2" fill={color} opacity={hasWaste ? 0.9 : 0.3} />

      {/* empty track */}
      <path d={BODY} fill="var(--track)" />

      {/* waste with animated wave surface + rising bubbles */}
      <g clipPath="url(#bin-body)">
        {hasWaste && (
          <g style={{ transform: `translateY(${wasteTop}px)`, transition: "transform 650ms cubic-bezier(.2,.8,.2,1)" }}>
            <g className="wave-move">
              <path d={wavePath(4, BOTTOM + 20)} fill="url(#waste-grad)" filter="url(#waste-glow)" />
            </g>
            {/* subtle second wave for depth, offset */}
            <g className="wave-move" style={{ animationDuration: "3.6s", opacity: 0.35 }}>
              <path d={wavePath(3, BOTTOM + 20)} fill={color} />
            </g>
            {BUBBLES.map((b, i) => (
              <circle
                key={i}
                className="bubble"
                cx={b.x}
                cy={-6}
                r={b.r}
                fill="#fff"
                opacity="0.6"
                style={{ animationDuration: `${b.dur}s`, animationDelay: `${b.delay}s` }}
              />
            ))}
          </g>
        )}
      </g>

      {/* glossy highlight + outline */}
      <path d={BODY} fill="url(#bin-shine)" clipPath="url(#bin-body)" />
      <path d={BODY} fill="none" stroke="var(--axis)" strokeWidth="2" />

      {/* threshold marks */}
      {[
        { pct: FULL_THRESHOLD, label: "Full", c: "var(--critical)" },
        { pct: ALMOST_THRESHOLD, label: "50%", c: "var(--warning)" },
      ].map(({ pct, label, c }) => (
        <g key={pct}>
          <line x1="40" x2="172" y1={markY(pct)} y2={markY(pct)} stroke={c} strokeDasharray="3 4" strokeWidth="1.2" opacity="0.7" />
          <text x="176" y={markY(pct) + 4} fontSize="11" fill="var(--ink-2)" fontWeight="500">
            {label}
          </text>
        </g>
      ))}
    </svg>
  );
}
