import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

vi.mock('../../../hooks/queries/useAuditLogsQuery', () => ({
  useAuditLogsQuery: () => ({
    data: {
      data: [
        { id: 'a1', action: 'CREATE', resourceType: 'user', userId: 'u1', userEmail: 'admin@test.cl', createdAt: '2026-06-25T10:00:00Z' },
        { id: 'a2', action: 'UPDATE', resourceType: 'building', userId: 'u1', userEmail: 'admin@test.cl', createdAt: '2026-06-24T08:00:00Z' },
      ],
      total: 2,
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
      expect(screen.getAllByText('2.29.0').length).toBeGreaterThanOrEqual(1);
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
      expect(screen.getByText('UPDATE')).toBeInTheDocument();
    });

    it('renders resource types', () => {
      renderPage();
      expect(screen.getByText('user')).toBeInTheDocument();
      expect(screen.getByText('building')).toBeInTheDocument();
    });

    it('renders user emails', () => {
      renderPage();
      expect(screen.getAllByText('admin@test.cl').length).toBe(2);
    });

    it('renders result badges', () => {
      renderPage();
      expect(screen.getAllByText('éxito').length).toBe(2);
    });
  });
});
