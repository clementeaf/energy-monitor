import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

vi.mock('../../../hooks/queries/useMetersQuery', () => ({ useMetersQuery: () => ({ data: [{ id: 'm1', buildingId: 'b1', name: 'Principal', code: 'P1', meterType: 'main', isActive: true, metadata: {}, externalId: null, model: null, serialNumber: null, ipAddress: null, modbusAddress: null, busId: null, phaseType: 'three_phase', nominalVoltage: null, nominalCurrent: null, contractedDemandKw: null, loadCategory: null, parentMeterId: null, createdAt: '', updatedAt: '' }], isLoading: false, isSuccess: true }) }));
vi.mock('../../../hooks/queries/useBuildingsQuery', () => ({ useBuildingsQuery: () => ({ data: [{ id: 'b1', name: 'Mall Norte', tenantId: 't1', code: 'MN', address: null, countryCode: 'CL', isActive: true, latitude: null, longitude: null, areaSqm: null, regionId: null, timezone: null, externalSiteId: null, siteKind: null, createdAt: '', updatedAt: '' }], isLoading: false, isSuccess: true }) }));
vi.mock('../../../hooks/queries/useReadingsQuery', () => ({ useLatestReadingsQuery: () => ({ data: [{ meter_id: 'm1', meter_name: 'Principal', building_id: 'b1', timestamp: '2026-06-24T12:00:00Z', power_kw: '500.123', energy_kwh_total: '120000', voltage_l1: '220.5', current_l1: '30.2', power_factor: '0.953', frequency_hz: '50' }], isLoading: false, isSuccess: true }), useAggregatedReadingsQuery: () => ({ data: [], isLoading: false, isSuccess: true }) }));

import { TrazabilidadPage } from './TrazabilidadPage';
function renderPage() { return render(<MemoryRouter><TrazabilidadPage /></MemoryRouter>); }

describe('TrazabilidadPage', () => {
  beforeEach(() => vi.clearAllMocks());
  it('renders title', () => { renderPage(); expect(screen.getByText('6.4 Trazabilidad')).toBeInTheDocument(); });
  it('renders lineage panel', () => { renderPage(); expect(screen.getByText(/Panel de linaje por lectura/)).toBeInTheDocument(); });
  it('shows placeholder without selection', () => { renderPage(); expect(screen.getByText(/Selecciona un medidor/)).toBeInTheDocument(); });
  it('shows comparison prompt without selection', () => { renderPage(); expect(screen.getByText(/Selecciona un medidor para ver la comparación/)).toBeInTheDocument(); });
  it('renders ref tags', () => { renderPage(); expect(screen.getAllByText(/DAT-19/).length).toBeGreaterThanOrEqual(1); });
});
