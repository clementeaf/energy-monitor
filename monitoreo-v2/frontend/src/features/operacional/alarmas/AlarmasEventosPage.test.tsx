import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('../../../hooks/queries/useBuildingsQuery', () => ({
  useBuildingsQuery: () => ({
    data: [
      { id: 'b1', name: 'Mall Norte', tenantId: 't1', code: 'MN', address: null, countryCode: 'CL', isActive: true, latitude: null, longitude: null, areaSqm: null, regionId: null, timezone: null, externalSiteId: null, siteKind: null, createdAt: '', updatedAt: '' },
    ],
    isLoading: false,
    isSuccess: true,
  }),
}));

const mockAlerts = [
  { id: 'a1', buildingId: 'b1', meterId: 'm1', alertRuleId: null, alertTypeCode: 'OVERVOLTAGE', severity: 'critical' as const, status: 'active' as const, message: 'Sobrevoltaje L1', triggeredValue: 250, thresholdValue: 240, assignedTo: null, acknowledgedBy: null, acknowledgedAt: null, resolvedBy: null, resolvedAt: null, resolutionNotes: null, createdAt: '2026-06-24T10:00:00Z' },
  { id: 'a2', buildingId: 'b1', meterId: 'm2', alertRuleId: null, alertTypeCode: 'LOW_PF', severity: 'medium' as const, status: 'active' as const, message: 'Factor potencia bajo', triggeredValue: 0.7, thresholdValue: 0.85, assignedTo: null, acknowledgedBy: null, acknowledgedAt: null, resolvedBy: null, resolvedAt: null, resolutionNotes: null, createdAt: '2026-06-24T08:00:00Z' },
  { id: 'a3', buildingId: 'b1', meterId: 'm1', alertRuleId: null, alertTypeCode: 'OVERCURRENT', severity: 'high' as const, status: 'active' as const, message: 'Sobrecorriente', triggeredValue: 100, thresholdValue: 80, assignedTo: null, acknowledgedBy: null, acknowledgedAt: null, resolvedBy: null, resolvedAt: null, resolutionNotes: null, createdAt: '2026-06-24T09:00:00Z' },
];

vi.mock('../../../hooks/queries/useAlertsQuery', () => ({
  useAlertsQuery: () => ({
    data: mockAlerts,
    isLoading: false,
    isSuccess: true,
    isPending: false,
  }),
  useAcknowledgeAlert: () => ({ mutate: vi.fn(), isPending: false }),
  useResolveAlert: () => ({ mutate: vi.fn(), isPending: false }),
}));

import { AlarmasEventosPage } from './AlarmasEventosPage';

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <AlarmasEventosPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('AlarmasEventosPage', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('layout', () => {
    it('renders page header', () => {
      renderPage();
      expect(screen.getByRole('heading', { name: 'Alarmas y Eventos' })).toBeInTheDocument();
    });

    it('renders severity filter', () => {
      renderPage();
      expect(screen.getAllByText('Todas').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Crítica').length).toBeGreaterThanOrEqual(1);
    });

    it('renders status filter', () => {
      renderPage();
      expect(screen.getAllByText('Abiertas').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Asignadas').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('alert table', () => {
    it('renders table headers', () => {
      renderPage();
      expect(screen.getByText('Severidad')).toBeInTheDocument();
      expect(screen.getByText('Descripción')).toBeInTheDocument();
      expect(screen.getByText('Centro')).toBeInTheDocument();
      expect(screen.getByText('Tiempo')).toBeInTheDocument();
    });

    it('renders alerts sorted by severity (critical first)', () => {
      renderPage();
      const rows = screen.getAllByRole('row');
      // Header + 3 alerts = 4 rows
      expect(rows.length).toBe(4);
      // First data row should be critical
      expect(rows[1].textContent).toContain('CRITICAL');
    });

    it('renders severity badges', () => {
      renderPage();
      expect(screen.getByText('CRITICAL')).toBeInTheDocument();
      expect(screen.getByText('HIGH')).toBeInTheDocument();
      expect(screen.getByText('MEDIUM')).toBeInTheDocument();
    });

    it('renders building name', () => {
      renderPage();
      expect(screen.getAllByText('Mall Norte').length).toBeGreaterThanOrEqual(1);
    });

    it('renders status badges', () => {
      renderPage();
      expect(screen.getAllByText('Abierta').length).toBe(3);
    });
  });

  describe('detail panel', () => {
    it('shows placeholder when no alert selected', () => {
      renderPage();
      expect(screen.getByText('Selecciona una alarma para ver el detalle.')).toBeInTheDocument();
    });

    it('shows detail panel on alert click', async () => {
      const user = userEvent.setup();
      renderPage();

      await user.click(screen.getByText('Sobrevoltaje L1'));

      expect(screen.getByText('Detalle')).toBeInTheDocument();
      expect(screen.getByText('Valor disparador')).toBeInTheDocument();
      expect(screen.getByText('250')).toBeInTheDocument();
      expect(screen.getByText('Umbral')).toBeInTheDocument();
      expect(screen.getByText('240')).toBeInTheDocument();
    });

    it('shows action buttons', async () => {
      const user = userEvent.setup();
      renderPage();

      await user.click(screen.getByText('Sobrevoltaje L1'));

      expect(screen.getByRole('button', { name: 'Asignar a mí' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cerrar' })).toBeInTheDocument();
    });

    it('shows comment textarea', async () => {
      const user = userEvent.setup();
      renderPage();

      await user.click(screen.getByText('Sobrevoltaje L1'));

      expect(screen.getByLabelText('Comentario')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Notas de resolución...')).toBeInTheDocument();
    });
  });

  describe('SLA summary', () => {
    it('renders SLA summary section', () => {
      renderPage();
      expect(screen.getByText('Resumen SLA')).toBeInTheDocument();
    });
  });
});
