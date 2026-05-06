import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Outlet } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '../store/useAuthStore';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { SessionGate } from '../components/auth/SessionGate';
import type { AuthUser, TenantTheme } from '../types/auth';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('../services/api', () => ({ default: { get: vi.fn(), post: vi.fn() } }));

vi.mock('@azure/msal-react', () => ({
  useMsal: () => ({ inProgress: 'none', accounts: [], instance: {} }),
  MsalProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('@azure/msal-browser', () => ({
  InteractionStatus: { None: 'none' },
  PublicClientApplication: vi.fn(),
}));

vi.mock('@react-oauth/google', () => ({
  GoogleOAuthProvider: ({ children }: { children: React.ReactNode }) => children,
  GoogleLogin: () => <div data-testid="google-login-btn">Google Login</div>,
}));

vi.mock('../hooks/auth/useSessionResolver', () => ({
  useSessionResolver: vi.fn(),
  setSessionFlag: vi.fn(),
  clearSessionFlag: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const mockUser: AuthUser = {
  id: 'u1',
  email: 'admin@test.com',
  displayName: 'Admin',
  role: { id: 'r1', slug: 'super_admin' as const, name: 'Super Admin' },
  permissions: ['dashboard_executive:read', 'admin_buildings:read'],
  buildingIds: [],
  authProvider: 'google' as const,
  lastLoginAt: null,
  privacyAccepted: true,
  requireMfaSetup: false,
  dataProcessingBlocked: false,
};

const mockTenant: TenantTheme = {
  primaryColor: '#3D3BF3',
  secondaryColor: '#333',
  sidebarColor: '#1a1a2e',
  accentColor: '#f59e0b',
  appTitle: 'Test',
  logoUrl: null,
  faviconUrl: null,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

beforeEach(() => {
  useAuthStore.setState({
    user: null,
    tenant: null,
    buildings: [],
    isAuthenticated: false,
    isLoading: false,
    error: null,
  });
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Login → Dashboard integration flow', () => {
  it('unauthenticated user sees login page', () => {
    useAuthStore.setState({ isAuthenticated: false, isLoading: false });

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/login" element={<div>Login Page</div>} />
          <Route path="*" element={<ProtectedRoute />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Login Page')).toBeVisible();
  });

  it('authenticated user passes ProtectedRoute', () => {
    useAuthStore.setState({
      isAuthenticated: true,
      isLoading: false,
      user: mockUser,
      tenant: mockTenant,
      buildings: [],
    });

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route path="/login" element={<div>Login Page</div>} />
            <Route
              path="*"
              element={<ProtectedRoute />}
            >
              <Route index element={<div>Dashboard</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByText('Dashboard')).toBeVisible();
  });

  it('SessionGate shows spinner while loading', () => {
    useAuthStore.setState({ isLoading: true });

    const { container } = render(
      <MemoryRouter>
        <SessionGate>
          <div>Content</div>
        </SessionGate>
      </MemoryRouter>,
    );

    // Spinner has animate-spin class
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeTruthy();

    // Content should NOT be rendered
    expect(screen.queryByText('Content')).toBeNull();
  });

  it('SessionGate shows content after session resolves', () => {
    useAuthStore.setState({ isLoading: false, isAuthenticated: true });

    const { container } = render(
      <MemoryRouter>
        <SessionGate>
          <div>Dashboard Content</div>
        </SessionGate>
      </MemoryRouter>,
    );

    expect(screen.getByText('Dashboard Content')).toBeVisible();

    // No spinner
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeNull();
  });
});
