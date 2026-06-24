import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
    it('renders page header', () => {
      renderPage();
      expect(screen.getByRole('heading', { name: 'Costos y Tendencias' })).toBeInTheDocument();
    });

    it('renders country selector', () => {
      renderPage();
      expect(screen.getByText('Chile')).toBeInTheDocument();
      expect(screen.getByText('Perú')).toBeInTheDocument();
    });

    it('renders period selector', () => {
      renderPage();
      expect(screen.getByText('Mes actual')).toBeInTheDocument();
      expect(screen.getByText('Trimestre')).toBeInTheDocument();
    });

    it('renders currency selector', () => {
      renderPage();
      expect(screen.getByText('CLP')).toBeInTheDocument();
      expect(screen.getByText('UF')).toBeInTheDocument();
      expect(screen.getByText('USD')).toBeInTheDocument();
    });
  });

  describe('summary KPIs', () => {
    it('renders all four KPI cards', () => {
      renderPage();
      expect(screen.getAllByText('Costo total').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Consumo total')).toBeInTheDocument();
      expect(screen.getAllByText('Precio medio').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Centros')).toBeInTheDocument();
    });
  });

  describe('cost table', () => {
    it('renders table headers', () => {
      renderPage();
      expect(screen.getByText('Centro')).toBeInTheDocument();
      expect(screen.getByText('MWh')).toBeInTheDocument();
      // "Precio medio" and "Costo total" also appear as KPI cards
      expect(screen.getAllByText('Precio medio').length).toBe(2); // KPI + header
      expect(screen.getAllByText('Costo total').length).toBe(2);  // KPI + header
      expect(screen.getByText('Facturas')).toBeInTheDocument();
    });

    it('renders Chilean buildings in table', () => {
      renderPage();
      expect(screen.getByText('Mall Costanera')).toBeInTheDocument();
      expect(screen.getByText('Mall Arauco')).toBeInTheDocument();
    });

    it('does not render Peruvian building', () => {
      renderPage();
      expect(screen.queryByText('Mall Lima')).not.toBeInTheDocument();
    });

    it('excludes voided invoices from cost calculation', () => {
      renderPage();
      // Mall Arauco has inv3 (238000 paid) + inv4 (voided, excluded)
      // So only 1 invoice counted for Arauco
      const rows = screen.getAllByText('1');
      expect(rows.length).toBeGreaterThanOrEqual(1);
    });

    it('renders table footer with totals', () => {
      renderPage();
      expect(screen.getByText('Total')).toBeInTheDocument();
    });
  });

  describe('chart', () => {
    it('renders chart area', () => {
      renderPage();
      expect(screen.getByTestId('chart')).toBeInTheDocument();
    });

    it('renders chart section title', () => {
      renderPage();
      expect(screen.getByText('Costo mensual por período')).toBeInTheDocument();
    });
  });

  describe('country filter', () => {
    it('switches to Peru and hides Chilean buildings', async () => {
      const user = userEvent.setup();
      renderPage();

      await user.click(screen.getByText('Perú'));

      expect(screen.getByText('Mall Lima')).toBeInTheDocument();
      expect(screen.queryByText('Mall Costanera')).not.toBeInTheDocument();
    });
  });
});
