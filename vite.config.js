import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { readFileSync } from "node:fs";

const { version } = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf-8"),
);

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Shown on the login page: app version and when this build was made.
  define: {
    "import.meta.env.VITE_APP_VERSION": JSON.stringify(version),
    "import.meta.env.VITE_APP_BUILD_DATE": JSON.stringify(new Date().toISOString()),
  },
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
      "/ams-ticket-detail-hub": {
        target: "https://sureze.ddns.net:3333",
        changeOrigin: true,
        secure: false,
        ws: true,
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
      // Backend report templates (labels for the report pages).
      "^/Reports/.*\\.mrt$": {
        target: "https://sureze.ddns.net:3333",
        changeOrigin: true,
        secure: false,
      },
    },
  },

  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.replaceAll("\\", "/");
          const chunkGroups = {
            // Core React runtime — changes rarely, gets cached aggressively
            "vendor-react": ["react", "react-dom", "react-router-dom"],
            // MUI core — the theme is needed at startup. The DataGrid and tree
            // view are left out so they load only with the pages that use them.
            "vendor-mui": [
              "@mui/material",
              "@mui/icons-material",
              "@emotion/react",
              "@emotion/styled",
            ],
            // Charts — only loaded on pages that use them
            "vendor-charts": ["recharts"],
            // Utility libraries
            "vendor-utils": ["axios", "qs", "clsx", "tailwind-merge", "framer-motion"],
            // Drag-and-drop, Excel/PDF export and date pickers are not grouped
            // here: named chunks get pulled into the startup download, while
            // ungrouped they load only with the pages that use them.
          };

          for (const [chunkName, packages] of Object.entries(chunkGroups)) {
            if (packages.some((packageName) =>
              normalizedId.includes(`/node_modules/${packageName}/`),
            )) {
              return chunkName;
            }
          }

          return undefined;
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
