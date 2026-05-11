import type { NextConfig } from "next";

// Generated once at build/start time — used as a diagnostic version identifier
const BUILD_VERSION = new Date().toISOString();

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {},
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "fpwrazvgrmatlajjzdiq.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
  async headers() {
    return [
      {
        // Global security headers (applied to all routes)
        source: "/(.*)",
        headers: [
          // Clickjacking protection: prevent framing by external sites
          { key: "X-Frame-Options", value: "DENY" },
          // CSP frame-ancestors (modern clickjacking defense)
          { key: "Content-Security-Policy", value: "frame-ancestors 'none';" },
          // Prevent MIME-type sniffing (UI redressing attacks)
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
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
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "zcashna.me" }],
        destination: "https://www.zcashnames.com/:path*",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.zcashna.me" }],
        destination: "https://www.zcashnames.com/:path*",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: "zcashname.com" }],
        destination: "https://www.zcashnames.com/:path*",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.zcashname.com" }],
        destination: "https://www.zcashnames.com/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
