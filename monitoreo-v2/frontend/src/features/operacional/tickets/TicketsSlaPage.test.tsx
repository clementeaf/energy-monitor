import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';

vi.mock('../../../hooks/queries/useBuildingsQuery', () => ({
  useBuildingsQuery: () => ({
    data: [
      { id: 'b1', name: 'Mall Norte', tenantId: 't1', code: 'MN', address: null, countryCode: 'CL', isActive: true, latitude: null, longitude: null, areaSqm: null, regionId: null, timezone: null, externalSiteId: null, siteKind: null, createdAt: '', updatedAt: '' },
    ],
    isLoading: false,
    isSuccess: true,
  }),
}));

vi.mock('../../../hooks/queries/useReadingsQuery', () => ({
  useLatestReadingsQuery: () => ({
    data: [
      { meter_id: 'm1', meter_name: 'P1', building_id: 'b1', timestamp: new Date(Date.now() - 30 * 60_000).toISOString(), power_kw: '10', energy_kwh_total: '100', voltage_l1: null, current_l1: null, power_factor: null, frequency_hz: null },
      { meter_id: 'm2', meter_name: 'H1', building_id: 'b1', timestamp: new Date(Date.now() - 2 * 3_600_000).toISOString(), power_kw: '5', energy_kwh_total: '50', voltage_l1: null, current_l1: null, power_factor: null, frequency_hz: null },
    ],
    isLoading: false,
    isSuccess: true,
    isPending: false,
  }),
  useReadingsQuery: () => ({ data: [], isLoading: false }),
  useLatestReadingAnchorQuery: () => ({ data: null, isLoading: false }),
  useCompareBuildingsQuery: () => ({ data: null, isLoading: false }),
  useAggregatedReadingsQuery: () => ({ data: [], isLoading: false }),
}));

const NOW = Date.now();
const HOURS_AGO = (h: number) => new Date(NOW - h * 3_600_000).toISOString();

vi.mock('../../../hooks/queries/useAlertsQuery', () => ({
  useAlertsQuery: (params: { status: string }) => {
    const alerts: Record<string, unknown[]> = {
      active: [
        { id: 'aaaa1111', buildingId: 'b1', meterId: 'm1', alertRuleId: null, alertTypeCode: 'OV', severity: 'critical', status: 'active', message: 'Sobrevoltaje crítico', triggeredValue: 250, thresholdValue: 240, assignedTo: null, acknowledgedBy: null, acknowledgedAt: null, resolvedBy: null, resolvedAt: null, resolutionNotes: null, createdAt: HOURS_AGO(6) },
        { id: 'bbbb2222', buildingId: 'b1', meterId: 'm2', alertRuleId: null, alertTypeCode: 'LP', severity: 'low', status: 'active', message: 'Factor bajo leve', triggeredValue: 0.8, thresholdValue: 0.85, assignedTo: null, acknowledgedBy: null, acknowledgedAt: null, resolvedBy: null, resolvedAt: null, resolutionNotes: null, createdAt: HOURS_AGO(2) },
      ],
      acknowledged: [],
      resolved: [
        { id: 'cccc3333', buildingId: 'b1', meterId: 'm1', alertRuleId: null, alertTypeCode: 'OC', severity: 'medium', status: 'resolved', message: 'Sobrecorriente resuelta', triggeredValue: 90, thresholdValue: 80, assignedTo: null, acknowledgedBy: null, acknowledgedAt: null, resolvedBy: 'u1', resolvedAt: HOURS_AGO(1), resolutionNotes: 'ok', createdAt: HOURS_AGO(10) },
      ],
    };
    return { data: alerts[params.status] ?? [], isLoading: false, isSuccess: true, isPending: false };
  },
}));

import { TicketsSlaPage } from './TicketsSlaPage';

function renderPage() {
  return render(
    <MemoryRouter>
      <TicketsSlaPage />
    </MemoryRouter>,
  );
}

describe('TicketsSlaPage', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('layout', () => {
    it('renders page header', () => {
      renderPage();
      expect(screen.getByRole('heading', { name: '4.3 Tickets y SLA' })).toBeInTheDocument();
    });

    it('renders quick filter buttons', () => {
      renderPage();
      expect(screen.getByText('Todos')).toBeInTheDocument();
      expect(screen.getByText('Por vencer')).toBeInTheDocument();
      expect(screen.getByText('Vencidos')).toBeInTheDocument();
    });

    it('renders Mis tickets filter button', () => {
      renderPage();
      expect(screen.getByText('Mis tickets')).toBeInTheDocument();
    });
  });

  describe('KPI cards row 1', () => {
    it('renders uptime card', () => {
      renderPage();
      expect(screen.getByText('Uptime del servicio (30 días)')).toBeInTheDocument();
    });

    it('renders disponibilidad datos card', () => {
      renderPage();
      expect(screen.getByText('Disponibilidad de datos [%]')).toBeInTheDocument();
    });

    it('renders tiempo medio resolución card', () => {
      renderPage();
      expect(screen.getByText('T. medio resolución críticas [h]')).toBeInTheDocument();
    });
  });

  describe('SLA evolution chart', () => {
    it('renders SLA evolution heading', () => {
      renderPage();
      expect(screen.getByText('Evolución de SLA — últimos 3 meses')).toBeInTheDocument();
    });
  });

  describe('ticket table', () => {
    it('renders tablero de tickets heading', () => {
      renderPage();
      expect(screen.getByText('Tablero de tickets')).toBeInTheDocument();
    });

    it('renders table headers', () => {
      renderPage();
      expect(screen.getByText('Descripción')).toBeInTheDocument();
      expect(screen.getByText('Tipo')).toBeInTheDocument();
      expect(screen.getByText('Prioridad')).toBeInTheDocument();
      expect(screen.getByText('Apertura')).toBeInTheDocument();
      expect(screen.getByText('Compromiso SLA')).toBeInTheDocument();
    });

    it('renders ticket rows from alerts', () => {
      renderPage();
      expect(screen.getByText('Sobrevoltaje crítico')).toBeInTheDocument();
      expect(screen.getByText('Factor bajo leve')).toBeInTheDocument();
      expect(screen.getByText('Sobrecorriente resuelta')).toBeInTheDocument();
    });

    it('renders priority badges', () => {
      renderPage();
      expect(screen.getAllByText('ALTA').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('BAJA').length).toBeGreaterThanOrEqual(1);
    });

    it('renders status badges', () => {
      renderPage();
      expect(screen.getAllByText('abierto').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('resuelto').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('quick filter', () => {
    it('filters to overdue tickets', async () => {
      const user = userEvent.setup();
      renderPage();

      await user.click(screen.getByText('Vencidos'));
      // Critical ticket (4h SLA, created 6h ago) should be overdue
      expect(screen.getByText('Sobrevoltaje crítico')).toBeInTheDocument();
    });
  });
});
