import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

const clientRoot = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  root: clientRoot,
  envDir: fileURLToPath(new URL('..', import.meta.url)),
  plugins: [tailwindcss()],
  publicDir: 'public',
  esbuild: {
    jsx: 'automatic',
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
})
