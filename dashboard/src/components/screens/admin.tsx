"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import Modal from "@/components/Modal";
import { Avatar, Badge, Cell, PageHeader, Panel, Row, Stat, Table, Toggle } from "@/components/ui";
import { ScreenProps } from "@/lib/fleet";
import { API_KEYS, PERM_KEYS, ROLES, USERS } from "@/lib/mock";
import { API_BASE } from "@/lib/api";

const ROLE_COLOR: Record<string, string> = {
  Administrator: "var(--critical)",
  "Operations Manager": "var(--brand)",
  Dispatcher: "var(--brand-2)",
  "Field Supervisor": "var(--accent)",
  Viewer: "var(--muted)",
};

// ================= User Management =================
export function UsersScreen() {
  const [q, setQ] = useState("");
  const [invite, setInvite] = useState(false);
  const shown = USERS.filter((u) => `${u.name} ${u.email} ${u.role}`.toLowerCase().includes(q.toLowerCase()));
  const statusColor: Record<string, string> = { Active: "var(--good)", Invited: "var(--brand-2)", Suspended: "var(--critical)" };

  return (
    <>
      <PageHeader title="User Management" desc="People with access to the console">
        <div className="flex items-center gap-2 rounded-xl border border-line px-3 py-2" style={{ background: "var(--surface)" }}>
          <Icon name="search" className="h-4 w-4 text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search users…" className="w-32 bg-transparent text-sm outline-none placeholder:text-muted" />
        </div>
        <button onClick={() => setInvite(true)} className="btn btn-primary !py-1.5 !text-xs"><Icon name="plus" className="mr-1 inline h-3.5 w-3.5" />Invite user</button>
      </PageHeader>

      <Modal open={invite} onClose={() => setInvite(false)} title="Invite user" subtitle="Send a console invitation by email">
        <div className="space-y-3">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">Email</span>
            <input type="email" placeholder="name@citywaste.gov" className="mt-1 w-full rounded-xl border border-line bg-[color:var(--surface)] px-3 py-2 text-sm outline-none focus:border-[color:var(--brand)]" />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">Role</span>
            <select className="mt-1 w-full rounded-xl border border-line bg-[color:var(--surface)] px-3 py-2 text-sm outline-none focus:border-[color:var(--brand)]">
              {["Viewer", "Dispatcher", "Field Supervisor", "Operations Manager", "Administrator"].map((r) => <option key={r}>{r}</option>)}
            </select>
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setInvite(false)} className="btn btn-ghost !py-2 !text-xs">Cancel</button>
            <button onClick={() => setInvite(false)} className="btn btn-primary !py-2 !text-xs">Send invite</button>
          </div>
        </div>
      </Modal>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Total users" value={USERS.length} icon="users" color="var(--brand)" />
        <Stat label="Active" value={USERS.filter((u) => u.status === "Active").length} icon="check" color="var(--good)" />
        <Stat label="Invited" value={USERS.filter((u) => u.status === "Invited").length} icon="send" color="var(--brand-2)" />
        <Stat label="Administrators" value={USERS.filter((u) => u.role === "Administrator").length} icon="roles" color="var(--critical)" />
      </div>

      <Panel title="All users" icon="users">
        <Table head={["User", "Role", "Status", "Last active", ""]}>
          {shown.map((u) => (
            <Row key={u.email}>
              <Cell>
                <div className="flex items-center gap-2.5"><Avatar name={u.name} color={ROLE_COLOR[u.role]} /><div><div className="font-semibold">{u.name}</div><div className="text-[0.7rem] text-muted">{u.email}</div></div></div>
              </Cell>
              <Cell><Badge color={ROLE_COLOR[u.role]}>{u.role}</Badge></Cell>
              <Cell><Badge color={statusColor[u.status]}>{u.status}</Badge></Cell>
              <Cell><span className="text-xs text-muted">{u.lastActive}</span></Cell>
              <Cell><button className="btn btn-ghost !px-2.5 !py-1.5 !text-xs"><Icon name="edit" className="h-3.5 w-3.5" /></button></Cell>
            </Row>
          ))}
        </Table>
      </Panel>
    </>
  );
}

// ================= Roles & Permissions =================
export function RolesScreen() {
  return (
    <>
      <PageHeader title="Roles & Permissions" desc="What each role can see and do">
        <button className="btn btn-primary !py-1.5 !text-xs"><Icon name="plus" className="mr-1 inline h-3.5 w-3.5" />New role</button>
      </PageHeader>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {ROLES.map((r) => (
          <Panel key={r.name} pad={false} className="!rounded-2xl">
            <div className="p-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: `color-mix(in srgb, ${ROLE_COLOR[r.name]} 16%, transparent)`, color: ROLE_COLOR[r.name] }}><Icon name="roles" className="h-4 w-4" /></span>
              <div className="mt-2 text-sm font-bold">{r.name}</div>
              <div className="text-[0.7rem] text-muted">{r.members} {r.members === 1 ? "member" : "members"}</div>
              <p className="mt-2 text-xs text-ink-2">{r.description}</p>
            </div>
          </Panel>
        ))}
      </div>

      <Panel title="Permission matrix" subtitle="Green = allowed" icon="roles">
        <Table head={["Permission", ...ROLES.map((r) => r.name)]}>
          {PERM_KEYS.map((perm) => (
            <Row key={perm}>
              <Cell><span className="font-medium">{perm}</span></Cell>
              {ROLES.map((r) => (
                <Cell key={r.name}>
                  {r.perms[perm] ? (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full" style={{ background: "color-mix(in srgb, var(--good) 18%, transparent)", color: "var(--good)" }}><Icon name="check" className="h-3 w-3" /></span>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </Cell>
              ))}
            </Row>
          ))}
        </Table>
      </Panel>
    </>
  );
}

// ================= API Integration =================
export function ApiScreen() {
  const host = API_BASE.replace(/^https?:\/\//, "") || "same-origin";
  const endpoints = [
    ["GET", "/api/voice/status", "Live fill, status & speech for a bin"],
    ["GET", "/api/voice/full", "All bins needing collection"],
    ["GET", "/api/voice/health", "Device & sensor health"],
    ["POST", "/api/voice/query", "Intent-based Q&A (speech + data)"],
    ["GET", "/api/voice/stream", "SSE live feed for always-on agents"],
  ];
  return (
    <>
      <PageHeader title="API Integration" desc="Keys and endpoints for the voice agent and third-party integrations">
        <button className="btn btn-primary !py-1.5 !text-xs"><Icon name="plus" className="mr-1 inline h-3.5 w-3.5" />Generate key</button>
      </PageHeader>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Active keys" value={API_KEYS.filter((k) => k.status === "Active").length} icon="api" color="var(--brand)" />
        <Stat label="Requests (24h)" value="4.2k" icon="trend" color="var(--brand-2)" />
        <Stat label="Rate limit" value="60/min" icon="clock" color="var(--accent)" sub="per key" />
        <Stat label="Errors (24h)" value="0.3%" icon="warning" color="var(--good)" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <Panel title="API keys" subtitle="Secrets are shown once at creation" icon="api">
          <Table head={["Label", "Key", "Scope", "Last used", "Status"]}>
            {API_KEYS.map((k) => (
              <Row key={k.label}>
                <Cell><span className="font-semibold">{k.label}</span><div className="text-[0.7rem] text-muted">created {k.created}</div></Cell>
                <Cell><span className="font-mono text-xs">{k.prefix}</span></Cell>
                <Cell><Badge color="var(--brand-2)">{k.scope}</Badge></Cell>
                <Cell><span className="text-xs text-muted">{k.lastUsed}</span></Cell>
                <Cell><Badge color={k.status === "Active" ? "var(--good)" : "var(--critical)"}>{k.status}</Badge></Cell>
              </Row>
            ))}
          </Table>
        </Panel>

        <Panel title="Endpoints" subtitle={`Base: ${host}`} icon="plug">
          <div className="space-y-2">
            {endpoints.map(([m, path, desc]) => (
              <div key={path} className="rounded-xl p-2.5" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
                <div className="flex items-center gap-2">
                  <Badge color={m === "GET" ? "var(--brand)" : "var(--brand-2)"}>{m}</Badge>
                  <code className="font-mono text-xs">{path}</code>
                </div>
                <div className="mt-1 text-[0.7rem] text-muted">{desc}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 rounded-xl p-3 font-mono text-[0.68rem] text-muted" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            Header · x-api-key: &lt;your-key&gt;
          </div>
        </Panel>
      </div>
    </>
  );
}

// ================= Notification Settings =================
export function NotifSettingsScreen({ live }: ScreenProps) {
  const [ch, setCh] = useState<Record<string, boolean>>({ "Desktop push": live.perm === "granted", Email: true, SMS: false, WhatsApp: true, Webhook: true });
  const [rules, setRules] = useState<Record<string, boolean>>({ "Bin reaches 80% (full)": true, "Device goes offline": true, "Battery below 20%": true, "Sensor fault detected": true, "Daily summary at 18:00": false });

  return (
    <>
      <PageHeader title="Notification Settings" desc="Choose how and when the system notifies your team" />

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Channels" subtitle="Where notifications are delivered" icon="notif">
          <div className="space-y-3">
            {Object.keys(ch).map((k) => (
              <div key={k} className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg text-[color:var(--brand)]" style={{ background: "color-mix(in srgb, var(--brand) 12%, transparent)" }}>
                    <Icon name={k === "Email" ? "send" : k === "Webhook" ? "api" : k === "SMS" || k === "WhatsApp" ? "chat" : "notif"} className="h-4 w-4" />
                  </span>
                  <div><div className="text-sm font-medium">{k}</div><div className="text-[0.7rem] text-muted">{k === "Desktop push" ? (live.perm === "granted" ? "Enabled in this browser" : "Click enable in the bar") : "Configured"}</div></div>
                </div>
                <Toggle on={ch[k]} onClick={() => (k === "Desktop push" && live.perm !== "granted" ? live.onEnableNotif() : setCh((s) => ({ ...s, [k]: !s[k] })))} />
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Alert rules" subtitle="Which events trigger a notification" icon="alerts">
          <div className="space-y-3">
            {Object.keys(rules).map((k) => (
              <div key={k} className="flex items-center justify-between">
                <div className="text-sm font-medium">{k}</div>
                <Toggle on={rules[k]} onClick={() => setRules((s) => ({ ...s, [k]: !s[k] }))} />
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between rounded-xl p-3" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
            <div><div className="text-sm font-medium">Quiet hours</div><div className="text-[0.7rem] text-muted">Mute non-critical alerts overnight</div></div>
            <span className="font-mono text-xs">22:00 – 06:00</span>
          </div>
        </Panel>
      </div>
    </>
  );
}

// ================= System Settings =================
export function SettingsScreen({ live }: ScreenProps) {
  const host = API_BASE || "same-origin";
  const field = (label: string, value: string, mono = false) => (
    <div className="flex items-center justify-between gap-3 border-b border-line py-2.5">
      <span className="text-sm text-ink-2">{label}</span>
      <span className={`rounded-lg px-3 py-1.5 text-xs ${mono ? "font-mono" : ""}`} style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>{value}</span>
    </div>
  );

  return (
    <>
      <PageHeader title="System Settings" desc="Organisation, thresholds and backend configuration">
        <button className="btn btn-primary !py-1.5 !text-xs">Save changes</button>
      </PageHeader>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="General" icon="settings">
          {field("Organisation", "City Waste Management")}
          {field("Time zone", "Asia/Kolkata (GMT+5:30)")}
          {field("Units", "Metric (cm, L, °C)")}
          {field("Theme", "Auto (system)")}
        </Panel>

        <Panel title="Fill thresholds" subtitle="Drives status colours and alerts" icon="bin">
          {field("Almost full at", "50 %", true)}
          {field("Full / collect at", "80 %", true)}
          {field("Reading stale after", "60 s", true)}
          {field("Device offline after", "25 s", true)}
        </Panel>

        <Panel title="Backend & data" icon="device">
          {field("API base URL", host, true)}
          {field("Connection", live.serverUp ? "Connected" : "Unreachable", true)}
          {field("Poll interval", "2 s", true)}
          {field("Data retention", "90 days", true)}
        </Panel>

        <Panel title="Danger zone" icon="warning" className="!border-[color:color-mix(in_srgb,var(--critical)_30%,var(--border))]">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div><div className="text-sm font-medium">Reset live bin readings</div><div className="text-[0.7rem] text-muted">Clears history on the real device</div></div>
              <button onClick={live.onReset} className="btn btn-ghost !py-1.5 !text-xs" style={{ color: "var(--critical)", borderColor: "color-mix(in srgb, var(--critical) 40%, var(--border))" }}>Reset</button>
            </div>
            <div className="flex items-center justify-between">
              <div><div className="text-sm font-medium">Export all data</div><div className="text-[0.7rem] text-muted">Download a full JSON snapshot</div></div>
              <button className="btn btn-ghost !py-1.5 !text-xs">Export</button>
            </div>
          </div>
        </Panel>
      </div>
    </>
  );
}
