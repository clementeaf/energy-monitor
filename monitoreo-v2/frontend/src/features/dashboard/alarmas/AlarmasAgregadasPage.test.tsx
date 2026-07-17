import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';

vi.mock('../../../components/ui/MapView', () => ({ MapView: () => <div data-testid="map-view" /> }));

vi.mock('../../../hooks/queries/useBuildingsQuery', () => ({
  useBuildingsQuery: () => ({
    data: [
      { id: 'b1', name: 'Mall Norte', tenantId: 't1', code: 'MN', address: null, countryCode: 'CL', isActive: true, latitude: null, longitude: null, areaSqm: null, regionId: null, timezone: null, externalSiteId: null, siteKind: null, createdAt: '', updatedAt: '' },
      { id: 'b2', name: 'Mall Sur', tenantId: 't1', code: 'MS', address: null, countryCode: 'CL', isActive: true, latitude: null, longitude: null, areaSqm: null, regionId: null, timezone: null, externalSiteId: null, siteKind: null, createdAt: '', updatedAt: '' },
      { id: 'b3', name: 'Mall Lima', tenantId: 't1', code: 'ML', address: null, countryCode: 'PE', isActive: true, latitude: null, longitude: null, areaSqm: null, regionId: null, timezone: null, externalSiteId: null, siteKind: null, createdAt: '', updatedAt: '' },
    ],
    isLoading: false,
    isSuccess: true,
  }),
}));

const MOCK_ACTIVE_ALERTS = [
  { id: 'a1', buildingId: 'b1', meterId: 'm1', alertRuleId: null, alertTypeCode: 'OV', severity: 'critical' as const, status: 'active' as const, message: 'Sobrevoltaje', triggeredValue: 250, thresholdValue: 240, assignedTo: null, acknowledgedBy: null, acknowledgedAt: null, resolvedBy: null, resolvedAt: null, resolutionNotes: null, createdAt: new Date(Date.now() - 1000).toISOString() },
  { id: 'a2', buildingId: 'b1', meterId: 'm1', alertRuleId: null, alertTypeCode: 'LP', severity: 'medium' as const, status: 'active' as const, message: 'Factor bajo', triggeredValue: 0.7, thresholdValue: 0.85, assignedTo: null, acknowledgedBy: null, acknowledgedAt: null, resolvedBy: null, resolvedAt: null, resolutionNotes: null, createdAt: new Date(Date.now() - 2000).toISOString() },
  { id: 'a3', buildingId: 'b2', meterId: 'm2', alertRuleId: null, alertTypeCode: 'OL', severity: 'high' as const, status: 'active' as const, message: 'Sobrecarga', triggeredValue: 500, thresholdValue: 400, assignedTo: null, acknowledgedBy: null, acknowledgedAt: null, resolvedBy: null, resolvedAt: null, resolutionNotes: null, createdAt: new Date(Date.now() - 3000).toISOString() },
];

const MOCK_RESOLVED_ALERTS = [
  { id: 'a4', buildingId: 'b1', meterId: 'm1', alertRuleId: null, alertTypeCode: 'OV', severity: 'critical' as const, status: 'resolved' as const, message: 'Sobrevoltaje resuelto', triggeredValue: 250, thresholdValue: 240, assignedTo: null, acknowledgedBy: null, acknowledgedAt: null, resolvedBy: 'u1', resolvedAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(), resolutionNotes: 'ok', createdAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString() },
];

vi.mock('../../../hooks/queries/useAlertsQuery', () => ({
  useAlertsQuery: (params: { status: string }) => {
    const data = params.status === 'resolved' ? MOCK_RESOLVED_ALERTS : MOCK_ACTIVE_ALERTS;
    return { data, isLoading: false, isSuccess: true, isPending: false };
  },
}));

import { AlarmasAgregadasPage } from './AlarmasAgregadasPage';

function renderPage() {
  return render(
    <MemoryRouter>
      <AlarmasAgregadasPage />
    </MemoryRouter>,
  );
}

describe('AlarmasAgregadasPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // jsdom does not implement scrollIntoView
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  describe('layout', () => {
    it('renders page header with "3.5 Alarmas Agregadas"', () => {
      renderPage();
      expect(screen.getByRole('heading', { name: /3\.5 Alarmas Agregadas/ })).toBeInTheDocument();
    });

    it('renders filter banner', () => {
      renderPage();
      expect(screen.getByText('Filtros:')).toBeInTheDocument();
    });

    it('renders country filter with Chile and Peru options', () => {
      renderPage();
      // DropdownSelect renders button with current value + list options; getAllByText for duplicates
      expect(screen.getAllByText('Chile').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Perú').length).toBeGreaterThanOrEqual(1);
    });

    it('renders severity filter label', () => {
      renderPage();
      expect(screen.getByText('Severidad')).toBeInTheDocument();
    });

    it('renders status filter label', () => {
      renderPage();
      expect(screen.getByText('Estado')).toBeInTheDocument();
    });

    it('renders map view', () => {
      renderPage();
      expect(screen.getByTestId('map-view')).toBeInTheDocument();
    });
  });

  describe('KPI cards', () => {
    it('renders "Total alarmas activas" KPI', () => {
      renderPage();
      expect(screen.getByText('Total alarmas activas')).toBeInTheDocument();
    });

    it('renders "Críticas activas" KPI', () => {
      renderPage();
      expect(screen.getByText('Críticas activas')).toBeInTheDocument();
    });

    it('renders "Resueltas 24h" KPI', () => {
      renderPage();
      expect(screen.getByText('Resueltas 24h')).toBeInTheDocument();
    });

    it('renders "T. medio de resolución" KPI', () => {
      renderPage();
      expect(screen.getByText('T. medio de resolución')).toBeInTheDocument();
    });

    it('renders active alert count (3 CL active alerts)', () => {
      renderPage();
      // 3 active alerts in CL buildings (b1:2, b2:1); shown in KPI card — may appear in multiple places
      expect(screen.getAllByText('3').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('evolution chart', () => {
    it('renders evolución 30 días section', () => {
      renderPage();
      expect(screen.getByText('Evolución 30 días')).toBeInTheDocument();
    });

    it('renders evolution legend items', () => {
      renderPage();
      expect(screen.getByText('Abiertas')).toBeInTheDocument();
      expect(screen.getByText('Escaladas')).toBeInTheDocument();
      expect(screen.getAllByText('Resueltas').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('top 5 section', () => {
    it('renders top 5 malls section', () => {
      renderPage();
      expect(screen.getByText('Top 5 malls con más alarmas')).toBeInTheDocument();
    });

    it('shows Mall Norte first (2 active alerts > Mall Sur 1)', () => {
      renderPage();
      const top5 = screen.getByText('Top 5 malls con más alarmas').closest('div')!;
      const items = top5.querySelectorAll('li');
      expect(items[0]?.textContent).toContain('Mall Norte');
    });

    it('shows critical and warning counts in top 5', () => {
      renderPage();
      // Mall Norte: a1=critical, a2=medium → 1 críticas, 1 warnings
      expect(screen.getByText(/1 crít \/ 1 warn/)).toBeInTheDocument();
    });
  });

  describe('full table (Row 3)', () => {
    it('renders tabla de alarmas por mall section', () => {
      renderPage();
      expect(screen.getByText(/Tabla de alarmas por mall/)).toBeInTheDocument();
    });

    it('renders table column headers', () => {
      renderPage();
      // Headers include sort arrow when active (e.g. "Mall ▼"), so use regex
      expect(screen.getAllByText(/^Mall/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/^País/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/^Críticas/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/^Warnings/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/^Resueltas/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Última alarma')).toBeInTheDocument();
    });

    it('renders CL buildings in table', () => {
      renderPage();
      expect(screen.getAllByText('Mall Norte').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Mall Sur').length).toBeGreaterThanOrEqual(1);
    });

    it('does not render Peruvian building', () => {
      renderPage();
      expect(screen.queryByText('Mall Lima')).not.toBeInTheDocument();
    });

    it('shows last alert message for building', () => {
      renderPage();
      expect(screen.getByText('Sobrevoltaje')).toBeInTheDocument();
    });
  });

  describe('country filter switch', () => {
    it('switches to Peru and shows Peruvian building', async () => {
      const user = userEvent.setup();
      renderPage();

      // The País DropdownSelect button shows "Chile" (current value).
      // All DropdownSelect buttons that show country labels are role="button".
      // Find the one whose accessible text is "Chile" (the trigger button, not a list option).
      // Use getAllByRole to find dropdown trigger buttons, then pick the one with "Chile" text.
      const allChileBtns = screen.getAllByRole('button').filter(
        (btn) => btn.textContent?.trim().startsWith('Chile'),
      );
      // The País dropdown trigger should be among them — click the first one
      await user.click(allChileBtns[0]);

      // Perú option is now visible in the open dropdown list (role="option")
      const peruOptions = screen.getAllByRole('option').filter(
        (el) => el.textContent?.trim() === 'Perú',
      );
      await user.click(peruOptions[0]);

      expect(screen.getAllByText('Mall Lima').length).toBeGreaterThanOrEqual(1);
      expect(screen.queryByText('Mall Norte')).not.toBeInTheDocument();
    });
  });
});
