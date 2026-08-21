import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  root: "client",
  base: "/",
  build: {
    outDir: "../public",
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      "/interaction": "http://127.0.0.1:3001",
      "/demo": {
        target: "http://127.0.0.1:3001",
        bypass: (req) => {
          if (req.method === "GET") return req.url;
        }
      }
    },
  },
});