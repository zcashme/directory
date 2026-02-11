import type { NextConfig } from "next";

// Generated once at build/start time — used as a diagnostic version identifier
const BUILD_VERSION = new Date().toISOString();

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {},
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/i,
      type: "asset/resource",
    });
    return config;
  },

  async headers() {
    return [
      {
        // Apply to all document/page routes, but NOT to:
        // - _next/static (hashed immutable JS/CSS — safe to cache)
        // - _next/image  (optimized images)
        // - api routes   (manage their own caching)
        // - favicon.ico
        source: "/((?!_next/static|_next/image|api|favicon.ico).*)",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate, proxy-revalidate",
          },
          { key: "Pragma", value: "no-cache" },
          { key: "Expires", value: "0" },
          // TEMPORARY: Remove after one deploy. Forces browsers to drop
          // their disk cache for this origin. Does NOT clear cookies/storage.
          { key: "Clear-Site-Data", value: '"cache"' },
          // Diagnostic: curl -I to confirm which version is live
          { key: "x-app-version", value: BUILD_VERSION },
        ],
      },
    ];
  },
};

export default nextConfig;
