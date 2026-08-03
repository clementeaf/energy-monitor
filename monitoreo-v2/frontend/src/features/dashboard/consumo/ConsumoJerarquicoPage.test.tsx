import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';

vi.mock('../../../hooks/queries/useBuildingsQuery', () => ({
  useBuildingsQuery: () => ({
    data: [
      { id: 'b1', name: 'Mall Costanera', tenantId: 't1', code: 'MC', address: 'Av. Kennedy', countryCode: 'CL', isActive: true, latitude: -33.4, longitude: -70.6, areaSqm: '50000', regionId: null, timezone: null, externalSiteId: null, siteKind: null, createdAt: '', updatedAt: '' },
      { id: 'b2', name: 'Mall Plaza Oeste', tenantId: 't1', code: 'MPO', address: null, countryCode: 'CL', isActive: true, latitude: -33.5, longitude: -70.7, areaSqm: '30000', regionId: null, timezone: null, externalSiteId: null, siteKind: null, createdAt: '', updatedAt: '' },
      { id: 'b3', name: 'Mall Jockey', tenantId: 't1', code: 'MJ', address: null, countryCode: 'PE', isActive: true, latitude: -12.0, longitude: -77.0, areaSqm: null, regionId: null, timezone: null, externalSiteId: null, siteKind: null, createdAt: '', updatedAt: '' },
    ],
    isLoading: false,
    isSuccess: true,
  }),
}));

vi.mock('../../../hooks/queries/useMetersQuery', () => ({
  useMetersQuery: () => ({
    data: [
      { id: 'm1', buildingId: 'b1', name: 'Principal', code: 'P1', meterType: 'main', isActive: true, metadata: {}, externalId: null, model: null, serialNumber: null, ipAddress: null, modbusAddress: null, busId: null, phaseType: 'three_phase', nominalVoltage: null, nominalCurrent: null, contractedDemandKw: null, loadCategory: 'main', parentMeterId: null, createdAt: '', updatedAt: '' },
      { id: 'm2', buildingId: 'b1', name: 'HVAC', code: 'H1', meterType: 'sub', isActive: true, metadata: {}, externalId: null, model: null, serialNumber: null, ipAddress: null, modbusAddress: null, busId: null, phaseType: 'three_phase', nominalVoltage: null, nominalCurrent: null, contractedDemandKw: null, loadCategory: 'hvac', parentMeterId: null, createdAt: '', updatedAt: '' },
      { id: 'm3', buildingId: 'b2', name: 'General', code: 'G1', meterType: 'main', isActive: true, metadata: {}, externalId: null, model: null, serialNumber: null, ipAddress: null, modbusAddress: null, busId: null, phaseType: 'three_phase', nominalVoltage: null, nominalCurrent: null, contractedDemandKw: null, loadCategory: 'main', parentMeterId: null, createdAt: '', updatedAt: '' },
    ],
    isLoading: false,
    isSuccess: true,
  }),
}));

vi.mock('../../../hooks/queries/useReadingsQuery', () => ({
  useLatestReadingsQuery: () => ({
    data: [
      { meter_id: 'm1', meter_name: 'Principal', building_id: 'b1', timestamp: '2026-06-24T12:00:00Z', power_kw: '500', energy_kwh_total: '120000', voltage_l1: '220', current_l1: '30', power_factor: '0.95', frequency_hz: '50' },
      { meter_id: 'm2', meter_name: 'HVAC', building_id: 'b1', timestamp: '2026-06-24T12:00:00Z', power_kw: '200', energy_kwh_total: '50000', voltage_l1: '221', current_l1: '12', power_factor: '0.93', frequency_hz: '50' },
      { meter_id: 'm3', meter_name: 'General', building_id: 'b2', timestamp: '2026-06-24T12:00:00Z', power_kw: '300', energy_kwh_total: '80000', voltage_l1: '219', current_l1: '18', power_factor: '0.97', frequency_hz: '50' },
    ],
    isLoading: false,
    isSuccess: true,
  }),
  useAggregatedReadingsQuery: () => ({ data: [], isLoading: false, isPending: false, isSuccess: true }),
}));

vi.mock('../../../hooks/queries/useAlertsQuery', () => ({
  useAlertsQuery: () => ({
    data: [
      { id: 'a1', buildingId: 'b1', meterId: 'm1', alertRuleId: null, alertTypeCode: 'OVERVOLTAGE', severity: 'high', status: 'active', message: 'Alta tensión', triggeredValue: 250, thresholdValue: 240, assignedTo: null, acknowledgedBy: null, acknowledgedAt: null, resolvedBy: null, resolvedAt: null, resolutionNotes: null, createdAt: '2026-06-24T11:00:00Z' },
    ],
    isLoading: false,
    isSuccess: true,
    isPending: false,
  }),
}));

vi.mock('../../../components/ui/MapView', () => ({
  MapView: ({ className }: { className?: string }) => (
    <div data-testid="map-view" className={className}>Map</div>
  ),
}));

vi.mock('../../../hooks/useOperatorFilter', () => ({
  useOperatorFilter: () => ({
    isFilteredMode: false,
    needsSelection: false,
    operatorBuildingIds: null,
    operatorMeterIds: null,
  }),
}));

import { ConsumoJerarquicoPage } from './ConsumoJerarquicoPage';

function renderPage() {
  return render(
    <MemoryRouter>
      <ConsumoJerarquicoPage />
    </MemoryRouter>,
  );
}

describe('ConsumoJerarquicoPage', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('layout', () => {
    it('renders page header', () => {
      renderPage();
      expect(screen.getByRole('heading', { name: 'Consumo Jerárquico' })).toBeInTheDocument();
    });

    it('renders filter dropdowns without banner label', () => {
      renderPage();
      expect(screen.queryByText('Filtros:')).not.toBeInTheDocument();
      expect(screen.getByText('País')).toBeInTheDocument();
      expect(screen.getByText('Período')).toBeInTheDocument();
    });

    it('renders map view on mapa tab', () => {
      renderPage();
      expect(screen.getByTestId('map-view')).toBeInTheDocument();
    });
  });

  describe('tabs', () => {
    it('renders tab buttons', () => {
      renderPage();
      expect(screen.getByRole('button', { name: 'Mapa y detalle' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Medidores/ })).toBeInTheDocument();
    });

    it('shows medidores tab on click', async () => {
      const user = userEvent.setup();
      renderPage();
      await user.click(screen.getByRole('button', { name: /Medidores/ }));
      expect(screen.getByText('Seleccione un mall para ver sus medidores')).toBeInTheDocument();
    });
  });

  describe('tree panel', () => {
    it('renders hierarchy section', () => {
      renderPage();
      expect(screen.getByText('Jerarquía')).toBeInTheDocument();
    });

    it('renders portfolio root label', () => {
      renderPage();
      expect(screen.getByText(/Total país/)).toBeInTheDocument();
    });

    it('renders CL buildings in tree', () => {
      renderPage();
      expect(screen.getByText('Mall Costanera')).toBeInTheDocument();
      expect(screen.getByText('Mall Plaza Oeste')).toBeInTheDocument();
    });

    it('does not render PE building (filtered by default country CL)', () => {
      renderPage();
      expect(screen.queryByText('Mall Jockey')).not.toBeInTheDocument();
    });
  });

  describe('detail panel', () => {
    it('renders KPIs section', () => {
      renderPage();
      expect(screen.getByText('KPIs')).toBeInTheDocument();
    });

    it('shows placeholder when no mall selected', () => {
      renderPage();
      expect(screen.getAllByText('Seleccione un mall').length).toBeGreaterThanOrEqual(1);
    });

    it('shows KPIs when building clicked', async () => {
      const user = userEvent.setup();
      renderPage();
      await user.click(screen.getByText('Mall Costanera'));
      expect(screen.getAllByText(/Intensidad/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/kWh\/m²/).length).toBeGreaterThanOrEqual(1);
    });
  });
});
