import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';

vi.mock('../../../hooks/queries/useUsersQuery', () => ({
  useUsersQuery: () => ({
    data: [
      { id: 'u1', displayName: 'Admin User', email: 'admin@globepower.cl', roleId: 'r1', role: { id: 'r1', slug: 'super_admin', name: 'Super Admin' }, isActive: true, tenantId: 't1', authProvider: 'google', lastLoginAt: null, createdAt: '2026-01-01T00:00:00Z', updatedAt: '' },
      { id: 'u2', displayName: 'DevOps User', email: 'devops@globepower.cl', roleId: 'r2', role: { id: 'r2', slug: 'corp_admin', name: 'Corp Admin' }, isActive: true, tenantId: 't1', authProvider: 'microsoft', lastLoginAt: null, createdAt: '2026-03-01T00:00:00Z', updatedAt: '' },
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

    it('renders incidentes abiertos', () => {
      renderPage();
      expect(screen.getByText('Incidentes abiertos')).toBeInTheDocument();
    });
  });

  describe('breach reports', () => {
    it('renders breach section', () => {
      renderPage();
      expect(screen.getByText('Reportes de brecha')).toBeInTheDocument();
    });

    it('renders breach descriptions', () => {
      renderPage();
      // Appears in breach reports + incidents section
      expect(screen.getAllByText('Acceso no autorizado detectado').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Certificado expirado').length).toBeGreaterThanOrEqual(1);
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
      // Appears in audit activity + PAM usage history
      expect(screen.getAllByText('CREATE').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('DELETE').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('PAM accounts (enhanced)', () => {
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

    it('renders review date columns', () => {
      renderPage();
      expect(screen.getByText('Última revisión')).toBeInTheDocument();
      expect(screen.getByText('Próxima revisión')).toBeInTheDocument();
    });

    it('renders PAM status badges', () => {
      renderPage();
      // All active users should show 'activo' or 'en revisión'
      const badges = screen.getAllByText(/activo|en revisión/);
      expect(badges.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('PAM usage history', () => {
    it('renders usage history section', () => {
      renderPage();
      expect(screen.getByTestId('pam-usage-history')).toBeInTheDocument();
      expect(screen.getByText('Historial de uso PAM')).toBeInTheDocument();
    });

    it('shows privileged user actions', () => {
      renderPage();
      // u1 is a PAM user and has audit logs
      const section = screen.getByTestId('pam-usage-history');
      expect(section.textContent).toContain('admin@globepower.cl');
    });
  });

  describe('JIT credential vault', () => {
    it('renders JIT vault section', () => {
      renderPage();
      expect(screen.getByTestId('jit-vault')).toBeInTheDocument();
      expect(screen.getByText(/Bóveda de credenciales/)).toBeInTheDocument();
    });

    it('opens JIT form on button click', async () => {
      const user = userEvent.setup();
      renderPage();
      await user.click(screen.getByText('Solicitar acceso'));
      expect(screen.getByTestId('jit-form')).toBeInTheDocument();
      expect(screen.getByText('Justificación')).toBeInTheDocument();
    });

    it('submits JIT request', async () => {
      const user = userEvent.setup();
      renderPage();
      await user.click(screen.getByText('Solicitar acceso'));
      await user.selectOptions(screen.getByDisplayValue('Seleccionar...'), 'rds-prod');
      await user.type(screen.getByPlaceholderText('Motivo del acceso...'), 'Migración urgente');
      await user.click(screen.getByText('Enviar solicitud'));
      expect(screen.getByText(/Solicitud enviada/)).toBeInTheDocument();
    });
  });

  describe('security incidents', () => {
    it('renders incidents section', () => {
      renderPage();
      expect(screen.getByTestId('security-incidents')).toBeInTheDocument();
      expect(screen.getByText('Incidentes de seguridad')).toBeInTheDocument();
    });

    it('shows incidents derived from breaches', () => {
      renderPage();
      const section = screen.getByTestId('security-incidents');
      expect(section.textContent).toContain('Acceso no autorizado detectado');
      expect(section.textContent).toContain('brecha');
    });

    it('shows incident severity and status', () => {
      renderPage();
      const section = screen.getByTestId('security-incidents');
      expect(section.textContent).toContain('abierto');
      expect(section.textContent).toContain('resuelto');
    });
  });

  describe('breach notification', () => {
    it('renders notification section', () => {
      renderPage();
      expect(screen.getByTestId('breach-notification')).toBeInTheDocument();
      expect(screen.getByText(/Notificación de brecha/)).toBeInTheDocument();
    });

    it('opens breach form on click', async () => {
      const user = userEvent.setup();
      renderPage();
      await user.click(screen.getByText('Reportar brecha'));
      expect(screen.getByPlaceholderText(/Descripción de la brecha/)).toBeInTheDocument();
    });

    it('sends breach notification', async () => {
      const user = userEvent.setup();
      renderPage();
      await user.click(screen.getByText('Reportar brecha'));
      await user.type(screen.getByPlaceholderText(/Descripción de la brecha/), 'Data leak detected');
      await user.click(screen.getByText('Enviar notificación a PASA'));
      expect(screen.getByText(/Notificación enviada/)).toBeInTheDocument();
    });
  });

  describe('crypto deletion', () => {
    it('renders crypto deletion section', () => {
      renderPage();
      expect(screen.getByTestId('crypto-deletion')).toBeInTheDocument();
      expect(screen.getByText('Borrado criptográfico')).toBeInTheDocument();
    });

    it('requires CONFIRMAR to execute', async () => {
      const user = userEvent.setup();
      renderPage();
      await user.click(screen.getByText('Iniciar borrado'));
      expect(screen.getByPlaceholderText('CONFIRMAR')).toBeInTheDocument();
      // Button disabled until typed
      expect(screen.getByText('Ejecutar borrado')).toBeDisabled();
      await user.type(screen.getByPlaceholderText('CONFIRMAR'), 'CONFIRMAR');
      expect(screen.getByText('Ejecutar borrado')).not.toBeDisabled();
    });

    it('executes crypto deletion', async () => {
      const user = userEvent.setup();
      renderPage();
      await user.click(screen.getByText('Iniciar borrado'));
      await user.type(screen.getByPlaceholderText('CONFIRMAR'), 'CONFIRMAR');
      await user.click(screen.getByText('Ejecutar borrado'));
      expect(screen.getByText(/Borrado criptográfico ejecutado/)).toBeInTheDocument();
    });
  });
});
