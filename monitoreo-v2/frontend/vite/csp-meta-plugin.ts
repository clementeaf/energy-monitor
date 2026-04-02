import type { Plugin } from 'vite';
import { loadEnv } from 'vite';
import {
  buildContentSecurityPolicy,
  escapeHtmlAttr,
} from './csp-policy.ts';

/**
 * Inyecta &lt;meta http-equiv="Content-Security-Policy"&gt; solo en build de producción.
 * En `vite` dev no se añade meta (evita romper HMR / ws).
 * Si CloudFront u otro proxy también envía CSP, el navegador aplica la intersección:
 * alinear políticas o quitar CSP duplicado en cabeceras HTTP.
 */
export function cspMetaPlugin(): Plugin {
  let mode = 'production';

  return {
    name: 'csp-meta',
    apply: 'build',
    configResolved(config): void {
      mode = config.mode;
    },
    transformIndexHtml(html): string {
      const env = loadEnv(mode, process.cwd(), '');
      if (env.VITE_CSP_DISABLED === 'true') {
        return html;
      }
      const csp = buildContentSecurityPolicy({
        VITE_API_BASE_URL: env.VITE_API_BASE_URL,
        VITE_CSP_EXTRA_CONNECT: env.VITE_CSP_EXTRA_CONNECT,
      });
      const meta = `    <meta http-equiv="Content-Security-Policy" content="${escapeHtmlAttr(csp)}" />\n`;
      return html.replace('</head>', `${meta}</head>`);
    },
  };
}
