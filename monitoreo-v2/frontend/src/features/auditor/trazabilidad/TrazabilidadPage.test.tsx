import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';

vi.mock('../../../hooks/queries/useMetersQuery', () => ({ useMetersQuery: () => ({ data: [{ id: 'm1', buildingId: 'b1', name: 'Principal', code: 'P1', meterType: 'main', isActive: true, metadata: {}, externalId: null, model: null, serialNumber: null, ipAddress: null, modbusAddress: null, busId: null, phaseType: 'three_phase', nominalVoltage: null, nominalCurrent: null, contractedDemandKw: null, loadCategory: null, parentMeterId: null, createdAt: '', updatedAt: '' }], isLoading: false, isSuccess: true }) }));
vi.mock('../../../hooks/queries/useBuildingsQuery', () => ({ useBuildingsQuery: () => ({ data: [{ id: 'b1', name: 'Mall Norte', tenantId: 't1', code: 'MN', address: null, countryCode: 'CL', isActive: true, latitude: null, longitude: null, areaSqm: null, regionId: null, timezone: null, externalSiteId: null, siteKind: null, createdAt: '', updatedAt: '' }], isLoading: false, isSuccess: true }) }));
vi.mock('../../../hooks/queries/useReadingsQuery', () => ({ useLatestReadingsQuery: () => ({ data: [{ meter_id: 'm1', meter_name: 'Principal', building_id: 'b1', timestamp: '2026-06-24T12:00:00Z', power_kw: '500.123', energy_kwh_total: '120000', voltage_l1: '220.5', current_l1: '30.2', power_factor: '0.953', frequency_hz: '50' }], isLoading: false, isSuccess: true }), useAggregatedReadingsQuery: () => ({ data: [], isLoading: false, isSuccess: true }) }));

import { TrazabilidadPage } from './TrazabilidadPage';
function renderPage() { return render(<MemoryRouter><TrazabilidadPage /></MemoryRouter>); }

describe('TrazabilidadPage', () => {
  beforeEach(() => vi.clearAllMocks());
  it('renders page header', () => { renderPage(); expect(screen.getByRole('heading', { name: 'Trazabilidad / Lineage' })).toBeInTheDocument(); });
  it('renders meter selector', () => { renderPage(); expect(screen.getByText('Medidor')).toBeInTheDocument(); });
  it('shows placeholder without selection', () => { renderPage(); expect(screen.getByText('Selecciona un medidor para ver el linaje.')).toBeInTheDocument(); });
  it('shows lineage on meter select', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.selectOptions(screen.getByRole('combobox'), 'm1');
    expect(screen.getByText('Linaje de lectura')).toBeInTheDocument();
    expect(screen.getByText('Comparación raw vs. mostrado')).toBeInTheDocument();
    expect(screen.getByText('500.123 kW')).toBeInTheDocument();
  });
});
