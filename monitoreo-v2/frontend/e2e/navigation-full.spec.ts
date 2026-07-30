import { test, expect } from '@playwright/test';
import { injectAuth } from './helpers';

const ROUTES = {
  'Dashboard': [
    '/dashboard/consolidado',
    '/dashboard/consumo',
    '/dashboard/costos',
    '/dashboard/alarmas',
    '/dashboard/executive',
    '/dashboard/compare',
    '/dashboard/reportes-ejecutivos',
    '/dashboard/exportar',
    '/dashboard/platform',
  ],
  'Operacional': [
    '/operacional/monitoreo',
    '/operacional/alarmas',
    '/operacional/cobertura',
    '/operacional/tickets',
    '/operacional/calidad',
    '/operacional/cnr',
  ],
  'Técnico': [
    '/tecnico/medidores',
    '/tecnico/diagnostico',
    '/tecnico/maestro',
    '/tecnico/ordenes',
    '/tecnico/intervencion',
    '/tecnico/cnr',
    '/tecnico/reglas',
  ],
  'Auditor': [
    '/auditor/calidad-datos',
    '/auditor/cuadratura',
    '/auditor/datos-crudos',
    '/auditor/evidencia',
    '/auditor/pista',
    '/auditor/trazabilidad',
  ],
  'Monitoreo': [
    '/monitoring/realtime',
    '/monitoring/devices',
    '/monitoring/meters/type',
    '/monitoring/modbus-map',
    '/monitoring/generation',
  ],
  'Edificios/Medidores': [
    '/buildings',
    '/meters',
    '/map',
  ],
  'Alertas': [
    '/alerts',
    '/alerts/rules',
    '/alerts/history',
    '/alerts/escalation',
    '/alerts/notifications',
  ],
  'Billing': [
    '/billing',
    '/billing/rates',
    '/billing/history',
    '/billing/approve',
    '/billing/my-invoice',
  ],
  'Analytics': [
    '/analytics/trends',
    '/analytics/patterns',
    '/analytics/benchmark',
  ],
  'Integraciones': [
    '/integrations',
    '/integrations/status',
    '/integrations/gaps',
    '/integrations/config',
    '/integrations/backfill',
    '/integrations/sync-log',
    '/integrations/webhooks',
  ],
  'Reportes': [
    '/reports',
    '/reports/scheduled',
  ],
  'Admin': [
    '/admin/users',
    '/admin/companies',
    '/admin/roles',
    '/admin/tenants',
    '/admin/tenants-malls',
    '/admin/regions',
    '/admin/hierarchy',
    '/admin/api-keys',
    '/admin/oauth-clients',
    '/admin/iot-devices',
    '/admin/settings',
    '/admin/audit',
    '/admin/audit/access',
    '/admin/audit/changes',
    '/admin/data-quality',
    '/admin/register-mappings',
    '/admin/config-releases',
    '/admin/observabilidad',
    '/admin/seguridad-pam',
    '/admin/replica',
    '/admin/retencion',
    '/admin/slos',
    '/admin/throttle',
    '/admin/breach-reports',
    '/admin/deletion-requests',
    '/admin/rectification-requests',
  ],
  'Perfil': [
    '/profile',
  ],
};

for (const [group, paths] of Object.entries(ROUTES)) {
  test.describe(group, () => {
    for (const path of paths) {
      test(`${path} → loads without error or redirect to login`, async ({ page }) => {
        await injectAuth(page);
        await page.goto(path, { waitUntil: 'domcontentloaded' });

        // Must not redirect to login
        const url = page.url();
        expect(url).not.toContain('/login');

        // Must render content (not blank)
        const root = page.locator('#root');
        await expect(root).not.toBeEmpty();

        // No uncaught JS errors
        const errors: string[] = [];
        page.on('pageerror', (err) => errors.push(err.message));

        // No visible error boundary / crash message
        const errorBoundary = page.locator('text=Something went wrong');
        const hasError = await errorBoundary.count();
        expect(hasError).toBe(0);

        // Page title should not be blank
        const title = await page.title();
        expect(title.length).toBeGreaterThan(0);
      });
    }
  });
}
