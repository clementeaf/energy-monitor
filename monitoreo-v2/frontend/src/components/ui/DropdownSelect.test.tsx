import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DropdownSelect, type DropdownOption } from './DropdownSelect';

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

const options: DropdownOption[] = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' },
  { value: 'c', label: 'Charlie' },
];

const manyOptions: DropdownOption[] = Array.from({ length: 10 }, (_, i) => ({
  value: `opt-${i}`,
  label: `Option ${i}`,
}));

describe('DropdownSelect', () => {
  it('renders placeholder when no value selected', () => {
    render(<DropdownSelect options={options} value="" onChange={vi.fn()} />);
    expect(screen.getByText('Seleccionar...')).toBeInTheDocument();
  });

  it('renders custom placeholder', () => {
    render(<DropdownSelect options={options} value="" onChange={vi.fn()} placeholder="Pick one" />);
    expect(screen.getByText('Pick one')).toBeInTheDocument();
  });

  it('renders selected option label', () => {
    render(<DropdownSelect options={options} value="b" onChange={vi.fn()} />);
    expect(screen.getByText('Beta')).toBeInTheDocument();
  });

  it('opens dropdown on button click', async () => {
    render(<DropdownSelect options={options} value="" onChange={vi.fn()} />);
    await userEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();
  });

  it('closes dropdown on second button click', async () => {
    render(<DropdownSelect options={options} value="" onChange={vi.fn()} />);
    await userEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button'));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('calls onChange when option is clicked', async () => {
    const onChange = vi.fn();
    render(<DropdownSelect options={options} value="" onChange={onChange} />);
    await userEvent.click(screen.getByRole('button'));
    await userEvent.click(screen.getByText('Beta'));
    expect(onChange).toHaveBeenCalledWith('b');
  });

  it('closes dropdown after selecting an option', async () => {
    const onChange = vi.fn();
    render(<DropdownSelect options={options} value="" onChange={onChange} />);
    await userEvent.click(screen.getByRole('button'));
    await userEvent.click(screen.getByText('Alpha'));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('shows search input when options exceed searchThreshold', async () => {
    render(<DropdownSelect options={manyOptions} value="" onChange={vi.fn()} />);
    await userEvent.click(screen.getByRole('button'));
    expect(screen.getByPlaceholderText('Buscar...')).toBeInTheDocument();
  });

  it('does not show search input when options are below threshold', async () => {
    render(<DropdownSelect options={options} value="" onChange={vi.fn()} />);
    await userEvent.click(screen.getByRole('button'));
    expect(screen.queryByPlaceholderText('Buscar...')).not.toBeInTheDocument();
  });

  it('filters options with search', async () => {
    render(<DropdownSelect options={manyOptions} value="" onChange={vi.fn()} />);
    await userEvent.click(screen.getByRole('button'));
    await userEvent.type(screen.getByPlaceholderText('Buscar...'), '3');
    expect(screen.getByText('Option 3')).toBeInTheDocument();
    expect(screen.queryByText('Option 1')).not.toBeInTheDocument();
  });

  it('shows "Sin resultados" when search matches nothing', async () => {
    render(<DropdownSelect options={manyOptions} value="" onChange={vi.fn()} />);
    await userEvent.click(screen.getByRole('button'));
    await userEvent.type(screen.getByPlaceholderText('Buscar...'), 'zzzzz');
    expect(screen.getByText('Sin resultados')).toBeInTheDocument();
  });

  it('navigates with arrow down and selects with enter', async () => {
    const onChange = vi.fn();
    render(<DropdownSelect options={options} value="" onChange={onChange} />);
    const btn = screen.getByRole('button');
    // Open with ArrowDown
    btn.focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    // Move down to first item
    await userEvent.keyboard('{ArrowDown}');
    // Select with Enter
    await userEvent.keyboard('{Enter}');
    expect(onChange).toHaveBeenCalledWith('a');
  });

  it('closes on Escape key', async () => {
    render(<DropdownSelect options={options} value="" onChange={vi.fn()} />);
    await userEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('is disabled when disabled prop is true', () => {
    render(<DropdownSelect options={options} value="" onChange={vi.fn()} disabled />);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('does not open when disabled', async () => {
    render(<DropdownSelect options={options} value="" onChange={vi.fn()} disabled />);
    await userEvent.click(screen.getByRole('button'));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('applies extra className', () => {
    const { container } = render(
      <DropdownSelect options={options} value="" onChange={vi.fn()} className="w-64" />,
    );
    expect(container.firstElementChild?.className).toContain('w-64');
  });

  it('marks selected option with aria-selected', async () => {
    render(<DropdownSelect options={options} value="b" onChange={vi.fn()} />);
    await userEvent.click(screen.getByRole('button'));
    const selectedOpt = screen.getByRole('option', { selected: true });
    expect(selectedOpt).toHaveTextContent('Beta');
  });
});
