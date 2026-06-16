import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // In dev: /api/fifa-rankings -> Vercel dev server or direct fetch
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});
