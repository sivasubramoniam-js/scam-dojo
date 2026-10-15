import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import path from "path";

export default defineConfig({
  plugins: [react() as any, tsconfigPaths() as any],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
      "next/link": path.resolve(import.meta.dirname, "./src/lib/navigation.tsx"),
      "next/navigation": path.resolve(import.meta.dirname, "./src/lib/navigation.tsx"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/tests/setup.ts"],
  },
});
