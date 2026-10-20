import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// send /api to the server in development
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    strictPort: true,
    // also open on the wi-fi, so a phone can use http://<laptop ip>:5173
    host: true,
    proxy: {
      "/api": { target: "http://localhost:8881", changeOrigin: false, xfwd: false },
    },
  },
  build: { sourcemap: false, target: "es2022" },
});
