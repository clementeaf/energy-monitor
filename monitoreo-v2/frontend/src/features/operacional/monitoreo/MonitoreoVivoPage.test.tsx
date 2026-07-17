import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';

vi.mock('../../../hooks/queries/useBuildingsQuery', () => ({
  useBuildingsQuery: () => ({
    data: [
      { id: 'b1', name: 'Mall Arauco', tenantId: 't1', code: 'MA', address: null, countryCode: 'CL', isActive: true, latitude: null, longitude: null, areaSqm: null, regionId: null, timezone: null, externalSiteId: null, siteKind: null, createdAt: '', updatedAt: '' },
      { id: 'b2', name: 'Mall Plaza', tenantId: 't1', code: 'MP', address: null, countryCode: 'CL', isActive: true, latitude: null, longitude: null, areaSqm: null, regionId: null, timezone: null, externalSiteId: null, siteKind: null, createdAt: '', updatedAt: '' },
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

const RECENT_TS = new Date(Date.now() - 10 * 60 * 1000).toISOString(); // 10 min ago
const STALE_TS = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(); // 5h ago

vi.mock('../../../hooks/queries/useReadingsQuery', () => ({
  useLatestReadingsQuery: () => ({
    data: [
      { meter_id: 'm1', meter_name: 'Principal', building_id: 'b1', timestamp: RECENT_TS, power_kw: '500', energy_kwh_total: '120000', voltage_l1: '220', current_l1: '30', power_factor: '0.95', frequency_hz: '50' },
      { meter_id: 'm2', meter_name: 'HVAC', building_id: 'b1', timestamp: STALE_TS, power_kw: '200', energy_kwh_total: '50000', voltage_l1: '221', current_l1: '12', power_factor: '0.93', frequency_hz: '50' },
      // m3 has no reading → offline
    ],
    isLoading: false,
    isSuccess: true,
  }),
  useAggregatedReadingsQuery: () => ({ data: [], isLoading: false, isSuccess: true }),
}));

vi.mock('../../../hooks/queries/useAlertsQuery', () => ({
  useAlertsQuery: () => ({
    data: [
      { id: 'a1', buildingId: 'b1', meterId: 'm1', alertRuleId: null, alertTypeCode: 'OV', severity: 'critical', status: 'active', message: 'Sobrevoltaje en Principal', triggeredValue: 250, thresholdValue: 240, assignedTo: null, acknowledgedBy: null, acknowledgedAt: null, resolvedBy: null, resolvedAt: null, resolutionNotes: null, createdAt: '2026-06-24T11:00:00Z' },
    ],
    isLoading: false,
    isSuccess: true,
    isPending: false,
  }),
}));

vi.mock('../../../hooks/queries/useBackfillJobsQuery', () => ({
  useBackfillJobsQuery: () => ({
    data: [],
    isLoading: false,
    isSuccess: true,
  }),
}));
vi.mock('../../../hooks/queries/useCnrQuery', () => ({ useCnrQuery: () => ({ data: [], isLoading: false, isSuccess: true }) }));

import { MonitoreoVivoPage } from './MonitoreoVivoPage';

function renderPage() {
  return render(
    <MemoryRouter>
      <MonitoreoVivoPage />
    </MemoryRouter>,
  );
}

describe('MonitoreoVivoPage', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('layout', () => {
    it('renders page header', () => {
      renderPage();
      expect(screen.getByRole('heading', { name: '4.1 Monitoreo en Vivo' })).toBeInTheDocument();
    });
  });

  describe('KPI header', () => {
    it('renders total meters label', () => {
      renderPage();
      expect(screen.getByText('Total medidores')).toBeInTheDocument();
    });

    it('renders total meters value', () => {
      renderPage();
      // 3 meters total — value appears in KPI card
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('renders online KPI label', () => {
      renderPage();
      expect(screen.getByText('En línea [%]')).toBeInTheDocument();
    });

    it('renders offline KPI label', () => {
      renderPage();
      expect(screen.getByText('Offline')).toBeInTheDocument();
    });

    it('renders stale KPI label', () => {
      renderPage();
      // The label uses HTML entity > rendered as text
      expect(screen.getByText('Dato estancado > 4h')).toBeInTheDocument();
    });

    it('renders CNR pendientes KPI label', () => {
      renderPage();
      expect(screen.getByText('CNR pendientes')).toBeInTheDocument();
    });
  });

  describe('mall grid', () => {
    it('renders mall cards', () => {
      renderPage();
      expect(screen.getAllByText('Mall Arauco').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Mall Plaza').length).toBeGreaterThanOrEqual(1);
    });

    it('renders centros comerciales panel label', () => {
      renderPage();
      expect(screen.getByText('Mapa / grilla de centros comerciales')).toBeInTheDocument();
    });

    it('shows meter count badge', () => {
      renderPage();
      // Mall Arauco has 2 meters — shown in card as "2 med."
      expect(screen.getAllByText(/2 med\./).length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('expand mall', () => {
    it('shows meter table on mall click', async () => {
      const user = userEvent.setup();
      renderPage();

      // Click the mall card button
      const mallButtons = screen.getAllByText('Mall Arauco');
      const cardButton = mallButtons.find((el) => el.closest('button[type="button"]'))!;
      await user.click(cardButton);
      // Expanded row shows meter codes (meter.code ?? meter.name)
      expect(screen.getByText('P1')).toBeInTheDocument();
      expect(screen.getByText('H1')).toBeInTheDocument();
    });

    it('collapses on second click', async () => {
      const user = userEvent.setup();
      renderPage();

      const mallButtons = screen.getAllByText('Mall Arauco');
      const cardButton = mallButtons.find((el) => el.closest('button[type="button"]'))!;
      await user.click(cardButton);
      expect(screen.getByText('P1')).toBeInTheDocument();

      await user.click(cardButton);
      expect(screen.queryByText('P1')).not.toBeInTheDocument();
    });
  });

  describe('events feed', () => {
    it('renders feed panel label', () => {
      renderPage();
      expect(screen.getByText('Feed de eventos recientes')).toBeInTheDocument();
    });

    it('renders alert events', () => {
      renderPage();
      // Feed renders event type + message inside a <p> — message may be split across elements
      expect(screen.getByText(/Sobrevoltaje en Principal/)).toBeInTheDocument();
    });

    it('shows event type badge', () => {
      renderPage();
      // evt.type is 'alert' (lowercase); CSS class uppercase renders it visually as ALERT
      expect(screen.getByText(/^alert$/i)).toBeInTheDocument();
    });
  });

  describe('histogram panel', () => {
    it('renders histogram panel label', () => {
      renderPage();
      expect(screen.getByText('Comportamiento del parque — 24h')).toBeInTheDocument();
    });
  });

  describe('meter grid panel', () => {
    it('renders meter grid panel label', () => {
      renderPage();
      expect(screen.getByText('Grilla de medidores del mall seleccionado')).toBeInTheDocument();
    });

    it('shows placeholder when no mall selected', () => {
      renderPage();
      expect(screen.getByText('Seleccione un mall para ver sus medidores')).toBeInTheDocument();
    });
  });
});
