// Base URL of the Smart Dustbin backend API.
// Defaults to the local backend on the LAN (this PC running smart-dustbin/app.py),
// so the dashboard and the ESP32 report to the same server. Override at build/dev
// time with NEXT_PUBLIC_API_BASE — e.g. NEXT_PUBLIC_API_BASE=http://37.27.53.14:8031
// for the deployed server, or "" when the backend serves this UI from the same origin.
export const API_BASE = (process.env.NEXT_PUBLIC_API_BASE ?? "http://192.168.1.59:5000").replace(/\/$/, "");

/** Build a full API URL, e.g. api("/api/status"). */
export const api = (path: string) => `${API_BASE}${path}`;
