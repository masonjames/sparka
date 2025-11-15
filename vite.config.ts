// vite.config.ts
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    tsconfigPaths(),
  ],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3006",
        changeOrigin: true,
        ws: true,
      },
    },
  },
});