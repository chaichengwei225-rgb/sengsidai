import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
  ],
  server: {
    proxy: {
      // 只代理 AI 推理接口，不代理 /api/sync-data：
      // 避免本地开发时的写操作污染线上 Netlify Blob 真实数据。
      // npm run dev 会复用已部署的线上 Function；若要调试本地 netlify/functions，
      // 请改用 `npx netlify dev`（默认 8888 端口），并把 target 改成 http://localhost:8888。
      '/api/ai-recommend': {
        target: 'https://sengsidai.netlify.app',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
