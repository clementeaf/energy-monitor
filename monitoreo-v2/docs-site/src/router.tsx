import { createBrowserRouter } from 'react-router';
import { DocsLayout } from './layouts/DocsLayout';
import { lazy, Suspense, type ComponentType } from 'react';

function mdxPage(loader: () => Promise<{ default: ComponentType }>) {
  const Lazy = lazy(loader);
  return {
    element: (
      <Suspense fallback={<div className="animate-pulse h-64 bg-[var(--color-bg-secondary)] rounded-lg" />}>
        <Lazy />
      </Suspense>
    ),
  };
}

export const router = createBrowserRouter(
  [
    {
      element: <DocsLayout />,
      children: [
        { index: true, ...mdxPage(() => import('../docs/introduction.mdx')) },
        { path: 'quickstart', ...mdxPage(() => import('../docs/quickstart.mdx')) },
        // Auth
        { path: 'autenticacion/oauth', ...mdxPage(() => import('../docs/autenticacion/oauth.mdx')) },
        { path: 'autenticacion/api-keys', ...mdxPage(() => import('../docs/autenticacion/api-keys.mdx')) },
        { path: 'autenticacion/permisos', ...mdxPage(() => import('../docs/autenticacion/permisos.mdx')) },
        { path: 'autenticacion/versionado', ...mdxPage(() => import('../docs/autenticacion/versionado.mdx')) },
        // Guides
        { path: 'guias/arquitectura', ...mdxPage(() => import('../docs/guias/arquitectura.mdx')) },
        { path: 'guias/multi-tenant', ...mdxPage(() => import('../docs/guias/multi-tenant.mdx')) },
        { path: 'guias/iot', ...mdxPage(() => import('../docs/guias/iot.mdx')) },
        // API Reference
        { path: 'api-reference/overview', ...mdxPage(() => import('../docs/api-reference/overview.mdx')) },
        // Auth endpoints
        { path: 'api-reference/auth/login', ...mdxPage(() => import('../docs/api-reference/auth/login.mdx')) },
        { path: 'api-reference/auth/refresh', ...mdxPage(() => import('../docs/api-reference/auth/refresh.mdx')) },
        { path: 'api-reference/auth/logout', ...mdxPage(() => import('../docs/api-reference/auth/logout.mdx')) },
        { path: 'api-reference/auth/me', ...mdxPage(() => import('../docs/api-reference/auth/me.mdx')) },
        // Buildings
        { path: 'api-reference/buildings/list', ...mdxPage(() => import('../docs/api-reference/buildings/list.mdx')) },
        { path: 'api-reference/buildings/get', ...mdxPage(() => import('../docs/api-reference/buildings/get.mdx')) },
        { path: 'api-reference/buildings/create', ...mdxPage(() => import('../docs/api-reference/buildings/create.mdx')) },
        { path: 'api-reference/buildings/update', ...mdxPage(() => import('../docs/api-reference/buildings/update.mdx')) },
        { path: 'api-reference/buildings/delete', ...mdxPage(() => import('../docs/api-reference/buildings/delete.mdx')) },
        // Meters
        { path: 'api-reference/meters/list', ...mdxPage(() => import('../docs/api-reference/meters/list.mdx')) },
        { path: 'api-reference/meters/get', ...mdxPage(() => import('../docs/api-reference/meters/get.mdx')) },
        { path: 'api-reference/meters/create', ...mdxPage(() => import('../docs/api-reference/meters/create.mdx')) },
        { path: 'api-reference/meters/update', ...mdxPage(() => import('../docs/api-reference/meters/update.mdx')) },
        { path: 'api-reference/meters/delete', ...mdxPage(() => import('../docs/api-reference/meters/delete.mdx')) },
        // Readings
        { path: 'api-reference/readings/timeseries', ...mdxPage(() => import('../docs/api-reference/readings/timeseries.mdx')) },
        { path: 'api-reference/readings/latest', ...mdxPage(() => import('../docs/api-reference/readings/latest.mdx')) },
        { path: 'api-reference/readings/aggregated', ...mdxPage(() => import('../docs/api-reference/readings/aggregated.mdx')) },
        // Alerts
        { path: 'api-reference/alerts/list', ...mdxPage(() => import('../docs/api-reference/alerts/list.mdx')) },
        { path: 'api-reference/alerts/get', ...mdxPage(() => import('../docs/api-reference/alerts/get.mdx')) },
        { path: 'api-reference/alerts/acknowledge', ...mdxPage(() => import('../docs/api-reference/alerts/acknowledge.mdx')) },
        { path: 'api-reference/alerts/resolve', ...mdxPage(() => import('../docs/api-reference/alerts/resolve.mdx')) },
        // Invoices
        { path: 'api-reference/invoices/list', ...mdxPage(() => import('../docs/api-reference/invoices/list.mdx')) },
        { path: 'api-reference/invoices/get', ...mdxPage(() => import('../docs/api-reference/invoices/get.mdx')) },
        { path: 'api-reference/invoices/create', ...mdxPage(() => import('../docs/api-reference/invoices/create.mdx')) },
        { path: 'api-reference/invoices/generate', ...mdxPage(() => import('../docs/api-reference/invoices/generate.mdx')) },
        { path: 'api-reference/invoices/approve', ...mdxPage(() => import('../docs/api-reference/invoices/approve.mdx')) },
        { path: 'api-reference/invoices/pdf', ...mdxPage(() => import('../docs/api-reference/invoices/pdf.mdx')) },
        // Tariffs
        { path: 'api-reference/tariffs/list', ...mdxPage(() => import('../docs/api-reference/tariffs/list.mdx')) },
        { path: 'api-reference/tariffs/get', ...mdxPage(() => import('../docs/api-reference/tariffs/get.mdx')) },
        { path: 'api-reference/tariffs/create', ...mdxPage(() => import('../docs/api-reference/tariffs/create.mdx')) },
        { path: 'api-reference/tariffs/blocks', ...mdxPage(() => import('../docs/api-reference/tariffs/blocks.mdx')) },
        // Users
        { path: 'api-reference/users/list', ...mdxPage(() => import('../docs/api-reference/users/list.mdx')) },
        { path: 'api-reference/users/create', ...mdxPage(() => import('../docs/api-reference/users/create.mdx')) },
        { path: 'api-reference/users/import', ...mdxPage(() => import('../docs/api-reference/users/import.mdx')) },
        // Hierarchy
        { path: 'api-reference/hierarchy/list', ...mdxPage(() => import('../docs/api-reference/hierarchy/list.mdx')) },
        { path: 'api-reference/hierarchy/create', ...mdxPage(() => import('../docs/api-reference/hierarchy/create.mdx')) },
        { path: 'api-reference/hierarchy/meters', ...mdxPage(() => import('../docs/api-reference/hierarchy/meters.mdx')) },
        // IoT
        { path: 'api-reference/iot/devices', ...mdxPage(() => import('../docs/api-reference/iot/devices.mdx')) },
        { path: 'api-reference/iot/readings', ...mdxPage(() => import('../docs/api-reference/iot/readings.mdx')) },
        { path: 'api-reference/iot/alerts', ...mdxPage(() => import('../docs/api-reference/iot/alerts.mdx')) },
        // Catch-all 404
        { path: '*', element: <div className="prose"><h1>404</h1><p>Pagina no encontrada.</p></div> },
      ],
    },
  ],
  { basename: '/' },
);
