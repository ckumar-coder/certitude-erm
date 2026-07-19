import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Builds straight into ../public so `node server.js` can serve the
// compiled SPA, and proxies /api during local dev to the Express
// server on :3000.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../public',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
