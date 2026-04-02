import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { cspMetaPlugin } from './vite/csp-meta-plugin.ts';

export default defineConfig({
  plugins: [react(), tailwindcss(), cspMetaPlugin()],
  server: {
    port: 5173,
    // Sin COOP en el dev server: evita avisos de window.closed (HMR + OAuth popup de Google).
    // El API (Nest) envía same-origin-allow-popups vía Helmet para las respuestas /api.
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
