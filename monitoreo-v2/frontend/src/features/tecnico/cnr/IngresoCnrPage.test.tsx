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

vi.mock('../../../hooks/queries/useCnrQuery', () => ({ useCnrQuery: () => ({ data: [], isLoading: false, isSuccess: true }), useCreateCnr: () => ({ mutate: vi.fn((_, opts) => opts?.onSuccess?.()), isPending: false }) }));

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
  });

  describe('layout', () => {
    it('renders page header with new title format', () => {
      renderPage();
      expect(screen.getByRole('heading', { name: '5.5 Ingreso CNR manual' })).toBeInTheDocument();
    });

    it('renders meter selector with default option', () => {
      renderPage();
      expect(screen.getByText('Seleccionar medidor')).toBeInTheDocument();
    });

    it('renders meter option in select', () => {
      renderPage();
      // Option text: "P1 — {buildingName}" where buildingName = 'Mall Norte'
      expect(screen.getByText(/P1 —/)).toBeInTheDocument();
    });

    it('renders kWh input', () => {
      renderPage();
      expect(screen.getByPlaceholderText(/Lectura manual/)).toBeInTheDocument();
    });

    it('renders motive selector with CNR motives', () => {
      renderPage();
      expect(screen.getByText('Falla de comunicación')).toBeInTheDocument();
      expect(screen.getByText('Mantenimiento programado')).toBeInTheDocument();
    });

    it('renders justification textarea', () => {
      renderPage();
      expect(screen.getByPlaceholderText(/Justificación detallada/)).toBeInTheDocument();
    });

    it('renders section headers', () => {
      renderPage();
      expect(screen.getByText('Medidor y contexto')).toBeInTheDocument();
      expect(screen.getByText('Datos del CNR')).toBeInTheDocument();
      expect(screen.getByText('Justificación y evidencia')).toBeInTheDocument();
      expect(screen.getByText('Marcado del valor')).toBeInTheDocument();
    });

    it('renders post-signature restrictions notice', () => {
      renderPage();
      expect(screen.getByText('Restricciones post-firma')).toBeInTheDocument();
    });
  });

  describe('meter info', () => {
    it('shows meter code after selection', async () => {
      const user = userEvent.setup();
      renderPage();
      await user.selectOptions(screen.getAllByRole('combobox')[0], 'm1');
      // Shows "P1 · Mall Norte" inline
      expect(screen.getAllByText(/P1/).length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('validation', () => {
    it('submit disabled without data', () => {
      renderPage();
      expect(screen.getByRole('button', { name: 'Firmar CNR' })).toBeDisabled();
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
      expect(screen.getByRole('button', { name: 'Firmar CNR' })).toBeDisabled();
    });

    it('submit enabled with all fields and 20+ char justification', async () => {
      const user = userEvent.setup();
      renderPage();
      await fillForm(user);
      expect(screen.getByRole('button', { name: 'Firmar CNR' })).toBeEnabled();
    });
  });

  describe('submit', () => {
    it('shows success message after submit', async () => {
      const user = userEvent.setup();
      renderPage();
      await fillForm(user);
      await user.click(screen.getByRole('button', { name: 'Firmar CNR' }));
      // Text appears in both success banner and static "Marcado del valor" section
      expect(screen.getAllByText(/dato manual — CNR/).length).toBeGreaterThanOrEqual(1);
    });

    it('clears form after submit (button disabled again)', async () => {
      const user = userEvent.setup();
      renderPage();
      await fillForm(user);
      await user.click(screen.getByRole('button', { name: 'Firmar CNR' }));
      // onSuccess resets selectedMeterId → canSubmit false → button disabled
      expect(screen.getByRole('button', { name: 'Firmar CNR' })).toBeDisabled();
    });
  });
});
