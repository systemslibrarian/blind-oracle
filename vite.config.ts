import { defineConfig } from 'vite'

export default defineConfig({
  base:
    process.env.VITE_BASE_PATH ??
    (process.env.GITHUB_ACTIONS === 'true' && process.env.GITHUB_REPOSITORY
      ? `/${process.env.GITHUB_REPOSITORY.split('/')[1]}/`
      : '/'),
  build: { target: 'esnext' },
  optimizeDeps: { exclude: ['tfhe'] },
  server: { port: 5173 }
})
