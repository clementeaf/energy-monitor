import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WidgetRenderErrorFallback } from './widgetErrors';

describe('WidgetRenderErrorFallback', () => {
  it('renders error message', () => {
    render(<WidgetRenderErrorFallback error={new Error('Render failed')} reset={() => {}} />);
    expect(screen.getByText('Render failed')).toBeInTheDocument();
  });

  it('renders heading text', () => {
    render(<WidgetRenderErrorFallback error={new Error('x')} reset={() => {}} />);
    expect(screen.getByText('Error al renderizar este bloque')).toBeInTheDocument();
  });

  it('has alert role', () => {
    render(<WidgetRenderErrorFallback error={new Error('x')} reset={() => {}} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('calls reset when Reintentar clicked', async () => {
    const reset = vi.fn();
    render(<WidgetRenderErrorFallback error={new Error('x')} reset={reset} />);
    await userEvent.click(screen.getByText('Reintentar'));
    expect(reset).toHaveBeenCalledTimes(1);
  });
});
