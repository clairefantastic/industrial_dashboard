import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",   // needed inside Docker
    port: 5173,
    proxy: {
      // During development, proxy /api → FastAPI backend
      // so we avoid CORS issues and don't hardcode the backend URL
      "/api": {
        target:      "http://backend:8000",
        changeOrigin: true,
        rewrite:     (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});