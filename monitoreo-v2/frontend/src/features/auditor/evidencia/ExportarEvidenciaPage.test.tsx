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
vi.mock('../../../hooks/queries/useReportsQuery', () => ({ useReportsQuery: () => ({ data: [], isLoading: false, isSuccess: true }), useGenerateReport: () => ({ mutate: vi.fn(), isPending: false }) }));

import { ExportarEvidenciaPage } from './ExportarEvidenciaPage';

function renderPage() { return render(<MemoryRouter><ExportarEvidenciaPage /></MemoryRouter>); }

describe('ExportarEvidenciaPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders title', () => { renderPage(); expect(screen.getByText('6.6 Exportar Evidencia')).toBeInTheDocument(); });
  it('renders configurator', () => { renderPage(); expect(screen.getByText(/Configurador de paquete de evidencia/)).toBeInTheDocument(); });
  it('renders content checkboxes', () => {
    renderPage();
    expect(screen.getByLabelText('Datos de consumo')).toBeChecked();
    expect(screen.getByLabelText('Cuadratura')).toBeChecked();
    expect(screen.getByLabelText('Pista de auditoría')).toBeChecked();
  });
  it('renders SHA-256 info', () => { renderPage(); expect(screen.getAllByText(/SHA-256/).length).toBeGreaterThanOrEqual(1); });
  it('renders generate button', () => { renderPage(); expect(screen.getByText('Generar paquete firmado')).toBeInTheDocument(); });
  it('renders history table', () => { renderPage(); expect(screen.getByText(/Historial de evidencias exportadas/)).toBeInTheDocument(); });
  it('shows history entries', () => { renderPage(); expect(screen.getAllByText(/Datos de consumo/).length).toBeGreaterThanOrEqual(1); });
  it('toggles checkbox', async () => {
    const user = userEvent.setup();
    renderPage();
    const cb = screen.getByLabelText('Scorecard de calidad');
    expect(cb).not.toBeChecked();
    await user.click(cb);
    expect(cb).toBeChecked();
  });
  it('renders ref tags', () => { renderPage(); expect(screen.getAllByText(/DAT-12/).length).toBeGreaterThanOrEqual(1); });
});
