import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

vi.mock('../../../hooks/queries/useUsersQuery', () => ({
  useUsersQuery: () => ({
    data: [
      { id: 'u1', displayName: 'Admin User', email: 'admin@globepower.cl', roleId: 'r1', role: { id: 'r1', slug: 'super_admin', name: 'Super Admin' }, isActive: true, tenantId: 't1', authProvider: 'google', lastLoginAt: null, createdAt: '', updatedAt: '' },
      { id: 'u2', displayName: 'DevOps User', email: 'devops@globepower.cl', roleId: 'r2', role: { id: 'r2', slug: 'corp_admin', name: 'Corp Admin' }, isActive: true, tenantId: 't1', authProvider: 'microsoft', lastLoginAt: null, createdAt: '', updatedAt: '' },
      { id: 'u3', displayName: 'Operator', email: 'op@pasa.cl', roleId: 'r3', role: { id: 'r3', slug: 'operator', name: 'Operator' }, isActive: true, tenantId: 't2', authProvider: 'google', lastLoginAt: null, createdAt: '', updatedAt: '' },
    ],
    isLoading: false, isSuccess: true,
  }),
}));

vi.mock('../../../hooks/queries/useBreachReportsQuery', () => ({
  useBreachReportsQuery: () => ({
    data: [
      { id: 'br1', description: 'Acceso no autorizado detectado', status: 'open', createdAt: '2026-06-25T10:00:00Z' },
      { id: 'br2', description: 'Certificado expirado', status: 'resolved', createdAt: '2026-06-20T08:00:00Z' },
    ],
    isLoading: false, isSuccess: true, isPending: false,
  }),
}));

vi.mock('../../../hooks/queries/useAuditLogsQuery', () => ({
  useAuditLogsQuery: () => ({
    data: {
      data: [
        { id: 'a1', action: 'CREATE', resourceType: 'user', userId: 'u1', userEmail: 'admin@globepower.cl', createdAt: '2026-06-25T10:00:00Z' },
        { id: 'a2', action: 'DELETE', resourceType: 'api_key', userId: 'u1', userEmail: 'admin@globepower.cl', createdAt: '2026-06-24T09:00:00Z' },
      ],
      total: 2,
    },
    isLoading: false, isSuccess: true, isPending: false,
  }),
}));

import { SeguridadPamPage } from './SeguridadPamPage';

function renderPage() {
  return render(<MemoryRouter><SeguridadPamPage /></MemoryRouter>);
}

describe('SeguridadPamPage', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('layout', () => {
    it('renders page header', () => {
      renderPage();
      expect(screen.getByRole('heading', { name: 'Seguridad y PAM' })).toBeInTheDocument();
    });
  });

  describe('KPIs', () => {
    it('renders brechas abiertas count', () => {
      renderPage();
      expect(screen.getByText('Brechas abiertas')).toBeInTheDocument();
    });

    it('renders PAM accounts count', () => {
      renderPage();
      expect(screen.getByText('Cuentas PAM')).toBeInTheDocument();
    });

    it('renders acciones recientes', () => {
      renderPage();
      expect(screen.getByText('Acciones recientes')).toBeInTheDocument();
    });
  });

  describe('breach reports', () => {
    it('renders breach section', () => {
      renderPage();
      expect(screen.getByText('Reportes de brecha')).toBeInTheDocument();
    });

    it('renders breach descriptions', () => {
      renderPage();
      expect(screen.getByText('Acceso no autorizado detectado')).toBeInTheDocument();
      expect(screen.getByText('Certificado expirado')).toBeInTheDocument();
    });

    it('renders breach status badges', () => {
      renderPage();
      expect(screen.getByText('open')).toBeInTheDocument();
      expect(screen.getByText('resolved')).toBeInTheDocument();
    });
  });

  describe('audit activity', () => {
    it('renders activity section', () => {
      renderPage();
      expect(screen.getByText('Actividad de seguridad')).toBeInTheDocument();
    });

    it('renders audit actions', () => {
      renderPage();
      expect(screen.getByText('CREATE')).toBeInTheDocument();
      expect(screen.getByText('DELETE')).toBeInTheDocument();
    });
  });

  describe('PAM accounts', () => {
    it('renders PAM section', () => {
      renderPage();
      expect(screen.getByText('Cuentas privilegiadas (PAM)')).toBeInTheDocument();
    });

    it('shows only privileged users', () => {
      renderPage();
      expect(screen.getByText('Admin User')).toBeInTheDocument();
      expect(screen.getByText('DevOps User')).toBeInTheDocument();
      expect(screen.queryByText('Operator')).not.toBeInTheDocument();
    });

    it('renders PAM emails', () => {
      renderPage();
      expect(screen.getByText('admin@globepower.cl')).toBeInTheDocument();
      expect(screen.getByText('devops@globepower.cl')).toBeInTheDocument();
    });

    it('renders active status badges', () => {
      renderPage();
      expect(screen.getAllByText('activo').length).toBeGreaterThanOrEqual(2);
    });
  });
});
