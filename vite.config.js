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
      "/get-list-by-lookup-code": {
        target: "https://sureze.ddns.net:3333",
        changeOrigin: true,
        secure: false,
      },
      "/get-list-by-lookup-codes": {
        target: "https://sureze.ddns.net:3333",
        changeOrigin: true,
        secure: false,
      },
    },
  },

  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React runtime — changes rarely, gets cached aggressively
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          // MUI — very large, worth its own cache bucket
          "vendor-mui": [
            "@mui/material",
            "@mui/icons-material",
            "@mui/x-data-grid",
            "@mui/x-tree-view",
            "@emotion/react",
            "@emotion/styled",
          ],
          // Charts — only loaded on pages that use them
          "vendor-charts": ["recharts"],
          // Utility libraries
          "vendor-utils": ["axios", "qs", "clsx", "tailwind-merge", "framer-motion"],
          // Drag-and-drop
          "vendor-dnd": ["@dnd-kit/core", "@dnd-kit/sortable", "@dnd-kit/utilities"],
          // Excel/export — only needed for export actions
          "vendor-excel": ["exceljs", "file-saver", "xlsx"],
          // Date pickers
          "vendor-dates": ["flatpickr", "react-flatpickr"],
        },
      },
    },
    // Increase the warning threshold slightly for large vendor chunks
    chunkSizeWarningLimit: 1000,
  },

  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "@mui/material",
      "@mui/icons-material",
      "axios",
      "lucide-react",
    ],
  },
});
