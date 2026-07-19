import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';

vi.mock('../../../hooks/queries/useBuildingsQuery', () => ({ useBuildingsQuery: () => ({ data: [{ id: 'b1', name: 'Mall Norte', tenantId: 't1', code: 'MN', address: null, countryCode: 'CL', isActive: true, latitude: null, longitude: null, areaSqm: null, regionId: null, timezone: null, externalSiteId: null, siteKind: null, createdAt: '', updatedAt: '' }], isLoading: false, isSuccess: true }) }));
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

  it('renders filter banner with meter dropdown', () => {
    renderPage();
    // Filter banner has "Medidor" label and DropdownSelect showing "Todos" by default
    expect(screen.getByText('Medidor')).toBeInTheDocument();
    expect(screen.getAllByText('Todos').length).toBeGreaterThanOrEqual(1);
  });

  it('renders meter option in dropdown', async () => {
    const user = userEvent.setup();
    renderPage();
    // The DropdownSelect for "Medidor" shows "Todos" by default; click to open and find meter code
    const buttons = screen.getAllByRole('button');
    const medidorButton = buttons.find((btn) => btn.textContent === 'Todos');
    expect(medidorButton).toBeDefined();
    await user.click(medidorButton!);
    // After opening, the meter code 'P1' should appear as an option
    expect(screen.getByText('P1')).toBeInTheDocument();
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
    expect(screen.getByText(/Forzar re-intento de lectura/)).toBeInTheDocument();
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

  it('shows fallback data when no meter selected', () => {
    renderPage();
    // Fallback success rate is 96%
    expect(screen.getByText(/96/)).toBeInTheDocument();
  });

  it('shows log table headers (always visible)', () => {
    renderPage();
    // Log table headers are always rendered (fallback log shown when no meter selected)
    expect(screen.getByText('Timestamp UTC')).toBeInTheDocument();
    expect(screen.getByText('Trama / evento')).toBeInTheDocument();
  });
});
