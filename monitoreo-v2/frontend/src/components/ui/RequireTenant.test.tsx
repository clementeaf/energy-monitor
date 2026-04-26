import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RequireTenant } from './RequireTenant';

vi.mock('../../hooks/usePermissions', () => ({
  usePermissions: vi.fn(),
}));

vi.mock('../../store/useAppStore', () => ({
  useAppStore: vi.fn(),
}));

import { usePermissions } from '../../hooks/usePermissions';
import { useAppStore } from '../../store/useAppStore';

const mockedUsePermissions = vi.mocked(usePermissions);
const mockedUseAppStore = vi.mocked(useAppStore);

const stubPermissions = (isSuperAdmin: boolean) => {
  mockedUsePermissions.mockReturnValue({
    isSuperAdmin,
    effectiveRole: isSuperAdmin ? 'super_admin' : 'site_admin',
    can: () => true,
    canAny: () => true,
  } as ReturnType<typeof usePermissions>);
};

describe('RequireTenant', () => {
  it('renders children when user is not super_admin', () => {
    stubPermissions(false);
    mockedUseAppStore.mockImplementation(() => null);
    render(
      <RequireTenant>
        <p>Page content</p>
      </RequireTenant>,
    );
    expect(screen.getByText('Page content')).toBeInTheDocument();
  });

  it('renders children when super_admin has selected tenant', () => {
    stubPermissions(true);
    mockedUseAppStore.mockImplementation(() => 'tenant-uuid-123');
    render(
      <RequireTenant>
        <p>Page content</p>
      </RequireTenant>,
    );
    expect(screen.getByText('Page content')).toBeInTheDocument();
  });

  it('shows "Selecciona una empresa" when super_admin has no tenant selected', () => {
    stubPermissions(true);
    mockedUseAppStore.mockImplementation(() => null);
    render(
      <RequireTenant>
        <p>Page content</p>
      </RequireTenant>,
    );
    expect(screen.getByText('Selecciona una empresa')).toBeInTheDocument();
    expect(screen.queryByText('Page content')).not.toBeInTheDocument();
  });
});
