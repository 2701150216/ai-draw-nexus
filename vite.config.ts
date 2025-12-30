import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
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
        rewrite: (p) => p.replace(/^\/dev-api/, ''),
      },
    },
  },
})
