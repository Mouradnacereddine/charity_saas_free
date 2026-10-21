/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // `server/src/**` : la politique de date vit côté serveur
    // (`server/src/lib/datePolicy.ts`) et n'a aucun import, donc testable ici
    // avec la même config que le front. Sans ce motif elle ne serait jamais
    // collectée, et son test resterait vert sans jamais s'exécuter.
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'server/src/**/*.{test,spec}.ts'],
    css: false,
  },
})
