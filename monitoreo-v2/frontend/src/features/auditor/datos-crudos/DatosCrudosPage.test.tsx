import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';

vi.mock('../../../hooks/queries/useMetersQuery', () => ({ useMetersQuery: () => ({ data: [{ id: 'm1', buildingId: 'b1', name: 'Principal', code: 'P1', meterType: 'main', isActive: true, metadata: {}, externalId: null, model: null, serialNumber: null, ipAddress: null, modbusAddress: null, busId: null, phaseType: 'three_phase', nominalVoltage: null, nominalCurrent: null, contractedDemandKw: null, loadCategory: null, parentMeterId: null, createdAt: '', updatedAt: '' }], isLoading: false, isSuccess: true }) }));
vi.mock('../../../hooks/queries/useReadingsQuery', () => ({ useLatestReadingsQuery: () => ({ data: [{ meter_id: 'm1', meter_name: 'Principal', building_id: 'b1', timestamp: '2026-06-24T12:00:00Z', power_kw: '500', energy_kwh_total: '120000', voltage_l1: '220', current_l1: '30', power_factor: '0.95', frequency_hz: '50' }], isLoading: false, isSuccess: true }) }));

import { DatosCrudosPage } from './DatosCrudosPage';
function renderPage() { return render(<MemoryRouter><DatosCrudosPage /></MemoryRouter>); }

describe('DatosCrudosPage', () => {
  beforeEach(() => vi.clearAllMocks());
  it('renders page header', () => { renderPage(); expect(screen.getByRole('heading', { name: 'Datos Crudos (Raw)' })).toBeInTheDocument(); });
  it('renders meter selector', () => { renderPage(); expect(screen.getByText('Seleccionar medidor')).toBeInTheDocument(); });
  it('renders resolution selector', () => { renderPage(); expect(screen.getByText('15 min')).toBeInTheDocument(); expect(screen.getByText('Horaria')).toBeInTheDocument(); expect(screen.getByText('Diaria')).toBeInTheDocument(); });
  it('renders format selector', () => { renderPage(); expect(screen.getByText('CSV')).toBeInTheDocument(); expect(screen.getByText('JSON')).toBeInTheDocument(); expect(screen.getByText('Parquet')).toBeInTheDocument(); });
  it('renders export button disabled without meter', () => { renderPage(); expect(screen.getByRole('button', { name: 'Exportar datos' })).toBeDisabled(); });
  it('renders DAT-30 notice', () => { renderPage(); expect(screen.getByText(/DAT-30/)).toBeInTheDocument(); });
  it('shows preview on meter select', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.selectOptions(screen.getAllByRole('combobox')[0], 'm1');
    expect(screen.getByText('2026-06-24T12:00:00Z')).toBeInTheDocument();
  });
});
