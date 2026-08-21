import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  envDir: "..",
  resolve: { alias: { "@": path.resolve(currentDirectory, "./src") } },
  server: { port: 5173 },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("@tanstack")) return "query-vendor";
          if (id.includes("react-hook-form") || id.includes("zod")) return "forms-vendor";
          if (id.includes("axios")) return "http-vendor";
          if (id.includes("lucide-react")) return "icons-vendor";
          if (id.includes("react")) return "react-vendor";
          return undefined;
        },
      },
    },
  },
});
