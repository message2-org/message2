import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const root = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8")) as { version: string };

export default defineConfig({
  base: process.env.VITE_BASE ?? "/",
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version)
  },
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/messaging": {
        target: "http://localhost:4000",
        changeOrigin: true
      },
      "/media": {
        target: "http://localhost:4000",
        changeOrigin: true
      }
    }
  }
});
