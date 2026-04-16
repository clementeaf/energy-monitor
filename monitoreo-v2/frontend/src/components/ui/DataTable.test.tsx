import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataTable, type Column } from './DataTable';

interface TestRow {
  id: string;
  name: string;
  age: number;
}

const testData: TestRow[] = [
  { id: '1', name: 'Alice', age: 30 },
  { id: '2', name: 'Bob', age: 25 },
  { id: '3', name: 'Charlie', age: 35 },
  { id: '4', name: 'Diana', age: 28 },
  { id: '5', name: 'Eve', age: 22 },
];

const columns: Column<TestRow>[] = [
  { key: 'name', header: 'Nombre', render: (r) => r.name, sortable: true, sortValue: (r) => r.name },
  { key: 'age', header: 'Edad', render: (r) => r.age, sortable: true, sortValue: (r) => r.age, align: 'right' },
];

const rowKey = (r: TestRow) => r.id;

describe('DataTable', () => {
  it('renders column headers', () => {
    render(<DataTable columns={columns} data={testData} rowKey={rowKey} />);
    expect(screen.getByText('Nombre')).toBeInTheDocument();
    expect(screen.getByText('Edad')).toBeInTheDocument();
  });

  it('renders all rows', () => {
    render(<DataTable columns={columns} data={testData} rowKey={rowKey} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();
    expect(screen.getByText('Diana')).toBeInTheDocument();
    expect(screen.getByText('Eve')).toBeInTheDocument();
  });

  it('shows empty message when data is empty', () => {
    render(<DataTable columns={columns} data={[]} rowKey={rowKey} />);
    expect(screen.getByText('Sin datos')).toBeInTheDocument();
  });

  it('shows custom empty message', () => {
    render(<DataTable columns={columns} data={[]} rowKey={rowKey} emptyMessage="No hay registros" />);
    expect(screen.getByText('No hay registros')).toBeInTheDocument();
  });

  it('sorts ascending on first header click', async () => {
    render(<DataTable columns={columns} data={testData} rowKey={rowKey} />);
    await userEvent.click(screen.getByText('Nombre'));
    const rows = screen.getAllByRole('row');
    // row 0 = header, rows 1-5 = data
    expect(within(rows[1]).getByText('Alice')).toBeInTheDocument();
    expect(within(rows[2]).getByText('Bob')).toBeInTheDocument();
    expect(within(rows[5]).getByText('Eve')).toBeInTheDocument();
  });

  it('sorts descending on second header click', async () => {
    render(<DataTable columns={columns} data={testData} rowKey={rowKey} />);
    await userEvent.click(screen.getByText('Nombre'));
    await userEvent.click(screen.getByText('Nombre'));
    const rows = screen.getAllByRole('row');
    expect(within(rows[1]).getByText('Eve')).toBeInTheDocument();
    expect(within(rows[5]).getByText('Alice')).toBeInTheDocument();
  });

  it('sorts numerically by age', async () => {
    render(<DataTable columns={columns} data={testData} rowKey={rowKey} />);
    await userEvent.click(screen.getByText('Edad'));
    const rows = screen.getAllByRole('row');
    expect(within(rows[1]).getByText('Eve')).toBeInTheDocument(); // age 22
    expect(within(rows[5]).getByText('Charlie')).toBeInTheDocument(); // age 35
  });

  it('renders pagination when pageSize is set', () => {
    render(<DataTable columns={columns} data={testData} rowKey={rowKey} pageSize={2} />);
    expect(screen.getByText('Anterior')).toBeInTheDocument();
    expect(screen.getByText('Siguiente')).toBeInTheDocument();
    expect(screen.getByText('1 / 3')).toBeInTheDocument();
    expect(screen.getByText('5 registros')).toBeInTheDocument();
  });

  it('navigates to next page', async () => {
    render(<DataTable columns={columns} data={testData} rowKey={rowKey} pageSize={2} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.queryByText('Charlie')).not.toBeInTheDocument();

    await userEvent.click(screen.getByText('Siguiente'));
    expect(screen.getByText('2 / 3')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();
    expect(screen.queryByText('Alice')).not.toBeInTheDocument();
  });

  it('navigates to previous page', async () => {
    render(<DataTable columns={columns} data={testData} rowKey={rowKey} pageSize={2} />);
    await userEvent.click(screen.getByText('Siguiente'));
    await userEvent.click(screen.getByText('Anterior'));
    expect(screen.getByText('1 / 3')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('disables Anterior button on first page', () => {
    render(<DataTable columns={columns} data={testData} rowKey={rowKey} pageSize={2} />);
    expect(screen.getByText('Anterior')).toBeDisabled();
  });

  it('disables Siguiente button on last page', async () => {
    render(<DataTable columns={columns} data={testData} rowKey={rowKey} pageSize={2} />);
    await userEvent.click(screen.getByText('Siguiente'));
    await userEvent.click(screen.getByText('Siguiente'));
    expect(screen.getByText('3 / 3')).toBeInTheDocument();
    expect(screen.getByText('Siguiente')).toBeDisabled();
  });

  it('does not show pagination when pageSize is 0', () => {
    render(<DataTable columns={columns} data={testData} rowKey={rowKey} pageSize={0} />);
    expect(screen.queryByText('Anterior')).not.toBeInTheDocument();
    expect(screen.queryByText('Siguiente')).not.toBeInTheDocument();
  });

  it('applies compact mode class', () => {
    const { container } = render(
      <DataTable columns={columns} data={testData} rowKey={rowKey} compact />,
    );
    const cells = container.querySelectorAll('td');
    expect(cells[0].className).toContain('px-3');
    expect(cells[0].className).toContain('py-1.5');
  });

  it('applies normal padding by default', () => {
    const { container } = render(
      <DataTable columns={columns} data={testData} rowKey={rowKey} />,
    );
    const cells = container.querySelectorAll('td');
    expect(cells[0].className).toContain('px-4');
    expect(cells[0].className).toContain('py-3');
  });

  it('calls onRowClick when row is clicked', async () => {
    const onRowClick = vi.fn();
    render(<DataTable columns={columns} data={testData} rowKey={rowKey} onRowClick={onRowClick} />);
    await userEvent.click(screen.getByText('Alice'));
    expect(onRowClick).toHaveBeenCalledWith(testData[0]);
  });

  it('applies right alignment class for right-aligned column', () => {
    const { container } = render(
      <DataTable columns={columns} data={testData} rowKey={rowKey} />,
    );
    const headers = container.querySelectorAll('th');
    // Second column has align: 'right'
    expect(headers[1].className).toContain('text-right');
  });

  it('applies extra className to wrapper', () => {
    const { container } = render(
      <DataTable columns={columns} data={testData} rowKey={rowKey} className="mt-4" />,
    );
    expect(container.firstElementChild?.className).toContain('mt-4');
  });
});
