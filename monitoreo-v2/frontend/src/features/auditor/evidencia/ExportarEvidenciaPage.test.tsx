import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';

import { ExportarEvidenciaPage } from './ExportarEvidenciaPage';
function renderPage() { return render(<MemoryRouter><ExportarEvidenciaPage /></MemoryRouter>); }

describe('ExportarEvidenciaPage', () => {
  beforeEach(() => vi.clearAllMocks());
  it('renders page header', () => { renderPage(); expect(screen.getByRole('heading', { name: 'Exportar Evidencia' })).toBeInTheDocument(); });
  it('renders content checkboxes', () => { renderPage(); expect(screen.getByLabelText('Datos de consumo')).toBeChecked(); expect(screen.getByLabelText('Cuadratura')).toBeChecked(); expect(screen.getByLabelText('Pista de auditoría')).toBeChecked(); expect(screen.getByLabelText('Scorecard de calidad')).not.toBeChecked(); });
  it('renders SHA-256 notice', () => { renderPage(); expect(screen.getByText(/SHA-256/)).toBeInTheDocument(); });
  it('renders generate button', () => { renderPage(); expect(screen.getByRole('button', { name: 'Generar paquete de evidencia' })).toBeInTheDocument(); });
  it('renders history table', () => { renderPage(); expect(screen.getByText('Historial de evidencias exportadas')).toBeInTheDocument(); expect(screen.getAllByText('auditor@pasa.cl').length).toBe(2); });
  it('toggles checkbox', async () => {
    const user = userEvent.setup();
    renderPage();
    const checkbox = screen.getByLabelText('Scorecard de calidad');
    expect(checkbox).not.toBeChecked();
    await user.click(checkbox);
    expect(checkbox).toBeChecked();
  });
});
