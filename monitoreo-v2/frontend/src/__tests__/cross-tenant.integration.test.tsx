import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ---------------------------------------------------------------------------
// Mocks — vi.mock paths are resolved relative to the *source files* that
// import them, so we use the same specifier the source uses.
// ---------------------------------------------------------------------------

const mockUsePermissions = vi.fn();
vi.mock('../hooks/usePermissions', () => ({
  usePermissions: (...args: unknown[]) => mockUsePermissions(...args),
}));

const mockUseAppStore = vi.fn();
vi.mock('../store/useAppStore', () => ({
  useAppStore: (...args: unknown[]) => mockUseAppStore(...args),
}));

vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockUseOperatorFilter = vi.fn();
vi.mock('../hooks/useOperatorFilter', () => ({
  useOperatorFilter: (...args: unknown[]) => mockUseOperatorFilter(...args),
}));

// Mock hooks that BuildingsPage uses internally
vi.mock('../hooks/queries/useBuildingsQuery', () => ({
  useBuildingsQuery: vi.fn(),
  useCreateBuilding: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateBuilding: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteBuilding: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('../hooks/queries/useTenantsQuery', () => ({
  useTenantsAdminQuery: vi.fn(),
}));

vi.mock('../hooks/useInfiniteScroll', () => ({
  useInfiniteScroll: (items: unknown[]) => ({
    visible: items,
    hasMore: false,
    sentinelRef: { current: null },
    total: items.length,
  }),
}));

// ---------------------------------------------------------------------------
// Imports that depend on mocks (must come after vi.mock calls)
// ---------------------------------------------------------------------------

import { RequireTenant } from '../components/ui/RequireTenant';
import { BuildingsPage } from '../features/buildings/BuildingsPage';
import { useBuildingsQuery } from '../hooks/queries/useBuildingsQuery';
import { useTenantsAdminQuery } from '../hooks/queries/useTenantsQuery';
import type { Building } from '../types/building';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const fakeBuildingsData: Building[] = [
  {
    id: 'b1',
    tenantId: 'tenant-1',
    name: 'Edificio Alpha',
    code: 'ALPHA',
    address: 'Calle 1',
    areaSqm: '5000',
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'b2',
    tenantId: 'tenant-2',
    name: 'Edificio Beta',
    code: 'BETA',
    address: 'Calle 2',
    areaSqm: '3000',
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
];

const fakeTenantsData = [
  { id: 'tenant-1', name: 'PASA', slug: 'pasa', isActive: true, primaryColor: '#3D3BF3', secondaryColor: '#333', sidebarColor: '#1a1a2e', accentColor: '#f59e0b', appTitle: 'PASA', logoUrl: null, faviconUrl: null, timezone: 'America/Santiago', settings: {}, createdAt: '2026-01-01', updatedAt: '2026-01-01' },
  { id: 'tenant-2', name: 'Siemens', slug: 'siemens', isActive: true, primaryColor: '#009999', secondaryColor: '#333', sidebarColor: '#1a1a2e', accentColor: '#f59e0b', appTitle: 'Siemens', logoUrl: null, faviconUrl: null, timezone: 'America/Santiago', settings: {}, createdAt: '2026-01-01', updatedAt: '2026-01-01' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
}

function setAppStoreState(state: Record<string, unknown>) {
  mockUseAppStore.mockImplementation((selector: (s: Record<string, unknown>) => unknown) => {
    if (typeof selector === 'function') return selector(state);
    return undefined;
  });
}

function mockSuccessQuery(data: unknown) {
  return {
    data,
    isLoading: false,
    isPending: false,
    isError: false,
    isSuccess: true,
    error: null,
    refetch: vi.fn(),
    status: 'success' as const,
  };
}

// ---------------------------------------------------------------------------
// Tests — RequireTenant
// ---------------------------------------------------------------------------

describe('Cross-tenant integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('RequireTenant', () => {
    it('shows message when super_admin has no tenant', () => {
      mockUsePermissions.mockReturnValue({ isSuperAdmin: true });
      setAppStoreState({ selectedTenantId: null });

      render(
        <RequireTenant>
          <div>Content</div>
        </RequireTenant>,
      );

      expect(screen.getByText('Selecciona una empresa')).toBeVisible();
      expect(screen.queryByText('Content')).toBeNull();
    });

    it('shows children when super_admin has tenant selected', () => {
      mockUsePermissions.mockReturnValue({ isSuperAdmin: true });
      setAppStoreState({ selectedTenantId: 'tenant-1' });

      render(
        <RequireTenant>
          <div>Content</div>
        </RequireTenant>,
      );

      expect(screen.getByText('Content')).toBeVisible();
    });

    it('shows children for non-super_admin', () => {
      mockUsePermissions.mockReturnValue({ isSuperAdmin: false });
      setAppStoreState({ selectedTenantId: null });

      render(
        <RequireTenant>
          <div>Content</div>
        </RequireTenant>,
      );

      expect(screen.getByText('Content')).toBeVisible();
    });
  });

  // ---------------------------------------------------------------------------
  // Tests — BuildingsPage cross-tenant column
  // ---------------------------------------------------------------------------

  describe('BuildingsPage cross-tenant column', () => {
    beforeEach(() => {
      mockUsePermissions.mockReturnValue({
        has: () => true,
        hasAny: () => true,
        isSuperAdmin: true,
        roleSlug: 'super_admin',
        realRoleSlug: 'super_admin',
        isAdmin: true,
        isImpersonating: false,
        permSet: new Set(['*']),
        bypassAll: true,
      });

      mockUseOperatorFilter.mockReturnValue({
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
      });

      vi.mocked(useBuildingsQuery).mockReturnValue(mockSuccessQuery(fakeBuildingsData) as ReturnType<typeof useBuildingsQuery>);
      vi.mocked(useTenantsAdminQuery).mockReturnValue(mockSuccessQuery(fakeTenantsData) as ReturnType<typeof useTenantsAdminQuery>);
    });

    it('shows Empresa column in cross-tenant mode', async () => {
      setAppStoreState({ selectedTenantId: null });

      render(
        <QueryClientProvider client={makeQueryClient()}>
          <MemoryRouter>
            <BuildingsPage />
          </MemoryRouter>
        </QueryClientProvider>,
      );

      await waitFor(() => {
        expect(screen.getByText('Empresa')).toBeVisible();
      });

      // Tenant names rendered in rows
      expect(screen.getByText('PASA')).toBeVisible();
      expect(screen.getByText('Siemens')).toBeVisible();
    });

    it('hides Empresa column when tenant selected', async () => {
      setAppStoreState({ selectedTenantId: 'tenant-1' });

      render(
        <QueryClientProvider client={makeQueryClient()}>
          <MemoryRouter>
            <BuildingsPage />
          </MemoryRouter>
        </QueryClientProvider>,
      );

      await waitFor(() => {
        expect(screen.getByText('Edificios')).toBeVisible();
      });

      expect(screen.queryByText('Empresa')).toBeNull();
    });
  });
});
