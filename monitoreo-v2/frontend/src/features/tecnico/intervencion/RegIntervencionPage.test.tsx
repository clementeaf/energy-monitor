import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';

import { RegIntervencionPage } from './RegIntervencionPage';

function renderPage() { return render(<MemoryRouter><RegIntervencionPage /></MemoryRouter>); }

describe('RegIntervencionPage', () => {
  beforeEach(() => vi.clearAllMocks());
  it('renders page header', () => { renderPage(); expect(screen.getByRole('heading', { name: 'Registro de Intervención' })).toBeInTheDocument(); });
  it('renders meter input', () => { renderPage(); expect(screen.getByPlaceholderText(/Serial o nombre/)).toBeInTheDocument(); });
  it('renders type selector', () => { renderPage(); expect(screen.getByText('Inspección')).toBeInTheDocument(); });
  it('renders result selector', () => { renderPage(); expect(screen.getByText('Solucionado')).toBeInTheDocument(); });
  it('renders CNR checkbox', () => { renderPage(); expect(screen.getByLabelText('Requiere CNR')).toBeInTheDocument(); });
  it('submit button disabled without data', () => { renderPage(); expect(screen.getByRole('button', { name: 'Registrar intervención' })).toBeDisabled(); });
  it('submit button enabled with data', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByPlaceholderText(/Serial o nombre/), 'M-001');
    await user.type(screen.getByPlaceholderText(/Descripción del trabajo/), 'Revisión completa del medidor');
    expect(screen.getByRole('button', { name: 'Registrar intervención' })).toBeEnabled();
  });
  it('shows success message after submit', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByPlaceholderText(/Serial o nombre/), 'M-001');
    await user.type(screen.getByPlaceholderText(/Descripción del trabajo/), 'Revisión completa');
    await user.click(screen.getByRole('button', { name: 'Registrar intervención' }));
    expect(screen.getByText(/Intervención registrada correctamente/)).toBeInTheDocument();
  });
});
