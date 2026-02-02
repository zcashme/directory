const path = require('path');
const parentDir = path.resolve(__dirname, '..');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: parentDir,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'fpwrazvgrmatlajjzdiq.supabase.co' },
    ],
  },
  webpack: (config) => {
    config.resolve.alias['@'] = parentDir;
    config.module.rules.push({
      test: /\.svg$/i,
      type: 'asset/resource',
    });
    return config;
  },
};

module.exports = nextConfig;
