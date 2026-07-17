import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';

vi.mock('../../../hooks/queries/useBuildingsQuery', () => ({ useBuildingsQuery: () => ({ data: [{ id: 'b1', name: 'Mall Norte', tenantId: 't1', code: 'MN', address: null, countryCode: 'CL', isActive: true, latitude: null, longitude: null, areaSqm: null, regionId: null, timezone: null, externalSiteId: null, siteKind: null, createdAt: '', updatedAt: '' }], isLoading: false, isSuccess: true }) }));
vi.mock('../../../hooks/queries/useMetersQuery', () => ({ useUpdateMeter: () => ({ mutate: vi.fn(), isPending: false }), useMetersQuery: () => ({ data: [
  { id: 'm1', buildingId: 'b1', name: 'Principal', code: 'P1', meterType: 'main', isActive: true, metadata: {}, externalId: null, model: null, serialNumber: 'SN-001', ipAddress: null, modbusAddress: 10, busId: null, phaseType: 'three_phase', nominalVoltage: null, nominalCurrent: null, contractedDemandKw: null, loadCategory: null, parentMeterId: null, createdAt: '', updatedAt: '' },
  { id: 'm2', buildingId: 'b1', name: 'Dado de baja', code: 'X1', meterType: 'sub', isActive: false, metadata: {}, externalId: null, model: null, serialNumber: 'SN-OLD', ipAddress: null, modbusAddress: null, busId: null, phaseType: 'single_phase', nominalVoltage: null, nominalCurrent: null, contractedDemandKw: null, loadCategory: null, parentMeterId: null, createdAt: '', updatedAt: '' },
], isLoading: false, isSuccess: true }) }));

import { MaestroMedidoresPage } from './MaestroMedidoresPage';

function renderPage() { return render(<MemoryRouter><MaestroMedidoresPage /></MemoryRouter>); }

describe('MaestroMedidoresPage', () => {
  beforeEach(() => vi.clearAllMocks());
  it('renders page title', () => { renderPage(); expect(screen.getByText('5.6 Maestro de Medidores')).toBeInTheDocument(); });
  it('renders table headers', () => { renderPage(); expect(screen.getByText('Serial')).toBeInTheDocument(); expect(screen.getByText('Prot.')).toBeInTheDocument(); expect(screen.getByText('Estado activo')).toBeInTheDocument(); });
  it('renders meters', () => { renderPage(); expect(screen.getByText('Principal')).toBeInTheDocument(); expect(screen.getByText('Dado de baja')).toBeInTheDocument(); });
  it('shows asset status badges', () => { renderPage(); expect(screen.getByText('activo')).toBeInTheDocument(); expect(screen.getByText('baja')).toBeInTheDocument(); });
  it('renders section labels', () => { renderPage(); expect(screen.getByText('Maestro de medidores')).toBeInTheDocument(); expect(screen.getByText('Alta / edición de medidor')).toBeInTheDocument(); });
  it('renders search input', () => { renderPage(); expect(screen.getByPlaceholderText('Buscar...')).toBeInTheDocument(); });
  it('filters by search', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByPlaceholderText('Buscar...'), 'SN-001');
    expect(screen.getByText('Principal')).toBeInTheDocument();
    expect(screen.queryByText('Dado de baja')).not.toBeInTheDocument();
  });
});
