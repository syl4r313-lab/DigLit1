import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        manifest: {
          name: 'DIGITAL LITERACY I SS 2026',
          short_name: 'DL-SS26',
          description: 'Evolution von Maker- und Hackerspaces',
          theme_color: '#050505',
          background_color: '#050505',
          display: 'standalone',
          icons: [
            { src: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&q=80&w=192', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
            { src: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&q=80&w=512', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/images\.unsplash\.com\/.*/i,
              handler: 'CacheFirst',
              options: { cacheName: 'unsplash-images-cache', expiration: { maxEntries: 50, maxAgeSeconds: 2592000 }, cacheableResponse: { statuses: [0, 200] } }
            },
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: { cacheName: 'google-fonts-cache' }
            }
          ]
        }
      })
    ],
    define: { 'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY) },
    base: '/DigLit1/',
    resolve: { alias: { '@': path.resolve(__dirname, '.') } },
    server: { hmr: process.env.DISABLE_HMR !== 'true' }
  };
});
