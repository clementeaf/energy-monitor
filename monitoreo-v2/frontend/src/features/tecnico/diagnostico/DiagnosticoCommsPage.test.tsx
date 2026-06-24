import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';

vi.mock('../../../hooks/queries/useMetersQuery', () => ({ useMetersQuery: () => ({ data: [{ id: 'm1', buildingId: 'b1', name: 'Principal', code: 'P1', meterType: 'main', isActive: true, metadata: {}, externalId: null, model: null, serialNumber: 'SN-001', ipAddress: '10.0.0.1', modbusAddress: null, busId: null, phaseType: 'three_phase', nominalVoltage: null, nominalCurrent: null, contractedDemandKw: null, loadCategory: null, parentMeterId: null, createdAt: '', updatedAt: '' }], isLoading: false, isSuccess: true }) }));
vi.mock('../../../hooks/queries/useReadingsQuery', () => ({ useLatestReadingsQuery: () => ({ data: [{ meter_id: 'm1', meter_name: 'Principal', building_id: 'b1', timestamp: new Date().toISOString(), power_kw: '500', energy_kwh_total: '120000', voltage_l1: null, current_l1: null, power_factor: null, frequency_hz: null }], isLoading: false, isSuccess: true }) }));

import { DiagnosticoCommsPage } from './DiagnosticoCommsPage';

function renderPage() { return render(<MemoryRouter><DiagnosticoCommsPage /></MemoryRouter>); }

describe('DiagnosticoCommsPage', () => {
  beforeEach(() => vi.clearAllMocks());
  it('renders page header', () => { renderPage(); expect(screen.getByRole('heading', { name: 'Diagnóstico Comms' })).toBeInTheDocument(); });
  it('renders meter list', () => { renderPage(); expect(screen.getByText('Principal')).toBeInTheDocument(); });
  it('shows diagnostic panel on meter click', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByText('Principal'));
    expect(screen.getByText('Estado comunicación')).toBeInTheDocument();
    expect(screen.getByText('TCP/IP')).toBeInTheDocument();
    expect(screen.getByText('10.0.0.1')).toBeInTheDocument();
  });
  it('shows diagnostic tools', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByText('Principal'));
    expect(screen.getByText('Forzar re-intento de lectura')).toBeInTheDocument();
    expect(screen.getByText(/Ver log comunicación/)).toBeInTheDocument();
  });
});
