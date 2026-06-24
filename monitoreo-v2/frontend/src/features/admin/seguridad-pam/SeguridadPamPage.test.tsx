import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

import { SeguridadPamPage } from './SeguridadPamPage';

function renderPage() { return render(<MemoryRouter><SeguridadPamPage /></MemoryRouter>); }

describe('SeguridadPamPage', () => {
  beforeEach(() => vi.clearAllMocks());
  it('renders page header', () => { renderPage(); expect(screen.getByRole('heading', { name: 'Seguridad y PAM' })).toBeInTheDocument(); });
  it('renders security KPIs', () => { renderPage(); expect(screen.getByText('Vulnerabilidades')).toBeInTheDocument(); expect(screen.getByText('Parches pendientes')).toBeInTheDocument(); expect(screen.getByText('Cuentas PAM')).toBeInTheDocument(); });
  it('renders vulnerability table', () => { renderPage(); expect(screen.getByText('Vulnerabilidades por severidad')).toBeInTheDocument(); expect(screen.getByText('CRITICAL')).toBeInTheDocument(); expect(screen.getByText('MEDIUM')).toBeInTheDocument(); });
  it('renders TLS certificates', () => { renderPage(); expect(screen.getByText('Certificados TLS')).toBeInTheDocument(); expect(screen.getByText('API Gateway')).toBeInTheDocument(); expect(screen.getByText('CloudFront CDN')).toBeInTheDocument(); });
  it('renders PAM accounts', () => { renderPage(); expect(screen.getByText('Cuentas privilegiadas (PAM)')).toBeInTheDocument(); expect(screen.getByText('admin@globepower.cl')).toBeInTheDocument(); expect(screen.getByText('devops@globepower.cl')).toBeInTheDocument(); });
  it('renders PAM status badges', () => { renderPage(); expect(screen.getAllByText('activo').length).toBe(2); });
});
