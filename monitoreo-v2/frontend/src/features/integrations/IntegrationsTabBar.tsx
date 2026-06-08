import { NavLink } from 'react-router';
import { APP_ROUTES } from '../../app/routes';

export type IntegrationsTab =
  | 'connectors'
  | 'webhooks'
  | 'deliveries'
  | 'health'
  | 'gaps'
  | 'backfill';

interface IntegrationsTabBarProps {
  canWebhooks: boolean;
}

const TAB_CLASS = ({ isActive }: { isActive: boolean }): string =>
  `rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-150 ${
    isActive
      ? 'bg-background text-foreground shadow-sm ring-1 ring-border'
      : 'text-muted hover:text-foreground'
  }`;

/**
 * Tab navigation for Integrations section.
 */
export function IntegrationsTabBar({ canWebhooks }: Readonly<IntegrationsTabBarProps>) {
  return (
    <nav
      className="inline-flex flex-wrap gap-1 rounded-full border border-border bg-surface p-1"
      aria-label="Integraciones"
    >
      <NavLink to={APP_ROUTES.integrations} end className={TAB_CLASS}>
        Conectores
      </NavLink>
      {canWebhooks && (
        <NavLink to={APP_ROUTES.integrationsWebhooks} className={TAB_CLASS}>
          Webhooks
        </NavLink>
      )}
      {canWebhooks && (
        <NavLink to={APP_ROUTES.integrationsWebhookDeliveries} className={TAB_CLASS}>
          Entregas
        </NavLink>
      )}
      <NavLink to={APP_ROUTES.integrationsGaps} className={TAB_CLASS}>
        Brechas ingest
      </NavLink>
      <NavLink to={APP_ROUTES.integrationsBackfill} className={TAB_CLASS}>
        Backfill
      </NavLink>
      <NavLink to={APP_ROUTES.integrationsStatus} className={TAB_CLASS}>
        Salud
      </NavLink>
    </nav>
  );
}

/**
 * Resolves active integrations tab from pathname.
 */
export function resolveIntegrationsTab(pathname: string): IntegrationsTab {
  if (pathname.includes('/webhooks/deliveries')) return 'deliveries';
  if (pathname.includes('/webhooks')) return 'webhooks';
  if (pathname.includes('/gaps')) return 'gaps';
  if (pathname.includes('/backfill')) return 'backfill';
  if (pathname.includes('/status')) return 'health';
  return 'connectors';
}
