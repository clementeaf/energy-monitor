import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
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

function renderPage() { return render(<MemoryRouter><TenantsMallsPage /></MemoryRouter>); }

describe('TenantsMallsPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders page header', () => { renderPage(); expect(screen.getByRole('heading', { name: 'Tenants y Malls' })).toBeInTheDocument(); });

  it('renders tenant table with columns', () => {
    renderPage();
    expect(screen.getByText('Nombre')).toBeInTheDocument();
    expect(screen.getByText('País')).toBeInTheDocument();
    expect(screen.getByText('Medidores')).toBeInTheDocument();
    expect(screen.getByText('Usuarios')).toBeInTheDocument();
    expect(screen.getByText('Contrato')).toBeInTheDocument();
  });

  it('renders tenant rows', () => {
    renderPage();
    expect(screen.getByText('PASA')).toBeInTheDocument();
    expect(screen.getByText('Siemens')).toBeInTheDocument();
    expect(screen.getByText('Inactive Co')).toBeInTheDocument();
  });

  it('shows active status badges', () => {
    renderPage();
    expect(screen.getAllByText('activo').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('inactivo')).toBeInTheDocument();
  });

  it('shows country codes', () => {
    renderPage();
    expect(screen.getAllByText('CL').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('PE').length).toBeGreaterThanOrEqual(1);
  });

  it('shows currency in drawer', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByText('PASA'));
    expect(screen.getByText('CLP')).toBeInTheDocument();
  });

  it('renders country filter', () => {
    renderPage();
    expect(screen.getByDisplayValue('Todos los países')).toBeInTheDocument();
  });

  it('renders status filter', () => {
    renderPage();
    expect(screen.getByDisplayValue('Todos los estados')).toBeInTheDocument();
  });

  it('renders alert filter checkbox', () => {
    renderPage();
    expect(screen.getByText('Con alertas')).toBeInTheDocument();
  });

  it('filters by status', async () => {
    const user = userEvent.setup();
    renderPage();
    const select = screen.getByDisplayValue('Todos los estados');
    await user.selectOptions(select, 'inactivo');
    expect(screen.getByText('Inactive Co')).toBeInTheDocument();
    expect(screen.queryByText('PASA')).not.toBeInTheDocument();
  });

  it('opens detail drawer on row click', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByText('PASA'));
    expect(screen.getByText('Configuración base')).toBeInTheDocument();
    expect(screen.getByText('Estadísticas de uso')).toBeInTheDocument();
    expect(screen.getByText('Historial de cambios')).toBeInTheDocument();
  });

  it('shows config details in drawer', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByText('PASA'));
    expect(screen.getByText('America/Santiago')).toBeInTheDocument();
    expect(screen.getByText('pasa')).toBeInTheDocument();
  });

  it('shows usage stats in drawer', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByText('PASA'));
    expect(screen.getByText('Usuarios activos (30d)')).toBeInTheDocument();
    expect(screen.getByText('Acciones audit log')).toBeInTheDocument();
    expect(screen.getByText('Volumen datos (aprox.)')).toBeInTheDocument();
  });
});
