import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';

vi.mock('../../../hooks/queries/useMetersQuery', () => ({
  useMetersQuery: () => ({
    data: [
      { id: 'm1', buildingId: 'b1', name: 'Principal', code: 'P1', meterType: 'main', isActive: true, metadata: {}, externalId: null, model: null, serialNumber: null, ipAddress: null, modbusAddress: null, busId: null, phaseType: 'three_phase', nominalVoltage: null, nominalCurrent: null, contractedDemandKw: null, loadCategory: null, parentMeterId: null, createdAt: '', updatedAt: '' },
    ],
    isLoading: false,
    isSuccess: true,
  }),
}));

vi.mock('../../../hooks/queries/useBuildingsQuery', () => ({
  useBuildingsQuery: () => ({
    data: [{ id: 'b1', name: 'Mall Norte', tenantId: 't1', code: 'MN', address: null, countryCode: 'CL', isActive: true, latitude: null, longitude: null, areaSqm: null, regionId: null, timezone: null, externalSiteId: null, siteKind: null, createdAt: '', updatedAt: '' }],
    isLoading: false,
    isSuccess: true,
  }),
}));

import { IngresoCnrPage } from './IngresoCnrPage';

function renderPage() {
  return render(<MemoryRouter><IngresoCnrPage /></MemoryRouter>);
}

async function fillForm(user: ReturnType<typeof userEvent.setup>) {
  await user.selectOptions(screen.getAllByRole('combobox')[0], 'm1');
  const dateInputs = screen.getAllByDisplayValue('');
  await user.type(dateInputs[0], '2026-06-20T08:00');
  await user.type(dateInputs[1], '2026-06-22T08:00');
  await user.type(screen.getByPlaceholderText(/Lectura manual/), '150');
  await user.type(screen.getByPlaceholderText(/Justificación detallada/), 'Falla comunicación del medidor durante mantenimiento programado en terreno');
}

describe('IngresoCnrPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    try { localStorage.setItem('cnr_entries', '[]'); } catch { /* noop */ }
  });

  describe('layout', () => {
    it('renders page header', () => {
      renderPage();
      expect(screen.getByRole('heading', { name: 'Ingreso CNR Manual' })).toBeInTheDocument();
    });

    it('renders meter selector with real meters', () => {
      renderPage();
      expect(screen.getByText('Seleccionar medidor')).toBeInTheDocument();
      expect(screen.getByText(/Principal \(P1\)/)).toBeInTheDocument();
    });

    it('renders period inputs', () => {
      renderPage();
      expect(screen.getByText('Inicio período')).toBeInTheDocument();
      expect(screen.getByText('Fin período')).toBeInTheDocument();
    });

    it('renders kWh input', () => {
      renderPage();
      expect(screen.getByPlaceholderText(/Lectura manual/)).toBeInTheDocument();
    });

    it('renders motive selector', () => {
      renderPage();
      expect(screen.getByText('Falla de comunicación')).toBeInTheDocument();
      expect(screen.getByText('Mantenimiento programado')).toBeInTheDocument();
    });

    it('renders justification with char counter', () => {
      renderPage();
      expect(screen.getByText(/20 caracteres mínimo/)).toBeInTheDocument();
    });

    it('renders empty history', () => {
      renderPage();
      expect(screen.getByText(/Sin CNR registrados/)).toBeInTheDocument();
    });
  });

  describe('meter info', () => {
    it('shows meter details after selection', async () => {
      const user = userEvent.setup();
      renderPage();
      await user.selectOptions(screen.getAllByRole('combobox')[0], 'm1');
      expect(screen.getByText(/Código:/)).toBeInTheDocument();
    });
  });

  describe('validation', () => {
    it('submit disabled without data', () => {
      renderPage();
      expect(screen.getByRole('button', { name: 'Registrar CNR' })).toBeDisabled();
    });

    it('submit disabled with short justification', async () => {
      const user = userEvent.setup();
      renderPage();
      await user.selectOptions(screen.getAllByRole('combobox')[0], 'm1');
      const dateInputs = screen.getAllByDisplayValue('');
      await user.type(dateInputs[0], '2026-06-20T08:00');
      await user.type(dateInputs[1], '2026-06-22T08:00');
      await user.type(screen.getByPlaceholderText(/Lectura manual/), '150');
      await user.type(screen.getByPlaceholderText(/Justificación detallada/), 'Corto');
      expect(screen.getByRole('button', { name: 'Registrar CNR' })).toBeDisabled();
    });

    it('submit enabled with all fields and 20+ char justification', async () => {
      const user = userEvent.setup();
      renderPage();
      await fillForm(user);
      expect(screen.getByRole('button', { name: 'Registrar CNR' })).toBeEnabled();
    });
  });

  describe('submit', () => {
    it('shows success message after submit', async () => {
      const user = userEvent.setup();
      renderPage();
      await fillForm(user);
      await user.click(screen.getByRole('button', { name: 'Registrar CNR' }));
      expect(screen.getByText(/CNR registrado/)).toBeInTheDocument();
    });

    it('adds entry to history panel', async () => {
      const user = userEvent.setup();
      renderPage();
      await fillForm(user);
      await user.click(screen.getByRole('button', { name: 'Registrar CNR' }));
      expect(screen.getByText('Principal')).toBeInTheDocument();
      expect(screen.getByText(/150 kWh/)).toBeInTheDocument();
    });

    it('clears form after submit', async () => {
      const user = userEvent.setup();
      renderPage();
      await fillForm(user);
      await user.click(screen.getByRole('button', { name: 'Registrar CNR' }));
      expect(screen.getByRole('button', { name: 'Registrar CNR' })).toBeDisabled();
    });

    it('updates history count', async () => {
      const user = userEvent.setup();
      renderPage();
      await fillForm(user);
      await user.click(screen.getByRole('button', { name: 'Registrar CNR' }));
      expect(screen.getByText('Historial CNR (1)')).toBeInTheDocument();
    });
  });

  describe('char counter', () => {
    it('updates as user types', async () => {
      const user = userEvent.setup();
      renderPage();
      await user.type(screen.getByPlaceholderText(/Justificación detallada/), 'ABCDE');
      expect(screen.getByText('5/20 caracteres mínimo')).toBeInTheDocument();
    });
  });
});
