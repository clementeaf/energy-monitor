import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

vi.mock('../../../hooks/queries/useMetersQuery', () => ({ useMetersQuery: () => ({ data: [{ id: 'm1', buildingId: 'b1', name: 'P1', code: 'P1', meterType: 'main', isActive: true, metadata: {}, externalId: null, model: null, serialNumber: null, ipAddress: null, modbusAddress: null, busId: null, phaseType: 'three_phase', nominalVoltage: null, nominalCurrent: null, contractedDemandKw: null, loadCategory: null, parentMeterId: null, createdAt: '', updatedAt: '' }], isLoading: false, isSuccess: true }) }));
vi.mock('../../../hooks/queries/useReadingsQuery', () => ({ useLatestReadingsQuery: () => ({ data: [{ meter_id: 'm1', meter_name: 'P1', building_id: 'b1', timestamp: new Date().toISOString(), power_kw: '500', energy_kwh_total: '120000', voltage_l1: null, current_l1: null, power_factor: null, frequency_hz: null }], isLoading: false, isSuccess: true }) }));
vi.mock('../../../hooks/queries/useAlertsQuery', () => ({ useAlertsQuery: () => ({ data: [], isLoading: false, isSuccess: true, isPending: false }) }));

import { ObservabilidadPage } from './ObservabilidadPage';

function renderPage() { return render(<MemoryRouter><ObservabilidadPage /></MemoryRouter>); }

describe('ObservabilidadPage', () => {
  beforeEach(() => vi.clearAllMocks());
  it('renders page header', () => { renderPage(); expect(screen.getByRole('heading', { name: 'Observabilidad' })).toBeInTheDocument(); });
  it('renders health KPIs', () => { renderPage(); expect(screen.getByText('Uptime (30d)')).toBeInTheDocument(); expect(screen.getByText('Latencia API')).toBeInTheDocument(); expect(screen.getByText('Error rate')).toBeInTheDocument(); });
  it('renders component status', () => { renderPage(); expect(screen.getByText('Estado por componente')).toBeInTheDocument(); expect(screen.getByText('API principal')).toBeInTheDocument(); expect(screen.getByText('Base de datos')).toBeInTheDocument(); });
  it('renders ingestion metrics', () => { renderPage(); expect(screen.getByText('Métricas de ingestión')).toBeInTheDocument(); expect(screen.getByText('Medidores reportando')).toBeInTheDocument(); });
  it('renders health alerts section', () => { renderPage(); expect(screen.getByText('Alertas de salud activas')).toBeInTheDocument(); });
});
