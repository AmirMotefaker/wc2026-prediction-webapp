import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // No proxy needed locally — useFIFARankings.js automatically
  // falls back to static teams.json data when /api is unavailable.
  // On Vercel, /api/fifa-rankings is served automatically by the
  // serverless function in api/fifa-rankings.js.
});
