import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';

vi.mock('../../../hooks/queries/useMetersQuery', () => ({ useMetersQuery: () => ({ data: [{ id: 'm1', buildingId: 'b1', name: 'Principal', code: 'P1', meterType: 'main', isActive: true, metadata: {}, externalId: null, model: null, serialNumber: 'SN-001', ipAddress: '10.0.0.1', modbusAddress: null, busId: null, phaseType: 'three_phase', nominalVoltage: null, nominalCurrent: null, contractedDemandKw: null, loadCategory: null, parentMeterId: null, createdAt: '', updatedAt: '' }], isLoading: false, isSuccess: true }) }));
vi.mock('../../../hooks/queries/useReadingsQuery', () => ({ useLatestReadingsQuery: () => ({ data: [{ meter_id: 'm1', meter_name: 'Principal', building_id: 'b1', timestamp: new Date().toISOString(), power_kw: '500', energy_kwh_total: '120000', voltage_l1: null, current_l1: null, power_factor: null, frequency_hz: null }], isLoading: false, isSuccess: true }), useAggregatedReadingsQuery: () => ({ data: [], isLoading: false, isSuccess: true }) }));

import { DiagnosticoCommsPage } from './DiagnosticoCommsPage';

function renderPage() { return render(<MemoryRouter><DiagnosticoCommsPage /></MemoryRouter>); }

describe('DiagnosticoCommsPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders page header with new title format', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: '5.3 Diagnóstico Comms' })).toBeInTheDocument();
  });

  it('renders search input and meter select', () => {
    renderPage();
    expect(screen.getByPlaceholderText('Buscar por serial o nombre...')).toBeInTheDocument();
    expect(screen.getByText('Seleccionar medidor...')).toBeInTheDocument();
  });

  it('renders meter in the select dropdown', () => {
    renderPage();
    // Option text in the select: "P1 — Principal"
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    expect(screen.getByText('P1 — Principal')).toBeInTheDocument();
  });

  it('renders KPI card labels always visible', () => {
    renderPage();
    expect(screen.getByText('Estado de comunicación')).toBeInTheDocument();
    expect(screen.getByText('Tasa de éxito 24 h')).toBeInTheDocument();
    expect(screen.getByText('Último dato recibido')).toBeInTheDocument();
  });

  it('renders diagnostic tools section', () => {
    renderPage();
    expect(screen.getByText('Herramientas de diagnóstico')).toBeInTheDocument();
    expect(screen.getByText('• Forzar re-intento de lectura')).toBeInTheDocument();
    expect(screen.getByText(/Ver log de comunicación raw/)).toBeInTheDocument();
  });

  it('renders tool action buttons', () => {
    renderPage();
    expect(screen.getByRole('button', { name: 'Test de conexión' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Forzar re-lectura' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver log raw' })).toBeInTheDocument();
  });

  it('shows histogram section', () => {
    renderPage();
    expect(screen.getByText(/Histograma de disponibilidad 72 h/)).toBeInTheDocument();
  });

  it('shows log table section', () => {
    renderPage();
    expect(screen.getByText(/Log de comunicación raw/)).toBeInTheDocument();
  });

  it('shows placeholder when no meter selected', () => {
    renderPage();
    // Histogram and log sections both show placeholder when no meter selected
    expect(screen.getAllByText('Selecciona un medidor').length).toBeGreaterThanOrEqual(1);
  });

  it('shows log entries after selecting a meter', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.selectOptions(screen.getByRole('combobox'), 'm1');
    // Log table headers become visible
    expect(screen.getByText('Timestamp UTC')).toBeInTheDocument();
    expect(screen.getByText('Trama / evento')).toBeInTheDocument();
  });
});
