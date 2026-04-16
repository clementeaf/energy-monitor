import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Th, Td, StatusBadge, ActionBtn } from './TablePrimitives';

describe('Th', () => {
  it('renders children in th element', () => {
    render(<table><thead><tr><Th>Name</Th></tr></thead></table>);
    expect(screen.getByText('Name').tagName).toBe('TH');
  });

  it('applies custom className', () => {
    render(<table><thead><tr><Th className="w-40">Col</Th></tr></thead></table>);
    expect(screen.getByText('Col').className).toContain('w-40');
  });
});

describe('Td', () => {
  it('renders children in td element', () => {
    render(<table><tbody><tr><Td>Value</Td></tr></tbody></table>);
    expect(screen.getByText('Value').tagName).toBe('TD');
  });

  it('applies title attribute', () => {
    render(<table><tbody><tr><Td title="Full text">Trunc...</Td></tr></tbody></table>);
    expect(screen.getByText('Trunc...').getAttribute('title')).toBe('Full text');
  });
});

describe('StatusBadge', () => {
  it('shows Activo for active=true', () => {
    render(<StatusBadge active={true} />);
    expect(screen.getByText('Activo')).toBeInTheDocument();
    expect(screen.getByText('Activo').className).toContain('bg-green-100');
  });

  it('shows Inactivo for active=false', () => {
    render(<StatusBadge active={false} />);
    expect(screen.getByText('Inactivo')).toBeInTheDocument();
    expect(screen.getByText('Inactivo').className).toContain('bg-gray-100');
  });
});

describe('ActionBtn', () => {
  it('renders label and calls onClick', async () => {
    const onClick = vi.fn();
    render(<ActionBtn label="Edit" onClick={onClick} />);
    await userEvent.click(screen.getByText('Edit'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('applies danger variant styling', () => {
    render(<ActionBtn label="Delete" onClick={() => {}} variant="danger" />);
    expect(screen.getByText('Delete').className).toContain('text-red-600');
  });

  it('applies default variant styling', () => {
    render(<ActionBtn label="View" onClick={() => {}} />);
    expect(screen.getByText('View').className).toContain('text-gray-600');
  });
});
