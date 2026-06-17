import { defineConfig } from "vite";

export default defineConfig({
  base: process.env.VITE_BASE ?? "/",
  server: {
    port: 5175,
    proxy: {
      "/messaging": {
        target: "http://localhost:4000",
        changeOrigin: true
      }
    }
  }
});
