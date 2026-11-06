"use client";

import Icon from "@/components/Icon";
import { NAV } from "@/lib/nav";

type Props = {
  active: string;
  onNavigate: (key: string) => void;
  online: boolean;
  open: boolean;
  onClose: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
};

export default function Sidebar({ active, onNavigate, online, open, onClose, collapsed, onToggleCollapse }: Props) {
  const hideLg = collapsed ? "lg:hidden" : ""; // labels/text hidden in the icon-rail

  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden" onClick={onClose} aria-hidden />}

      <aside
        data-collapsed={collapsed ? "true" : "false"}
        className={`chrome fixed left-0 top-0 z-50 flex h-screen w-[17rem] flex-col border-r py-5 transition-transform duration-300 lg:sticky lg:top-0 lg:z-30 lg:w-auto lg:translate-x-0 ${
          collapsed ? "px-2.5" : "px-3"
        } ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        {/* header */}
        <div className={`flex items-center justify-between gap-2.5 px-1.5 ${collapsed ? "lg:flex-col lg:justify-center lg:gap-3 lg:px-0" : ""}`}>
          <div className="flex min-w-0 items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-icon.png" alt="" className="h-9 w-9 shrink-0 object-contain" style={{ filter: "drop-shadow(0 6px 14px var(--glow))" }} />
            <div className={`leading-tight ${hideLg}`}>
              <div className="font-display text-[0.95rem] font-extrabold tracking-tight">Smart Dustbin</div>
              <div className="text-[0.64rem] font-medium uppercase tracking-wider text-muted">Ops Console</div>
            </div>
          </div>
          <button onClick={onToggleCollapse} className="btn btn-ghost hidden !p-1.5 lg:flex" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} title={collapsed ? "Expand" : "Collapse"}>
            <Icon name="chevron" className={`h-4 w-4 transition-transform duration-300 ${collapsed ? "" : "rotate-180"}`} />
          </button>
          <button onClick={onClose} className="btn btn-ghost !p-1.5 lg:hidden" aria-label="Close menu">
            <Icon name="x" className="h-4 w-4" />
          </button>
        </div>

        {/* nav */}
        <nav className="mt-5 flex-1 space-y-4 overflow-y-auto overflow-x-hidden pr-1">
          {NAV.map((g) => (
            <div key={g.group}>
              <div className={`px-1.5 text-[0.6rem] font-semibold uppercase tracking-wider text-muted ${hideLg}`}>{g.group}</div>
              {collapsed && <div className="mx-auto hidden h-px w-7 bg-line lg:block" />}
              <div className="mt-1.5 flex flex-col gap-0.5">
                {g.items.map((it) => (
                  <button key={it.key} type="button" onClick={() => onNavigate(it.key)} data-active={active === it.key} title={it.label} className="nav-link text-left">
                    <Icon name={it.icon} className="h-[18px] w-[18px] shrink-0" />
                    <span className={`truncate ${hideLg}`}>{it.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* footer status */}
        <div
          className={`mt-3 flex items-center gap-2 rounded-xl border border-line py-2.5 ${collapsed ? "lg:justify-center lg:px-0 px-3" : "px-3"}`}
          style={{ background: "var(--surface)" }}
          title={online ? "Backend online" : "Backend offline"}
        >
          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${online ? "dot-live" : ""}`} style={{ background: online ? "var(--good)" : "var(--critical)" }} />
          <div className={`min-w-0 leading-tight ${hideLg}`}>
            <div className="text-[0.78rem] font-semibold">{online ? "Backend online" : "Backend offline"}</div>
            <div className="truncate text-[0.64rem] text-muted">ESP32 · AJ-SR04M · v1.2</div>
          </div>
        </div>
      </aside>
    </>
  );
}
