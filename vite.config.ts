import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const base = env.VITE_BASE_PATH || '/'

  return {
    base,
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      proxy: {
        // 将前端 /dev-api/** 代理到后端 8080
        '/dev-api': {
          target: 'http://localhost:8080',
          changeOrigin: true,
          // 若后端无自定义 context-path，则直接去掉前缀；如需自定义请改此处
          rewrite: (p) => p.replace(/^\/dev-api/, ''),
        },
      },
    },
  }
})
