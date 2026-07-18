import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';

vi.mock('../../../hooks/queries/useTenantsQuery', () => ({
  useUpdateTenant: () => ({ mutate: vi.fn(), isPending: false }),
  useTenantsAdminQuery: () => ({
    data: [
      { id: 't1', name: 'PASA', slug: 'pasa', isActive: true, primaryColor: '#000', secondaryColor: '#fff', sidebarColor: '#000', accentColor: '#f00', address: null, addressDetail: null, phone: null, taxId: null, appTitle: 'PASA', logoUrl: null, faviconUrl: null, timezone: 'America/Santiago', settings: {}, defaultCountryCode: 'CL', defaultCurrency: 'CLP', createdAt: '2026-01-15T00:00:00Z', updatedAt: '' },
      { id: 't2', name: 'Siemens', slug: 'siemens', isActive: true, primaryColor: '#000', secondaryColor: '#fff', sidebarColor: '#000', accentColor: '#0af', address: null, addressDetail: null, phone: null, taxId: null, appTitle: 'Siemens', logoUrl: null, faviconUrl: null, timezone: 'America/Lima', settings: {}, defaultCountryCode: 'PE', defaultCurrency: 'PEN', createdAt: '2026-03-01T00:00:00Z', updatedAt: '' },
      { id: 't3', name: 'Inactive Co', slug: 'inactive', isActive: false, primaryColor: '#000', secondaryColor: '#fff', sidebarColor: '#000', accentColor: '#ccc', address: null, addressDetail: null, phone: null, taxId: null, appTitle: 'Inactive', logoUrl: null, faviconUrl: null, timezone: 'UTC', settings: {}, defaultCountryCode: 'CL', defaultCurrency: null, createdAt: '2026-02-01T00:00:00Z', updatedAt: '' },
    ],
    isLoading: false, isSuccess: true,
  }),
}));

vi.mock('../../../hooks/queries/useBuildingsQuery', () => ({
  useBuildingsQuery: () => ({
    data: [
      { id: 'b1', name: 'Mall Norte', tenantId: 't1', code: 'MN', address: null, countryCode: 'CL', isActive: true, latitude: null, longitude: null, areaSqm: null, regionId: null, timezone: null, externalSiteId: null, siteKind: null, createdAt: '', updatedAt: '' },
      { id: 'b2', name: 'Mall Lima', tenantId: 't2', code: 'ML', address: null, countryCode: 'PE', isActive: true, latitude: null, longitude: null, areaSqm: null, regionId: null, timezone: null, externalSiteId: null, siteKind: null, createdAt: '', updatedAt: '' },
    ],
    isLoading: false, isSuccess: true,
  }),
}));

vi.mock('../../../hooks/queries/useMetersQuery', () => ({
  useMetersQuery: () => ({
    data: [
      { id: 'm1', buildingId: 'b1', name: 'Meter 1', code: 'M1', meterType: 'main', isActive: true, metadata: {}, externalId: null, model: null, serialNumber: null, ipAddress: null, modbusAddress: null, busId: null, phaseType: 'three_phase', nominalVoltage: null, nominalCurrent: null, contractedDemandKw: null, loadCategory: 'main', parentMeterId: null, createdAt: '', updatedAt: '' },
      { id: 'm2', buildingId: 'b1', name: 'Meter 2', code: 'M2', meterType: 'sub', isActive: true, metadata: {}, externalId: null, model: null, serialNumber: null, ipAddress: null, modbusAddress: null, busId: null, phaseType: 'three_phase', nominalVoltage: null, nominalCurrent: null, contractedDemandKw: null, loadCategory: 'hvac', parentMeterId: null, createdAt: '', updatedAt: '' },
    ],
    isLoading: false, isSuccess: true,
  }),
}));

vi.mock('../../../hooks/queries/useUsersQuery', () => ({
  useUsersQuery: () => ({
    data: [
      { id: 'u1', displayName: 'Admin', email: 'admin@pasa.cl', roleId: 'r1', role: { id: 'r1', slug: 'super_admin', name: 'Super Admin' }, isActive: true, tenantId: 't1', authProvider: 'google', lastLoginAt: null, createdAt: '', updatedAt: '' },
    ],
    isLoading: false, isSuccess: true,
  }),
}));

vi.mock('../../../hooks/queries/useAlertsQuery', () => ({
  useAlertsQuery: () => ({
    data: [
      { id: 'a1', buildingId: 'b1', meterId: 'm1', alertRuleId: null, alertTypeCode: 'OVERVOLTAGE', severity: 'critical', status: 'active', message: 'Sobrevoltaje', triggeredValue: 250, thresholdValue: 240, assignedTo: null, acknowledgedBy: null, acknowledgedAt: null, resolvedBy: null, resolvedAt: null, resolutionNotes: null, createdAt: '2026-06-24T11:00:00Z' },
    ],
    isLoading: false, isSuccess: true, isPending: false, error: null, refetch: vi.fn(),
  }),
}));

vi.mock('../../../hooks/queries/useAuditLogsQuery', () => ({
  useAuditLogsQuery: () => ({
    data: { data: [{ id: 'al1', action: 'UPDATE', resourceType: 'tenant', userId: 'u1', userEmail: 'admin@pasa.cl', createdAt: '2026-06-25T10:00:00Z' }], total: 1 },
    isLoading: false, isSuccess: true, isPending: false,
  }),
}));

import { TenantsMallsPage } from './TenantsMallsPage';

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

function renderPage() { return render(<MemoryRouter><TenantsMallsPage /></MemoryRouter>); }

describe('TenantsMallsPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders page heading', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: /7\.1 Tenants y Malls/ })).toBeInTheDocument();
  });

  it('renders tenant list section', () => {
    renderPage();
    expect(screen.getByText('Lista de tenants')).toBeInTheDocument();
  });

  it('renders tenant table columns', () => {
    renderPage();
    expect(screen.getByText('Tenant ID')).toBeInTheDocument();
    expect(screen.getByText('Mall')).toBeInTheDocument();
    expect(screen.getByText('País')).toBeInTheDocument();
    expect(screen.getByText('Nº medidores')).toBeInTheDocument();
    expect(screen.getByText('Nº usuarios')).toBeInTheDocument();
    expect(screen.getByText('Versión contrato')).toBeInTheDocument();
  });

  it('renders tenant rows', () => {
    renderPage();
    expect(screen.getByText('PASA')).toBeInTheDocument();
    expect(screen.getByText('Siemens')).toBeInTheDocument();
    expect(screen.getByText('Inactive Co')).toBeInTheDocument();
  });

  it('shows status badges', () => {
    renderPage();
    // PASA has meters → activo; Siemens has no meters → onboarding; Inactive Co isActive=false → inactivo
    expect(screen.getByText('inactivo')).toBeInTheDocument();
  });

  it('shows country codes in rows', () => {
    renderPage();
    expect(screen.getAllByText('CL').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('PE').length).toBeGreaterThanOrEqual(1);
  });

  it('renders country filter dropdown', () => {
    renderPage();
    expect(screen.getAllByText('Todos los países').length).toBeGreaterThanOrEqual(1);
  });

  it('renders status filter dropdown', () => {
    renderPage();
    expect(screen.getAllByText('Todos los estados').length).toBeGreaterThanOrEqual(1);
  });

  it('renders alert filter checkbox', () => {
    renderPage();
    expect(screen.getByText('Con alertas')).toBeInTheDocument();
  });

  it('renders detail panel placeholder', () => {
    renderPage();
    expect(screen.getByText('Detalle de tenant — configuración base')).toBeInTheDocument();
  });

  it('renders usage stats panel placeholder', () => {
    renderPage();
    expect(screen.getByText('Estadísticas de uso')).toBeInTheDocument();
  });

  it('renders config history section', () => {
    renderPage();
    expect(screen.getByText('Historial de cambios de configuración del tenant')).toBeInTheDocument();
  });

  it('renders action buttons', () => {
    renderPage();
    expect(screen.getByText('Crear tenant')).toBeInTheDocument();
    expect(screen.getByText('Activar')).toBeInTheDocument();
    expect(screen.getByText('Desactivar')).toBeInTheDocument();
  });

  it('filters by status using dropdown', async () => {
    const user = userEvent.setup();
    renderPage();
    // Open the status dropdown
    await user.click(screen.getAllByText('Todos los estados')[0]);
    await user.click(screen.getByText('Inactivo'));
    expect(screen.getByText('Inactive Co')).toBeInTheDocument();
    expect(screen.queryByText('PASA')).not.toBeInTheDocument();
  });

  it('shows detail panel content on row click', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByText('PASA'));
    // After clicking, the detail panel shows the selected tenant's timezone inline
    // The timezone is rendered inside a <li> concatenated with other text
    expect(screen.getByText(/America\/Santiago/)).toBeInTheDocument();
  });

  it('shows CLP currency in detail panel after clicking PASA row', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByText('PASA'));
    expect(screen.getAllByText(/CLP/).length).toBeGreaterThanOrEqual(1);
  });

  it('shows usage stats for selected tenant', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByText('PASA'));
    expect(screen.getByText('Usuarios activos 30d')).toBeInTheDocument();
    expect(screen.getByText('Nº consultas API (mes)')).toBeInTheDocument();
    expect(screen.getByText('Volumen de datos almacenados')).toBeInTheDocument();
  });
});
