// Central line-icon set used across the app shell and all screens.
// 24x24 viewBox, 1.8 stroke, currentColor — inherits text color.

type Props = { name: string; className?: string };

const P = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const PATHS: Record<string, React.ReactNode> = {
  dashboard: (
    <>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" {...P} />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" {...P} />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" {...P} />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" {...P} />
    </>
  ),
  monitoring: (
    <>
      <path d="M4 5h16M4 12h16M4 19h16" {...P} />
      <circle cx="8" cy="5" r="1.6" {...P} />
      <circle cx="14" cy="12" r="1.6" {...P} />
      <circle cx="10" cy="19" r="1.6" {...P} />
    </>
  ),
  bin: (
    <>
      <path d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" {...P} />
      <path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" {...P} />
      <path d="M10 11v6M14 11v6" {...P} />
    </>
  ),
  map: (
    <>
      <path d="M9 4 4 6v14l5-2 6 2 5-2V4l-5 2-6-2Z" {...P} />
      <path d="M9 4v14M15 6v14" {...P} />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s-6-5.3-6-10a6 6 0 1 1 12 0c0 4.7-6 10-6 10Z" {...P} />
      <circle cx="12" cy="11" r="2.2" {...P} />
    </>
  ),
  alerts: (
    <>
      <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" {...P} />
      <path d="M10 20a2 2 0 0 0 4 0" {...P} />
    </>
  ),
  collection: (
    <>
      <path d="M3 6h11v9H3z" {...P} />
      <path d="M14 9h4l3 3v3h-7z" {...P} />
      <circle cx="7" cy="18" r="1.6" {...P} />
      <circle cx="17" cy="18" r="1.6" {...P} />
    </>
  ),
  team: (
    <>
      <circle cx="9" cy="8" r="3" {...P} />
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0" {...P} />
      <path d="M16 6.5a3 3 0 0 1 0 5.8M16.5 19a5.5 5.5 0 0 0-2-4.3" {...P} />
    </>
  ),
  voice: (
    <>
      <rect x="9" y="3" width="6" height="11" rx="3" {...P} />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" {...P} />
    </>
  ),
  chat: (
    <>
      <path d="M4 5h16v11H9l-4 3v-3H4z" {...P} />
      <path d="M8 9h8M8 12h5" {...P} />
    </>
  ),
  analytics: (
    <>
      <path d="M4 4v16h16" {...P} />
      <path d="M8 15l3-4 3 2 4-6" {...P} />
    </>
  ),
  device: (
    <>
      <rect x="6" y="6" width="12" height="12" rx="2" {...P} />
      <rect x="9.5" y="9.5" width="5" height="5" rx="1" {...P} />
      <path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3" {...P} />
    </>
  ),
  diagnostics: <path d="M3 12h4l2-6 4 12 2-6h6" {...P} />,
  users: (
    <>
      <circle cx="12" cy="8" r="3.2" {...P} />
      <path d="M5 20a7 7 0 0 1 14 0" {...P} />
    </>
  ),
  roles: (
    <>
      <path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6l-7-3Z" {...P} />
      <path d="M9 12l2 2 4-4" {...P} />
    </>
  ),
  api: (
    <>
      <path d="M9 7 4 12l5 5M15 7l5 5-5 5" {...P} />
      <path d="M13 5l-2 14" {...P} />
    </>
  ),
  notif: (
    <>
      <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" {...P} />
      <circle cx="18" cy="6" r="2.4" {...P} />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" {...P} />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1" {...P} />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6" {...P} />
      <path d="m20 20-3.5-3.5" {...P} />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" {...P} />,
  check: <path d="m5 12 4 4 10-10" {...P} />,
  x: <path d="M6 6l12 12M18 6 6 18" {...P} />,
  warning: (
    <>
      <path d="M12 3 2 20h20L12 3Z" {...P} />
      <path d="M12 9v5M12 17h.01" {...P} />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" {...P} />
      <path d="M12 7.5V12l3 2" {...P} />
    </>
  ),
  battery: (
    <>
      <rect x="3" y="8" width="16" height="9" rx="2" {...P} />
      <path d="M21 11v3" {...P} />
    </>
  ),
  wifi: (
    <>
      <path d="M4 9a13 13 0 0 1 16 0M7 12.5a8 8 0 0 1 10 0M9.5 16a4 4 0 0 1 5 0" {...P} />
      <path d="M12 19h.01" {...P} />
    </>
  ),
  chevron: <path d="m9 6 6 6-6 6" {...P} />,
  download: (
    <>
      <path d="M12 4v11M8 11l4 4 4-4" {...P} />
      <path d="M5 20h14" {...P} />
    </>
  ),
  filter: <path d="M4 5h16l-6 7v6l-4 2v-8L4 5Z" {...P} />,
  refresh: (
    <>
      <path d="M20 11a8 8 0 1 0-1.5 5" {...P} />
      <path d="M20 5v6h-6" {...P} />
    </>
  ),
  play: <path d="M7 5l12 7-12 7V5Z" {...P} />,
  pause: <path d="M8 5v14M16 5v14" {...P} />,
  phone: <path d="M6 3h3l2 5-2 1a12 12 0 0 0 5 5l1-2 5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 4 5a2 2 0 0 1 2-2Z" {...P} />,
  trend: (
    <>
      <path d="M3 17l5-5 4 3 6-7" {...P} />
      <path d="M17 8h4v4" {...P} />
    </>
  ),
  leaf: (
    <>
      <path d="M5 19c0-8 6-14 15-14 0 9-6 14-14 14" {...P} />
      <path d="M5 19c3-5 6-7 10-8" {...P} />
    </>
  ),
  signal: <path d="M4 18h2v-4H4zM10 18h2V9h-2zM16 18h2V4h-2z" fill="currentColor" stroke="none" />,
  calendar: (
    <>
      <rect x="4" y="5" width="16" height="16" rx="2" {...P} />
      <path d="M4 9h16M8 3v4M16 3v4" {...P} />
    </>
  ),
  logout: (
    <>
      <path d="M14 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4" {...P} />
      <path d="M10 8l-4 4 4 4M6 12h10" {...P} />
    </>
  ),
  edit: <path d="M5 19h4L19 9l-4-4L5 15v4ZM13 7l4 4" {...P} />,
  trash: (
    <>
      <path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" {...P} />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z" {...P} />
      <circle cx="12" cy="12" r="2.5" {...P} />
    </>
  ),
  send: <path d="M4 12 20 4l-6 16-3-7-7-1Z" {...P} />,
  plug: (
    <>
      <path d="M9 3v5M15 3v5" {...P} />
      <path d="M6 8h12v3a6 6 0 0 1-12 0V8Z" {...P} />
      <path d="M12 17v4" {...P} />
    </>
  ),
  dot: <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" {...P} />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" {...P} />
    </>
  ),
  moon: <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" {...P} />,
  auto: (
    <>
      <rect x="3" y="4" width="18" height="12" rx="2" {...P} />
      <path d="M8 20h8M12 16v4" {...P} />
    </>
  ),
  "panel-left": (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" {...P} />
      <path d="M9.5 4.5v15" {...P} />
    </>
  ),
  truck: (
    <>
      <path d="M3 6h11v9H3z" {...P} />
      <path d="M14 9h4l3 3v3h-7z" {...P} />
      <circle cx="7" cy="18" r="1.6" {...P} />
      <circle cx="17" cy="18" r="1.6" {...P} />
    </>
  ),
};

export default function Icon({ name, className = "h-[18px] w-[18px]" }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      {PATHS[name] ?? PATHS.dot}
    </svg>
  );
}
