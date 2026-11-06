"use client";

import { useEffect, useRef, useState } from "react";
import { BinStatus, EventItem, Level, Point, Stats } from "@/lib/types";

// ------------------------------------------------------------------
// Fleet model — one real bin (BIN-A1, wired to the live backend) plus a
// simulated fleet across generic city sectors, drifting in real time.
// ------------------------------------------------------------------

export type BinType = "General" | "Recycling" | "Organic";

export type Bin = {
  id: string;
  name: string;
  sector: string;
  zone: string; // Central | North | East | South | West
  x: number; // map position, viewBox 0..100 (x) / 0..62 (y)
  y: number;
  fill: number;
  distanceCm: number;
  capacityL: number;
  battery: number; // %
  rssi: number; // dBm
  tempC: number;
  fillRate: number; // % per hour
  team: string;
  type: BinType;
  online: boolean;
  sensorOk: boolean;
  lastUpdateS: number; // seconds since last reading
  isReal?: boolean;
};

type Seed = Omit<Bin, "distanceCm"> & { distanceCm?: number };

const SEED: Seed[] = [
  { id: "BIN-A1", name: "Central Plaza", sector: "Sector 1", zone: "Central", x: 50, y: 30, fill: 85, capacityL: 120, battery: 92, rssi: -54, tempC: 31, fillRate: 3.4, team: "Team Alpha", type: "General", online: true, sensorOk: true, lastUpdateS: 8, isReal: true },
  { id: "BIN-A2", name: "Civic Center", sector: "Sector 2", zone: "Central", x: 44, y: 24, fill: 64, capacityL: 120, battery: 88, rssi: -61, tempC: 32, fillRate: 4.1, team: "Team Alpha", type: "Recycling", online: true, sensorOk: true, lastUpdateS: 12 },
  { id: "BIN-F1", name: "Riverside Walk", sector: "Sector 3", zone: "Central", x: 57, y: 37, fill: 29, capacityL: 240, battery: 90, rssi: -58, tempC: 30, fillRate: 2.2, team: "Team Alpha", type: "Organic", online: true, sensorOk: true, lastUpdateS: 7 },
  { id: "BIN-B1", name: "North Market Sq", sector: "Sector 4", zone: "North", x: 38, y: 10, fill: 83, capacityL: 240, battery: 76, rssi: -67, tempC: 33, fillRate: 6.0, team: "Team Bravo", type: "General", online: true, sensorOk: true, lastUpdateS: 19 },
  { id: "BIN-B2", name: "North Transit Hub", sector: "Sector 5", zone: "North", x: 52, y: 8, fill: 48, capacityL: 120, battery: 81, rssi: -59, tempC: 31, fillRate: 4.8, team: "Team Bravo", type: "General", online: true, sensorOk: true, lastUpdateS: 24 },
  { id: "BIN-F2", name: "Stadium North", sector: "Sector 6", zone: "North", x: 62, y: 14, fill: 95, capacityL: 120, battery: 69, rssi: -72, tempC: 34, fillRate: 7.1, team: "Team Bravo", type: "General", online: true, sensorOk: true, lastUpdateS: 9 },
  { id: "BIN-C1", name: "East Park Gate", sector: "Sector 7", zone: "East", x: 78, y: 24, fill: 22, capacityL: 120, battery: 90, rssi: -55, tempC: 29, fillRate: 1.9, team: "Team Charlie", type: "Organic", online: true, sensorOk: true, lastUpdateS: 15 },
  { id: "BIN-C2", name: "East Mall Entrance", sector: "Sector 8", zone: "East", x: 86, y: 34, fill: 71, capacityL: 240, battery: 84, rssi: -63, tempC: 32, fillRate: 5.3, team: "Team Charlie", type: "Recycling", online: true, sensorOk: true, lastUpdateS: 33 },
  { id: "BIN-G1", name: "Tech Park East", sector: "Sector 9", zone: "East", x: 72, y: 42, fill: 57, capacityL: 120, battery: 15, rssi: -78, tempC: 35, fillRate: 4.4, team: "Team Charlie", type: "General", online: true, sensorOk: false, lastUpdateS: 41 },
  { id: "BIN-D1", name: "South Bus Depot", sector: "Sector 10", zone: "South", x: 46, y: 54, fill: 88, capacityL: 240, battery: 47, rssi: -80, tempC: 33, fillRate: 5.9, team: "Team Delta", type: "General", online: true, sensorOk: true, lastUpdateS: 28 },
  { id: "BIN-D2", name: "South Garden", sector: "Sector 11", zone: "South", x: 58, y: 50, fill: 12, capacityL: 120, battery: 94, rssi: -52, tempC: 28, fillRate: 1.4, team: "Team Delta", type: "Organic", online: true, sensorOk: true, lastUpdateS: 11 },
  { id: "BIN-G2", name: "Harbor South", sector: "Sector 12", zone: "South", x: 40, y: 48, fill: 69, capacityL: 120, battery: 0, rssi: -99, tempC: 0, fillRate: 0, team: "Team Delta", type: "General", online: false, sensorOk: false, lastUpdateS: 5400 },
  { id: "BIN-E1", name: "West Metro Stn", sector: "Sector 13", zone: "West", x: 14, y: 30, fill: 78, capacityL: 120, battery: 58, rssi: -75, tempC: 32, fillRate: 5.1, team: "Team Echo", type: "General", online: true, sensorOk: true, lastUpdateS: 22 },
  { id: "BIN-E2", name: "West Bazaar", sector: "Sector 14", zone: "West", x: 20, y: 44, fill: 34, capacityL: 240, battery: 86, rssi: -60, tempC: 30, fillRate: 3.0, team: "Team Echo", type: "Recycling", online: true, sensorOk: true, lastUpdateS: 17 },
];

export const ZONES = ["Central", "North", "East", "South", "West"] as const;
export const TEAMS = ["Team Alpha", "Team Bravo", "Team Charlie", "Team Delta", "Team Echo"] as const;

export function binLevel(b: Bin): Level {
  if (!b.online) return "idle";
  if (b.fill >= 80) return "critical";
  if (b.fill >= 50) return "warning";
  return "good";
}

export function binStatusLabel(b: Bin): string {
  if (!b.online) return "Offline";
  if (!b.sensorOk) return "Sensor fault";
  if (b.fill >= 80) return "Full";
  if (b.fill >= 50) return "Almost full";
  return "Available";
}

function fillFromDistance(fill: number, capacityL: number): number {
  // purely cosmetic distance figure derived from fill (sensor depth ~ emptier)
  const depth = 40 - (fill / 100) * 35;
  return Math.max(4, Math.round(depth * 10) / 10) + (capacityL > 200 ? 10 : 0);
}

function withDistance(s: Seed): Bin {
  return { ...s, distanceCm: s.distanceCm ?? fillFromDistance(s.fill, s.capacityL) };
}

/**
 * Live fleet: seeds the simulated bins, then every 3s nudges fills upward,
 * empties bins that hit capacity (a "collection"), and jitters battery/signal
 * so the fleet reads as live. BIN-A1 is overwritten with the real backend bin.
 */
export function useFleet(real: { fill: number; online: boolean; sensorOk: boolean; distanceCm: number; lastUpdateS: number } | null): Bin[] {
  const [bins, setBins] = useState<Bin[]>(() => SEED.map(withDistance));
  const realRef = useRef(real);
  realRef.current = real;

  useEffect(() => {
    const id = setInterval(() => {
      setBins((prev) =>
        prev.map((b) => {
          if (b.isReal && realRef.current?.online) return b; // live device → merge effect owns it; else simulate a demo bin
          if (!b.online) return { ...b, lastUpdateS: b.lastUpdateS + 3 };
          let fill = b.fill;
          // the demo "live" bin climbs a bit faster so the collection truck shows regularly
          const boost = b.isReal ? 4 : 1;
          const step = b.sensorOk ? Math.random() * (b.fillRate / 20 + 0.6) * boost : 0;
          // A bin that was at 100% last tick gets collected now (emptied);
          // otherwise it keeps filling and holds at a visible 100% when full,
          // which is what triggers the garbage-collection animation.
          if (b.fill >= 100) fill = Math.random() * 10 + 4;
          else fill = Math.min(100, fill + step);
          const battery = Math.max(0, b.battery - (Math.random() < 0.1 ? 1 : 0));
          const rssi = Math.min(-45, Math.max(-85, b.rssi + Math.round((Math.random() - 0.5) * 4)));
          return {
            ...b,
            fill: Math.round(fill),
            distanceCm: fillFromDistance(fill, b.capacityL),
            battery,
            rssi,
            online: battery > 3,
            lastUpdateS: Math.max(2, Math.round(Math.random() * 30)),
          };
        }),
      );
    }, 3000);
    return () => clearInterval(id);
  }, []);

  // merge the real backend bin into BIN-A1 whenever it changes
  useEffect(() => {
    setBins((prev) =>
      prev.map((b) => {
        if (!b.isReal) return b;
        const r = realRef.current;
        if (!r || !r.online) return b; // no live ESP32 → leave BIN-A1 to the simulation
        return {
          ...b,
          fill: r.fill,
          online: r.online,
          sensorOk: r.sensorOk,
          distanceCm: r.distanceCm,
          lastUpdateS: r.lastUpdateS,
        };
      }),
    );
  }, [real?.fill, real?.online, real?.sensorOk, real?.distanceCm, real?.lastUpdateS]);

  return bins;
}

// ------------------------------------------------------------------
// Shared app-shell types passed down to every screen.
// ------------------------------------------------------------------

export type LinkState = "connecting" | "server-offline" | "waiting" | "sensor-fault" | "stale" | "live";

export type LiveBundle = {
  data: BinStatus | null;
  points: Point[];
  stats: Stats | null;
  events: EventItem[];
  link: LinkState;
  latencyMs: number | null;
  serverUp: boolean;
  live: boolean;
  perm: string;
  sound: boolean;
  onReset: () => void;
  onTest: () => void;
  onEnableNotif: () => void;
  onToggleSound: () => void;
};

export type ScreenProps = {
  bins: Bin[];
  live: LiveBundle;
  now: number;
  theme: "auto" | "light" | "dark";
  goto: (key: string) => void;
  selectedBinId: string;
  selectBin: (id: string) => void;
};

// Map center + span for geo-placing the fleet on a real tiled map.
// Change CENTER to your actual deployment city; bins spread within SPAN.
export const MAP_CENTER = { lat: 17.447, lng: 78.3772 };
export const MAP_SPAN = { lat: 0.055, lng: 0.07 };

export function binLatLng(b: Bin): [number, number] {
  const lat = MAP_CENTER.lat + (0.5 - b.y / 62) * MAP_SPAN.lat;
  const lng = MAP_CENTER.lng + (b.x / 100 - 0.5) * MAP_SPAN.lng;
  return [lat, lng];
}
