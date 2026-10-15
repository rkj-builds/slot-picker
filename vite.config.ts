import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig(({ command, isPreview }) => ({
  // GitHub Pages serves the build from /slot-picker/ (and so does `vite preview`); dev and tests stay at the root.
  base: command === "build" || isPreview ? "/slot-picker/" : "/",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    css: false,
    // Pin the process zone so "local time" in tests never depends on the laptop.
    env: { TZ: "UTC" },
  },
}));
