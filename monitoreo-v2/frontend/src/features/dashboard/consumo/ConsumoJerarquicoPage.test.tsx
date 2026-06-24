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
  useAggregatedReadingsQuery: () => ({
    data: [],
    isLoading: false,
    isSuccess: true,
  }),
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

  describe('layout and filters', () => {
    it('renders page header', () => {
      renderPage();
      expect(screen.getByRole('heading', { name: 'Consumo Jerárquico' })).toBeInTheDocument();
    });

    it('renders country selector', () => {
      renderPage();
      expect(screen.getByText('Chile')).toBeInTheDocument();
      expect(screen.getByText('Perú')).toBeInTheDocument();
      expect(screen.getByText('Colombia')).toBeInTheDocument();
    });

    it('renders period selector', () => {
      renderPage();
      expect(screen.getByText('Mes')).toBeInTheDocument();
      expect(screen.getByText('Trimestre')).toBeInTheDocument();
      expect(screen.getByText('Año')).toBeInTheDocument();
    });

    it('renders metric selector', () => {
      renderPage();
      // "Consumo" also appears as eyebrow — check all three metric labels exist
      expect(screen.getAllByText('Consumo').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Demanda')).toBeInTheDocument();
      expect(screen.getByText('Costo')).toBeInTheDocument();
    });

    it('renders portfolio total', () => {
      renderPage();
      expect(screen.getByText('Portafolio')).toBeInTheDocument();
    });
  });

  describe('building tree', () => {
    it('renders Chilean buildings by default', () => {
      renderPage();
      expect(screen.getByText('Mall Costanera')).toBeInTheDocument();
      expect(screen.getByText('Mall Plaza Oeste')).toBeInTheDocument();
    });

    it('does not render Peruvian building with Chile selected', () => {
      renderPage();
      expect(screen.queryByText('Mall Jockey')).not.toBeInTheDocument();
    });

    it('shows table headers', () => {
      renderPage();
      expect(screen.getByText('Centro')).toBeInTheDocument();
      expect(screen.getByText('% Total')).toBeInTheDocument();
      expect(screen.getByText('Medidores')).toBeInTheDocument();
      expect(screen.getByText('Estado')).toBeInTheDocument();
    });

    it('shows meter count per building', () => {
      renderPage();
      // b1 has 2 meters, b2 has 1
      const cells = screen.getAllByText('2');
      expect(cells.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('expand building', () => {
    it('shows meters when building row is clicked', async () => {
      const user = userEvent.setup();
      renderPage();

      await user.click(screen.getByText('Mall Costanera'));

      // Should show meters of b1
      expect(screen.getByText('Principal')).toBeInTheDocument();
      expect(screen.getByText('HVAC')).toBeInTheDocument();
    });

    it('collapses meters on second click', async () => {
      const user = userEvent.setup();
      renderPage();

      await user.click(screen.getByText('Mall Costanera'));
      expect(screen.getByText('Principal')).toBeInTheDocument();

      await user.click(screen.getByText('Mall Costanera'));
      expect(screen.queryByText('Principal')).not.toBeInTheDocument();
    });
  });

  describe('country filter', () => {
    it('switches to Peru and shows Peruvian building', async () => {
      const user = userEvent.setup();
      renderPage();

      await user.click(screen.getByText('Perú'));
      expect(screen.getByText('Mall Jockey')).toBeInTheDocument();
      expect(screen.queryByText('Mall Costanera')).not.toBeInTheDocument();
    });
  });
});
