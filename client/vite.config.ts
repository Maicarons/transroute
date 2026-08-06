import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 开发时通过代理把 /api 与 /ws 转发到 Go 后端（默认 :8080）。
// 生产构建产物（dist/）交由 Go 后端直接托管，因此前端 API 使用同源相对路径。
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:8080', changeOrigin: true },
      '/ws': { target: 'ws://localhost:8080', ws: true },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
