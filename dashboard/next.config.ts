import type { NextConfig } from "next";

// Production: static export served by the FastAPI server (smart-dustbin/app.py).
// Development (npm run dev): proxy /api to the FastAPI server on port 5000.
const isDev = process.env.NODE_ENV !== "production";

const nextConfig: NextConfig = isDev
  ? {
      async rewrites() {
        return [{ source: "/api/:path*", destination: "http://localhost:5000/api/:path*" }];
      },
    }
  : { output: "export", images: { unoptimized: true } };

export default nextConfig;
