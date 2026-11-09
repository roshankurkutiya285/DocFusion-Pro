import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('pdfjs-dist')) {
            return 'pdfjs'
          }
          if (id.includes('pdf-lib')) {
            return 'pdflib'
          }
          if (id.includes('jszip')) {
            return 'jszip'
          }
          if (id.includes('tesseract.js')) {
            return 'tesseract'
          }
        },
      },
    },
  },
})
