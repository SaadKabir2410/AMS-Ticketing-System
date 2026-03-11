import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      "/.well-known": {
        target: "https://sureze.ddns.net:3333",
        changeOrigin: true,
        secure: false,
      },
      "/api": {
        target: "https://sureze.ddns.net:3333",
        changeOrigin: true,
        secure: false,
      },
      "/connect": {
        target: "https://sureze.ddns.net:3333",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
