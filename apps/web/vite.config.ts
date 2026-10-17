import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
      "next/link": path.resolve(import.meta.dirname, "./src/lib/navigation.tsx"),
      "next/navigation": path.resolve(import.meta.dirname, "./src/lib/navigation.tsx"),
    },
  },
  define: {
    "process.env": {},
  },
  server: {
    port: 3000,
    proxy: {
      "/v1": {
        target: process.env.VITE_API_URL || "http://127.0.0.1:8080",
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
