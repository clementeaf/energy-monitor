import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BuildingsPage } from '../features/buildings/BuildingsPage';


// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
    create: vi.fn(),
  },
}));

vi.mock('../hooks/usePermissions', () => ({
  usePermissions: () => ({
    has: () => true,
    hasAny: () => true,
    roleSlug: 'corp_admin',
    realRoleSlug: 'corp_admin',
    isAdmin: true,
    isSuperAdmin: false,
    isImpersonating: false,
    permSet: new Set(['*']),
  }),
}));

vi.mock('../hooks/useOperatorFilter', () => ({
  useOperatorFilter: () => ({
    isHolding: true,
    isMultiOp: false,
    isOperadorMode: false,
    isTecnico: false,
    isLocatario: false,
    isFilteredMode: false,
    hasOperator: false,
    hasBuilding: false,
    needsSelection: false,
    selectedOperator: null,
    selectedBuildingId: null,
    operatorMeterIds: null,
    operatorBuildingIds: null,
  }),
}));

vi.mock('../store/useAppStore', () => {
  const state = {
    sidebarOpen: true,
    selectedBuildingId: null,
    viewAsRole: null,
    selectedTenantId: 'tenant-1',
    selectedOperator: null,
    setSidebarOpen: vi.fn(),
    toggleSidebar: vi.fn(),
    setSelectedBuildingId: vi.fn(),
    setViewAsRole: vi.fn(),
    setSelectedTenantId: vi.fn(),
    setSelectedOperator: vi.fn(),
  };
  const useAppStore = (selector: (s: typeof state) => unknown) => selector(state);
  useAppStore.getState = () => state;
  return { useAppStore };
});

vi.mock('../store/useAuthStore', () => {
  const state = {
    user: {
      id: 'u1',
      email: 'test@test.com',
      name: 'Test',
      role: { slug: 'corp_admin', name: 'Corp Admin' },
      permissions: ['*'],
    },
    setUser: vi.fn(),
    clearUser: vi.fn(),
  };
  const useAuthStore = (selector: (s: typeof state) => unknown) => selector(state);
  useAuthStore.getState = () => state;
  return { useAuthStore };
});

// Mock useTenantsAdminQuery (used by BuildingsPage for cross-tenant column)
vi.mock('../hooks/queries/useTenantsQuery', () => ({
  useTenantsAdminQuery: () => ({ data: [], isLoading: false, isError: false }),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

import api from '../services/api';

const mockApi = api as unknown as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  patch: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

const mockBuildings = [
  {
    id: 'b1',
    tenantId: 't1',
    name: 'Mallplaza',
    code: 'MG',
    address: 'Av. Test 123',
    areaSqm: '120000',
    isActive: true,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  {
    id: 'b2',
    tenantId: 't1',
    name: 'Mall Marina',
    code: 'MM',
    address: 'Av. Marina 456',
    areaSqm: '68000',
    isActive: true,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
];

function Wrapper({ children }: Readonly<{ children: React.ReactNode }>) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('BuildingsPage integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders buildings table with data', async () => {
    mockApi.get.mockResolvedValue({ data: mockBuildings });

    render(<BuildingsPage />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText('Mallplaza')).toBeInTheDocument();
    });
    expect(screen.getByText('Mall Marina')).toBeInTheDocument();
  });

  it('shows loading skeleton initially', () => {
    mockApi.get.mockReturnValue(new Promise(() => {})); // never resolves

    render(<BuildingsPage />, { wrapper: Wrapper });

    const pulseElements = document.querySelectorAll('.animate-pulse');
    expect(pulseElements.length).toBeGreaterThan(0);
  });

  it('shows empty state when no buildings', async () => {
    mockApi.get.mockResolvedValue({ data: [] });

    render(<BuildingsPage />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(
        screen.getByText('No hay edificios registrados.'),
      ).toBeInTheDocument();
    });
  });

  it('opens drawer when clicking Nuevo Edificio', async () => {
    mockApi.get.mockResolvedValue({ data: mockBuildings });
    const user = userEvent.setup();

    render(<BuildingsPage />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText('Mallplaza')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Nuevo Edificio'));

    await waitFor(() => {
      // Drawer renders a portal with role="dialog"
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(dialog.querySelector('h2')!.textContent).toBe('Nuevo Edificio');
      expect(dialog.querySelector('form')).not.toBeNull();
    });
  });

  it('shows error state and retry button', async () => {
    mockApi.get.mockRejectedValue(new Error('Network error'));

    render(<BuildingsPage />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
    expect(screen.getByText('Reintentar')).toBeInTheDocument();
  });
});
