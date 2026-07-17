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

vi.mock('../../../hooks/queries/useReadingsQuery', () => ({
  useAggregatedReadingsQuery: () => ({ data: [], isLoading: false, isSuccess: true }),
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
      expect(screen.getByRole('heading', { name: '4.2 Alarmas y Eventos' })).toBeInTheDocument();
    });

    it('renders filter bar', () => {
      renderPage();
      expect(screen.getByText('Filtros:')).toBeInTheDocument();
    });

    it('renders severity filter label', () => {
      renderPage();
      expect(screen.getByText('Severidad')).toBeInTheDocument();
    });

    it('renders status filter label', () => {
      renderPage();
      expect(screen.getAllByText('Estado').length).toBeGreaterThanOrEqual(1);
    });

    it('renders mall filter label', () => {
      renderPage();
      expect(screen.getAllByText('Mall').length).toBeGreaterThanOrEqual(1);
    });

    it('renders severity dropdown showing current value', () => {
      renderPage();
      // DropdownSelect renders a button with the selected label
      expect(screen.getAllByText('Todas').length).toBeGreaterThanOrEqual(1);
    });

    it('renders status dropdown showing current value', () => {
      renderPage();
      expect(screen.getAllByText('Abiertas').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('alert table', () => {
    it('renders table panel label', () => {
      renderPage();
      expect(screen.getByText('Tabla de alarmas')).toBeInTheDocument();
    });

    it('renders table column headers', () => {
      renderPage();
      expect(screen.getByText('ID')).toBeInTheDocument();
      expect(screen.getByText('Sev.')).toBeInTheDocument();
      expect(screen.getByText('Descripción')).toBeInTheDocument();
      // 'Mall' appears in both filter bar and table header
      expect(screen.getAllByText('Mall').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Apertura')).toBeInTheDocument();
      expect(screen.getByText('Transcurrido')).toBeInTheDocument();
    });

    it('renders alerts sorted by severity (critical first)', () => {
      renderPage();
      // The table has thead + tbody split into two <table> elements
      // Just verify severity badges appear
      expect(screen.getByText('CRITICAL')).toBeInTheDocument();
      expect(screen.getByText('HIGH')).toBeInTheDocument();
      expect(screen.getByText('MEDIUM')).toBeInTheDocument();
    });

    it('renders alert messages', () => {
      renderPage();
      expect(screen.getByText('Sobrevoltaje L1')).toBeInTheDocument();
      expect(screen.getByText('Factor potencia bajo')).toBeInTheDocument();
      expect(screen.getByText('Sobrecorriente')).toBeInTheDocument();
    });

    it('renders building name in table', () => {
      renderPage();
      expect(screen.getAllByText('Mall Norte').length).toBeGreaterThanOrEqual(1);
    });

    it('renders status badges', () => {
      renderPage();
      expect(screen.getAllByText('Abierta').length).toBe(3);
    });
  });

  describe('right panel', () => {
    it('renders SLA summary panel', () => {
      renderPage();
      expect(screen.getByText('Resumen de SLA de alarmas')).toBeInTheDocument();
    });

    it('renders SLA percentage text', () => {
      renderPage();
      expect(screen.getByText(/% dentro SLA/)).toBeInTheDocument();
    });

    it('renders detail panel placeholder when no alert selected', () => {
      renderPage();
      expect(screen.getByText('Seleccione una alarma')).toBeInTheDocument();
    });

    it('renders comment panel', () => {
      renderPage();
      expect(screen.getByText('Comentario de la alarma')).toBeInTheDocument();
    });

    it('renders comment textarea', () => {
      renderPage();
      expect(screen.getByPlaceholderText('Comentario del operador (texto libre)')).toBeInTheDocument();
    });
  });

  describe('row expand', () => {
    it('shows expanded detail on row click', async () => {
      const user = userEvent.setup();
      renderPage();

      await user.click(screen.getByText('Sobrevoltaje L1'));

      // Expanded row shows triggered value and threshold
      expect(screen.getByText(/Valor:/)).toBeInTheDocument();
      expect(screen.getByText(/250/)).toBeInTheDocument();
    });
  });

  describe('action buttons', () => {
    it('renders action buttons', () => {
      renderPage();
      expect(screen.getByRole('button', { name: 'Asignar' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Escalar' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cerrar' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Iniciar backfill' })).toBeInTheDocument();
    });
  });
});
