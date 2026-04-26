import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChartSkeleton } from './ChartSkeleton';

describe('ChartSkeleton', () => {
  it('renders with default height (280)', () => {
    const { container } = render(<ChartSkeleton />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.height).toBe('280px');
  });

  it('renders with custom height', () => {
    const { container } = render(<ChartSkeleton height={400} />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.height).toBe('400px');
  });

  it('contains SVG element', () => {
    const { container } = render(<ChartSkeleton />);
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('contains Y-axis labels (120, 90, 60, 30, 0)', () => {
    render(<ChartSkeleton />);
    for (const label of ['120', '90', '60', '30', '0']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it('contains X-axis time labels', () => {
    render(<ChartSkeleton />);
    for (const label of ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });
});
