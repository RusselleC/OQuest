import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Split vendor dependencies
          if (id.includes('node_modules')) {
            if (id.includes('firebase')) {
              return 'firebase-vendor';
            }
            return 'vendor';
          }
          // Keep main app together but allow dynamic imports
          if (id.includes('src/App.jsx')) {
            return 'app';
          }
        }
      }
    }
  }
})
