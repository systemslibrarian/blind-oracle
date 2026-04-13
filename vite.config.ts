import { defineConfig } from 'vite'

export default defineConfig({
  base: '/crypto-lab-blind-oracle/',
  build: { target: 'esnext' },
  optimizeDeps: { exclude: ['tfhe'] },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://blind-oracle-api.onrender.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
})
