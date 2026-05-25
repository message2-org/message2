import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      "/messaging": { target: "http://localhost:4000", changeOrigin: true },
      "/access-audit": { target: "http://localhost:4000", changeOrigin: true }
    }
  }
});
