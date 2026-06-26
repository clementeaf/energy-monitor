import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('../../../hooks/queries/useBuildingsQuery', () => ({
  useBuildingsQuery: () => ({ data: [{ id: 'b1', name: 'Mall Norte', tenantId: 't1', code: 'MN', address: null, countryCode: 'CL', isActive: true, latitude: null, longitude: null, areaSqm: null, regionId: null, timezone: null, externalSiteId: null, siteKind: null, createdAt: '', updatedAt: '' }], isLoading: false, isSuccess: true }),
}));

const HOURS_AGO = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();
const mockAlerts = [
  { id: 'aaaa1111-0000-0000-0000-000000000001', buildingId: 'b1', meterId: 'm1', alertRuleId: null, alertTypeCode: 'OV', severity: 'critical', status: 'active', message: 'Sobrevoltaje', triggeredValue: 250, thresholdValue: 240, assignedTo: null, acknowledgedBy: null, acknowledgedAt: null, resolvedBy: null, resolvedAt: null, resolutionNotes: null, createdAt: HOURS_AGO(6) },
  { id: 'bbbb2222-0000-0000-0000-000000000002', buildingId: 'b1', meterId: 'm2', alertRuleId: null, alertTypeCode: 'LP', severity: 'low', status: 'acknowledged', message: 'Factor bajo', triggeredValue: 0.8, thresholdValue: 0.85, assignedTo: null, acknowledgedBy: null, acknowledgedAt: null, resolvedBy: null, resolvedAt: null, resolutionNotes: null, createdAt: HOURS_AGO(2) },
  { id: 'cccc3333-0000-0000-0000-000000000003', buildingId: 'b1', meterId: 'm1', alertRuleId: null, alertTypeCode: 'OC', severity: 'medium', status: 'resolved', message: 'Sobrecorriente anterior', triggeredValue: 90, thresholdValue: 80, assignedTo: null, acknowledgedBy: null, acknowledgedAt: null, resolvedBy: 'u1', resolvedAt: HOURS_AGO(1), resolutionNotes: 'ok', createdAt: HOURS_AGO(48) },
];

vi.mock('../../../hooks/queries/useAlertsQuery', () => ({
  useAlertsQuery: (params: { status: string }) => {
    const data: Record<string, unknown[]> = { active: [mockAlerts[0]], acknowledged: [mockAlerts[1]], resolved: [mockAlerts[2]] };
    return { data: data[params.status] ?? [], isLoading: false, isSuccess: true, isPending: false };
  },
  useAcknowledgeAlert: () => ({ mutate: vi.fn(), isPending: false }),
  useResolveAlert: () => ({ mutate: vi.fn(), isPending: false }),
}));

import { MisOrdenesPage } from './MisOrdenesPage';

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}><MemoryRouter><MisOrdenesPage /></MemoryRouter></QueryClientProvider>);
}

describe('MisOrdenesPage', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('layout', () => {
    it('renders page header', () => {
      renderPage();
      expect(screen.getByRole('heading', { name: 'Mis Órdenes' })).toBeInTheDocument();
    });

    it('renders quick filter pills', () => {
      renderPage();
      expect(screen.getByText('Todos')).toBeInTheDocument();
      // "Pendientes", "En curso", "Vencidas" appear as both KPI and filter pill
      expect(screen.getAllByText('Pendientes').length).toBeGreaterThanOrEqual(2);
      expect(screen.getAllByText('Vencidas').length).toBeGreaterThanOrEqual(2);
      expect(screen.getAllByText('En curso').length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('KPIs', () => {
    it('renders all KPI labels', () => {
      renderPage();
      for (const label of ['Pendientes', 'En curso', 'Cerradas hoy', 'Vencidas']) {
        expect(screen.getAllByText(label).length).toBeGreaterThanOrEqual(1);
      }
    });
  });

  describe('table', () => {
    it('renders order rows from alerts', () => {
      renderPage();
      expect(screen.getByText('Sobrevoltaje')).toBeInTheDocument();
      expect(screen.getByText('Factor bajo')).toBeInTheDocument();
    });

    it('renders priority badges', () => {
      renderPage();
      expect(screen.getAllByText('ALTA').length).toBeGreaterThanOrEqual(1);
    });

    it('renders building name', () => {
      renderPage();
      expect(screen.getAllByText('Mall Norte').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('detail panel', () => {
    it('shows detail panel on click', async () => {
      const user = userEvent.setup();
      renderPage();
      await user.click(screen.getByText('Sobrevoltaje'));
      expect(screen.getByText('Detalle')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Iniciar' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cerrar' })).toBeInTheDocument();
    });

    it('shows meter history for selected order', async () => {
      const user = userEvent.setup();
      renderPage();
      // Click Sobrevoltaje (meterId: m1) — has resolved history for same meter
      await user.click(screen.getByText('Sobrevoltaje'));
      expect(screen.getByText('Historial del medidor')).toBeInTheDocument();
      // Appears in both table row and history panel
      expect(screen.getAllByText('Sobrecorriente anterior').length).toBeGreaterThanOrEqual(2);
    });

    it('hides history for order with no prior alerts on same meter', async () => {
      const user = userEvent.setup();
      renderPage();
      // Click Factor bajo (meterId: m2) — no resolved alerts for m2
      await user.click(screen.getByText('Factor bajo'));
      expect(screen.queryByText('Historial del medidor')).not.toBeInTheDocument();
    });
  });

  describe('quick filter', () => {
    it('filters to vencidas', async () => {
      const user = userEvent.setup();
      renderPage();
      await user.click(screen.getAllByText('Vencidas')[0]);
      // Critical (4h SLA, 6h old) should be overdue
      expect(screen.getByText('Sobrevoltaje')).toBeInTheDocument();
    });

    it('filters to en curso', async () => {
      const user = userEvent.setup();
      renderPage();
      await user.click(screen.getAllByText('En curso')[0]);
      expect(screen.getByText('Factor bajo')).toBeInTheDocument();
      expect(screen.queryByText('Sobrevoltaje')).not.toBeInTheDocument();
    });
  });
});
