// App navigation: grouped sections, each with a stable key, label and icon.

export type NavItem = { key: string; label: string; icon: string };
export type NavGroup = { group: string; items: NavItem[] };

export const NAV: NavGroup[] = [
  {
    group: "Monitor",
    items: [
      { key: "dashboard", label: "Dashboard", icon: "dashboard" },
      { key: "monitoring", label: "Bin Monitoring", icon: "monitoring" },
      { key: "bin-details", label: "Bin Details", icon: "bin" },
      { key: "map", label: "Live Map", icon: "map" },
    ],
  },
  {
    group: "Operations",
    items: [
      { key: "alerts", label: "Alerts & Notifications", icon: "alerts" },
      { key: "collection", label: "Collection Management", icon: "collection" },
      { key: "team", label: "Cleaning Team", icon: "team" },
    ],
  },
  {
    group: "Assistant",
    items: [
      { key: "voice", label: "AI Voice Assistant", icon: "voice" },
      { key: "chat", label: "Chat History", icon: "chat" },
    ],
  },
  {
    group: "Insights",
    items: [
      { key: "analytics", label: "Analytics & Reports", icon: "analytics" },
    ],
  },
  {
    group: "Devices",
    items: [
      { key: "device-health", label: "Device Health", icon: "device" },
      { key: "diagnostics", label: "Sensor Diagnostics", icon: "diagnostics" },
    ],
  },
  {
    group: "Administration",
    items: [
      { key: "users", label: "User Management", icon: "users" },
      { key: "roles", label: "Roles & Permissions", icon: "roles" },
      { key: "api", label: "API Integration", icon: "api" },
      { key: "notif-settings", label: "Notification Settings", icon: "notif" },
      { key: "settings", label: "System Settings", icon: "settings" },
    ],
  },
];

export const ALL_ITEMS: NavItem[] = NAV.flatMap((g) => g.items);

export function navLabel(key: string): string {
  return ALL_ITEMS.find((i) => i.key === key)?.label ?? "Dashboard";
}
