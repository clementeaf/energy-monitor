import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

vi.mock('../../../hooks/queries/useMetersQuery', () => ({
  useMetersQuery: () => ({
    data: [{ id: 'm1', buildingId: 'b1', name: 'Principal', code: 'P1', meterType: 'main', isActive: true, metadata: {}, externalId: null, model: null, serialNumber: null, ipAddress: null, modbusAddress: null, busId: null, phaseType: 'three_phase', nominalVoltage: null, nominalCurrent: null, contractedDemandKw: null, loadCategory: null, parentMeterId: null, createdAt: '', updatedAt: '' }],
    isLoading: false, isSuccess: true,
  }),
}));
vi.mock('../../../hooks/queries/useReadingsQuery', () => ({
  useLatestReadingsQuery: () => ({
    data: [{ meter_id: 'm1', meter_name: 'Principal', building_id: 'b1', timestamp: '2026-06-24T12:00:00Z', power_kw: '500', energy_kwh_total: '120000', voltage_l1: '220', current_l1: '30', power_factor: '0.95', frequency_hz: '50' }],
    isLoading: false, isSuccess: true, isPending: false,
  }),
  useAggregatedReadingsQuery: () => ({ data: [], isLoading: false, isSuccess: true, isPending: false }),
}));

import { DatosCrudosPage } from './DatosCrudosPage';

function renderPage() { return render(<MemoryRouter><DatosCrudosPage /></MemoryRouter>); }

describe('DatosCrudosPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:test');
    globalThis.URL.revokeObjectURL = vi.fn();
  });

  it('renders title', () => { renderPage(); expect(screen.getByText('6.5 Datos Crudos')).toBeInTheDocument(); });
  it('renders preview panel', () => { renderPage(); expect(screen.getByText(/Vista previa de datos raw/)).toBeInTheDocument(); });
  it('renders DAT-30 restriction', () => { renderPage(); expect(screen.getByText(/Restricción DAT-30/)).toBeInTheDocument(); });
  it('renders export buttons', () => {
    renderPage();
    expect(screen.getByText('Exportar Parquet')).toBeInTheDocument();
    expect(screen.getByText('Exportar CSV')).toBeInTheDocument();
    expect(screen.getByText('Exportar JSON')).toBeInTheDocument();
  });
  it('renders exportation info', () => { renderPage(); expect(screen.getByText(/Formatos para Data Science/)).toBeInTheDocument(); });
  it('renders empty state without meter', () => { renderPage(); expect(screen.getByText(/Selecciona un medidor/)).toBeInTheDocument(); });
});
