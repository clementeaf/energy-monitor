import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmDialog } from './ConfirmDialog';

// jsdom does not implement HTMLDialogElement.showModal / .close
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.removeAttribute('open');
  });
});

const defaults = {
  open: true,
  onClose: vi.fn(),
  onConfirm: vi.fn(),
  title: 'Confirmar eliminación',
  message: '¿Estás seguro de eliminar este registro?',
};

describe('ConfirmDialog', () => {
  it('renders title and message when open', () => {
    render(<ConfirmDialog {...defaults} />);
    expect(screen.getByText(defaults.title)).toBeInTheDocument();
    expect(screen.getByText(defaults.message)).toBeInTheDocument();
  });

  it('does not render content when closed (open=false)', () => {
    render(<ConfirmDialog {...defaults} open={false} />);
    // Dialog exists but showModal was not called, so content is hidden
    expect(screen.queryByText(defaults.message)).not.toBeVisible();
  });

  it('calls onConfirm when confirm button clicked', async () => {
    const onConfirm = vi.fn();
    render(<ConfirmDialog {...defaults} onConfirm={onConfirm} />);
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when cancel button clicked', async () => {
    const onClose = vi.fn();
    render(<ConfirmDialog {...defaults} onClose={onClose} />);
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows confirm button with custom label', () => {
    render(<ConfirmDialog {...defaults} confirmLabel="Sí, eliminar" />);
    expect(screen.getByRole('button', { name: 'Sí, eliminar' })).toBeInTheDocument();
  });

  it('shows default "Eliminar" label', () => {
    render(<ConfirmDialog {...defaults} />);
    expect(screen.getByRole('button', { name: 'Eliminar' })).toBeInTheDocument();
  });

  it('disables confirm button when isPending', () => {
    render(<ConfirmDialog {...defaults} isPending />);
    expect(screen.getByRole('button', { name: 'Eliminar' })).toBeDisabled();
  });
});
