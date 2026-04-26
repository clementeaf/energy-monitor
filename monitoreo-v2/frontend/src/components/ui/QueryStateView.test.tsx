import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryStateView } from './QueryStateView';

describe('QueryStateView', () => {
  it('renders children when phase is ready', () => {
    render(
      <QueryStateView phase="ready" error={null}>
        <p>Content</p>
      </QueryStateView>,
    );
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('shows loading spinner during loading phase', () => {
    render(
      <QueryStateView phase="loading" error={null}>
        <p>Content</p>
      </QueryStateView>,
    );
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('Cargando datos…')).toBeInTheDocument();
    expect(screen.queryByText('Content')).not.toBeInTheDocument();
  });

  it('shows error message and retry button during error phase', () => {
    render(
      <QueryStateView phase="error" error={new Error('boom')}>
        <p>Content</p>
      </QueryStateView>,
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Reintentar')).toBeInTheDocument();
    expect(screen.queryByText('Content')).not.toBeInTheDocument();
  });

  it('calls onRetry when retry clicked', async () => {
    const onRetry = vi.fn();
    render(
      <QueryStateView phase="error" error={new Error('fail')} onRetry={onRetry}>
        <p>Content</p>
      </QueryStateView>,
    );
    await userEvent.click(screen.getByText('Reintentar'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('shows empty title and description during empty phase', () => {
    render(
      <QueryStateView phase="empty" error={null}>
        <p>Content</p>
      </QueryStateView>,
    );
    expect(screen.getByText('Sin datos')).toBeInTheDocument();
    expect(screen.getByText('No hay información para mostrar en este momento.')).toBeInTheDocument();
    expect(screen.queryByText('Content')).not.toBeInTheDocument();
  });

  it('uses custom emptyTitle and emptyDescription', () => {
    render(
      <QueryStateView
        phase="empty"
        error={null}
        emptyTitle="Nada aqui"
        emptyDescription="Intenta otro filtro."
      >
        <p>Content</p>
      </QueryStateView>,
    );
    expect(screen.getByText('Nada aqui')).toBeInTheDocument();
    expect(screen.getByText('Intenta otro filtro.')).toBeInTheDocument();
  });

  it('shows "Actualizando" indicator when isFetching is true and phase is ready', () => {
    render(
      <QueryStateView phase="ready" error={null} isFetching>
        <p>Content</p>
      </QueryStateView>,
    );
    expect(screen.getByText('Actualizando')).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
  });
});
