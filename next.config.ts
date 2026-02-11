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
        // Rule 1: Aggressive no-store for documents only
        // Excludes static assets/API to preserve their standard caching behavior
        source: "/((?!_next/static|_next/image|api|favicon.ico).*)",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate, proxy-revalidate",
          },
          { key: "Pragma", value: "no-cache" },
          { key: "Expires", value: "0" },
          { key: "x-app-version", value: BUILD_VERSION },
        ],
      },
    ];
  },
};

export default nextConfig;
