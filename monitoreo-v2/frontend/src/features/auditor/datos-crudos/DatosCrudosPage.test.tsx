import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';

vi.mock('../../../hooks/queries/useMetersQuery', () => ({
  useMetersQuery: () => ({
    data: [{ id: 'm1', buildingId: 'b1', name: 'Principal', code: 'P1', meterType: 'main', isActive: true, metadata: {}, externalId: null, model: null, serialNumber: null, ipAddress: null, modbusAddress: null, busId: null, phaseType: 'three_phase', nominalVoltage: null, nominalCurrent: null, contractedDemandKw: null, loadCategory: null, parentMeterId: null, createdAt: '', updatedAt: '' }],
    isLoading: false,
    isSuccess: true,
  }),
}));

vi.mock('../../../hooks/queries/useReadingsQuery', () => ({
  useLatestReadingsQuery: () => ({
    data: [{ meter_id: 'm1', meter_name: 'Principal', building_id: 'b1', timestamp: '2026-06-24T12:00:00Z', power_kw: '500', energy_kwh_total: '120000', voltage_l1: '220', current_l1: '30', power_factor: '0.95', frequency_hz: '50' }],
    isLoading: false,
    isSuccess: true,
    isPending: false,
  }),
  useAggregatedReadingsQuery: () => ({
    data: [
      { bucket: '2026-06-24T12:00:00Z', energy_delta_kwh: '100', avg_power_kw: '50', max_power_kw: '80', avg_power_factor: '0.95', avg_voltage_l1: '220', reading_count: '10' },
    ],
    isLoading: false,
    isSuccess: true,
    isPending: false,
  }),
  useReadingsQuery: () => ({ data: [], isLoading: false }),
  useLatestReadingAnchorQuery: () => ({ data: null, isLoading: false }),
  useCompareBuildingsQuery: () => ({ data: null, isLoading: false }),
}));

import { DatosCrudosPage } from './DatosCrudosPage';

function renderPage() {
  return render(<MemoryRouter><DatosCrudosPage /></MemoryRouter>);
}

describe('DatosCrudosPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:test');
    globalThis.URL.revokeObjectURL = vi.fn();
  });

  describe('layout', () => {
    it('renders page header', () => {
      renderPage();
      expect(screen.getByRole('heading', { name: 'Datos Crudos (Raw)' })).toBeInTheDocument();
    });

    it('renders meter selector', () => {
      renderPage();
      expect(screen.getByText('Principal (P1)')).toBeInTheDocument();
    });

    it('renders resolution pills', () => {
      renderPage();
      expect(screen.getByText('15 min')).toBeInTheDocument();
      expect(screen.getByText('Horaria')).toBeInTheDocument();
      expect(screen.getByText('Diaria')).toBeInTheDocument();
    });

    it('renders format pills', () => {
      renderPage();
      expect(screen.getByText('CSV')).toBeInTheDocument();
      expect(screen.getByText('JSON')).toBeInTheDocument();
      expect(screen.getByText(/Parquet/)).toBeInTheDocument();
    });

    it('renders DAT-30 notice', () => {
      renderPage();
      expect(screen.getByText(/DAT-30/)).toBeInTheDocument();
    });
  });

  describe('export button', () => {
    it('is disabled without meter selected', () => {
      renderPage();
      expect(screen.getByRole('button', { name: /Exportar/ })).toBeDisabled();
    });

    it('shows selected format in button label', async () => {
      const user = userEvent.setup();
      renderPage();
      await user.click(screen.getByText('JSON'));
      expect(screen.getByRole('button', { name: 'Exportar JSON' })).toBeDisabled();
    });

    it('enables after meter selection', async () => {
      const user = userEvent.setup();
      renderPage();
      await user.selectOptions(screen.getByRole('listbox'), 'm1');
      expect(screen.getByRole('button', { name: /Exportar/ })).not.toBeDisabled();
    });

    it('calls createObjectURL on export click', async () => {
      const user = userEvent.setup();
      renderPage();
      await user.selectOptions(screen.getByRole('listbox'), 'm1');
      await user.click(screen.getByRole('button', { name: /Exportar/ }));
      expect(globalThis.URL.createObjectURL).toHaveBeenCalled();
    });
  });

  describe('preview', () => {
    it('shows empty state without meter', () => {
      renderPage();
      expect(screen.getByText(/Selecciona un medidor/)).toBeInTheDocument();
    });

    it('shows preview data on meter select', async () => {
      const user = userEvent.setup();
      renderPage();
      await user.selectOptions(screen.getByRole('listbox'), 'm1');
      expect(screen.getByText('2026-06-24T12:00:00Z')).toBeInTheDocument();
    });
  });
});
