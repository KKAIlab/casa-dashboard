import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/casa-dashboard/',
  server: {
    port: 3000,
  },
  build: {
    // Plotly is by far the largest dependency (~4.5 MB). Pin it to its own
    // chunk so it caches independently and is fetched only when a chart page
    // loads, instead of leaking into an unrelated, confusingly-named chunk.
    chunkSizeWarningLimit: 5000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('plotly.js')) return 'plotly'
          if (id.includes('node_modules')) return 'vendor'
        },
      },
    },
  },
})
