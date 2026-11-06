import { ComponentType } from "react";
import { ScreenProps } from "@/lib/fleet";
import { DashboardScreen, MonitoringScreen, BinDetailsScreen, LiveMapScreen } from "./monitor";
import { AlertsScreen, CollectionScreen, TeamScreen } from "./operations";
import { VoiceScreen, ChatScreen } from "./assistant";
import { AnalyticsScreen } from "./insights";
import { DeviceHealthScreen, DiagnosticsScreen } from "./devices";
import { UsersScreen, RolesScreen, ApiScreen, NotifSettingsScreen, SettingsScreen } from "./admin";

export const SCREENS: Record<string, ComponentType<ScreenProps>> = {
  dashboard: DashboardScreen,
  monitoring: MonitoringScreen,
  "bin-details": BinDetailsScreen,
  map: LiveMapScreen,
  alerts: AlertsScreen,
  collection: CollectionScreen,
  team: TeamScreen,
  voice: VoiceScreen,
  chat: ChatScreen,
  analytics: AnalyticsScreen,
  "device-health": DeviceHealthScreen,
  diagnostics: DiagnosticsScreen,
  users: UsersScreen,
  roles: RolesScreen,
  api: ApiScreen,
  "notif-settings": NotifSettingsScreen,
  settings: SettingsScreen,
};
