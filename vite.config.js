import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    rollupOptions: {
      input: {
        // Main Capital Connect site.
        main: resolve(__dirname, 'index.html'),
        // Standalone Chrome-style dinosaur game (iPad friendly).
        dino: resolve(__dirname, 'dino.html'),
      },
    },
  },
})
