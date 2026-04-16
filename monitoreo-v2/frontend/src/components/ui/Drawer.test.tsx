import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Drawer } from './Drawer';

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = vi.fn();
  HTMLDialogElement.prototype.close = vi.fn();
});

/** In jsdom, <dialog> is not truly "open" so its role is hidden. */
const getDialog = () => screen.getByRole('dialog', { hidden: true });

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
    const { container } = render(<Drawer {...defaultProps} />);
    // Footer has border-t class — only header has border-b
    const borderTDivs = container.querySelectorAll('.border-t');
    expect(borderTDivs.length).toBe(0);
  });

  it('calls onClose when close button is clicked', async () => {
    const onClose = vi.fn();
    render(<Drawer {...defaultProps} onClose={onClose} />);
    const closeBtn = screen.getByRole('button', { hidden: true });
    await userEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls showModal when open transitions to true', () => {
    vi.mocked(HTMLDialogElement.prototype.showModal).mockClear();
    const { rerender } = render(<Drawer {...defaultProps} open={false} />);
    rerender(<Drawer {...defaultProps} open={true} />);
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalled();
  });

  it('applies right side classes by default', () => {
    render(<Drawer {...defaultProps} />);
    const dialog = getDialog();
    expect(dialog.className).toContain('ml-auto');
    expect(dialog.className).toContain('rounded-l-lg');
  });

  it('applies left side classes when side="left"', () => {
    render(<Drawer {...defaultProps} side="left" />);
    const dialog = getDialog();
    expect(dialog.className).toContain('mr-auto');
    expect(dialog.className).toContain('rounded-r-lg');
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

  it('applies custom dialogClassName when provided', () => {
    render(<Drawer {...defaultProps} dialogClassName="my-custom-class" />);
    const dialog = getDialog();
    expect(dialog.className).toBe('my-custom-class');
    expect(dialog.className).not.toContain('w-96');
  });

  it('calls onClose on native dialog close event', () => {
    const onClose = vi.fn();
    render(<Drawer {...defaultProps} onClose={onClose} />);
    const dialog = getDialog();
    dialog.dispatchEvent(new Event('close', { bubbles: false }));
    expect(onClose).toHaveBeenCalled();
  });
});
