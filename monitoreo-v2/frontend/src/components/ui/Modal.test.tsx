import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal } from './Modal';

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = vi.fn();
  HTMLDialogElement.prototype.close = vi.fn();
});

/** In jsdom, <dialog> is not truly "open" so its role is hidden. */
const getDialog = () => screen.getByRole('dialog', { hidden: true });

describe('Modal', () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    title: 'Test Modal',
    children: <p>Modal content</p>,
  };

  it('renders dialog element', () => {
    render(<Modal {...defaultProps} />);
    expect(getDialog()).toBeInTheDocument();
  });

  it('shows title when open', () => {
    render(<Modal {...defaultProps} />);
    expect(screen.getByText('Test Modal')).toBeInTheDocument();
  });

  it('shows children when open', () => {
    render(<Modal {...defaultProps} />);
    expect(screen.getByText('Modal content')).toBeInTheDocument();
  });

  it('calls showModal when open transitions to true', () => {
    vi.mocked(HTMLDialogElement.prototype.showModal).mockClear();
    const { rerender } = render(<Modal {...defaultProps} open={false} />);
    rerender(<Modal {...defaultProps} open={true} />);
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalled();
  });

  it('calls dialog.close when open transitions to false', () => {
    vi.mocked(HTMLDialogElement.prototype.close).mockClear();
    const { rerender } = render(<Modal {...defaultProps} open={true} />);
    const el = getDialog();
    // jsdom doesn't set .open — simulate it so the component branch executes
    Object.defineProperty(el, 'open', { value: true, writable: true, configurable: true });
    rerender(<Modal {...defaultProps} open={false} />);
    expect(HTMLDialogElement.prototype.close).toHaveBeenCalled();
  });

  it('calls onClose when close button is clicked', async () => {
    const onClose = vi.fn();
    render(<Modal {...defaultProps} onClose={onClose} />);
    const closeBtn = screen.getByRole('button', { hidden: true });
    await userEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose on native dialog close event', () => {
    const onClose = vi.fn();
    render(<Modal {...defaultProps} onClose={onClose} />);
    const dialog = getDialog();
    dialog.dispatchEvent(new Event('close', { bubbles: false }));
    expect(onClose).toHaveBeenCalled();
  });

  it('renders close button with SVG icon', () => {
    render(<Modal {...defaultProps} />);
    const btn = screen.getByRole('button', { hidden: true });
    expect(btn.querySelector('svg')).toBeTruthy();
  });

  it('applies default dialog class when no dialogClassName', () => {
    render(<Modal {...defaultProps} />);
    const dialog = getDialog();
    expect(dialog.className).toContain('max-w-lg');
    expect(dialog.className).toContain('rounded-xl');
  });

  it('applies custom dialogClassName when provided', () => {
    render(<Modal {...defaultProps} dialogClassName="custom-class" />);
    const dialog = getDialog();
    expect(dialog.className).toBe('custom-class');
    expect(dialog.className).not.toContain('max-w-lg');
  });

  it('renders title in h2 element', () => {
    render(<Modal {...defaultProps} title="My Title" />);
    const heading = screen.getByText('My Title');
    expect(heading.tagName).toBe('H2');
  });

  it('renders children inside the body section', () => {
    render(
      <Modal {...defaultProps}>
        <span data-testid="child">Hello</span>
      </Modal>,
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('renders different children content', () => {
    render(
      <Modal {...defaultProps}>
        <form data-testid="form">
          <input type="text" />
        </form>
      </Modal>,
    );
    expect(screen.getByTestId('form')).toBeInTheDocument();
  });
});
