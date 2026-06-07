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
  active: IntegrationsTab;
  canWebhooks: boolean;
}

const TAB_CLASS = ({ isActive }: { isActive: boolean }): string =>
  `rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
    isActive
      ? 'bg-brand text-brand-fg'
      : 'text-muted hover:bg-surface hover:text-foreground'
  }`;

/**
 * Tab navigation for Integrations section.
 */
export function IntegrationsTabBar({ active, canWebhooks }: Readonly<IntegrationsTabBarProps>) {
  return (
    <nav className="flex flex-wrap gap-2" aria-label="Integraciones">
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
      {active === 'connectors' && <span className="sr-only">Conectores activo</span>}
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
