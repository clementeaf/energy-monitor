import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CheckboxList } from './CheckboxList';

const OPTIONS = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' },
  { value: 'c', label: 'Gamma' },
];

describe('CheckboxList', () => {
  it('renders all options', () => {
    render(<CheckboxList options={OPTIONS} selected={[]} onChange={() => {}} />);
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
    expect(screen.getByText('Gamma')).toBeInTheDocument();
  });

  it('shows checked state for selected items', () => {
    const { container } = render(<CheckboxList options={OPTIONS} selected={['b']} onChange={() => {}} />);
    const svgs = container.querySelectorAll('svg');
    expect(svgs).toHaveLength(1);
  });

  it('calls onChange with added item when clicking unselected', async () => {
    const onChange = vi.fn();
    render(<CheckboxList options={OPTIONS} selected={['a']} onChange={onChange} />);
    await userEvent.click(screen.getByText('Beta'));
    expect(onChange).toHaveBeenCalledWith(['a', 'b']);
  });

  it('calls onChange with removed item when clicking selected', async () => {
    const onChange = vi.fn();
    render(<CheckboxList options={OPTIONS} selected={['a', 'b']} onChange={onChange} />);
    await userEvent.click(screen.getByText('Alpha'));
    expect(onChange).toHaveBeenCalledWith(['b']);
  });

  it('shows empty message when no options', () => {
    render(<CheckboxList options={[]} selected={[]} onChange={() => {}} />);
    expect(screen.getByText('Sin opciones disponibles')).toBeInTheDocument();
  });
});
