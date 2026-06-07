import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserImportTab } from './UserImportTab';
import {
  useValidateUserImport,
  useCommitUserImport,
  useUserImportPreviewQuery,
  useUserImportJobsQuery,
} from '../../../hooks/queries/useUserImportQuery';

vi.mock('../../../hooks/queries/useUserImportQuery', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../hooks/queries/useUserImportQuery')>();
  return {
    ...actual,
    downloadUserImportTemplate: vi.fn(),
    useUserImportJobsQuery: vi.fn(),
    useUserImportPreviewQuery: vi.fn(),
    useValidateUserImport: vi.fn(),
    useCommitUserImport: vi.fn(),
  };
});

function renderTab(onViewUsers = vi.fn()): void {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <UserImportTab onViewUsers={onViewUsers} />
    </QueryClientProvider>,
  );
}

describe('UserImportTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useUserImportJobsQuery).mockReturnValue({
      data: { data: [], total: 0 },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as ReturnType<typeof useUserImportJobsQuery>);
    vi.mocked(useUserImportPreviewQuery).mockReturnValue({
      data: { data: [], total: 0, limit: 25, offset: 0 },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as ReturnType<typeof useUserImportPreviewQuery>);
    vi.mocked(useCommitUserImport).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useCommitUserImport>);
  });

  it('renders upload step with template link and dropzone', () => {
    vi.mocked(useValidateUserImport).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as ReturnType<typeof useValidateUserImport>);

    renderTab();
    expect(screen.getByText(/Descargar plantilla CSV/i)).toBeInTheDocument();
    expect(screen.getByText(/Arrastre un archivo CSV/i)).toBeInTheDocument();
  });

  it('calls validate mutation when CSV file is uploaded', async () => {
    const mutate = vi.fn();
    vi.mocked(useValidateUserImport).mockReturnValue({
      mutate,
      isPending: false,
    } as ReturnType<typeof useValidateUserImport>);

    renderTab();
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['email,auth_provider,role_slug'], 'users.csv', { type: 'text/csv' });
    await userEvent.upload(input, file);

    expect(mutate).toHaveBeenCalledWith(file, expect.objectContaining({ onSuccess: expect.any(Function) }));
  });

  it('shows preview and disables commit until age checkbox is checked', async () => {
    vi.mocked(useValidateUserImport).mockReturnValue({
      mutate: vi.fn((_file, options) => {
        options?.onSuccess?.({
          jobId: 'job-1',
          summary: { totalRows: 1, validRows: 1, errorRows: 0, duplicateRows: 0 },
        });
      }),
      isPending: false,
    } as ReturnType<typeof useValidateUserImport>);

    vi.mocked(useUserImportPreviewQuery).mockReturnValue({
      data: {
        data: [{
          id: 'r1',
          rowNumber: 2,
          email: 'a@test.com',
          displayName: null,
          authProvider: 'google',
          roleSlug: 'operator',
          buildingCodesRaw: null,
          phone: null,
          status: 'valid',
          errorCodes: [],
          resolvedRoleId: 'role-1',
          resolvedBuildingIds: [],
          createdUserId: null,
        }],
        total: 1,
        limit: 25,
        offset: 0,
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as ReturnType<typeof useUserImportPreviewQuery>);

    renderTab();
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(input, new File(['x'], 'users.csv', { type: 'text/csv' }));

    await waitFor(() => {
      expect(screen.getByText(/Crear 1 usuario/i)).toBeInTheDocument();
    });

    const commitBtn = screen.getByRole('button', { name: /Crear 1 usuario/i });
    expect(commitBtn).toBeDisabled();

    await userEvent.click(screen.getByRole('checkbox'));
    expect(commitBtn).not.toBeDisabled();
  });

  it('shows success summary after commit', async () => {
    vi.mocked(useValidateUserImport).mockReturnValue({
      mutate: vi.fn((_file, options) => {
        options?.onSuccess?.({
          jobId: 'job-1',
          summary: { totalRows: 2, validRows: 2, errorRows: 0, duplicateRows: 0 },
        });
      }),
      isPending: false,
    } as ReturnType<typeof useValidateUserImport>);

    vi.mocked(useCommitUserImport).mockReturnValue({
      mutate: vi.fn((_args, options) => {
        options?.onSuccess?.({ jobId: 'job-1', created: 2, skipped: 0, failed: 0 });
      }),
      isPending: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useCommitUserImport>);

    renderTab();
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(input, new File(['x'], 'users.csv', { type: 'text/csv' }));

    await waitFor(() => {
      expect(screen.getByRole('checkbox')).toBeInTheDocument();
    });
    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.click(screen.getByRole('button', { name: /Crear 2 usuarios/i }));

    await waitFor(() => {
      expect(screen.getByText(/Importación completada/i)).toBeInTheDocument();
    });
  });
});
