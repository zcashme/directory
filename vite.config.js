import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      workbox: {
        clientsClaim: true,
        skipWaiting: true,
        cleanupOutdatedCaches: true,
      },
      includeAssets: [
        "favicon.ico",
        "icon-192.png",
        "icon-512.png",
        "icon-512-maskable.png"
      ],
      manifest: {
        name: "Zcash.me",
        short_name: "ZcashMe",
        description: "Decentralized Zcash messaging & sign-in via memo",
        start_url: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#ffffff",
        icons: [
          {
            src: "icon-192.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png"
          },
          {
            src: "icon-512-maskable.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable"
          }
        ]
      }
    })
  ],

  esbuild: {
    drop: ["console", "debugger"]
  },

  server: {
    historyApiFallback: true
  },
  build: {
    rollupOptions: {
      input: "index.html"
    }
  }
});
