import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
server: {
    historyApiFallback: true, // 👈 ensures all routes go to index.html
  },
  build: {
    rollupOptions: {
      input: "index.html",
    },
  },
});


