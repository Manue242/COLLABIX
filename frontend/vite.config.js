import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const backendHttp = process.env.VITE_BACKEND_URL || 'http://localhost:8000'
const backendWs = backendHttp.replace('http', 'ws')
const aiHttp = process.env.VITE_AI_URL || 'http://localhost:8080'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api':     { target: backendHttp, changeOrigin: true },
      '/auth':    { target: backendHttp, changeOrigin: true },
      '/videos':  { target: backendHttp, changeOrigin: true },
      '/hls':     { target: backendHttp, changeOrigin: true },
      '/ws':      { target: backendWs,  ws: true, changeOrigin: true },
      '/process': { target: aiHttp,     changeOrigin: true },
      '/search':  { target: aiHttp,     changeOrigin: true },
    },
  },
})
