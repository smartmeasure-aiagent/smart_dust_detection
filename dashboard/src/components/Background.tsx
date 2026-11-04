// Fixed, non-interactive backdrop: drifting aurora blobs + floating "dust" motes.
// Deterministic values (no Math.random at render) to avoid hydration mismatch.

const PARTICLES = [
  { l: 6, s: 3, d: 15, delay: 0, drift: 24 },
  { l: 14, s: 5, d: 20, delay: 3, drift: -30 },
  { l: 22, s: 2, d: 13, delay: 7, drift: 18 },
  { l: 30, s: 4, d: 22, delay: 1, drift: -22 },
  { l: 38, s: 6, d: 26, delay: 9, drift: 34 },
  { l: 46, s: 3, d: 17, delay: 5, drift: -16 },
  { l: 53, s: 5, d: 21, delay: 12, drift: 28 },
  { l: 61, s: 2, d: 14, delay: 2, drift: -26 },
  { l: 68, s: 4, d: 24, delay: 8, drift: 20 },
  { l: 75, s: 6, d: 19, delay: 4, drift: -34 },
  { l: 82, s: 3, d: 23, delay: 11, drift: 30 },
  { l: 89, s: 5, d: 16, delay: 6, drift: -18 },
  { l: 95, s: 2, d: 18, delay: 10, drift: 22 },
  { l: 10, s: 4, d: 28, delay: 14, drift: -28 },
  { l: 44, s: 3, d: 25, delay: 13, drift: 16 },
  { l: 58, s: 5, d: 30, delay: 16, drift: -32 },
  { l: 72, s: 2, d: 15, delay: 15, drift: 26 },
  { l: 86, s: 4, d: 27, delay: 18, drift: -20 },
];

export default function Background() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div
        className="aurora-blob"
        style={{ width: 520, height: 520, left: "-8%", top: "-12%", background: "var(--aurora-1)", animation: "aurora 18s ease-in-out infinite" }}
      />
      <div
        className="aurora-blob"
        style={{ width: 460, height: 460, right: "-6%", top: "4%", background: "var(--aurora-2)", animation: "aurora 22s ease-in-out infinite reverse" }}
      />
      <div
        className="aurora-blob"
        style={{ width: 600, height: 600, left: "32%", bottom: "-20%", background: "var(--aurora-3)", animation: "aurora 26s ease-in-out infinite" }}
      />
      {PARTICLES.map((p, i) => (
        <span
          key={i}
          className="dust"
          style={{
            left: `${p.l}%`,
            width: p.s,
            height: p.s,
            animationDuration: `${p.d}s`,
            animationDelay: `${p.delay}s`,
            ["--drift" as string]: `${p.drift}px`,
          }}
        />
      ))}
    </div>
  );
}
