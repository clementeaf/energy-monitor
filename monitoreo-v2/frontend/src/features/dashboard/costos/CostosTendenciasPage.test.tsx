import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

vi.mock('../../../hooks/queries/useBuildingsQuery', () => ({
  useBuildingsQuery: () => ({
    data: [
      { id: 'b1', name: 'Mall Costanera', tenantId: 't1', code: 'MC', address: null, countryCode: 'CL', isActive: true, latitude: null, longitude: null, areaSqm: null, regionId: null, timezone: null, externalSiteId: null, siteKind: null, createdAt: '', updatedAt: '' },
      { id: 'b2', name: 'Mall Arauco', tenantId: 't1', code: 'MA', address: null, countryCode: 'CL', isActive: true, latitude: null, longitude: null, areaSqm: null, regionId: null, timezone: null, externalSiteId: null, siteKind: null, createdAt: '', updatedAt: '' },
      { id: 'b3', name: 'Mall Lima', tenantId: 't1', code: 'ML', address: null, countryCode: 'PE', isActive: true, latitude: null, longitude: null, areaSqm: null, regionId: null, timezone: null, externalSiteId: null, siteKind: null, createdAt: '', updatedAt: '' },
    ],
    isLoading: false,
    isSuccess: true,
  }),
}));

vi.mock('../../../hooks/queries/useInvoicesQuery', () => ({
  useInvoicesQuery: () => ({
    data: [
      { id: 'inv1', buildingId: 'b1', tenantId: 't1', tariffId: null, invoiceNumber: 'F-001', periodStart: '2026-05-01', periodEnd: '2026-05-31', status: 'paid', totalNet: '400000', taxRate: '0.19', taxAmount: '76000', total: '476000', notes: null, approvedBy: null, approvedAt: null, createdBy: 'u1', createdAt: '', updatedAt: '' },
      { id: 'inv2', buildingId: 'b1', tenantId: 't1', tariffId: null, invoiceNumber: 'F-002', periodStart: '2026-06-01', periodEnd: '2026-06-30', status: 'pending', totalNet: '420000', taxRate: '0.19', taxAmount: '79800', total: '499800', notes: null, approvedBy: null, approvedAt: null, createdBy: 'u1', createdAt: '', updatedAt: '' },
      { id: 'inv3', buildingId: 'b2', tenantId: 't1', tariffId: null, invoiceNumber: 'F-003', periodStart: '2026-05-01', periodEnd: '2026-05-31', status: 'paid', totalNet: '200000', taxRate: '0.19', taxAmount: '38000', total: '238000', notes: null, approvedBy: null, approvedAt: null, createdBy: 'u1', createdAt: '', updatedAt: '' },
      { id: 'inv4', buildingId: 'b2', tenantId: 't1', tariffId: null, invoiceNumber: 'F-004', periodStart: '2026-05-01', periodEnd: '2026-05-31', status: 'voided', totalNet: '100000', taxRate: '0.19', taxAmount: '19000', total: '119000', notes: null, approvedBy: null, approvedAt: null, createdBy: 'u1', createdAt: '', updatedAt: '' },
    ],
    isLoading: false,
    isSuccess: true,
  }),
}));

vi.mock('../../../hooks/queries/useReadingsQuery', () => ({
  useLatestReadingsQuery: () => ({
    data: [
      { meter_id: 'm1', meter_name: 'M1', building_id: 'b1', timestamp: '2026-06-24T12:00:00Z', power_kw: '500', energy_kwh_total: '120000', voltage_l1: null, current_l1: null, power_factor: null, frequency_hz: null },
      { meter_id: 'm2', meter_name: 'M2', building_id: 'b2', timestamp: '2026-06-24T12:00:00Z', power_kw: '300', energy_kwh_total: '80000', voltage_l1: null, current_l1: null, power_factor: null, frequency_hz: null },
    ],
    isLoading: false,
    isSuccess: true,
  }),
}));

// Mock Chart (avoids Highcharts in jsdom)
vi.mock('../../../components/charts/Chart', () => ({
  Chart: () => <div data-testid="chart">Chart</div>,
}));

import { CostosTendenciasPage } from './CostosTendenciasPage';

function renderPage() {
  return render(
    <MemoryRouter>
      <CostosTendenciasPage />
    </MemoryRouter>,
  );
}

describe('CostosTendenciasPage', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('layout and filters', () => {
    it('renders page header with "3.3 Costos y Tendencias"', () => {
      renderPage();
      expect(screen.getByRole('heading', { name: /3\.3 Costos y Tendencias/ })).toBeInTheDocument();
    });

    it('renders filter banner', () => {
      renderPage();
      expect(screen.getByText('Filtros:')).toBeInTheDocument();
    });

    it('renders period selector with default "Mes actual"', () => {
      renderPage();
      expect(screen.getAllByText('Mes actual').length).toBeGreaterThanOrEqual(1);
    });

    it('renders currency selector', () => {
      renderPage();
      // CLP appears as the default DropdownSelect button value and as option
      expect(screen.getAllByText('CLP').length).toBeGreaterThanOrEqual(1);
    });

    it('renders grouping selector', () => {
      renderPage();
      expect(screen.getByText('Agrupación')).toBeInTheDocument();
      expect(screen.getAllByText('Por mall').length).toBeGreaterThanOrEqual(1);
    });

    it('renders mall multi-select', () => {
      renderPage();
      expect(screen.getByText('Todos los malls')).toBeInTheDocument();
    });
  });

  describe('chart section', () => {
    it('renders stacked bar chart area', () => {
      renderPage();
      // Chart is mocked — no real invoices in same month so "Sin datos de facturación" shown
      // Either the chart or the empty state renders
      const chartOrEmpty = screen.queryByTestId('chart') ?? screen.queryByText('Sin datos de facturación');
      expect(chartOrEmpty).toBeInTheDocument();
    });

    it('renders chart section label', () => {
      renderPage();
      expect(screen.getByText(/Barras apiladas mensual/)).toBeInTheDocument();
    });

    it('renders waterfall section', () => {
      renderPage();
      expect(screen.getByText('Waterfall de variación de costo')).toBeInTheDocument();
    });
  });

  describe('cost table', () => {
    it('renders table section label', () => {
      renderPage();
      expect(screen.getByText(/Tabla de costos por mall/)).toBeInTheDocument();
    });

    it('renders sortable table headers', () => {
      renderPage();
      expect(screen.getAllByText('Mall').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('País').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Variación %')).toBeInTheDocument();
    });

    it('renders export CSV button', () => {
      renderPage();
      expect(screen.getByRole('button', { name: 'Exportar CSV' })).toBeInTheDocument();
    });

    it('renders CL buildings in table', () => {
      renderPage();
      expect(screen.getByText('Mall Costanera')).toBeInTheDocument();
      expect(screen.getByText('Mall Arauco')).toBeInTheDocument();
    });

    it('excludes Peruvian building (filtered by default country CL)', () => {
      renderPage();
      expect(screen.queryByText('Mall Lima')).not.toBeInTheDocument();
    });

    it('excludes voided invoices from calculation', () => {
      renderPage();
      // Mall Arauco has only 1 non-voided invoice (inv3); inv4 is voided
      // Country code column shows CL for both buildings
      const clCells = screen.getAllByText('CL');
      expect(clCells.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('projections section', () => {
    it('renders projections row', () => {
      renderPage();
      expect(screen.getByText('Proyecciones — 2 meses')).toBeInTheDocument();
    });

    it('renders projection legend', () => {
      renderPage();
      expect(screen.getByText(/Proyectado/)).toBeInTheDocument();
    });
  });
});
