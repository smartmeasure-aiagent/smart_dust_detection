import type { NextConfig } from "next";

// The UI calls the backend by its absolute URL (see src/lib/api.ts, NEXT_PUBLIC_API_BASE),
// and the backend allows cross-origin (CORS *), so no dev proxy is needed.
// Production builds a static export that can be served by any static server on any port.
const isDev = process.env.NODE_ENV !== "production";

const nextConfig: NextConfig = isDev ? {} : { output: "export", images: { unoptimized: true } };

export default nextConfig;
