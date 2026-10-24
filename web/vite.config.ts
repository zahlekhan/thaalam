import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [react()],
  resolve: {
    // @strudel/web's dist bundles its own copy of @strudel/core. Use its source so
    // soundfonts and the player share one core.
    alias: { '@strudel/web': fileURLToPath(new URL('./node_modules/@strudel/web/web.mjs', import.meta.url)) },
  },
  server: { port: 5180, proxy: { '/api': 'http://127.0.0.1:8000', '/parties': { target: 'http://127.0.0.1:8787', ws: true } } },
})
