import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TableStateBody } from './TableStateBody';

function renderInTable(ui: React.ReactElement) {
  return render(<table>{ui}</table>);
}

describe('TableStateBody', () => {
  it('renders skeleton rows during loading phase', () => {
    const { container } = renderInTable(
      <TableStateBody phase="loading" colSpan={4}>
        <tr><td>data</td></tr>
      </TableStateBody>,
    );
    const pulseElements = container.querySelectorAll('.animate-pulse');
    // default 5 rows × 4 cols = 20 pulse divs
    expect(pulseElements).toHaveLength(20);
  });

  it('renders error message during error phase', () => {
    renderInTable(
      <TableStateBody phase="error" colSpan={3} error={new Error('Network failure')}>
        <tr><td>data</td></tr>
      </TableStateBody>,
    );
    expect(screen.getByText('Network failure')).toBeInTheDocument();
  });

  it('shows retry button during error phase and calls onRetry', async () => {
    const onRetry = vi.fn();
    renderInTable(
      <TableStateBody phase="error" colSpan={3} error={new Error('Oops')} onRetry={onRetry}>
        <tr><td>data</td></tr>
      </TableStateBody>,
    );
    const retryButton = screen.getByRole('button', { name: 'Reintentar' });
    expect(retryButton).toBeInTheDocument();
    await userEvent.click(retryButton);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders empty message during empty phase', () => {
    renderInTable(
      <TableStateBody phase="empty" colSpan={3}>
        <tr><td>data</td></tr>
      </TableStateBody>,
    );
    expect(screen.getByText('No hay datos registrados.')).toBeInTheDocument();
  });

  it('renders children during ready phase', () => {
    renderInTable(
      <TableStateBody phase="ready" colSpan={3}>
        <tr><td>Row content</td></tr>
      </TableStateBody>,
    );
    expect(screen.getByText('Row content')).toBeInTheDocument();
  });

  it('uses custom skeletonWidths', () => {
    const { container } = renderInTable(
      <TableStateBody phase="loading" colSpan={2} skeletonWidths={['w-16', 'w-40']}>
        <tr><td>data</td></tr>
      </TableStateBody>,
    );
    const pulseElements = container.querySelectorAll('.animate-pulse');
    // 5 rows × 2 widths = 10
    expect(pulseElements).toHaveLength(10);
    expect(pulseElements[0].className).toContain('w-16');
    expect(pulseElements[1].className).toContain('w-40');
  });

  it('uses custom emptyMessage', () => {
    renderInTable(
      <TableStateBody phase="empty" colSpan={3} emptyMessage="Sin resultados">
        <tr><td>data</td></tr>
      </TableStateBody>,
    );
    expect(screen.getByText('Sin resultados')).toBeInTheDocument();
  });
});
