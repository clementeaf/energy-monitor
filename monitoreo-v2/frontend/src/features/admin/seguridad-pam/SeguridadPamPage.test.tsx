import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
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

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

function renderPage() {
  return render(<MemoryRouter><SeguridadPamPage /></MemoryRouter>);
}

describe('SeguridadPamPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders page heading', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: /7\.3 Seguridad y PAM/ })).toBeInTheDocument();
  });

  it('renders vulnerability summary section', () => {
    renderPage();
    expect(screen.getByText('Resumen de vulnerabilidades')).toBeInTheDocument();
  });

  it('renders vulnerability counts', () => {
    renderPage();
    expect(screen.getByText(/Críticas:/)).toBeInTheDocument();
    expect(screen.getByText(/Altas:/)).toBeInTheDocument();
    expect(screen.getByText(/Medias:/)).toBeInTheDocument();
    expect(screen.getByText(/Bajas:/)).toBeInTheDocument();
  });

  it('renders TLS certificates section', () => {
    renderPage();
    expect(screen.getByText('Certificados TLS')).toBeInTheDocument();
    expect(screen.getByText('API Gateway')).toBeInTheDocument();
    expect(screen.getByText('CloudFront CDN')).toBeInTheDocument();
  });

  it('renders encryption at rest section', () => {
    renderPage();
    expect(screen.getByText('Cifrado en reposo (AES-256)')).toBeInTheDocument();
  });

  it('renders WAF section', () => {
    renderPage();
    expect(screen.getByText('WAF / DDoS / IDS-IPS')).toBeInTheDocument();
    expect(screen.getByText(/WAF activo/)).toBeInTheDocument();
  });

  it('renders CIS hardening section', () => {
    renderPage();
    expect(screen.getByText('Hardening — CIS Benchmarks')).toBeInTheDocument();
    expect(screen.getByText('ECS Fargate')).toBeInTheDocument();
    // RDS PostgreSQL appears in both CIS and SBOM sections
    expect(screen.getAllByText('RDS PostgreSQL').length).toBeGreaterThanOrEqual(1);
  });

  it('renders EDR section', () => {
    renderPage();
    expect(screen.getByText('EDR / antivirus')).toBeInTheDocument();
    expect(screen.getByText(/AWS Inspector activo/)).toBeInTheDocument();
  });

  it('renders SBOM inventory section', () => {
    renderPage();
    expect(screen.getByText('Inventario HW/SW (SBOM)')).toBeInTheDocument();
    expect(screen.getByText('Node.js 20')).toBeInTheDocument();
    expect(screen.getByText('PostgreSQL 16')).toBeInTheDocument();
  });

  it('renders PAM accounts section', () => {
    renderPage();
    expect(screen.getByText('PAM — cuentas privilegiadas')).toBeInTheDocument();
  });

  it('shows only privileged users in PAM table', () => {
    renderPage();
    expect(screen.getByText('Admin User')).toBeInTheDocument();
    expect(screen.getByText('DevOps User')).toBeInTheDocument();
    expect(screen.queryByText('Operator')).not.toBeInTheDocument();
  });

  it('renders PAM status badges', () => {
    renderPage();
    const badges = screen.getAllByText(/activo|en revisión/);
    expect(badges.length).toBeGreaterThanOrEqual(2);
  });

  it('renders JIT vault section', () => {
    renderPage();
    expect(screen.getByTestId('jit-vault')).toBeInTheDocument();
    expect(screen.getByText(/Bóveda de credenciales JIT/)).toBeInTheDocument();
  });

  it('renders JIT vault details', () => {
    renderPage();
    expect(screen.getByText(/TTL máximo/)).toBeInTheDocument();
    expect(screen.getByText('Solicitar acceso')).toBeInTheDocument();
  });

  it('opens JIT form on button click', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByText('Solicitar acceso'));
    expect(screen.getByPlaceholderText(/Justificación/)).toBeInTheDocument();
    expect(screen.getByText('Enviar')).toBeInTheDocument();
  });

  it('send button disabled without resource and justification', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByText('Solicitar acceso'));
    expect(screen.getByText('Enviar')).toBeDisabled();
  });

  it('renders security incidents section', () => {
    renderPage();
    expect(screen.getByTestId('security-incidents')).toBeInTheDocument();
    expect(screen.getByText('Incidentes de seguridad')).toBeInTheDocument();
  });

  it('shows incidents derived from breach reports', () => {
    renderPage();
    const section = screen.getByTestId('security-incidents');
    // breach reports map to incidents with type 'brecha'
    expect(section.textContent).toContain('brecha');
    expect(section.textContent).toContain('abierto');
    expect(section.textContent).toContain('resuelto');
  });

  it('renders breach notification button', () => {
    renderPage();
    expect(screen.getByText('Notificar a PASA')).toBeInTheDocument();
  });

  it('opens breach form on click', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByText('Notificar a PASA'));
    expect(screen.getByPlaceholderText(/Descripción de la brecha/)).toBeInTheDocument();
  });

  it('sends breach notification', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByText('Notificar a PASA'));
    await user.type(screen.getByPlaceholderText(/Descripción de la brecha/), 'Data leak detected');
    await user.click(screen.getByText('Notificar a PASA'));
    expect(screen.getByText(/Notificación enviada a PASA/)).toBeInTheDocument();
  });

  it('renders BCP/DRP section', () => {
    renderPage();
    expect(screen.getByText('Estado del BCP / DRP')).toBeInTheDocument();
    expect(screen.getByText(/BCP documentado/)).toBeInTheDocument();
  });

  it('renders backup integrity section', () => {
    renderPage();
    expect(screen.getByText('Integridad de backups')).toBeInTheDocument();
    expect(screen.getByText(/RDS automated backups/)).toBeInTheDocument();
  });

  it('renders DAST scan section', () => {
    renderPage();
    expect(screen.getByText('Escaneo DAST')).toBeInTheDocument();
    expect(screen.getByText(/OWASP ZAP/)).toBeInTheDocument();
  });

  it('renders pentest report section', () => {
    renderPage();
    expect(screen.getByText('Informe Pentest anual')).toBeInTheDocument();
    expect(screen.getByText(/91 PASS/)).toBeInTheDocument();
  });

  it('renders crypto deletion section', () => {
    renderPage();
    expect(screen.getByTestId('crypto-deletion')).toBeInTheDocument();
    expect(screen.getByText('Borrado criptográfico')).toBeInTheDocument();
  });

  it('requires CONFIRMAR to execute crypto deletion', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByText('Iniciar borrado criptográfico'));
    expect(screen.getByPlaceholderText('CONFIRMAR')).toBeInTheDocument();
    expect(screen.getByText('Ejecutar borrado')).toBeDisabled();
    await user.type(screen.getByPlaceholderText('CONFIRMAR'), 'CONFIRMAR');
    expect(screen.getByText('Ejecutar borrado')).not.toBeDisabled();
  });

  it('executes crypto deletion after confirmation', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByText('Iniciar borrado criptográfico'));
    await user.type(screen.getByPlaceholderText('CONFIRMAR'), 'CONFIRMAR');
    await user.click(screen.getByText('Ejecutar borrado'));
    expect(screen.getByText(/Borrado ejecutado/)).toBeInTheDocument();
  });
});
