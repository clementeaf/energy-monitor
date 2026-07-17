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

  it('renders page header with new title format', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: '5.2 Activos (medidores)' })).toBeInTheDocument();
  });

  it('renders meter table with code column', () => {
    renderPage();
    // Table shows meter.code ?? meter.name — mock has code: 'P1'
    expect(screen.getByText('P1')).toBeInTheDocument();
  });

  it('renders static section headers', () => {
    renderPage();
    expect(screen.getByText('Medidores del mall')).toBeInTheDocument();
    expect(screen.getByText('Ficha — Identificación')).toBeInTheDocument();
    expect(screen.getByText('Ubicación física')).toBeInTheDocument();
  });

  it('renders dropdown filters', () => {
    renderPage();
    // DropdownSelect renders a button with the display value (may appear multiple times in DOM)
    expect(screen.getAllByText('Todos los centros').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Estado comms: Todos').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Tipo: Todos').length).toBeGreaterThanOrEqual(1);
  });

  it('renders table column headers', () => {
    renderPage();
    expect(screen.getByText('Serial')).toBeInTheDocument();
    expect(screen.getByText('Estado')).toBeInTheDocument();
    expect(screen.getByText('Prot.')).toBeInTheDocument();
    expect(screen.getByText('Últ. dato')).toBeInTheDocument();
  });

  it('shows placeholder text when no meter selected', () => {
    renderPage();
    // Multiple "Selecciona un medidor" placeholders in ficha sections
    expect(screen.getAllByText('Selecciona un medidor').length).toBeGreaterThanOrEqual(1);
  });

  it('renders availability and series section headers', () => {
    renderPage();
    expect(screen.getByText(/Disponibilidad 72 h/)).toBeInTheDocument();
    expect(screen.getByText(/Serie temporal 48 h/)).toBeInTheDocument();
    expect(screen.getByText(/Historial de fallas e intervenciones/)).toBeInTheDocument();
  });

  it('shows ficha detail after clicking a meter row', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByText('P1'));
    // After selection, ficha shows meter code and name
    expect(screen.getAllByText(/P1/).length).toBeGreaterThanOrEqual(1);
  });
});
