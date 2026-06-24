import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';

vi.mock('../../../hooks/queries/useBuildingsQuery', () => ({
  useBuildingsQuery: () => ({
    data: [
      { id: 'b1', name: 'Mall Norte', tenantId: 't1', code: 'MN', address: null, countryCode: 'CL', isActive: true, latitude: null, longitude: null, areaSqm: null, regionId: null, timezone: null, externalSiteId: null, siteKind: null, createdAt: '', updatedAt: '' },
    ],
    isLoading: false,
    isSuccess: true,
  }),
}));

vi.mock('../../../hooks/queries/useMetersQuery', () => ({
  useMetersQuery: () => ({
    data: [
      { id: 'm1', buildingId: 'b1', name: 'Principal', code: 'P1', meterType: 'main', isActive: true, metadata: {}, externalId: null, model: null, serialNumber: null, ipAddress: null, modbusAddress: null, busId: null, phaseType: 'three_phase', nominalVoltage: null, nominalCurrent: null, contractedDemandKw: null, loadCategory: 'main', parentMeterId: null, createdAt: '', updatedAt: '' },
      { id: 'm2', buildingId: 'b1', name: 'HVAC', code: 'H1', meterType: 'sub', isActive: true, metadata: {}, externalId: null, model: null, serialNumber: null, ipAddress: null, modbusAddress: null, busId: null, phaseType: 'three_phase', nominalVoltage: null, nominalCurrent: null, contractedDemandKw: null, loadCategory: 'hvac', parentMeterId: null, createdAt: '', updatedAt: '' },
      { id: 'm3', buildingId: 'b1', name: 'Iluminación', code: 'L1', meterType: 'sub', isActive: true, metadata: {}, externalId: null, model: null, serialNumber: null, ipAddress: null, modbusAddress: null, busId: null, phaseType: 'single_phase', nominalVoltage: null, nominalCurrent: null, contractedDemandKw: null, loadCategory: 'lighting', parentMeterId: null, createdAt: '', updatedAt: '' },
    ],
    isLoading: false,
    isSuccess: true,
  }),
}));

import { CnrPendientesPage } from './CnrPendientesPage';

function renderPage() {
  return render(
    <MemoryRouter>
      <CnrPendientesPage />
    </MemoryRouter>,
  );
}

describe('CnrPendientesPage', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('layout', () => {
    it('renders page header', () => {
      renderPage();
      expect(screen.getByRole('heading', { name: 'CNR Pendientes' })).toBeInTheDocument();
    });

    it('renders status filter pills', () => {
      renderPage();
      expect(screen.getAllByText('Todas').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Pendientes').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('En revisión')).toBeInTheDocument();
    });
  });

  describe('KPIs', () => {
    it('renders CNR abiertas', () => {
      renderPage();
      expect(screen.getByText('CNR abiertas')).toBeInTheDocument();
    });

    it('renders >7 días label', () => {
      renderPage();
      expect(screen.getByText('>7 días sin resolución')).toBeInTheDocument();
    });

    it('renders ingresadas hoy', () => {
      renderPage();
      expect(screen.getByText('Ingresadas hoy')).toBeInTheDocument();
    });
  });

  describe('table', () => {
    it('renders table headers', () => {
      renderPage();
      expect(screen.getByText('Medidor')).toBeInTheDocument();
      expect(screen.getByText('Centro')).toBeInTheDocument();
      expect(screen.getByText('Período')).toBeInTheDocument();
      expect(screen.getByText('Tipo')).toBeInTheDocument();
      expect(screen.getByText('kWh est.')).toBeInTheDocument();
    });

    it('renders CNR rows from meters', () => {
      renderPage();
      expect(screen.getByText('Principal')).toBeInTheDocument();
      expect(screen.getByText('HVAC')).toBeInTheDocument();
      expect(screen.getByText('Iluminación')).toBeInTheDocument();
    });

    it('renders CNR IDs', () => {
      renderPage();
      expect(screen.getByText('CNR-0001')).toBeInTheDocument();
      expect(screen.getByText('CNR-0002')).toBeInTheDocument();
    });

    it('renders status badges', () => {
      renderPage();
      expect(screen.getAllByText('pendiente').length).toBeGreaterThanOrEqual(1);
    });

    it('renders building name', () => {
      renderPage();
      expect(screen.getAllByText('Mall Norte').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('expand row', () => {
    it('shows justification on row click', async () => {
      const user = userEvent.setup();
      renderPage();

      await user.click(screen.getByText('Principal'));
      expect(screen.getByText(/Justificación:/)).toBeInTheDocument();
      expect(screen.getByText(/Falla comunicación medidor Principal/)).toBeInTheDocument();
    });

    it('shows responsible on expand', async () => {
      const user = userEvent.setup();
      renderPage();

      await user.click(screen.getByText('Principal'));
      expect(screen.getByText(/Responsable:/)).toBeInTheDocument();
    });

    it('collapses on second click', async () => {
      const user = userEvent.setup();
      renderPage();

      await user.click(screen.getByText('Principal'));
      expect(screen.getByText(/Justificación:/)).toBeInTheDocument();

      await user.click(screen.getByText('Principal'));
      expect(screen.queryByText(/Justificación:/)).not.toBeInTheDocument();
    });
  });
});
