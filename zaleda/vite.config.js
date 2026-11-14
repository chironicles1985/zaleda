import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // Load the whole app (including every performer photo) into the device
      // cache on the first online visit, so it all works with no internet.
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,jpg,jpeg,webp,woff,woff2}'],
        navigateFallback: 'index.html',
      },
      manifest: {
      name: 'ZALEDA 2.0',
      short_name: 'ZALEDA 2.0',
      theme_color: '#0a0a0a',
      background_color: '#0a0a0a',
      display: 'standalone',
      start_url: '/',
      icons: [
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    }),
  ],
})