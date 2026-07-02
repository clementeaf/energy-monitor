import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { IotDevicesPage } from './IotDevicesPage';

const mockAssign = vi.fn();
const mockUnassign = vi.fn();

vi.mock('../../../hooks/queries/useIotDevicesQuery', () => ({
  useIotDevicesQuery: () => ({
    data: [
      {
        id: 'dev-1',
        deviceClientId: 'thing-001',
        firstSeen: '2026-06-28T10:00:00Z',
        lastSeen: '2026-06-30T08:00:00Z',
        assignedMeterId: null,
        assignedMeter: null,
        payloadSample: { voltajeL1N_V: 220 },
      },
      {
        id: 'dev-2',
        deviceClientId: 'thing-002',
        firstSeen: '2026-06-29T10:00:00Z',
        lastSeen: '2026-06-30T07:00:00Z',
        assignedMeterId: 'meter-1',
        assignedMeter: { id: 'meter-1', name: 'Medidor A', code: 'MA-01' },
        payloadSample: {},
      },
    ],
    isLoading: false,
  }),
  useAssignIotDevice: () => ({ mutate: mockAssign, isPending: false }),
  useUnassignIotDevice: () => ({ mutate: mockUnassign, isPending: false }),
}));

vi.mock('../../../hooks/queries/useBuildingsQuery', () => ({
  useBuildingsQuery: () => ({
    data: [{ id: 'b-1', name: 'Edificio Norte' }],
  }),
}));

vi.mock('../../../hooks/queries/useMetersQuery', () => ({
  useMetersQuery: () => ({
    data: [
      { id: 'meter-free', name: 'Medidor Libre', code: 'ML-01', iotDeviceId: null },
    ],
  }),
}));

const wrap = (ui: React.ReactNode) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter>{ui}</MemoryRouter>
  </QueryClientProvider>
);

describe('IotDevicesPage', () => {
  beforeEach(() => {
    mockAssign.mockClear();
    mockUnassign.mockClear();
  });

  it('renders device list with both devices', () => {
    render(wrap(<IotDevicesPage />));
    expect(screen.getByText('thing-001')).toBeTruthy();
    expect(screen.getByText('thing-002')).toBeTruthy();
  });

  it('shows assigned and unassigned badges', () => {
    render(wrap(<IotDevicesPage />));
    expect(screen.getByText('sin asignar')).toBeTruthy();
    expect(screen.getByText('asignado')).toBeTruthy();
  });

  it('shows assigned meter name', () => {
    render(wrap(<IotDevicesPage />));
    expect(screen.getByText('Medidor A (MA-01)')).toBeTruthy();
  });

  it('renders page header', () => {
    render(wrap(<IotDevicesPage />));
    expect(screen.getByText('Dispositivos IoT')).toBeTruthy();
  });

  it('renders filter pills', () => {
    render(wrap(<IotDevicesPage />));
    expect(screen.getByText('Todos')).toBeTruthy();
    expect(screen.getByText('Sin asignar')).toBeTruthy();
    expect(screen.getByText('Asignados')).toBeTruthy();
  });

  it('clicking unassigned device shows assign button in detail panel', () => {
    render(wrap(<IotDevicesPage />));
    fireEvent.click(screen.getByText('thing-001'));
    expect(screen.getByText('Asignar a medidor')).toBeTruthy();
  });

  it('clicking assigned device shows unassign button in detail panel', () => {
    render(wrap(<IotDevicesPage />));
    fireEvent.click(screen.getByText('thing-002'));
    expect(screen.getByText('Desasignar')).toBeTruthy();
  });

  it('clicking Desasignar calls unassign mutation', () => {
    render(wrap(<IotDevicesPage />));
    fireEvent.click(screen.getByText('thing-002'));
    fireEvent.click(screen.getByText('Desasignar'));
    expect(mockUnassign).toHaveBeenCalledWith('dev-2', expect.any(Object));
  });

  it('clicking Asignar opens drawer with building selector', () => {
    render(wrap(<IotDevicesPage />));
    fireEvent.click(screen.getByText('thing-001'));
    fireEvent.click(screen.getByText('Asignar a medidor'));
    expect(screen.getByText('Asignar dispositivo IoT')).toBeTruthy();
    expect(screen.getByText('Edificio')).toBeTruthy();
  });

  it('shows payload sample when selecting device with payload', () => {
    render(wrap(<IotDevicesPage />));
    fireEvent.click(screen.getByText('thing-001'));
    expect(screen.getByText('Muestra payload')).toBeTruthy();
    expect(screen.getByText(/"voltajeL1N_V": 220/)).toBeTruthy();
  });

  it('filters to show only unassigned devices', () => {
    render(wrap(<IotDevicesPage />));
    fireEvent.click(screen.getByText('Sin asignar'));
    expect(screen.getByText('thing-001')).toBeTruthy();
    expect(screen.queryByText('thing-002')).toBeNull();
  });

  it('filters to show only assigned devices', () => {
    render(wrap(<IotDevicesPage />));
    fireEvent.click(screen.getByText('Asignados'));
    expect(screen.queryByText('thing-001')).toBeNull();
    expect(screen.getByText('thing-002')).toBeTruthy();
  });
});
