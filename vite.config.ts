import { defineConfig } from 'vite'

// Base path is overridable via VITE_BASE_PATH so the GitHub Pages workflow can
// derive it from the repository name. Falls back to the canonical project path.
const base = process.env.VITE_BASE_PATH ?? '/crypto-lab-blind-oracle/'

export default defineConfig({
  base,
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
