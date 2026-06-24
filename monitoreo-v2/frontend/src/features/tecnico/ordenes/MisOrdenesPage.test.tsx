import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('../../../hooks/queries/useBuildingsQuery', () => ({
  useBuildingsQuery: () => ({ data: [{ id: 'b1', name: 'Mall Norte', tenantId: 't1', code: 'MN', address: null, countryCode: 'CL', isActive: true, latitude: null, longitude: null, areaSqm: null, regionId: null, timezone: null, externalSiteId: null, siteKind: null, createdAt: '', updatedAt: '' }], isLoading: false, isSuccess: true }),
}));

const HOURS_AGO = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();
const mockAlerts = [
  { id: 'aaaa1111-0000-0000-0000-000000000001', buildingId: 'b1', meterId: 'm1', alertRuleId: null, alertTypeCode: 'OV', severity: 'critical', status: 'active', message: 'Sobrevoltaje', triggeredValue: 250, thresholdValue: 240, assignedTo: null, acknowledgedBy: null, acknowledgedAt: null, resolvedBy: null, resolvedAt: null, resolutionNotes: null, createdAt: HOURS_AGO(6) },
  { id: 'bbbb2222-0000-0000-0000-000000000002', buildingId: 'b1', meterId: 'm2', alertRuleId: null, alertTypeCode: 'LP', severity: 'low', status: 'acknowledged', message: 'Factor bajo', triggeredValue: 0.8, thresholdValue: 0.85, assignedTo: null, acknowledgedBy: null, acknowledgedAt: null, resolvedBy: null, resolvedAt: null, resolutionNotes: null, createdAt: HOURS_AGO(2) },
];

vi.mock('../../../hooks/queries/useAlertsQuery', () => ({
  useAlertsQuery: (params: { status: string }) => {
    const data: Record<string, unknown[]> = { active: [mockAlerts[0]], acknowledged: [mockAlerts[1]], resolved: [] };
    return { data: data[params.status] ?? [], isLoading: false, isSuccess: true, isPending: false };
  },
  useAcknowledgeAlert: () => ({ mutate: vi.fn(), isPending: false }),
  useResolveAlert: () => ({ mutate: vi.fn(), isPending: false }),
}));

import { MisOrdenesPage } from './MisOrdenesPage';

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}><MemoryRouter><MisOrdenesPage /></MemoryRouter></QueryClientProvider>);
}

describe('MisOrdenesPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders page header', () => { renderPage(); expect(screen.getByRole('heading', { name: 'Mis Órdenes' })).toBeInTheDocument(); });
  it('renders KPIs', () => { renderPage(); expect(screen.getByText('Pendientes')).toBeInTheDocument(); expect(screen.getByText('En curso')).toBeInTheDocument(); expect(screen.getByText('Cerradas hoy')).toBeInTheDocument(); expect(screen.getByText('Vencidas')).toBeInTheDocument(); });
  it('renders order table', () => { renderPage(); expect(screen.getByText('Sobrevoltaje')).toBeInTheDocument(); expect(screen.getByText('Factor bajo')).toBeInTheDocument(); });
  it('renders priority badges', () => { renderPage(); expect(screen.getAllByText('ALTA').length).toBeGreaterThanOrEqual(1); });
  it('shows detail panel on click', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByText('Sobrevoltaje'));
    expect(screen.getByText('Detalle')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Iniciar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cerrar' })).toBeInTheDocument();
  });
});
