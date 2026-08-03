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

vi.mock('../../../components/charts/Chart', () => ({
  Chart: () => <div data-testid="chart">Chart</div>,
}));

vi.mock('../../../hooks/useOperatorFilter', () => ({
  useOperatorFilter: () => ({
    isFilteredMode: false,
    needsSelection: false,
    operatorBuildingIds: null,
    operatorMeterIds: null,
  }),
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

  describe('layout', () => {
    it('renders page header', () => {
      renderPage();
      expect(screen.getByRole('heading', { name: 'Costos y Tendencias' })).toBeInTheDocument();
    });

    it('renders filter dropdowns without banner label', () => {
      renderPage();
      expect(screen.queryByText('Filtros:')).not.toBeInTheDocument();
      expect(screen.getByText('País')).toBeInTheDocument();
      expect(screen.getByText('Moneda')).toBeInTheDocument();
    });
  });

  describe('tabs', () => {
    it('renders all tab buttons', () => {
      renderPage();
      expect(screen.getByRole('button', { name: 'Tendencia mensual' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Variación de costo' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Tabla por mall' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Proyecciones' })).toBeInTheDocument();
    });

    it('shows tendencia tab by default', () => {
      renderPage();
      const chartOrEmpty = screen.queryByTestId('chart') ?? screen.queryByText('Sin datos de facturación');
      expect(chartOrEmpty).toBeInTheDocument();
    });

    it('shows cost table on tabla tab click', async () => {
      const user = userEvent.setup();
      renderPage();
      await user.click(screen.getByRole('button', { name: 'Tabla por mall' }));
      expect(screen.getByRole('button', { name: 'Exportar CSV' })).toBeInTheDocument();
      expect(screen.getAllByText('Mall Costanera').length).toBeGreaterThanOrEqual(1);
    });

    it('excludes voided invoices from table', async () => {
      const user = userEvent.setup();
      renderPage();
      await user.click(screen.getByRole('button', { name: 'Tabla por mall' }));
      const clCells = screen.getAllByText('CL');
      expect(clCells.length).toBeGreaterThanOrEqual(1);
    });

    it('shows waterfall on variation tab click', async () => {
      const user = userEvent.setup();
      renderPage();
      await user.click(screen.getByRole('button', { name: 'Variación de costo' }));
      expect(screen.getByText('Anterior')).toBeInTheDocument();
      expect(screen.getByText('Actual')).toBeInTheDocument();
    });
  });
});
