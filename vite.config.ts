/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/retr/', // Базовый путь для GitHub Pages: https://relight123.github.io/retr/
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png', '.nojekyll'],
      manifest: {
        name: 'Paper Trading — симулятор трейдинга',
        short_name: 'Paper',
        description:
          'Торговля криптовалютой на виртуальном счёте с реальными рыночными данными. Без риска.',
        lang: 'ru',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/retr/',
        scope: '/retr/',
        theme_color: '#0B0E14',
        background_color: '#0B0E14',
        categories: ['finance', 'education'],
        icons: [
          {
            src: 'icons/pwa-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Кэшируем только статику приложения (offline-оболочка).
        // Рыночные данные (Binance/Bybit/CoinGecko) НЕ кэшируются.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/(api|icons)\//],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        runtimeCaching: [],
      },
      devOptions: { enabled: false },
    }),
  ],
  build: {
    sourcemap: false,
    chunkSizeWarningLimit: 1200,
  },
  server: {
    host: true, // Доступ с телефона в локальной сети (Wi-Fi)
    port: 5173,
  },
  preview: {
    host: true,
    port: 4173,
  },
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts'],
  },
})
