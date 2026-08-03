import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const portFile = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  ".vite-port.json",
);

export default defineConfig({
  base: "./",
  plugins: [
    react(),
    tailwindcss(),
    {
      name: "locus-write-port",
      configureServer(server) {
        server.httpServer?.once("listening", () => {
          const addr = server.httpServer?.address();
          const port = typeof addr === "object" && addr ? addr.port : 5173;
          fs.writeFileSync(portFile, JSON.stringify({ port }));
        });
      },
    },
  ],
  build: { outDir: "dist" },
  server: { port: 5173, strictPort: false },
});
