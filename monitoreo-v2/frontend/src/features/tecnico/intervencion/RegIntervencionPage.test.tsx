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

import { RegIntervencionPage } from './RegIntervencionPage';

function renderPage() {
  return render(<MemoryRouter><RegIntervencionPage /></MemoryRouter>);
}

describe('RegIntervencionPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // ponytail: jsdom localStorage is a shim; just reset via setItem
    try { localStorage.setItem('interventions', '[]'); } catch { /* noop */ }
  });

  describe('layout', () => {
    it('renders page header', () => {
      renderPage();
      expect(screen.getByRole('heading', { name: 'Registro de Intervención' })).toBeInTheDocument();
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

    it('renders CNR checkbox', () => {
      renderPage();
      expect(screen.getByLabelText('Requiere CNR')).toBeInTheDocument();
    });

    it('renders empty history', () => {
      renderPage();
      expect(screen.getByText(/Sin intervenciones registradas/)).toBeInTheDocument();
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
    it('submit disabled without meter and description', () => {
      renderPage();
      expect(screen.getByRole('button', { name: 'Registrar intervención' })).toBeDisabled();
    });

    it('submit disabled with meter but no description', async () => {
      const user = userEvent.setup();
      renderPage();
      await user.selectOptions(screen.getAllByRole('combobox')[0], 'm1');
      expect(screen.getByRole('button', { name: 'Registrar intervención' })).toBeDisabled();
    });

    it('submit enabled with meter and description', async () => {
      const user = userEvent.setup();
      renderPage();
      await user.selectOptions(screen.getAllByRole('combobox')[0], 'm1');
      await user.type(screen.getByPlaceholderText(/Descripción del trabajo/), 'Revisión completa');
      expect(screen.getByRole('button', { name: 'Registrar intervención' })).toBeEnabled();
    });
  });

  describe('submit', () => {
    it('shows success message after submit', async () => {
      const user = userEvent.setup();
      renderPage();
      await user.selectOptions(screen.getAllByRole('combobox')[0], 'm1');
      await user.type(screen.getByPlaceholderText(/Descripción del trabajo/), 'Revisión completa');
      await user.click(screen.getByRole('button', { name: 'Registrar intervención' }));
      expect(screen.getByText(/Intervención registrada correctamente/)).toBeInTheDocument();
    });

    it('adds entry to history panel', async () => {
      const user = userEvent.setup();
      renderPage();
      await user.selectOptions(screen.getAllByRole('combobox')[0], 'm1');
      await user.type(screen.getByPlaceholderText(/Descripción del trabajo/), 'Cambio de fusible');
      await user.click(screen.getByRole('button', { name: 'Registrar intervención' }));
      expect(screen.getByText('Cambio de fusible')).toBeInTheDocument();
      expect(screen.getByText('Principal')).toBeInTheDocument();
    });

    it('clears form after submit', async () => {
      const user = userEvent.setup();
      renderPage();
      await user.selectOptions(screen.getAllByRole('combobox')[0], 'm1');
      await user.type(screen.getByPlaceholderText(/Descripción del trabajo/), 'Test');
      await user.click(screen.getByRole('button', { name: 'Registrar intervención' }));
      // Meter selector should reset
      expect(screen.getByRole('button', { name: 'Registrar intervención' })).toBeDisabled();
    });

    it('shows history entry after submit', async () => {
      const user = userEvent.setup();
      renderPage();
      await user.selectOptions(screen.getAllByRole('combobox')[0], 'm1');
      await user.type(screen.getByPlaceholderText(/Descripción del trabajo/), 'Inspección rutinaria');
      await user.click(screen.getByRole('button', { name: 'Registrar intervención' }));
      expect(screen.getByText('Historial (1)')).toBeInTheDocument();
      expect(screen.getByText('Inspección rutinaria')).toBeInTheDocument();
    });
  });

  describe('CNR flag', () => {
    it('saves requiresCnr when checked', async () => {
      const user = userEvent.setup();
      renderPage();
      await user.selectOptions(screen.getAllByRole('combobox')[0], 'm1');
      await user.type(screen.getByPlaceholderText(/Descripción del trabajo/), 'Con CNR');
      await user.click(screen.getByLabelText('Requiere CNR'));
      await user.click(screen.getByRole('button', { name: 'Registrar intervención' }));
      // History panel shows CNR badge
      expect(screen.getByText('CNR')).toBeInTheDocument();
    });
  });
});
