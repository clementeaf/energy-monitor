import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PdfPreviewModal } from './PdfPreviewModal';

vi.mock('../../services/api', () => ({
  default: { get: vi.fn(() => Promise.resolve({ data: new Blob() })) },
}));

describe('PdfPreviewModal', () => {
  it('does not render when pdfPath is null', () => {
    const { container } = render(
      <PdfPreviewModal pdfPath={null} title="Factura" onClose={vi.fn()} />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders title when pdfPath provided', () => {
    render(
      <PdfPreviewModal pdfPath="/invoices/1/pdf" title="Factura #1" onClose={vi.fn()} />,
    );
    expect(screen.getByText('Factura #1')).toBeInTheDocument();
  });

  it('shows close button', () => {
    render(
      <PdfPreviewModal pdfPath="/invoices/1/pdf" title="Factura" onClose={vi.fn()} />,
    );
    expect(screen.getByRole('button', { name: 'Cerrar' })).toBeInTheDocument();
  });

  it('calls onClose when close button clicked', async () => {
    const onClose = vi.fn();
    render(
      <PdfPreviewModal pdfPath="/invoices/1/pdf" title="Factura" onClose={onClose} />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
