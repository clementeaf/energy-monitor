import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';

vi.mock('../../../hooks/queries/useBuildingsQuery', () => ({
  useBuildingsQuery: () => ({
    data: [{ id: 'b1', name: 'Mall Norte', tenantId: 't1', code: 'MN', address: null, countryCode: 'CL', isActive: true, latitude: null, longitude: null, areaSqm: null, regionId: null, timezone: null, externalSiteId: null, siteKind: null, createdAt: '', updatedAt: '' }],
    isLoading: false, isSuccess: true,
  }),
}));

vi.mock('../../../hooks/queries/useMetersQuery', () => ({
  useMetersQuery: () => ({
    data: [{ id: 'm1', buildingId: 'b1', name: 'Principal', code: 'P1', meterType: 'main', isActive: true, metadata: {}, externalId: null, model: null, serialNumber: null, ipAddress: null, modbusAddress: null, busId: null, phaseType: 'three_phase', nominalVoltage: null, nominalCurrent: null, contractedDemandKw: null, loadCategory: null, parentMeterId: null, createdAt: '', updatedAt: '' }],
    isLoading: false, isSuccess: true,
  }),
}));

vi.mock('../../../hooks/queries/useReadingsQuery', () => ({
  useLatestReadingsQuery: () => ({
    data: [{ meter_id: 'm1', meter_name: 'Principal', building_id: 'b1', timestamp: new Date().toISOString(), power_kw: '10', energy_kwh_total: '500', voltage_l1: '220', current_l1: null, power_factor: null, frequency_hz: null }],
    isLoading: false, isSuccess: true, isPending: false,
  }),
  useReadingsQuery: () => ({ data: [], isLoading: false }),
  useLatestReadingAnchorQuery: () => ({ data: null, isLoading: false }),
  useCompareBuildingsQuery: () => ({ data: null, isLoading: false }),
  useAggregatedReadingsQuery: () => ({ data: [], isLoading: false }),
}));

vi.mock('../../../hooks/queries/useAlertsQuery', () => ({
  useAlertsQuery: () => ({ data: [], isLoading: false, isSuccess: true, isPending: false }),
  useAcknowledgeAlert: () => ({ mutate: vi.fn(), isPending: false }),
  useResolveAlert: () => ({ mutate: vi.fn(), isPending: false }),
}));

import { ExportarEvidenciaPage } from './ExportarEvidenciaPage';

function renderPage() {
  return render(<MemoryRouter><ExportarEvidenciaPage /></MemoryRouter>);
}

describe('ExportarEvidenciaPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    try { localStorage.setItem('evidence_exports', '[]'); } catch { /* noop */ }
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:test');
    globalThis.URL.revokeObjectURL = vi.fn();
  });

  describe('layout', () => {
    it('renders page header', () => {
      renderPage();
      expect(screen.getByRole('heading', { name: 'Exportar Evidencia' })).toBeInTheDocument();
    });

    it('renders content checkboxes with defaults', () => {
      renderPage();
      expect(screen.getByLabelText('Datos de consumo')).toBeChecked();
      expect(screen.getByLabelText('Cuadratura')).toBeChecked();
      expect(screen.getByLabelText('Pista de auditoría')).toBeChecked();
      expect(screen.getByLabelText('Scorecard de calidad')).not.toBeChecked();
      expect(screen.getByLabelText('Linaje de lecturas')).not.toBeChecked();
    });

    it('renders SHA-256 notice', () => {
      renderPage();
      expect(screen.getByText(/SHA-256/)).toBeInTheDocument();
    });

    it('renders generate button', () => {
      renderPage();
      expect(screen.getByRole('button', { name: 'Generar paquete de evidencia' })).toBeInTheDocument();
    });

    it('renders empty history', () => {
      renderPage();
      expect(screen.getByText(/Sin evidencias exportadas/)).toBeInTheDocument();
    });
  });

  describe('checkbox toggle', () => {
    it('toggles unchecked checkbox on', async () => {
      const user = userEvent.setup();
      renderPage();
      const cb = screen.getByLabelText('Scorecard de calidad');
      expect(cb).not.toBeChecked();
      await user.click(cb);
      expect(cb).toBeChecked();
    });

    it('toggles checked checkbox off', async () => {
      const user = userEvent.setup();
      renderPage();
      const cb = screen.getByLabelText('Datos de consumo');
      expect(cb).toBeChecked();
      await user.click(cb);
      expect(cb).not.toBeChecked();
    });

    it('disables button when all unchecked', async () => {
      const user = userEvent.setup();
      renderPage();
      // Uncheck all 3 defaults
      await user.click(screen.getByLabelText('Datos de consumo'));
      await user.click(screen.getByLabelText('Cuadratura'));
      await user.click(screen.getByLabelText('Pista de auditoría'));
      expect(screen.getByRole('button', { name: 'Generar paquete de evidencia' })).toBeDisabled();
    });
  });

  describe('generate', () => {
    it('calls createObjectURL on generate', async () => {
      const user = userEvent.setup();
      renderPage();
      await user.click(screen.getByRole('button', { name: 'Generar paquete de evidencia' }));
      expect(globalThis.URL.createObjectURL).toHaveBeenCalled();
    });

    it('adds entry to history after generate', async () => {
      const user = userEvent.setup();
      renderPage();
      await user.click(screen.getByRole('button', { name: 'Generar paquete de evidencia' }));
      expect(screen.getByText('Historial de evidencias (1)')).toBeInTheDocument();
    });

    it('shows hash in history', async () => {
      const user = userEvent.setup();
      renderPage();
      await user.click(screen.getByRole('button', { name: 'Generar paquete de evidencia' }));
      // Hash column should have a hex-like string
      const cells = screen.getAllByRole('cell');
      const hashCell = cells.find((c) => /^[a-f0-9]{16}$|^sha256-/.test(c.textContent ?? ''));
      expect(hashCell).toBeDefined();
    });
  });
});
