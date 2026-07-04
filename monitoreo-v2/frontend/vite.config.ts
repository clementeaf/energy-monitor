import { defineConfig } from 'vite';
import type { ProxyOptions } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { cspMetaPlugin } from './vite/csp-meta-plugin.ts';

/**
 * Proxy /api requests.
 * Default: localhost:4000 (local backend).
 * To use prod backend without Docker: VITE_API_TARGET=https://power-monitor.cloud npm run dev
 */
const apiTarget = process.env.VITE_API_TARGET || 'http://localhost:4000';
const isRemoteTarget = apiTarget.startsWith('https://');

const apiProxy: Record<string, string | ProxyOptions> = {
  '/api': {
    target: apiTarget,
    changeOrigin: true,
    secure: true,
    // When proxying to prod, rewrite Set-Cookie headers so they work on localhost HTTP.
    // Prod sets __Host- prefix (requires Secure + no Domain) which browsers reject on HTTP.
    ...(isRemoteTarget && {
      cookieDomainRewrite: { '*': '' },
      configure: (proxy) => {
        proxy.on('proxyRes', (proxyRes) => {
          const setCookie = proxyRes.headers['set-cookie'];
          if (!setCookie) return;
          proxyRes.headers['set-cookie'] = setCookie.map((c) =>
            c
              .replace(/__Host-/g, '')      // strip __Host- prefix
              .replace(/;\s*Secure/gi, '')   // strip Secure flag (localhost is HTTP)
              .replace(/;\s*SameSite=\w+/gi, '; SameSite=Lax') // relax for cross-origin proxy
          );
        });
      },
    }),
  },
};

export default defineConfig({
  plugins: [react(), tailwindcss(), cspMetaPlugin()],
  server: {
    host: 'localhost',
    port: 5173,
    // Sin COOP en el dev server: evita avisos de window.closed (HMR + OAuth popup de Google).
    // El API (Nest) envía same-origin-allow-popups vía Helmet para las respuestas /api.
    proxy: apiProxy,
  },
  preview: {
    proxy: apiProxy,
  },
});
