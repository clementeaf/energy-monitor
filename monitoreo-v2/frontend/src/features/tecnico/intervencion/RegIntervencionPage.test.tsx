import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';

vi.mock('../../../hooks/queries/useMetersQuery', () => ({
  useMetersQuery: () => ({
    data: [
      { id: 'm1', buildingId: 'b1', name: 'Principal', code: 'P1', meterType: 'main', isActive: true, metadata: {}, externalId: null, model: null, serialNumber: null, ipAddress: null, modbusAddress: null, busId: null, phaseType: 'three_phase', nominalVoltage: null, nominalCurrent: null, contractedDemandKw: null, loadCategory: null, parentMeterId: null, createdAt: '', updatedAt: '' },
      { id: 'm2', buildingId: 'b1', name: 'HVAC', code: 'H1', meterType: 'sub', isActive: true, metadata: {}, externalId: null, model: null, serialNumber: null, ipAddress: null, modbusAddress: null, busId: null, phaseType: 'three_phase', nominalVoltage: null, nominalCurrent: null, contractedDemandKw: null, loadCategory: 'hvac', parentMeterId: null, createdAt: '', updatedAt: '' },
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

vi.mock('../../../hooks/queries/useInterventionsQuery', () => ({ useInterventionsQuery: () => ({ data: [], isLoading: false, isSuccess: true }), useCreateIntervention: () => ({ mutate: vi.fn((_, opts) => opts?.onSuccess?.()), isPending: false }) }));

import { RegIntervencionPage } from './RegIntervencionPage';

function renderPage() {
  return render(<MemoryRouter><RegIntervencionPage /></MemoryRouter>);
}

describe('RegIntervencionPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('layout', () => {
    it('renders page header with new title format', () => {
      renderPage();
      expect(screen.getByRole('heading', { name: '5.4 Registro de intervención' })).toBeInTheDocument();
    });

    it('renders meter selector with real meters', () => {
      renderPage();
      expect(screen.getByText('Seleccionar medidor')).toBeInTheDocument();
      expect(screen.getByText(/Principal \(P1\)/)).toBeInTheDocument();
      expect(screen.getByText(/HVAC \(H1\)/)).toBeInTheDocument();
    });

    it('renders type selector', () => {
      renderPage();
      expect(screen.getByText('Inspección')).toBeInTheDocument();
      expect(screen.getByText('Reemplazo')).toBeInTheDocument();
    });

    it('renders result selector', () => {
      renderPage();
      expect(screen.getByText('Solucionado')).toBeInTheDocument();
      expect(screen.getByText('Pendiente piezas')).toBeInTheDocument();
    });

    it('renders CNR checkbox label', () => {
      renderPage();
      // Label text appears in multiple places (form label + adjuntos section)
      expect(screen.getAllByText(/Requiere CNR/).length).toBeGreaterThanOrEqual(1);
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeInTheDocument();
    });

    it('renders section headers', () => {
      renderPage();
      expect(screen.getByText('Orden asociada')).toBeInTheDocument();
      expect(screen.getByText('Bitácora de intervención')).toBeInTheDocument();
      expect(screen.getByText('Adjuntos y firma')).toBeInTheDocument();
    });

    it('renders immutability notice', () => {
      renderPage();
      expect(screen.getByText('Inmutabilidad del registro')).toBeInTheDocument();
    });
  });

  describe('meter info', () => {
    it('shows meter details after selection', async () => {
      const user = userEvent.setup();
      renderPage();
      const selects = screen.getAllByRole('combobox');
      await user.selectOptions(selects[0], 'm1');
      expect(screen.getByText(/Código:/)).toBeInTheDocument();
      expect(screen.getByText(/Tipo:/)).toBeInTheDocument();
    });
  });

  describe('validation', () => {
    it('submit button disabled without meter and description', () => {
      renderPage();
      expect(screen.getByRole('button', { name: 'Firmar y guardar' })).toBeDisabled();
    });

    it('submit button disabled with meter but no description', async () => {
      const user = userEvent.setup();
      renderPage();
      await user.selectOptions(screen.getAllByRole('combobox')[0], 'm1');
      expect(screen.getByRole('button', { name: 'Firmar y guardar' })).toBeDisabled();
    });

    it('submit button enabled with meter and description', async () => {
      const user = userEvent.setup();
      renderPage();
      await user.selectOptions(screen.getAllByRole('combobox')[0], 'm1');
      await user.type(screen.getByPlaceholderText(/Descripción del trabajo realizado/), 'Revisión completa');
      expect(screen.getByRole('button', { name: 'Firmar y guardar' })).toBeEnabled();
    });
  });

  describe('submit', () => {
    it('shows success message after submit', async () => {
      const user = userEvent.setup();
      renderPage();
      await user.selectOptions(screen.getAllByRole('combobox')[0], 'm1');
      await user.type(screen.getByPlaceholderText(/Descripción del trabajo realizado/), 'Revisión completa');
      await user.click(screen.getByRole('button', { name: 'Firmar y guardar' }));
      expect(screen.getByText(/Intervención registrada correctamente/)).toBeInTheDocument();
    });

    it('clears form after submit (button disabled again)', async () => {
      const user = userEvent.setup();
      renderPage();
      await user.selectOptions(screen.getAllByRole('combobox')[0], 'm1');
      await user.type(screen.getByPlaceholderText(/Descripción del trabajo realizado/), 'Test');
      await user.click(screen.getByRole('button', { name: 'Firmar y guardar' }));
      // onSuccess resets selectedMeterId → canSubmit false → button disabled
      expect(screen.getByRole('button', { name: 'Firmar y guardar' })).toBeDisabled();
    });
  });

  describe('CNR flag', () => {
    it('checkbox is togglable', async () => {
      const user = userEvent.setup();
      renderPage();
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).not.toBeChecked();
      await user.click(checkbox);
      expect(checkbox).toBeChecked();
    });

    it('form can be submitted with CNR flag checked', async () => {
      const user = userEvent.setup();
      renderPage();
      await user.selectOptions(screen.getAllByRole('combobox')[0], 'm1');
      await user.type(screen.getByPlaceholderText(/Descripción del trabajo realizado/), 'Con CNR');
      await user.click(screen.getByRole('checkbox'));
      await user.click(screen.getByRole('button', { name: 'Firmar y guardar' }));
      expect(screen.getByText(/Intervención registrada correctamente/)).toBeInTheDocument();
    });
  });
});
