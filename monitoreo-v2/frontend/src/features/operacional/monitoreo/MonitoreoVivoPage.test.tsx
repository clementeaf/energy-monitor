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

const RECENT_TS = new Date(Date.now() - 10 * 60 * 1000).toISOString();
const STALE_TS = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString();

vi.mock('../../../hooks/queries/useReadingsQuery', () => ({
  useLatestReadingsQuery: () => ({
    data: [
      { meter_id: 'm1', meter_name: 'Principal', building_id: 'b1', timestamp: RECENT_TS, power_kw: '500', energy_kwh_total: '120000', voltage_l1: '220', current_l1: '30', power_factor: '0.95', frequency_hz: '50' },
      { meter_id: 'm2', meter_name: 'HVAC', building_id: 'b1', timestamp: STALE_TS, power_kw: '200', energy_kwh_total: '50000', voltage_l1: '221', current_l1: '12', power_factor: '0.93', frequency_hz: '50' },
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
vi.mock('../../../hooks/queries/useCnrQuery', () => ({ useCnrQuery: () => ({ data: [{ id: 'cnr1', created_at: '2026-06-24T10:00:00Z', justification: 'test' }], isLoading: false, isSuccess: true }) }));

vi.mock('../../../hooks/useOperatorFilter', () => ({
  useOperatorFilter: () => ({
    isFilteredMode: false,
    needsSelection: false,
    operatorBuildingIds: null,
    operatorMeterIds: null,
  }),
}));

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
      expect(screen.getByRole('heading', { name: 'Monitoreo en Vivo' })).toBeInTheDocument();
    });
  });

  describe('KPI stat row', () => {
    it('renders total meters', () => {
      renderPage();
      expect(screen.getByText('Total medidores')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('renders online percentage', () => {
      renderPage();
      expect(screen.getByText('En línea')).toBeInTheDocument();
    });

    it('renders offline count', () => {
      renderPage();
      expect(screen.getAllByText('Offline').length).toBeGreaterThanOrEqual(1);
    });

    it('renders stale count', () => {
      renderPage();
      expect(screen.getByText(/Estancado/)).toBeInTheDocument();
    });

    it('renders CNR pendientes with actual count from cnrQuery', () => {
      renderPage();
      const cnrLabel = screen.getByText('CNR pendientes');
      const cnrStat = cnrLabel.closest('div')!;
      expect(cnrStat.textContent).toContain('1');
    });
  });

  describe('tabs', () => {
    it('renders tab buttons', () => {
      renderPage();
      expect(screen.getByRole('button', { name: 'Panorama' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Medidores/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Eventos' })).toBeInTheDocument();
    });

    it('shows panorama tab by default with mall cards', () => {
      renderPage();
      expect(screen.getByText('Centros comerciales')).toBeInTheDocument();
      expect(screen.getAllByText('Mall Arauco').length).toBeGreaterThanOrEqual(1);
    });

    it('shows eventos tab content on click', async () => {
      const user = userEvent.setup();
      renderPage();
      await user.click(screen.getByRole('button', { name: 'Eventos' }));
      expect(screen.getByText('Eventos recientes')).toBeInTheDocument();
    });
  });

  describe('mall interaction', () => {
    it('navigates to medidores tab on mall click', async () => {
      const user = userEvent.setup();
      renderPage();
      const mallButtons = screen.getAllByText('Mall Arauco');
      const cardButton = mallButtons.find((el) => el.closest('button[type="button"]'))!;
      await user.click(cardButton);
      expect(screen.getByText('Medidores')).toBeInTheDocument();
    });
  });

  describe('no placeholder data', () => {
    it('does not show placeholder mall cards when data is empty', () => {
      renderPage();
      expect(screen.queryByText('Mall del Mar')).not.toBeInTheDocument();
      expect(screen.queryByText('Open Temuco')).not.toBeInTheDocument();
    });
  });
});
