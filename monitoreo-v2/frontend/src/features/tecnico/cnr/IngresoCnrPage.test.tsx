import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';

import { IngresoCnrPage } from './IngresoCnrPage';

function renderPage() { return render(<MemoryRouter><IngresoCnrPage /></MemoryRouter>); }

describe('IngresoCnrPage', () => {
  beforeEach(() => vi.clearAllMocks());
  it('renders page header', () => { renderPage(); expect(screen.getByRole('heading', { name: 'Ingreso CNR Manual' })).toBeInTheDocument(); });
  it('renders meter input', () => { renderPage(); expect(screen.getByPlaceholderText(/Serial del medidor/)).toBeInTheDocument(); });
  it('renders period inputs', () => { renderPage(); expect(screen.getByText('Inicio período')).toBeInTheDocument(); expect(screen.getByText('Fin período')).toBeInTheDocument(); });
  it('renders kWh input', () => { renderPage(); expect(screen.getByPlaceholderText(/Lectura manual/)).toBeInTheDocument(); });
  it('renders motive selector', () => { renderPage(); expect(screen.getByText('Falla de comunicación')).toBeInTheDocument(); });
  it('renders justification with char counter', () => { renderPage(); expect(screen.getByText(/20 caracteres mínimo/)).toBeInTheDocument(); });
  it('submit button disabled without data', () => { renderPage(); expect(screen.getByRole('button', { name: 'Registrar CNR' })).toBeDisabled(); });
  it('shows success message after submit', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByPlaceholderText(/Serial del medidor/), 'M-001');
    // Fill datetime-local inputs
    const [startInput, endInput] = screen.getAllByDisplayValue('');
    await user.type(startInput, '2026-06-20T08:00');
    await user.type(endInput, '2026-06-22T08:00');
    await user.type(screen.getByPlaceholderText(/Lectura manual/), '150');
    await user.type(screen.getByPlaceholderText(/Justificación detallada/), 'Falla de comunicación del medidor durante mantenimiento programado');
    await user.click(screen.getByRole('button', { name: 'Registrar CNR' }));
    expect(screen.getByText(/CNR registrado/)).toBeInTheDocument();
  });
});
