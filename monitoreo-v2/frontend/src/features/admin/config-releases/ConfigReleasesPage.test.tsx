import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';

vi.mock('../../../hooks/queries/useAuditLogsQuery', () => ({
  useAuditLogsQuery: () => ({
    data: {
      data: [
        { id: 'a1', action: 'CREATE', resourceType: 'user', resourceId: 'u100', userId: 'u1', userEmail: 'admin@test.cl', createdAt: '2026-06-25T10:00:00Z' },
        { id: 'a2', action: 'UPDATE', resourceType: 'building', resourceId: 'b200', userId: 'u1', userEmail: 'admin@test.cl', createdAt: '2026-06-24T08:00:00Z', changes: { name: { old: 'Mall Viejo', new: 'Mall Nuevo' }, timezone: { old: 'America/Santiago', new: 'America/Lima' } } },
        { id: 'a3', action: 'UPDATE', resourceType: 'tenant', resourceId: 't300', userId: 'u1', userEmail: 'admin@test.cl', createdAt: '2026-06-23T12:00:00Z', changes: { currency: 'CLP' } },
      ],
      total: 3,
    },
    isLoading: false,
    isSuccess: true,
    isPending: false,
  }),
}));

import { ConfigReleasesPage } from './ConfigReleasesPage';

function renderPage() {
  return render(<MemoryRouter><ConfigReleasesPage /></MemoryRouter>);
}

describe('ConfigReleasesPage', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('layout', () => {
    it('renders page header', () => {
      renderPage();
      expect(screen.getByRole('heading', { name: 'Config y Releases' })).toBeInTheDocument();
    });

    it('renders current version', () => {
      renderPage();
      expect(screen.getAllByText('2.39.0').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Producción').length).toBeGreaterThanOrEqual(1);
    });

    it('renders pipeline section', () => {
      renderPage();
      expect(screen.getByText('Pipeline de releases')).toBeInTheDocument();
    });
  });

  describe('audit activity', () => {
    it('renders activity section', () => {
      renderPage();
      expect(screen.getByText(/Actividad reciente/)).toBeInTheDocument();
    });

    it('renders audit log entries', () => {
      renderPage();
      expect(screen.getByText('CREATE')).toBeInTheDocument();
      expect(screen.getAllByText('UPDATE').length).toBeGreaterThanOrEqual(1);
    });

    it('renders resource types', () => {
      renderPage();
      expect(screen.getByText('user')).toBeInTheDocument();
      expect(screen.getByText('building')).toBeInTheDocument();
    });

    it('renders user emails', () => {
      renderPage();
      expect(screen.getAllByText('admin@test.cl').length).toBe(3);
    });

    it('renders result badges', () => {
      renderPage();
      expect(screen.getAllByText('éxito').length).toBe(3);
    });
  });

});
