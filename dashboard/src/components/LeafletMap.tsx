"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Bin, binLatLng, binLevel } from "@/lib/fleet";
import { levelColor } from "@/lib/types";

// Both tile sources are free and need NO API key / account — only attribution.
const TILES = {
  light: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; OpenStreetMap contributors',
    subdomains: "abc",
  },
  dark: {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    subdomains: "abcd",
  },
};

function iconFor(b: Bin): L.DivIcon {
  const color = levelColor[binLevel(b)];
  const full = b.online && b.fill >= 80;
  const label = b.online ? `${b.fill}` : "—";
  return L.divIcon({
    className: "",
    html: `<div class="mp ${full ? "mp-full" : ""} ${b.isReal ? "mp-live" : ""}" style="--c:${color}"><span>${label}</span></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

type Entry = { marker: L.Marker; level: string; online: boolean };

export default function LeafletMap({ bins, dark, onSelect }: { bins: Bin[]; dark: boolean; onSelect: (id: string) => void }) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileRef = useRef<L.TileLayer | null>(null);
  const markersRef = useRef<Map<string, Entry>>(new Map());
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  // init once
  useEffect(() => {
    if (!elRef.current || mapRef.current) return;
    const map = L.map(elRef.current, { zoomControl: true, attributionControl: true, scrollWheelZoom: true });
    mapRef.current = map;
    const pts = bins.map(binLatLng);
    if (pts.length) map.fitBounds(pts as [number, number][], { padding: [40, 40] });
    else map.setView([17.447, 78.3772], 13);
    const conf = dark ? TILES.dark : TILES.light;
    tileRef.current = L.tileLayer(conf.url, { attribution: conf.attribution, subdomains: conf.subdomains, maxZoom: 19 }).addTo(map);
    setTimeout(() => map.invalidateSize(), 120);
    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = new Map();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // swap tiles on theme change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (tileRef.current) map.removeLayer(tileRef.current);
    const conf = dark ? TILES.dark : TILES.light;
    tileRef.current = L.tileLayer(conf.url, { attribution: conf.attribution, subdomains: conf.subdomains, maxZoom: 19 }).addTo(map);
  }, [dark]);

  // sync markers with the fleet
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const markers = markersRef.current;
    const seen = new Set<string>();
    bins.forEach((b) => {
      seen.add(b.id);
      const level = binLevel(b);
      const existing = markers.get(b.id);
      const tip = `${b.name} — ${b.online ? b.fill + "% full" : "offline"}`;
      if (!existing) {
        const m = L.marker(binLatLng(b), { icon: iconFor(b) }).addTo(map);
        m.bindTooltip(tip, { direction: "top", offset: [0, -12] });
        m.on("click", () => onSelectRef.current(b.id));
        markers.set(b.id, { marker: m, level, online: b.online });
      } else {
        if (existing.level !== level || existing.online !== b.online) {
          existing.marker.setIcon(iconFor(b));
          existing.level = level;
          existing.online = b.online;
        }
        existing.marker.setTooltipContent(tip);
      }
    });
    markers.forEach((v, k) => {
      if (!seen.has(k)) {
        map.removeLayer(v.marker);
        markers.delete(k);
      }
    });
  }, [bins]);

  return <div ref={elRef} className="h-[460px] w-full lg:h-[560px]" />;
}
