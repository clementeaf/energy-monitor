import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';

vi.mock('../../../hooks/queries/useAuditLogsQuery', () => ({
  useAuditLogsQuery: () => ({
    data: {
      data: [
        { id: 'a1', action: 'CREATE', resourceType: 'user', resourceId: 'u100', userId: 'u1', userEmail: 'admin@test.cl', createdAt: '2026-06-25T10:00:00Z' },
        { id: 'a2', action: 'UPDATE', resourceType: 'building', resourceId: 'b200', userId: 'u1', userEmail: 'admin@test.cl', createdAt: '2026-06-24T08:00:00Z' },
        { id: 'a3', action: 'UPDATE', resourceType: 'tenant', resourceId: 't300', userId: 'u1', userEmail: 'admin@test.cl', createdAt: '2026-06-23T12:00:00Z' },
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

  it('renders page heading', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: /7\.5 Config y Releases/ })).toBeInTheDocument();
  });

  it('renders pipeline section', () => {
    renderPage();
    expect(screen.getByText('Pipeline de releases')).toBeInTheDocument();
  });

  it('renders pipeline table columns', () => {
    renderPage();
    // 'Versión' appears in both the pipeline table and the deploy history table
    expect(screen.getAllByText('Versión').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Descripción/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Estado').length).toBeGreaterThanOrEqual(1);
  });

  it('renders pipeline rows with versions', () => {
    renderPage();
    expect(screen.getByText('2.45.0')).toBeInTheDocument();
    expect(screen.getByText('2.44.1')).toBeInTheDocument();
    // 2.44.0 appears as both a pipeline row and the APP_VERSION production row
    expect(screen.getAllByText('2.44.0').length).toBeGreaterThanOrEqual(1);
  });

  it('renders status badges', () => {
    renderPage();
    expect(screen.getByText('En desarrollo')).toBeInTheDocument();
    expect(screen.getByText('QA')).toBeInTheDocument();
    expect(screen.getByText('Aprobación')).toBeInTheDocument();
    expect(screen.getAllByText('Producción').length).toBeGreaterThanOrEqual(1);
  });

  it('renders deploy control section', () => {
    renderPage();
    expect(screen.getByText('Control de despliegue')).toBeInTheDocument();
    expect(screen.getByText('Solicitar despliegue a producción')).toBeInTheDocument();
    expect(screen.getByText('Rollback')).toBeInTheDocument();
  });

  it('renders deploy history section', () => {
    renderPage();
    expect(screen.getByText('Historial de despliegues')).toBeInTheDocument();
  });

  it('renders deploy history rows from audit logs', () => {
    renderPage();
    // With 3 audit log entries, we get history rows with 'éxito' result
    expect(screen.getAllByText('éxito').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('admin@test.cl').length).toBeGreaterThanOrEqual(1);
  });

  it('renders IaC diff viewer section', () => {
    renderPage();
    expect(screen.getByText(/Configuración como código/)).toBeInTheDocument();
    expect(screen.getByText(/diff viewer/)).toBeInTheDocument();
  });

  it('renders IaC diff content', () => {
    renderPage();
    expect(screen.getByText('+5 adiciones')).toBeInTheDocument();
    expect(screen.getByText('-2 eliminaciones')).toBeInTheDocument();
  });

  it('expands diff on row click', async () => {
    const user = userEvent.setup();
    renderPage();
    // Click the 2.44.1 row (has a diff)
    await user.click(screen.getByText('2.44.1'));
    expect(screen.getByText(/WAF rate limit/)).toBeInTheDocument();
  });
});
