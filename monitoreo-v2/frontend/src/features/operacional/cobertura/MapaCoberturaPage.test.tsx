import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';

vi.mock('../../../hooks/queries/useBuildingsQuery', () => ({
  useBuildingsQuery: () => ({
    data: [
      { id: 'b1', name: 'Mall Norte', tenantId: 't1', code: 'MN', address: null, countryCode: 'CL', isActive: true, latitude: -33.4, longitude: -70.6, areaSqm: null, regionId: null, timezone: null, externalSiteId: null, siteKind: null, createdAt: '', updatedAt: '' },
      { id: 'b2', name: 'Mall Sur', tenantId: 't1', code: 'MS', address: null, countryCode: 'CL', isActive: true, latitude: -33.5, longitude: -70.7, areaSqm: null, regionId: null, timezone: null, externalSiteId: null, siteKind: null, createdAt: '', updatedAt: '' },
    ],
    isLoading: false,
    isSuccess: true,
  }),
}));

vi.mock('../../../hooks/queries/useMetersQuery', () => ({
  useMetersQuery: () => ({
    data: [
      { id: 'm1', buildingId: 'b1', name: 'P1', code: 'P1', meterType: 'main', isActive: true, metadata: {}, externalId: null, model: null, serialNumber: null, ipAddress: null, modbusAddress: null, busId: null, phaseType: 'three_phase', nominalVoltage: null, nominalCurrent: null, contractedDemandKw: null, loadCategory: 'main', parentMeterId: null, createdAt: '', updatedAt: '' },
      { id: 'm2', buildingId: 'b1', name: 'H1', code: 'H1', meterType: 'sub', isActive: true, metadata: {}, externalId: null, model: null, serialNumber: null, ipAddress: null, modbusAddress: null, busId: null, phaseType: 'three_phase', nominalVoltage: null, nominalCurrent: null, contractedDemandKw: null, loadCategory: 'hvac', parentMeterId: null, createdAt: '', updatedAt: '' },
      { id: 'm3', buildingId: 'b2', name: 'G1', code: 'G1', meterType: 'main', isActive: true, metadata: {}, externalId: null, model: null, serialNumber: null, ipAddress: null, modbusAddress: null, busId: null, phaseType: 'three_phase', nominalVoltage: null, nominalCurrent: null, contractedDemandKw: null, loadCategory: 'main', parentMeterId: null, createdAt: '', updatedAt: '' },
    ],
    isLoading: false,
    isSuccess: true,
  }),
}));

vi.mock('../../../hooks/queries/useReadingsQuery', () => ({
  useLatestReadingsQuery: () => ({
    data: [
      { meter_id: 'm1', meter_name: 'P1', building_id: 'b1', timestamp: new Date().toISOString(), power_kw: '500', energy_kwh_total: '120000', voltage_l1: null, current_l1: null, power_factor: null, frequency_hz: null },
      // m2 offline, m3 online
      { meter_id: 'm3', meter_name: 'G1', building_id: 'b2', timestamp: new Date().toISOString(), power_kw: '300', energy_kwh_total: '80000', voltage_l1: null, current_l1: null, power_factor: null, frequency_hz: null },
    ],
    isLoading: false,
    isSuccess: true,
  }),
}));

vi.mock('../../../hooks/queries/useAlertsQuery', () => ({
  useAlertsQuery: () => ({
    data: [
      { id: 'a1', buildingId: 'b1', meterId: 'm1', alertRuleId: null, alertTypeCode: 'OV', severity: 'critical', status: 'active', message: 'Sobrevoltaje', triggeredValue: 250, thresholdValue: 240, assignedTo: null, acknowledgedBy: null, acknowledgedAt: null, resolvedBy: null, resolvedAt: null, resolutionNotes: null, createdAt: '2026-06-24T11:00:00Z' },
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

import { MapaCoberturaPage } from './MapaCoberturaPage';

function renderPage() {
  return render(
    <MemoryRouter>
      <MapaCoberturaPage />
    </MemoryRouter>,
  );
}

describe('MapaCoberturaPage', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('layout', () => {
    it('renders page header', () => {
      renderPage();
      expect(screen.getByRole('heading', { name: 'Mapa de Cobertura' })).toBeInTheDocument();
    });

    it('renders map', () => {
      renderPage();
      expect(screen.getByTestId('map-view')).toBeInTheDocument();
    });

    it('renders metric selector', () => {
      renderPage();
      expect(screen.getByText('% Online')).toBeInTheDocument();
      expect(screen.getAllByText('Alertas').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Última lectura')).toBeInTheDocument();
    });

    it('renders search input', () => {
      renderPage();
      expect(screen.getByPlaceholderText('Buscar centro...')).toBeInTheDocument();
    });
  });

  describe('side panel', () => {
    it('renders building list sorted by % online ascending', () => {
      renderPage();
      // b1: 1/2 = 50% online (worst), b2: 1/1 = 100% online
      const items = screen.getAllByRole('button').filter((btn) =>
        btn.textContent?.includes('% online'),
      );
      expect(items.length).toBe(2);
      // First should be Mall Norte (50%)
      expect(items[0].textContent).toContain('Mall Norte');
      expect(items[0].textContent).toContain('50% online');
    });

    it('shows meter count per building', () => {
      renderPage();
      expect(screen.getByText(/2 med\./)).toBeInTheDocument();
    });

    it('shows alert count', () => {
      renderPage();
      expect(screen.getByText(/1 alertas/)).toBeInTheDocument();
    });
  });

  describe('search', () => {
    it('filters buildings by name', async () => {
      const user = userEvent.setup();
      renderPage();

      await user.type(screen.getByPlaceholderText('Buscar centro...'), 'Sur');

      expect(screen.queryByText('Mall Norte')).not.toBeInTheDocument();
      expect(screen.getByText('Mall Sur')).toBeInTheDocument();
    });

    it('shows no results message', async () => {
      const user = userEvent.setup();
      renderPage();

      await user.type(screen.getByPlaceholderText('Buscar centro...'), 'zzz');

      expect(screen.getByText('Sin resultados.')).toBeInTheDocument();
    });
  });
});
