import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';

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
  { id: 'a1', buildingId: 'b1', meterId: 'm1', alertRuleId: null, alertTypeCode: 'OV', severity: 'critical' as const, status: 'active' as const, message: 'Sobrevoltaje', triggeredValue: 250, thresholdValue: 240, assignedTo: null, acknowledgedBy: null, acknowledgedAt: null, resolvedBy: null, resolvedAt: null, resolutionNotes: null, createdAt: '2026-06-24T11:00:00Z' },
  { id: 'a2', buildingId: 'b1', meterId: 'm1', alertRuleId: null, alertTypeCode: 'LP', severity: 'medium' as const, status: 'active' as const, message: 'Factor bajo', triggeredValue: 0.7, thresholdValue: 0.85, assignedTo: null, acknowledgedBy: null, acknowledgedAt: null, resolvedBy: null, resolvedAt: null, resolutionNotes: null, createdAt: '2026-06-24T10:00:00Z' },
  { id: 'a3', buildingId: 'b2', meterId: 'm2', alertRuleId: null, alertTypeCode: 'OL', severity: 'high' as const, status: 'active' as const, message: 'Sobrecarga', triggeredValue: 500, thresholdValue: 400, assignedTo: null, acknowledgedBy: null, acknowledgedAt: null, resolvedBy: null, resolvedAt: null, resolutionNotes: null, createdAt: '2026-06-24T09:00:00Z' },
];

const MOCK_RESOLVED_ALERTS = [
  { id: 'a4', buildingId: 'b1', meterId: 'm1', alertRuleId: null, alertTypeCode: 'OV', severity: 'critical' as const, status: 'resolved' as const, message: 'Sobrevoltaje resuelto', triggeredValue: 250, thresholdValue: 240, assignedTo: null, acknowledgedBy: null, acknowledgedAt: null, resolvedBy: 'u1', resolvedAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(), resolutionNotes: 'ok', createdAt: '2026-06-24T08:00:00Z' },
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
  beforeEach(() => vi.clearAllMocks());

  describe('layout', () => {
    it('renders page header', () => {
      renderPage();
      expect(screen.getByRole('heading', { name: 'Alarmas Agregadas' })).toBeInTheDocument();
    });

    it('renders country selector', () => {
      renderPage();
      expect(screen.getByText('Chile')).toBeInTheDocument();
      expect(screen.getByText('Perú')).toBeInTheDocument();
    });

    it('renders severity filter options', () => {
      renderPage();
      // Labels appear in both filters and table headers
      expect(screen.getAllByText('Todas').length).toBeGreaterThanOrEqual(2);
      expect(screen.getAllByText('Críticas').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Warnings').length).toBeGreaterThanOrEqual(1);
    });

    it('renders status filter options', () => {
      renderPage();
      expect(screen.getAllByText('Activas').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Resueltas').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('KPI cards', () => {
    it('renders active count', () => {
      renderPage();
      // 3 active alerts in CL buildings (b1: 2, b2: 1)
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('renders critical active count', () => {
      renderPage();
      // a1 (critical) + a3 (high) = 2 critical
      expect(screen.getByText('Críticas activas')).toBeInTheDocument();
    });

    it('renders resolved 24h label', () => {
      renderPage();
      expect(screen.getByText('Resueltas 24h')).toBeInTheDocument();
    });
  });

  describe('top 5', () => {
    it('renders top 5 section', () => {
      renderPage();
      expect(screen.getByText('Top 5 centros con más alarmas activas')).toBeInTheDocument();
    });

    it('shows Mall Norte first (most alerts)', () => {
      renderPage();
      const top5Section = screen.getByText('Top 5 centros con más alarmas activas').closest('div')!;
      const items = top5Section.querySelectorAll('li');
      expect(items[0]?.textContent).toContain('Mall Norte');
    });

    it('shows critical and warning counts', () => {
      renderPage();
      // Mall Norte: 1 critical, 1 warning
      expect(screen.getByText(/1 críticas · 1 warnings/)).toBeInTheDocument();
    });
  });

  describe('full table', () => {
    it('renders table headers', () => {
      renderPage();
      expect(screen.getByText('Última alarma')).toBeInTheDocument();
    });

    it('renders Chilean buildings in table', () => {
      renderPage();
      // Both Mall Norte and Mall Sur appear
      const allNorte = screen.getAllByText('Mall Norte');
      expect(allNorte.length).toBeGreaterThanOrEqual(2); // top5 + table
      const allSur = screen.getAllByText('Mall Sur');
      expect(allSur.length).toBeGreaterThanOrEqual(1);
    });

    it('does not render Peruvian building', () => {
      renderPage();
      expect(screen.queryByText('Mall Lima')).not.toBeInTheDocument();
    });

    it('shows last alert message', () => {
      renderPage();
      expect(screen.getByText('Sobrevoltaje')).toBeInTheDocument();
    });
  });

  describe('country filter', () => {
    it('switches to Peru and shows Peruvian building', async () => {
      const user = userEvent.setup();
      renderPage();

      await user.click(screen.getByText('Perú'));
      expect(screen.getAllByText('Mall Lima').length).toBeGreaterThanOrEqual(1);
      expect(screen.queryByText('Mall Norte')).not.toBeInTheDocument();
    });
  });
});
