import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Drawer } from './Drawer';

const getDialog = () => screen.getByRole('dialog');

describe('Drawer', () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    title: 'Test Drawer',
    children: <p>Drawer body</p>,
  };

  it('renders dialog element when open', () => {
    render(<Drawer {...defaultProps} />);
    expect(getDialog()).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<Drawer {...defaultProps} open={false} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows title', () => {
    render(<Drawer {...defaultProps} />);
    expect(screen.getByText('Test Drawer')).toBeInTheDocument();
  });

  it('renders title in h2 element', () => {
    render(<Drawer {...defaultProps} />);
    const heading = screen.getByText('Test Drawer');
    expect(heading.tagName).toBe('H2');
  });

  it('shows children content', () => {
    render(<Drawer {...defaultProps} />);
    expect(screen.getByText('Drawer body')).toBeInTheDocument();
  });

  it('shows footer when provided', () => {
    render(
      <Drawer {...defaultProps} footer={<button>Save</button>} />,
    );
    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  it('does not render footer section when footer is not provided', () => {
    render(<Drawer {...defaultProps} />);
    const dialog = getDialog();
    const borderTDivs = dialog.querySelectorAll('.border-t');
    expect(borderTDivs.length).toBe(0);
  });

  it('calls onClose when close button is clicked', async () => {
    const onClose = vi.fn();
    render(<Drawer {...defaultProps} onClose={onClose} />);
    const closeBtn = screen.getByRole('button');
    await userEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('applies right side classes by default', () => {
    render(<Drawer {...defaultProps} />);
    const dialog = getDialog();
    expect(dialog.className).toContain('right-0');
    expect(dialog.className).toContain('rounded-l-xl');
  });

  it('applies left side classes when side="left"', () => {
    render(<Drawer {...defaultProps} side="left" />);
    const dialog = getDialog();
    expect(dialog.className).toContain('left-0');
    expect(dialog.className).toContain('rounded-r-xl');
  });

  it('applies md size by default (w-96)', () => {
    render(<Drawer {...defaultProps} />);
    const dialog = getDialog();
    expect(dialog.className).toContain('w-96');
  });

  it('applies sm size (w-72)', () => {
    render(<Drawer {...defaultProps} size="sm" />);
    const dialog = getDialog();
    expect(dialog.className).toContain('w-72');
  });

  it('applies lg size (w-[32rem])', () => {
    render(<Drawer {...defaultProps} size="lg" />);
    const dialog = getDialog();
    expect(dialog.className).toContain('w-[32rem]');
  });

  it('applies xl size (w-[40rem])', () => {
    render(<Drawer {...defaultProps} size="xl" />);
    const dialog = getDialog();
    expect(dialog.className).toContain('w-[40rem]');
  });

  it('has aria-modal attribute', () => {
    render(<Drawer {...defaultProps} />);
    expect(getDialog()).toHaveAttribute('aria-modal', 'true');
  });
});
