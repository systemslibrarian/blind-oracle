import { defineConfig } from 'vite'

// Base path is overridable via VITE_BASE_PATH so the GitHub Pages workflow can
// derive it from the repository name. Falls back to the canonical project path.
const base = process.env.VITE_BASE_PATH ?? '/crypto-lab-blind-oracle/'

// TFHE's WASM needs SharedArrayBuffer, which browsers only expose to
// cross-origin-isolated pages. On GitHub Pages that comes from
// public/coi-serviceworker.js; locally (dev AND preview) it has to come from
// real headers, otherwise the demo dead-ends at the SharedArrayBuffer check and
// nothing downstream of boot can be exercised or tested.
const COI_HEADERS = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp'
}

export default defineConfig({
  base,
  build: { target: 'esnext' },
  optimizeDeps: { exclude: ['tfhe'] },
  preview: { headers: COI_HEADERS },
  server: {
    port: 5173,
    headers: COI_HEADERS,
    proxy: {
      '/api': {
        target: 'https://blind-oracle-api.onrender.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
})
