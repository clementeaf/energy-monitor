import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

import { ConfigReleasesPage } from './ConfigReleasesPage';

function renderPage() { return render(<MemoryRouter><ConfigReleasesPage /></MemoryRouter>); }

describe('ConfigReleasesPage', () => {
  beforeEach(() => vi.clearAllMocks());
  it('renders page header', () => { renderPage(); expect(screen.getByRole('heading', { name: 'Config y Releases' })).toBeInTheDocument(); });
  it('renders pipeline section', () => { renderPage(); expect(screen.getByText('Pipeline de releases')).toBeInTheDocument(); });
  it('renders release versions', () => { renderPage(); expect(screen.getAllByText('2.24.0').length).toBeGreaterThanOrEqual(1); expect(screen.getByText('2.25.0')).toBeInTheDocument(); });
  it('renders status badges', () => { renderPage(); expect(screen.getByText('Producción')).toBeInTheDocument(); expect(screen.getByText('En desarrollo')).toBeInTheDocument(); });
  it('renders deploy history', () => { renderPage(); expect(screen.getByText('Historial de despliegues')).toBeInTheDocument(); });
  it('renders deploy results', () => { renderPage(); expect(screen.getAllByText('éxito').length).toBe(3); });
});
