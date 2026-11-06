// Static mock data for the admin / operations / assistant screens.
// Front-end only — stands in for data a real backend would serve later.

import { EventItem, Point } from "@/lib/types";

// A realistic fill-over-time curve (climbs, gets collected, repeats) so the
// dashboard chart is populated even when no live backend is connected.
export function sampleHistory(now: number, n = 48): Point[] {
  const out: Point[] = [];
  let fill = 24;
  const stepMs = 5 * 60 * 1000; // 5-minute readings
  for (let i = n - 1; i >= 0; i--) {
    fill += Math.random() * 7 + 1.5;
    if (fill >= 100) fill = Math.random() * 10 + 4; // collected
    const f = Math.round(fill);
    out.push({ ts: now - i * stepMs, fill: f, distance: Math.round((1 - f / 100) * 55 + 5) });
  }
  return out;
}

// A handful of recent events for the live stream fallback.
export function sampleEvents(now: number): EventItem[] {
  const m = 60 * 1000;
  return [
    { ts: now - 2 * m, kind: "FULL_ALERT", fill: 100, detail: "Stadium North reached 100% — collection dispatched" },
    { ts: now - 9 * m, kind: "RESET", fill: 6, detail: "South Bus Depot collected by Team Delta" },
    { ts: now - 17 * m, kind: "SENSOR_RECOVERED", fill: 48, detail: "Tech Park East sensor back online" },
    { ts: now - 26 * m, kind: "FULL_ALERT", fill: 100, detail: "North Market Sq reached 100% — collection dispatched" },
    { ts: now - 34 * m, kind: "SENSOR_FAULT", fill: null, detail: "Tech Park East ultrasonic sensor not responding" },
    { ts: now - 48 * m, kind: "RESET", fill: 5, detail: "Civic Center collected by Team Alpha" },
    { ts: now - 63 * m, kind: "FULL_ALERT", fill: 100, detail: "West Metro Stn reached 100% — collection dispatched" },
  ];
}

export type CrewMember = {
  name: string;
  role: string;
  team: string;
  zone: string;
  status: "On route" | "On break" | "Available" | "Off shift";
  shift: string;
  collectionsToday: number;
  phone: string;
};

export const CREW: CrewMember[] = [
  { name: "Ravi Kumar", role: "Lead Collector", team: "Team Alpha", zone: "Central", status: "On route", shift: "06:00–14:00", collectionsToday: 11, phone: "+91 90000 11001" },
  { name: "Suresh Patel", role: "Collector", team: "Team Alpha", zone: "Central", status: "On route", shift: "06:00–14:00", collectionsToday: 9, phone: "+91 90000 11002" },
  { name: "Meena Rao", role: "Lead Collector", team: "Team Bravo", zone: "North", status: "Available", shift: "06:00–14:00", collectionsToday: 7, phone: "+91 90000 11003" },
  { name: "Arjun Nair", role: "Collector", team: "Team Bravo", zone: "North", status: "On break", shift: "06:00–14:00", collectionsToday: 6, phone: "+91 90000 11004" },
  { name: "Priya Sharma", role: "Lead Collector", team: "Team Charlie", zone: "East", status: "On route", shift: "14:00–22:00", collectionsToday: 8, phone: "+91 90000 11005" },
  { name: "Imran Shaikh", role: "Collector", team: "Team Charlie", zone: "East", status: "Available", shift: "14:00–22:00", collectionsToday: 5, phone: "+91 90000 11006" },
  { name: "Lakshmi Devi", role: "Lead Collector", team: "Team Delta", zone: "South", status: "On route", shift: "06:00–14:00", collectionsToday: 10, phone: "+91 90000 11007" },
  { name: "Vikram Singh", role: "Collector", team: "Team Delta", zone: "South", status: "Off shift", shift: "22:00–06:00", collectionsToday: 0, phone: "+91 90000 11008" },
  { name: "Anita George", role: "Lead Collector", team: "Team Echo", zone: "West", status: "Available", shift: "14:00–22:00", collectionsToday: 4, phone: "+91 90000 11009" },
];

export type User = {
  name: string;
  email: string;
  role: "Administrator" | "Operations Manager" | "Dispatcher" | "Field Supervisor" | "Viewer";
  status: "Active" | "Invited" | "Suspended";
  lastActive: string;
};

export const USERS: User[] = [
  { name: "Gowrav (You)", email: "quantumdataleap.ai@gmail.com", role: "Administrator", status: "Active", lastActive: "now" },
  { name: "Deepa Menon", email: "deepa.menon@citywaste.gov", role: "Operations Manager", status: "Active", lastActive: "12 min ago" },
  { name: "Karthik Reddy", email: "karthik.reddy@citywaste.gov", role: "Dispatcher", status: "Active", lastActive: "1 h ago" },
  { name: "Fatima Khan", email: "fatima.khan@citywaste.gov", role: "Field Supervisor", status: "Active", lastActive: "3 h ago" },
  { name: "Joseph Mathew", email: "joseph.mathew@citywaste.gov", role: "Viewer", status: "Active", lastActive: "yesterday" },
  { name: "Neha Gupta", email: "neha.gupta@citywaste.gov", role: "Dispatcher", status: "Invited", lastActive: "—" },
  { name: "Old Account", email: "contractor@temp.io", role: "Viewer", status: "Suspended", lastActive: "28 days ago" },
];

export type Role = {
  name: string;
  members: number;
  description: string;
  perms: Record<string, boolean>;
};

export const PERM_KEYS = ["View dashboards", "Acknowledge alerts", "Dispatch crews", "Manage bins", "Manage users", "Edit settings", "API access"];

export const ROLES: Role[] = [
  { name: "Administrator", members: 1, description: "Full access to every screen and setting.", perms: Object.fromEntries(PERM_KEYS.map((k) => [k, true])) },
  { name: "Operations Manager", members: 1, description: "Runs day-to-day operations and dispatch.", perms: { "View dashboards": true, "Acknowledge alerts": true, "Dispatch crews": true, "Manage bins": true, "Manage users": false, "Edit settings": false, "API access": true } },
  { name: "Dispatcher", members: 2, description: "Assigns collections and tracks crews.", perms: { "View dashboards": true, "Acknowledge alerts": true, "Dispatch crews": true, "Manage bins": false, "Manage users": false, "Edit settings": false, "API access": false } },
  { name: "Field Supervisor", members: 1, description: "Oversees crews on the ground.", perms: { "View dashboards": true, "Acknowledge alerts": true, "Dispatch crews": false, "Manage bins": true, "Manage users": false, "Edit settings": false, "API access": false } },
  { name: "Viewer", members: 2, description: "Read-only access to dashboards and reports.", perms: { "View dashboards": true, "Acknowledge alerts": false, "Dispatch crews": false, "Manage bins": false, "Manage users": false, "Edit settings": false, "API access": false } },
];

export type ApiKey = {
  label: string;
  prefix: string;
  scope: string;
  created: string;
  lastUsed: string;
  status: "Active" | "Revoked";
};

export const API_KEYS: ApiKey[] = [
  { label: "Voice agent (production)", prefix: "SmartD-live-7f3a…", scope: "voice:read", created: "2026-09-12", lastUsed: "2 min ago", status: "Active" },
  { label: "Analytics export", prefix: "SmartD-live-91bc…", scope: "stats:read", created: "2026-10-01", lastUsed: "1 h ago", status: "Active" },
  { label: "Legacy integration", prefix: "SmartD-live-004d…", scope: "voice:read", created: "2026-06-20", lastUsed: "19 days ago", status: "Revoked" },
];

export type ChatSession = {
  id: string;
  caller: string;
  channel: "Phone" | "Web" | "WhatsApp";
  startedAgo: string;
  durationS: number;
  intent: string;
  outcome: "Resolved" | "Dispatched" | "Escalated";
  turns: { who: "caller" | "agent"; text: string }[];
};

export const CHAT_SESSIONS: ChatSession[] = [
  {
    id: "VC-20481",
    caller: "+91 98xxx 44210",
    channel: "Phone",
    startedAgo: "4 min ago",
    durationS: 68,
    intent: "list_full_bins",
    outcome: "Dispatched",
    turns: [
      { who: "caller", text: "Which bins are full right now?" },
      { who: "agent", text: "Three bins need collection: Stadium North at 95 percent, South Bus Depot at 88 percent, and North Market Square at 83 percent." },
      { who: "caller", text: "Send a truck to Stadium North." },
      { who: "agent", text: "Done — Team Bravo has been dispatched to Stadium North. Estimated arrival 15 minutes." },
    ],
  },
  {
    id: "VC-20478",
    caller: "+91 97xxx 10233",
    channel: "WhatsApp",
    startedAgo: "22 min ago",
    durationS: 41,
    intent: "check_bin_fill",
    outcome: "Resolved",
    turns: [
      { who: "caller", text: "How full is the Central Plaza bin?" },
      { who: "agent", text: "Central Plaza is currently 14 percent full. No collection needed." },
    ],
  },
  {
    id: "VC-20470",
    caller: "Web widget",
    channel: "Web",
    startedAgo: "1 h ago",
    durationS: 95,
    intent: "check_device_health",
    outcome: "Escalated",
    turns: [
      { who: "caller", text: "Is the Tech Park East sensor working?" },
      { who: "agent", text: "Tech Park East is reporting a sensor fault — the ultrasonic sensor has failed its last reads. I've raised a maintenance ticket and notified the field supervisor." },
    ],
  },
  {
    id: "VC-20465",
    caller: "+91 90xxx 88121",
    channel: "Phone",
    startedAgo: "2 h ago",
    durationS: 54,
    intent: "collections_today",
    outcome: "Resolved",
    turns: [
      { who: "caller", text: "How many collections have we done today?" },
      { who: "agent", text: "41 collections have been completed today across all five zones. The busiest was the North zone with 12." },
    ],
  },
];

export const VOICE_INTENTS = [
  { intent: "check_bin_fill", calls: 312, label: "Check a bin's fill level" },
  { intent: "list_full_bins", calls: 204, label: "List bins needing collection" },
  { intent: "check_device_health", calls: 88, label: "Check device / sensor health" },
  { intent: "fill_trend", calls: 61, label: "Ask for the fill trend" },
  { intent: "collections_today", calls: 143, label: "Collections completed today" },
  { intent: "acknowledge_reset", calls: 97, label: "Confirm a collection / reset" },
];
