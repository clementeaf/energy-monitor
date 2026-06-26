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

  describe('diff viewer', () => {
    it('renders diff viewer section', () => {
      renderPage();
      expect(screen.getByTestId('diff-viewer-section')).toBeInTheDocument();
      expect(screen.getByText('Configuración como código')).toBeInTheDocument();
    });

    it('renders view mode toggle buttons', () => {
      renderPage();
      expect(screen.getByText('Unificado')).toBeInTheDocument();
      expect(screen.getByText('Lado a lado')).toBeInTheDocument();
    });

    it('renders diff file entries from UPDATE audit logs', () => {
      renderPage();
      // 2 UPDATE logs = 2 diff entries
      expect(screen.getByText('config/building/b200.json')).toBeInTheDocument();
      expect(screen.getByText('config/tenant/t300.json')).toBeInTheDocument();
    });

    it('does not render diff entries for CREATE logs', () => {
      renderPage();
      expect(screen.queryByText('config/user/u100.json')).not.toBeInTheDocument();
    });

    it('shows added/removed counts in file headers', () => {
      renderPage();
      // building diff has 2 old→new changes = 2 removed + 2 added
      const fileHeaders = screen.getAllByText(/config\/building/);
      const parent = fileHeaders[0].closest('button');
      expect(parent).toBeTruthy();
      expect(within(parent!).getByText('+2')).toBeInTheDocument();
      expect(within(parent!).getByText('-2')).toBeInTheDocument();
    });

    it('expands diff content on click', async () => {
      const user = userEvent.setup();
      renderPage();
      expect(screen.queryByTestId('diff-content')).not.toBeInTheDocument();
      await user.click(screen.getByText('config/building/b200.json'));
      expect(screen.getByTestId('diff-content')).toBeInTheDocument();
    });

    it('shows old and new values in expanded diff', async () => {
      const user = userEvent.setup();
      renderPage();
      await user.click(screen.getByText('config/building/b200.json'));
      const diffContent = screen.getByTestId('diff-content');
      expect(diffContent.textContent).toContain('Mall Viejo');
      expect(diffContent.textContent).toContain('Mall Nuevo');
    });

    it('shows field names in diff lines', async () => {
      const user = userEvent.setup();
      renderPage();
      await user.click(screen.getByText('config/building/b200.json'));
      const diffContent = screen.getByTestId('diff-content');
      expect(diffContent.textContent).toContain('"name"');
      expect(diffContent.textContent).toContain('"timezone"');
    });

    it('collapses diff content on second click', async () => {
      const user = userEvent.setup();
      renderPage();
      await user.click(screen.getByText('config/building/b200.json'));
      expect(screen.getByTestId('diff-content')).toBeInTheDocument();
      await user.click(screen.getByText('config/building/b200.json'));
      expect(screen.queryByTestId('diff-content')).not.toBeInTheDocument();
    });

    it('switches to side-by-side view', async () => {
      const user = userEvent.setup();
      renderPage();
      await user.click(screen.getByText('config/building/b200.json'));
      await user.click(screen.getByText('Lado a lado'));
      const diffContent = screen.getByTestId('diff-content');
      // Side-by-side has a 2-column grid
      expect(diffContent.querySelector('.grid-cols-2')).toBeInTheDocument();
    });

    it('switches back to unified view', async () => {
      const user = userEvent.setup();
      renderPage();
      await user.click(screen.getByText('config/building/b200.json'));
      await user.click(screen.getByText('Lado a lado'));
      await user.click(screen.getByText('Unificado'));
      const diffContent = screen.getByTestId('diff-content');
      expect(diffContent.querySelector('.grid-cols-2')).not.toBeInTheDocument();
    });
  });
});
