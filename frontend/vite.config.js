import { defineConfig } from "vite";
import { tmpdir } from "node:os";
import { join } from "node:path";
import react from "@vitejs/plugin-react";
import jsconfigPaths from "vite-jsconfig-paths";
import svgr from "vite-plugin-svgr";
import tailwindcss from "@tailwindcss/vite";

// https://vitejs.dev/config/
export default defineConfig({
  cacheDir: join(tmpdir(), "agro-admin-vite-cache"),
  plugins: [
    react(),
    jsconfigPaths(),
    svgr(),
    tailwindcss(),
  ],
  server: {
    host: "0.0.0.0",
    port: 3002,
    open: true,
  },
});
