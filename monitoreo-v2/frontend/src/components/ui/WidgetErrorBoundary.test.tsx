import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WidgetErrorBoundary } from './WidgetErrorBoundary';

// Suppress console.error from ErrorBoundary.componentDidCatch during tests
const originalConsoleError = console.error;
beforeEach(() => {
  console.error = vi.fn();
});
afterEach(() => {
  console.error = originalConsoleError;
});

function ProblemChild(): JSX.Element {
  throw new Error('Render boom');
}

describe('WidgetErrorBoundary', () => {
  it('renders children when no error', () => {
    render(
      <WidgetErrorBoundary>
        <p>All good</p>
      </WidgetErrorBoundary>,
    );
    expect(screen.getByText('All good')).toBeInTheDocument();
  });

  it('renders fallback when child throws', () => {
    render(
      <WidgetErrorBoundary>
        <ProblemChild />
      </WidgetErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Render boom')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
  });
});
