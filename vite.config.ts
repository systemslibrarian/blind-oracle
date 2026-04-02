import { defineConfig } from 'vite'

export default defineConfig({
  base: '/blind-oracle/',
  build: { target: 'esnext' },
  optimizeDeps: { exclude: ['tfhe'] },
  server: { port: 5173 }
})
