import { defineConfig } from 'vite';
import type { ProxyOptions } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { cspMetaPlugin } from './vite/csp-meta-plugin.ts';

/**
 * Reenvía /api al backend Nest (puerto 4000). Mismo mapa en dev y preview para evitar 404 en /api/*.
 */
const apiProxy: Record<string, string | ProxyOptions> = {
  '/api': {
    target: 'https://power-monitor.cloud',
    changeOrigin: true,
    secure: true,
  },
};

export default defineConfig({
  plugins: [react(), tailwindcss(), cspMetaPlugin()],
  server: {
    port: 5173,
    // Sin COOP en el dev server: evita avisos de window.closed (HMR + OAuth popup de Google).
    // El API (Nest) envía same-origin-allow-popups vía Helmet para las respuestas /api.
    proxy: apiProxy,
  },
  preview: {
    proxy: apiProxy,
  },
});
