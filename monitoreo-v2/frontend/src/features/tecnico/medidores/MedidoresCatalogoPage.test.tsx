import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';

vi.mock('../../../hooks/queries/useBuildingsQuery', () => ({ useBuildingsQuery: () => ({ data: [{ id: 'b1', name: 'Mall Norte', tenantId: 't1', code: 'MN', address: null, countryCode: 'CL', isActive: true, latitude: null, longitude: null, areaSqm: null, regionId: null, timezone: null, externalSiteId: null, siteKind: null, createdAt: '', updatedAt: '' }], isLoading: false, isSuccess: true }) }));
vi.mock('../../../hooks/queries/useMetersQuery', () => ({ useMetersQuery: () => ({ data: [{ id: 'm1', buildingId: 'b1', name: 'Principal', code: 'P1', meterType: 'main', isActive: true, metadata: {}, externalId: null, model: 'PAC3200', serialNumber: 'SN-001', ipAddress: null, modbusAddress: 10, busId: null, phaseType: 'three_phase', nominalVoltage: '380', nominalCurrent: '100', contractedDemandKw: null, loadCategory: 'main', parentMeterId: null, createdAt: '', updatedAt: '' }], isLoading: false, isSuccess: true }) }));
vi.mock('../../../hooks/queries/useReadingsQuery', () => ({ useLatestReadingsQuery: () => ({ data: [{ meter_id: 'm1', meter_name: 'Principal', building_id: 'b1', timestamp: new Date().toISOString(), power_kw: '500', energy_kwh_total: '120000', voltage_l1: '220', current_l1: '30', power_factor: '0.95', frequency_hz: '50' }], isLoading: false, isSuccess: true }), useAggregatedReadingsQuery: () => ({ data: [], isLoading: false, isSuccess: true }) }));
vi.mock('../../../hooks/queries/useAlertsQuery', () => ({ useAlertsQuery: () => ({ data: [], isLoading: false, isSuccess: true, isPending: false }), useResolveAlert: () => ({ mutate: vi.fn(), isPending: false }), useAcknowledgeAlert: () => ({ mutate: vi.fn(), isPending: false }) }));

import { MedidoresCatalogoPage } from './MedidoresCatalogoPage';

function renderPage() { return render(<MemoryRouter><MedidoresCatalogoPage /></MemoryRouter>); }

describe('MedidoresCatalogoPage', () => {
  beforeEach(() => vi.clearAllMocks());
  it('renders page header', () => { renderPage(); expect(screen.getByRole('heading', { name: 'Medidores / Remarcador' })).toBeInTheDocument(); });
  it('renders search input', () => { renderPage(); expect(screen.getByPlaceholderText(/Buscar por serial/)).toBeInTheDocument(); });
  it('renders meter in table', () => { renderPage(); expect(screen.getByText('Principal')).toBeInTheDocument(); });
  it('shows ficha on click', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByText('Principal'));
    expect(screen.getByText('Identificación')).toBeInTheDocument();
    expect(screen.getByText('SN-001')).toBeInTheDocument();
    expect(screen.getByText('PAC3200')).toBeInTheDocument();
  });
  it('filters by search', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByPlaceholderText(/Buscar por serial/), 'zzz');
    expect(screen.queryByText('Principal')).not.toBeInTheDocument();
  });
});
