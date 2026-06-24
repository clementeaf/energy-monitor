import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';

vi.mock('../../../hooks/queries/useBuildingsQuery', () => ({ useBuildingsQuery: () => ({ data: [{ id: 'b1', name: 'Mall Norte', tenantId: 't1', code: 'MN', address: null, countryCode: 'CL', isActive: true, latitude: null, longitude: null, areaSqm: null, regionId: null, timezone: null, externalSiteId: null, siteKind: null, createdAt: '', updatedAt: '' }], isLoading: false, isSuccess: true }) }));
vi.mock('../../../hooks/queries/useMetersQuery', () => ({ useMetersQuery: () => ({ data: [
  { id: 'm1', buildingId: 'b1', name: 'Principal', code: 'P1', meterType: 'main', isActive: true, metadata: {}, externalId: null, model: null, serialNumber: 'SN-001', ipAddress: null, modbusAddress: 10, busId: null, phaseType: 'three_phase', nominalVoltage: null, nominalCurrent: null, contractedDemandKw: null, loadCategory: null, parentMeterId: null, createdAt: '', updatedAt: '' },
  { id: 'm2', buildingId: 'b1', name: 'Dado de baja', code: 'X1', meterType: 'sub', isActive: false, metadata: {}, externalId: null, model: null, serialNumber: 'SN-OLD', ipAddress: null, modbusAddress: null, busId: null, phaseType: 'single_phase', nominalVoltage: null, nominalCurrent: null, contractedDemandKw: null, loadCategory: null, parentMeterId: null, createdAt: '', updatedAt: '' },
], isLoading: false, isSuccess: true }) }));

import { MaestroMedidoresPage } from './MaestroMedidoresPage';

function renderPage() { return render(<MemoryRouter><MaestroMedidoresPage /></MemoryRouter>); }

describe('MaestroMedidoresPage', () => {
  beforeEach(() => vi.clearAllMocks());
  it('renders page header', () => { renderPage(); expect(screen.getByRole('heading', { name: 'Maestro Medidores' })).toBeInTheDocument(); });
  it('renders table headers', () => { renderPage(); expect(screen.getByText('Serial')).toBeInTheDocument(); expect(screen.getByText('Protocolo')).toBeInTheDocument(); expect(screen.getByText('Estado activo')).toBeInTheDocument(); });
  it('renders meters', () => { renderPage(); expect(screen.getByText('Principal')).toBeInTheDocument(); expect(screen.getByText('Dado de baja')).toBeInTheDocument(); });
  it('shows asset status badges', () => { renderPage(); expect(screen.getByText('activo')).toBeInTheDocument(); expect(screen.getByText('baja')).toBeInTheDocument(); });
  it('renders filter pills', () => { renderPage(); expect(screen.getByText('Todos')).toBeInTheDocument(); expect(screen.getByText('Activos')).toBeInTheDocument(); expect(screen.getByText('Baja')).toBeInTheDocument(); });
  it('filters by status', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByText('Baja'));
    expect(screen.getByText('Dado de baja')).toBeInTheDocument();
    expect(screen.queryByText('Principal')).not.toBeInTheDocument();
  });
  it('filters by search', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByPlaceholderText(/Buscar por serial/), 'SN-001');
    expect(screen.getByText('Principal')).toBeInTheDocument();
    expect(screen.queryByText('Dado de baja')).not.toBeInTheDocument();
  });
});
