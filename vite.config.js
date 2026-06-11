import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  base: "./",   // ← critical: use relative paths so Electron can load
                //   dist/index.html from the filesystem in production

  build: {
    outDir:    "dist",
    emptyOutDir: true,
  },

  server: {
    port:        5173,
    strictPort:  true,   // fail if port is taken so wait-on works reliably
  },
});
