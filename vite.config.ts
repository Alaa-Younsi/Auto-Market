import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: "es2022",
    rollupOptions: {
      output: {
        // Stable vendor chunks: app deploys don't bust the framework cache.
        // (Rolldown-Vite only supports the function form.)
        manualChunks(id: string) {
          if (!id.includes("node_modules")) return undefined;
          if (/[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(id)) {
            return "react";
          }
          if (id.includes("framer-motion") || id.includes("motion-")) return "motion";
          if (id.includes("@supabase") || id.includes("@tanstack")) return "data";
          return undefined;
        },
      },
    },
  },
});
