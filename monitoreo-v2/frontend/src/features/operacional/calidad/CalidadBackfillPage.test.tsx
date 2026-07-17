import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

vi.mock('../../../hooks/queries/useBuildingsQuery', () => ({
  useBuildingsQuery: () => ({
    data: [
      { id: 'b1', name: 'Mall Norte', tenantId: 't1', code: 'MN', address: null, countryCode: 'CL', isActive: true, latitude: null, longitude: null, areaSqm: null, regionId: null, timezone: null, externalSiteId: null, siteKind: null, createdAt: '', updatedAt: '' },
      { id: 'b2', name: 'Mall Sur', tenantId: 't1', code: 'MS', address: null, countryCode: 'CL', isActive: true, latitude: null, longitude: null, areaSqm: null, regionId: null, timezone: null, externalSiteId: null, siteKind: null, createdAt: '', updatedAt: '' },
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

const RECENT = new Date(Date.now() - 10 * 60 * 1000).toISOString();

vi.mock('../../../hooks/queries/useReadingsQuery', () => ({
  useLatestReadingsQuery: () => ({
    data: [
      // m1 has recent data, m2 and m3 have no reading → offline/degraded
      { meter_id: 'm1', meter_name: 'Principal', building_id: 'b1', timestamp: RECENT, power_kw: '500', energy_kwh_total: '120000', voltage_l1: '220', current_l1: '30', power_factor: '0.95', frequency_hz: '50' },
    ],
    isLoading: false,
    isSuccess: true,
  }),
  useAggregatedReadingsQuery: () => ({ data: [], isLoading: false, isSuccess: true }),
}));

vi.mock('../../../hooks/queries/useBackfillJobsQuery', () => ({
  useBackfillJobsQuery: () => ({
    data: [
      { id: 'bf1', tenantId: 't1', meterId: 'm2', fromTs: '2026-06-20T00:00:00Z', toTs: '2026-06-22T00:00:00Z', status: 'running', rowsProcessed: 150, errorMessage: null, createdAt: '2026-06-24T08:00:00Z', updatedAt: '2026-06-24T10:00:00Z' },
      { id: 'bf2', tenantId: 't1', meterId: 'm3', fromTs: '2026-06-18T00:00:00Z', toTs: '2026-06-20T00:00:00Z', status: 'completed', rowsProcessed: 300, errorMessage: null, createdAt: '2026-06-23T08:00:00Z', updatedAt: '2026-06-23T12:00:00Z' },
    ],
    isLoading: false,
    isSuccess: true,
  }),
}));

import { CalidadBackfillPage } from './CalidadBackfillPage';

function renderPage() {
  return render(
    <MemoryRouter>
      <CalidadBackfillPage />
    </MemoryRouter>,
  );
}

describe('CalidadBackfillPage', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('layout', () => {
    it('renders page header', () => {
      renderPage();
      expect(screen.getByRole('heading', { name: '4.4 Calidad y Backfill' })).toBeInTheDocument();
    });
  });

  describe('scorecard table', () => {
    it('renders scorecard heading', () => {
      renderPage();
      expect(screen.getByText('Scorecard de calidad por mall')).toBeInTheDocument();
    });

    it('renders table column headers', () => {
      renderPage();
      expect(screen.getByText('Mall')).toBeInTheDocument();
      expect(screen.getByText('% Reales')).toBeInTheDocument();
      expect(screen.getByText('% Estimadas')).toBeInTheDocument();
      expect(screen.getByText('% CNR')).toBeInTheDocument();
      expect(screen.getByText('Tendencia')).toBeInTheDocument();
    });

    it('renders building rows', () => {
      renderPage();
      expect(screen.getByText('Mall Norte')).toBeInTheDocument();
      expect(screen.getByText('Mall Sur')).toBeInTheDocument();
    });
  });

  describe('histogram panel', () => {
    it('renders histogram heading', () => {
      renderPage();
      expect(screen.getByText('Histograma de calidad — 30 días')).toBeInTheDocument();
    });

    it('renders histogram legend', () => {
      renderPage();
      expect(screen.getByText('Real')).toBeInTheDocument();
      expect(screen.getByText('Estimado')).toBeInTheDocument();
      expect(screen.getByText('CNR')).toBeInTheDocument();
      expect(screen.getByText('Faltante')).toBeInTheDocument();
    });
  });

  describe('backfill panel', () => {
    it('renders backfill panel heading', () => {
      renderPage();
      expect(screen.getByText('Panel de backfill activo')).toBeInTheDocument();
    });

    it('renders running backfill job meter name', () => {
      renderPage();
      // bf1 is running for m2 → meter name resolved from meterMap = 'HVAC'
      expect(screen.getByText('HVAC')).toBeInTheDocument();
    });

    it('renders launch backfill button', () => {
      renderPage();
      expect(screen.getByText('Lanzar backfill manual')).toBeInTheDocument();
    });

    it('renders backfill table headers', () => {
      renderPage();
      expect(screen.getByText('Medidor')).toBeInTheDocument();
      expect(screen.getByText('Tipo de gap')).toBeInTheDocument();
      expect(screen.getByText('% completado')).toBeInTheDocument();
      expect(screen.getByText('ETA')).toBeInTheDocument();
    });
  });

  describe('degradation alerts panel', () => {
    it('renders degradation panel heading', () => {
      renderPage();
      expect(screen.getByText('Alertas de degradación de calidad')).toBeInTheDocument();
    });

    it('renders meters without recent data', () => {
      renderPage();
      // m2 (HVAC) and m3 (General) have no readings — appear in degradation list via meter code
      // The page renders: "Medidor {meter.code} {buildingName} — cae a..."
      expect(screen.getAllByText(/H1|G1/).length).toBeGreaterThanOrEqual(1);
    });
  });
});
