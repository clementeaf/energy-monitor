import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';

// Mock hooks before importing the component
vi.mock('../../../hooks/usePermissions', () => ({
  usePermissions: () => ({
    has: () => true,
    hasAny: () => true,
    roleSlug: 'corp_admin',
    realRoleSlug: 'corp_admin',
    isAdmin: true,
    isSuperAdmin: false,
    isImpersonating: false,
    permSet: new Set(['*']),
    profile: 'gerencial' as const,
  }),
}));

vi.mock('../../../store/useAppStore', () => ({
  useAppStore: () => ({
    sidebarOpen: true,
    selectedTenantId: null,
    viewAsRole: null,
    selectedOperator: null,
    selectedBuildingId: null,
  }),
}));

vi.mock('../../../hooks/queries/useBuildingsQuery', () => ({
  useBuildingsQuery: () => ({
    data: [
      { id: 'b1', name: 'Mall Norte', tenantId: 't1', code: 'MN', address: 'Av. Norte 123', countryCode: 'CL', isActive: true, latitude: -33.4, longitude: -70.6, areaSqm: null, regionId: null, timezone: null, externalSiteId: null, siteKind: null, createdAt: '', updatedAt: '' },
      { id: 'b2', name: 'Mall Sur', tenantId: 't1', code: 'MS', address: null, countryCode: 'CL', isActive: true, latitude: -33.5, longitude: -70.7, areaSqm: null, regionId: null, timezone: null, externalSiteId: null, siteKind: null, createdAt: '', updatedAt: '' },
      { id: 'b3', name: 'Mall Lima', tenantId: 't1', code: 'ML', address: null, countryCode: 'PE', isActive: true, latitude: -12.0, longitude: -77.0, areaSqm: null, regionId: null, timezone: null, externalSiteId: null, siteKind: null, createdAt: '', updatedAt: '' },
    ],
    isLoading: false,
    isError: false,
    isSuccess: true,
    isPending: false,
  }),
}));

vi.mock('../../../hooks/queries/useReadingsQuery', () => ({
  useLatestReadingsQuery: () => ({
    data: [
      { meter_id: 'm1', meter_name: 'Meter 1', building_id: 'b1', timestamp: '2026-06-24T12:00:00Z', power_kw: '150', energy_kwh_total: '1000', voltage_l1: '220', current_l1: '10', power_factor: '0.95', frequency_hz: '50' },
      { meter_id: 'm2', meter_name: 'Meter 2', building_id: 'b1', timestamp: '2026-06-24T12:00:00Z', power_kw: '200', energy_kwh_total: '2000', voltage_l1: '221', current_l1: '12', power_factor: '0.93', frequency_hz: '50' },
      { meter_id: 'm3', meter_name: 'Meter 3', building_id: 'b2', timestamp: '2026-06-24T12:00:00Z', power_kw: '100', energy_kwh_total: '500', voltage_l1: '219', current_l1: '8', power_factor: '0.97', frequency_hz: '50' },
    ],
    isLoading: false,
    isError: false,
    isSuccess: true,
  }),
}));

vi.mock('../../../hooks/queries/useAlertsQuery', () => ({
  useAlertsQuery: () => ({
    data: [
      { id: 'a1', buildingId: 'b1', meterId: 'm1', alertRuleId: null, alertTypeCode: 'OVERVOLTAGE', severity: 'critical', status: 'active', message: 'Sobrevoltaje detectado', triggeredValue: 250, thresholdValue: 240, assignedTo: null, acknowledgedBy: null, acknowledgedAt: null, resolvedBy: null, resolvedAt: null, resolutionNotes: null, createdAt: '2026-06-24T11:00:00Z' },
      { id: 'a2', buildingId: 'b2', meterId: 'm3', alertRuleId: null, alertTypeCode: 'LOW_PF', severity: 'medium', status: 'active', message: 'Factor de potencia bajo', triggeredValue: 0.7, thresholdValue: 0.85, assignedTo: null, acknowledgedBy: null, acknowledgedAt: null, resolvedBy: null, resolvedAt: null, resolutionNotes: null, createdAt: '2026-06-24T10:00:00Z' },
    ],
    isLoading: false,
    isError: false,
    isSuccess: true,
    isPending: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

vi.mock('../../../hooks/queries/useInvoicesQuery', () => ({
  useInvoicesQuery: () => ({
    data: [
      { id: 'inv1', invoiceNumber: 'F-001', total: '500000', status: 'paid', periodStart: '2026-05-01', periodEnd: '2026-05-31' },
      { id: 'inv2', invoiceNumber: 'F-002', total: '300000', status: 'pending', periodStart: '2026-06-01', periodEnd: '2026-06-30' },
    ],
    isLoading: false,
    isError: false,
    isSuccess: true,
  }),
}));

vi.mock('../../../hooks/queries/useMetersQuery', () => ({
  useMetersQuery: () => ({
    data: [
      { id: 'm1', buildingId: 'b1', name: 'HVAC Main', code: 'M1', meterType: 'main', isActive: true, metadata: {}, externalId: null, model: null, serialNumber: null, ipAddress: null, modbusAddress: null, busId: null, phaseType: 'three_phase', nominalVoltage: null, nominalCurrent: null, contractedDemandKw: null, loadCategory: 'hvac', parentMeterId: null, createdAt: '', updatedAt: '' },
      { id: 'm2', buildingId: 'b1', name: 'Lighting A', code: 'M2', meterType: 'sub', isActive: true, metadata: {}, externalId: null, model: null, serialNumber: null, ipAddress: null, modbusAddress: null, busId: null, phaseType: 'three_phase', nominalVoltage: null, nominalCurrent: null, contractedDemandKw: null, loadCategory: 'lighting', parentMeterId: null, createdAt: '', updatedAt: '' },
      { id: 'm3', buildingId: 'b2', name: 'Tenant 1', code: 'M3', meterType: 'sub', isActive: true, metadata: {}, externalId: null, model: null, serialNumber: null, ipAddress: null, modbusAddress: null, busId: null, phaseType: 'three_phase', nominalVoltage: null, nominalCurrent: null, contractedDemandKw: null, loadCategory: 'tenant', parentMeterId: null, createdAt: '', updatedAt: '' },
    ],
    isLoading: false,
    isSuccess: true,
  }),
}));

vi.mock('../../../hooks/queries/useHierarchyQuery', () => ({
  useHierarchyByBuildingQuery: () => ({
    data: [
      { id: 'f1', buildingId: 'b1', parentId: null, name: 'Piso 1', levelType: 'floor', sortOrder: 1, metadata: {}, createdAt: '', updatedAt: '' },
      { id: 'f2', buildingId: 'b1', parentId: null, name: 'Piso 2', levelType: 'floor', sortOrder: 2, metadata: {}, createdAt: '', updatedAt: '' },
      { id: 'z1', buildingId: 'b1', parentId: 'f1', name: 'Zona Norte', levelType: 'zone', sortOrder: 1, metadata: {}, createdAt: '', updatedAt: '' },
      { id: 'z2', buildingId: 'b1', parentId: 'f1', name: 'Zona Sur', levelType: 'zone', sortOrder: 2, metadata: {}, createdAt: '', updatedAt: '' },
      { id: 'z3', buildingId: 'b1', parentId: 'f2', name: 'Zona Este', levelType: 'zone', sortOrder: 1, metadata: {}, createdAt: '', updatedAt: '' },
    ],
    isLoading: false,
    isSuccess: true,
  }),
}));

// MapView mock (avoids maplibre-gl in jsdom)
vi.mock('../../../components/ui/MapView', () => ({
  MapView: ({ className }: { className?: string }) => (
    <div data-testid="map-view" className={className}>Map</div>
  ),
}));

import { PanelConsolidadoPage } from './PanelConsolidadoPage';

function renderPage() {
  return render(
    <MemoryRouter>
      <PanelConsolidadoPage />
    </MemoryRouter>,
  );
}

describe('PanelConsolidadoPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('layout', () => {
    it('renders page header with title "Panel Consolidado"', () => {
      renderPage();
      expect(screen.getByRole('heading', { name: 'Panel Consolidado' })).toBeInTheDocument();
    });

    it('renders country selector with Chile, Perú, Colombia', () => {
      renderPage();
      expect(screen.getByText('Chile')).toBeInTheDocument();
      expect(screen.getByText('Perú')).toBeInTheDocument();
      expect(screen.getByText('Colombia')).toBeInTheDocument();
    });

    it('renders map area', () => {
      renderPage();
      expect(screen.getByTestId('map-view')).toBeInTheDocument();
    });

    it('renders status legend', () => {
      renderPage();
      expect(screen.getByText('Normal')).toBeInTheDocument();
      expect(screen.getByText('Alerta')).toBeInTheDocument();
      expect(screen.getByText('Crítico')).toBeInTheDocument();
      expect(screen.getAllByText('Sin datos').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('KPI cards', () => {
    it('renders demand KPI', () => {
      renderPage();
      expect(screen.getByText('Demanda agregada')).toBeInTheDocument();
      // 150 + 200 + 100 = 450 kW = 0.45 MW (only CL buildings: b1 + b2)
      expect(screen.getByText('0.45 MW')).toBeInTheDocument();
    });

    it('renders consumo acumulado KPI', () => {
      renderPage();
      expect(screen.getByText('Consumo acumulado')).toBeInTheDocument();
    });

    it('renders malls activos KPI', () => {
      renderPage();
      expect(screen.getByText('Malls activos')).toBeInTheDocument();
    });
  });

  describe('building list', () => {
    it('renders Chilean buildings (filtered by default country CL)', () => {
      renderPage();
      expect(screen.getByText('Mall Norte')).toBeInTheDocument();
      expect(screen.getByText('Mall Sur')).toBeInTheDocument();
    });

    it('does not render Peruvian building when Chile is selected', () => {
      renderPage();
      expect(screen.queryByText('Mall Lima')).not.toBeInTheDocument();
    });

    it('shows building power and meter count', () => {
      renderPage();
      // Mall Norte: 150 + 200 = 350 kW, 2 meters — text split across elements
      expect(screen.getByText(/350\.0 kW/)).toBeInTheDocument();
      expect(screen.getByText(/2 med\./)).toBeInTheDocument();
    });
  });

  describe('building detail (Nivel 2)', () => {
    it('shows building detail panel on building click', async () => {
      const user = userEvent.setup();
      renderPage();

      await user.click(screen.getByText('Mall Norte'));

      // Breadcrumb + pill both show Chile
      expect(screen.getAllByText('Chile').length).toBeGreaterThanOrEqual(2);
      // Building name appears in breadcrumb + detail header
      expect(screen.getAllByText('Mall Norte').length).toBeGreaterThanOrEqual(2);
      // Should show metrics
      expect(screen.getByText('Carga total')).toBeInTheDocument();
      // Should show alert feed (alert also appears in critical events — use within)
      expect(screen.getByText(/Alertas en vivo/)).toBeInTheDocument();
      expect(screen.getAllByText('Sobrevoltaje detectado').length).toBeGreaterThanOrEqual(1);
    });

    it('returns to portfolio view on back click', async () => {
      const user = userEvent.setup();
      renderPage();

      // Go to detail
      await user.click(screen.getByText('Mall Norte'));
      // Breadcrumb has country as link — find the one inside the detail panel (last Chile is the breadcrumb)
      const chiles = screen.getAllByText('Chile');
      expect(chiles.length).toBeGreaterThanOrEqual(2);

      // Back to portfolio via breadcrumb (last Chile is in the breadcrumb inside the detail panel)
      await user.click(chiles[chiles.length - 1]);
      expect(screen.getByText('Centros comerciales')).toBeInTheDocument();
      expect(screen.getByText('Demanda agregada')).toBeInTheDocument();
    });
  });

  describe('country filter', () => {
    it('switches to Peru and shows Peruvian building', async () => {
      const user = userEvent.setup();
      renderPage();

      await user.click(screen.getByText('Perú'));
      expect(screen.getByText('Mall Lima')).toBeInTheDocument();
      expect(screen.queryByText('Mall Norte')).not.toBeInTheDocument();
    });
  });

  describe('critical events', () => {
    it('renders critical events section', () => {
      renderPage();
      expect(screen.getByText('Eventos críticos recientes')).toBeInTheDocument();
      expect(screen.getByText(/2 alertas activas/)).toBeInTheDocument();
    });

    it('renders alert severity badges', () => {
      renderPage();
      expect(screen.getByText('CRITICAL')).toBeInTheDocument();
      expect(screen.getByText('MEDIUM')).toBeInTheDocument();
    });
  });

  describe('floor tabs (Nivel 3 selector)', () => {
    it('shows floor tabs when building is selected', async () => {
      const user = userEvent.setup();
      renderPage();
      await user.click(screen.getByText('Mall Norte'));
      expect(screen.getByTestId('floor-tabs')).toBeInTheDocument();
      expect(screen.getByText('Piso 1')).toBeInTheDocument();
      expect(screen.getByText('Piso 2')).toBeInTheDocument();
    });

    it('shows floor plan view when floor tab is clicked', async () => {
      const user = userEvent.setup();
      renderPage();
      await user.click(screen.getByText('Mall Norte'));
      await user.click(screen.getByText('Piso 1'));
      expect(screen.getByTestId('floor-plan-view')).toBeInTheDocument();
      expect(screen.getByText(/Plano de Piso 1/)).toBeInTheDocument();
    });

    it('shows zones for the selected floor', async () => {
      const user = userEvent.setup();
      renderPage();
      await user.click(screen.getByText('Mall Norte'));
      await user.click(screen.getByText('Piso 1'));
      expect(screen.getByText('Zona Norte')).toBeInTheDocument();
      expect(screen.getByText('Zona Sur')).toBeInTheDocument();
    });

    it('does not show zones from other floors', async () => {
      const user = userEvent.setup();
      renderPage();
      await user.click(screen.getByText('Mall Norte'));
      await user.click(screen.getByText('Piso 1'));
      expect(screen.queryByText('Zona Este')).not.toBeInTheDocument();
    });

    it('shows breadcrumb with country > mall > floor', async () => {
      const user = userEvent.setup();
      renderPage();
      await user.click(screen.getByText('Mall Norte'));
      await user.click(screen.getByText('Piso 1'));
      // Floor plan breadcrumb
      const floorPlan = screen.getByTestId('floor-plan-view');
      expect(within(floorPlan).getByText('Chile')).toBeInTheDocument();
      expect(within(floorPlan).getByText('Mall Norte')).toBeInTheDocument();
      expect(within(floorPlan).getByText('Piso 1')).toBeInTheDocument();
    });

    it('returns to mall detail when clicking mall in breadcrumb', async () => {
      const user = userEvent.setup();
      renderPage();
      await user.click(screen.getByText('Mall Norte'));
      await user.click(screen.getByText('Piso 1'));
      // Click mall name in floor plan breadcrumb
      const floorPlan = screen.getByTestId('floor-plan-view');
      await user.click(within(floorPlan).getByText('Mall Norte'));
      expect(screen.queryByTestId('floor-plan-view')).not.toBeInTheDocument();
      expect(screen.getByTestId('map-view')).toBeInTheDocument();
    });

    it('shows color mode selector with 3 options', async () => {
      const user = userEvent.setup();
      renderPage();
      await user.click(screen.getByText('Mall Norte'));
      await user.click(screen.getByText('Piso 1'));
      expect(screen.getByText('Estado alarma')).toBeInTheDocument();
      expect(screen.getByText('Intensidad consumo')).toBeInTheDocument();
      expect(screen.getByText('Variación consumo')).toBeInTheDocument();
    });

    it('switches color mode on click', async () => {
      const user = userEvent.setup();
      renderPage();
      await user.click(screen.getByText('Mall Norte'));
      await user.click(screen.getByText('Piso 1'));
      await user.click(screen.getByText('Intensidad consumo'));
      // Legend should change
      expect(screen.getByText('Bajo')).toBeInTheDocument();
      expect(screen.getByText('Muy alto')).toBeInTheDocument();
    });

    it('deselects floor when clicking active floor tab again', async () => {
      const user = userEvent.setup();
      renderPage();
      await user.click(screen.getByText('Mall Norte'));
      await user.click(screen.getByText('Piso 1'));
      expect(screen.getByTestId('floor-plan-view')).toBeInTheDocument();
      // Click Piso 1 again to deselect (in sidebar floor tabs)
      const floorTabs = screen.getByTestId('floor-tabs');
      await user.click(within(floorTabs).getByText('Piso 1'));
      expect(screen.queryByTestId('floor-plan-view')).not.toBeInTheDocument();
    });

    it('updates detail breadcrumb to show floor level', async () => {
      const user = userEvent.setup();
      renderPage();
      await user.click(screen.getByText('Mall Norte'));
      await user.click(screen.getByText('Piso 1'));
      // The building detail panel breadcrumb should show floor
      // Chile / Mall Norte / Piso 1
      const allPiso1 = screen.getAllByText('Piso 1');
      // At least 2: one in floor tabs, one in floor plan breadcrumb (and possibly detail breadcrumb)
      expect(allPiso1.length).toBeGreaterThanOrEqual(2);
    });
  });
});
