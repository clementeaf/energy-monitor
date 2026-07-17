import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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

import { CalidadDatosPage } from './CalidadDatosPage';
function renderPage() { return render(<MemoryRouter><CalidadDatosPage /></MemoryRouter>); }

describe('CalidadDatosPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders title', () => { renderPage(); expect(screen.getByText('6.1 Calidad de Datos')).toBeInTheDocument(); });
  it('renders scorecard panel', () => { renderPage(); expect(screen.getAllByText(/Scorecard de calidad por mall/).length).toBeGreaterThanOrEqual(1); });
  it('renders table headers', () => { renderPage(); expect(screen.getByText('Lecturas esperadas')).toBeInTheDocument(); });
  it('renders building row', () => { renderPage(); expect(screen.getAllByText('Mall Norte').length).toBeGreaterThanOrEqual(1); });
  it('renders evolution chart', () => { renderPage(); expect(screen.getByText(/Evolución de calidad/)).toBeInTheDocument(); });
  it('renders low-quality panel', () => { renderPage(); expect(screen.getByText(/Medidores con baja calidad/)).toBeInTheDocument(); });
  it('shows select prompt before clicking row', () => { renderPage(); expect(screen.getByText(/Seleccione un mall/)).toBeInTheDocument(); });
  it('shows detail after clicking row', () => {
    renderPage();
    const rows = screen.getAllByRole('row');
    const dataRow = rows.find((r) => r.textContent?.includes('Mall Norte'));
    expect(dataRow).toBeTruthy();
    fireEvent.click(dataRow!);
    expect(screen.queryByText(/Seleccione un mall/)).not.toBeInTheDocument();
  });
  it('renders export button', () => { renderPage(); expect(screen.getByText('Exportar CSV')).toBeInTheDocument(); });
  it('renders ref tags', () => { renderPage(); expect(screen.getAllByText(/DAT-06/).length).toBeGreaterThanOrEqual(1); });
});
