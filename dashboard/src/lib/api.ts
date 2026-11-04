// Base URL of the Smart Dustbin backend API.
// Defaults to the deployed server; override at build/dev time with NEXT_PUBLIC_API_BASE
// (e.g. NEXT_PUBLIC_API_BASE=http://localhost:5000 for a local backend, or "" when the
// backend serves this UI from the same origin).
export const API_BASE = (process.env.NEXT_PUBLIC_API_BASE ?? "http://37.27.53.14:8031").replace(/\/$/, "");

/** Build a full API URL, e.g. api("/api/status"). */
export const api = (path: string) => `${API_BASE}${path}`;
