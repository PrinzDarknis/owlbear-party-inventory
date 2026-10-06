/// <reference types="vitest/config" />
// Add one input per HTML entry (Owlbear iframe context).
import { resolve } from "path";
import { defineConfig } from "vite";

import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "",
  server: {
    cors: {
      // never "*": only Owlbear may load the dev build
      origin: "https://www.owlbear.rodeo",
    },
  },
  build: {
    rollupOptions: {
      input: {
        popover: resolve(__dirname, "html", "popover.html"),
        background: resolve(__dirname, "html", "background.html"),
      },
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
