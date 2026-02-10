import type { NextConfig } from "next";

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
};

export default nextConfig;
