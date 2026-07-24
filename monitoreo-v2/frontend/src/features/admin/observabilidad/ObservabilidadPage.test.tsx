import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

vi.mock('../../../hooks/queries/useMetersQuery', () => ({
  useMetersQuery: () => ({
    data: [{ id: 'm1', buildingId: 'b1', name: 'P1', code: 'P1', meterType: 'main', isActive: true, metadata: {}, externalId: null, model: null, serialNumber: null, ipAddress: null, modbusAddress: null, busId: null, phaseType: 'three_phase', nominalVoltage: null, nominalCurrent: null, contractedDemandKw: null, loadCategory: null, parentMeterId: null, createdAt: '', updatedAt: '' }],
    isLoading: false, isSuccess: true,
  }),
}));

vi.mock('../../../hooks/queries/useReadingsQuery', () => ({
  useLatestReadingsQuery: () => ({
    data: [{ meter_id: 'm1', meter_name: 'P1', building_id: 'b1', timestamp: new Date().toISOString(), power_kw: '500', energy_kwh_total: '120000', voltage_l1: null, current_l1: null, power_factor: null, frequency_hz: null }],
    isLoading: false, isSuccess: true,
  }),
}));

vi.mock('../../../hooks/queries/useAlertsQuery', () => ({
  useAlertsQuery: () => ({ data: [], isLoading: false, isSuccess: true, isPending: false }),
}));

vi.mock('../../../hooks/queries/useApiObservabilityQuery', () => ({
  useApiObservabilityQuery: () => ({ data: null, isLoading: false, isSuccess: true }),
}));

import { ObservabilidadPage } from './ObservabilidadPage';

function renderPage() { return render(<MemoryRouter><ObservabilidadPage /></MemoryRouter>); }

describe('ObservabilidadPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders page heading', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: /7\.4 Observabilidad/ })).toBeInTheDocument();
  });

  it('renders uptime KPI card', () => {
    renderPage();
    expect(screen.getByText('Uptime (30 días)')).toBeInTheDocument();
    expect(screen.getByText('99,82%')).toBeInTheDocument();
  });

  it('renders latency KPI card', () => {
    renderPage();
    expect(screen.getByText('Latencia media de API')).toBeInTheDocument();
    expect(screen.getAllByText('142 ms').length).toBeGreaterThanOrEqual(1);
  });

  it('renders error rate KPI card', () => {
    renderPage();
    expect(screen.getByText('Error rate')).toBeInTheDocument();
    expect(screen.getByText('(4xx+5xx) / total')).toBeInTheDocument();
  });

  it('renders p95 KPI card', () => {
    renderPage();
    expect(screen.getByText('Tiempo de respuesta p95')).toBeInTheDocument();
    expect(screen.getByText(/umbral < 500 ms/)).toBeInTheDocument();
  });

  it('renders health dashboard section', () => {
    renderPage();
    expect(screen.getByText('Health dashboard — semáforo por componente')).toBeInTheDocument();
  });

  it('renders component status rows', () => {
    renderPage();
    expect(screen.getByText('API')).toBeInTheDocument();
    expect(screen.getByText('BD')).toBeInTheDocument();
    expect(screen.getByText('Cola de mensajes')).toBeInTheDocument();
    expect(screen.getByText('Ingestión')).toBeInTheDocument();
    expect(screen.getByText('Backfill')).toBeInTheDocument();
  });

  it('renders component health badges', () => {
    renderPage();
    // All should be ok with this mock data
    expect(screen.getAllByText('ok').length).toBeGreaterThanOrEqual(1);
  });

  it('renders ingestion metrics section', () => {
    renderPage();
    expect(screen.getByText('Métricas de ingestión de datos')).toBeInTheDocument();
  });

  it('renders ingestion metric items', () => {
    renderPage();
    expect(screen.getByText('Medidores reportando en el último ciclo')).toBeInTheDocument();
    expect(screen.getByText('Mensajes procesados / hora')).toBeInTheDocument();
    expect(screen.getByText('Mensajes en cola')).toBeInTheDocument();
    expect(screen.getByText('Errores de parsing (24h)')).toBeInTheDocument();
  });

  it('renders chart sections', () => {
    renderPage();
    expect(screen.getByText('Latencia de API por endpoint')).toBeInTheDocument();
    expect(screen.getByText('Tasa de errores por tipo')).toBeInTheDocument();
    expect(screen.getByText('Throughput de mensajes')).toBeInTheDocument();
  });
});
