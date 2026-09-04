import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url)))

// Baked in at build time so the running app can always say exactly which
// commit it was built from — a human-readable version number alone can be
// forgotten to bump, but a commit hash can't drift from what's deployed.
function commitHash() {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim()
  } catch {
    return 'unknown'
  }
}

export default defineConfig({
  base: '/',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __COMMIT_HASH__: JSON.stringify(commitHash()),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png'],
      manifest: {
        name: 'Pronto — Real Italian for Real Life',
        short_name: 'Pronto',
        description: 'Learn Italian you can actually use — order the water, ask for the bill, find the bathroom.',
        theme_color: '#ff5a36',
        background_color: '#fff8f1',
        display: 'standalone',
        // No orientation lock — iPad users rotate to landscape constantly,
        // and a portrait lock actively fights that.
        orientation: 'any',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          {
            name: 'Continue Lesson',
            short_name: 'Continue',
            description: 'Jump straight back into your next lesson',
            url: '/?action=continue',
            icons: [{ src: '/pwa-192.png', sizes: '192x192', type: 'image/png' }],
          },
          {
            name: 'Call Volpe',
            short_name: 'Call Volpe',
            description: 'Practice a spoken conversation in Italian',
            url: '/?action=call',
            icons: [{ src: '/pwa-192.png', sizes: '192x192', type: 'image/png' }],
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
      },
    }),
  ],
})
