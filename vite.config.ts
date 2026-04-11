import { defineConfig } from 'vite'

export default defineConfig({
  base: '/crypto-lab-blind-oracle/',
  build: { target: 'esnext' },
  optimizeDeps: { exclude: ['tfhe'] },
  server: { port: 5173 }
})
