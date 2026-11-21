import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/habit-tracker/',
  plugins: [react(), VitePWA({
    registerType: 'autoUpdate',
    scope: '/habit-tracker/',
    includeAssets: ['icons/*.png'],
    manifest: {
      id: '/habit-tracker/',
      name: '習慣トラッカー',
      short_name: '習慣トラッカー',
      description: '自分のペースで続ける、シンプルな習慣トラッカー。',
      lang: 'ja',
      theme_color: '#0b121b',
      background_color: '#0b121b',
      display: 'standalone',
      start_url: '/habit-tracker/',
      scope: '/habit-tracker/',
      icons: [
        { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,png,webmanifest}'],
      navigateFallback: '/habit-tracker/index.html',
      navigateFallbackAllowlist: [/^\/habit-tracker\//],
      cleanupOutdatedCaches: true,
    },
  })],
  test: { include: ['src/**/*.test.{ts,tsx}'], environment: 'jsdom', setupFiles: './src/test/setup.ts' },
})
