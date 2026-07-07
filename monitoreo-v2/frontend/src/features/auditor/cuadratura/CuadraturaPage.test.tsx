import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

vi.mock('../../../hooks/queries/useBuildingsQuery', () => ({ useBuildingsQuery: () => ({ data: [{ id: 'b1', name: 'Mall Norte', tenantId: 't1', code: 'MN', address: null, countryCode: 'CL', isActive: true, latitude: null, longitude: null, areaSqm: null, regionId: null, timezone: null, externalSiteId: null, siteKind: null, createdAt: '', updatedAt: '' }], isLoading: false, isSuccess: true }) }));
vi.mock('../../../hooks/queries/useMetersQuery', () => ({ useMetersQuery: () => ({ data: [
  { id: 'm1', buildingId: 'b1', name: 'Main', code: 'M1', meterType: 'main', isActive: true, metadata: {}, externalId: null, model: null, serialNumber: null, ipAddress: null, modbusAddress: null, busId: null, phaseType: 'three_phase', nominalVoltage: null, nominalCurrent: null, contractedDemandKw: null, loadCategory: 'main', parentMeterId: null, createdAt: '', updatedAt: '' },
  { id: 'm2', buildingId: 'b1', name: 'Sub1', code: 'S1', meterType: 'sub', isActive: true, metadata: {}, externalId: null, model: null, serialNumber: null, ipAddress: null, modbusAddress: null, busId: null, phaseType: 'three_phase', nominalVoltage: null, nominalCurrent: null, contractedDemandKw: null, loadCategory: 'hvac', parentMeterId: null, createdAt: '', updatedAt: '' },
], isLoading: false, isSuccess: true }) }));
vi.mock('../../../hooks/queries/useReadingsQuery', () => ({ useLatestReadingsQuery: () => ({ data: [
  { meter_id: 'm1', meter_name: 'Main', building_id: 'b1', timestamp: new Date().toISOString(), power_kw: '500', energy_kwh_total: '10000', voltage_l1: null, current_l1: null, power_factor: null, frequency_hz: null },
  { meter_id: 'm2', meter_name: 'Sub1', building_id: 'b1', timestamp: new Date().toISOString(), power_kw: '300', energy_kwh_total: '9500', voltage_l1: null, current_l1: null, power_factor: null, frequency_hz: null },
], isLoading: false, isSuccess: true }), useAggregatedReadingsQuery: () => ({ data: [], isLoading: false, isSuccess: true }) }));

import { CuadraturaPage } from './CuadraturaPage';
function renderPage() { return render(<MemoryRouter><CuadraturaPage /></MemoryRouter>); }

describe('CuadraturaPage', () => {
  beforeEach(() => vi.clearAllMocks());
  it('renders page header', () => { renderPage(); expect(screen.getByRole('heading', { name: 'Cuadratura Agregación' })).toBeInTheDocument(); });
  it('renders reconciliation table', () => { renderPage(); expect(screen.getByText('Tabla de reconciliación')).toBeInTheDocument(); });
  it('renders table headers', () => { renderPage(); expect(screen.getByText('Remarcador [kWh]')).toBeInTheDocument(); expect(screen.getByText('Suma sub-med. [kWh]')).toBeInTheDocument(); expect(screen.getByText('Diferencia [kWh]')).toBeInTheDocument(); });
  it('renders building row', () => { renderPage(); expect(screen.getAllByText('Mall Norte').length).toBeGreaterThanOrEqual(1); });
  it('shows tolerance status', () => { renderPage(); expect(screen.getAllByText(/Sí|No/).length).toBeGreaterThanOrEqual(1); });
  it('shows tolerance percentage', () => { renderPage(); expect(screen.getByText(/±2%/)).toBeInTheDocument(); });
});
