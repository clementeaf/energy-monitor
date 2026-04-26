import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataWidget } from './DataWidget';

describe('DataWidget', () => {
  it('renders children when phase is ready', () => {
    render(
      <DataWidget phase="ready" error={null}>
        <p>Widget content</p>
      </DataWidget>,
    );
    expect(screen.getByText('Widget content')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(
      <DataWidget phase="loading" error={null}>
        <p>Widget content</p>
      </DataWidget>,
    );
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByText('Widget content')).not.toBeInTheDocument();
  });

  it('shows error state with retry', async () => {
    const onRetry = vi.fn();
    render(
      <DataWidget phase="error" error={new Error('oops')} onRetry={onRetry}>
        <p>Widget content</p>
      </DataWidget>,
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Reintentar')).toBeInTheDocument();
    await userEvent.click(screen.getByText('Reintentar'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('shows empty state', () => {
    render(
      <DataWidget phase="empty" error={null} emptyTitle="Vacio" emptyDescription="No hay datos.">
        <p>Widget content</p>
      </DataWidget>,
    );
    expect(screen.getByText('Vacio')).toBeInTheDocument();
    expect(screen.getByText('No hay datos.')).toBeInTheDocument();
    expect(screen.queryByText('Widget content')).not.toBeInTheDocument();
  });
});
