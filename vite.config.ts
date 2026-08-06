import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// 说明：本地 OSRM 的跨域由 docker-compose 中的 nginx 网关（:5000）返回
// Access-Control-Allow-Origin 解决，前端直接访问 http://localhost:5000，
// 因此此处无需 Vite 代理。详见 docker-compose.yml 与 nginx-osrm.conf。
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: true,
    port: 5173,
  },
});
