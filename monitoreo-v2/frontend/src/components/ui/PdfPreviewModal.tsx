import { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import api from '../../services/api';

interface PdfPreviewModalProps {
  /** API path to fetch the PDF (e.g. "/invoices/:id/pdf"). null = closed. */
  pdfPath: string | null;
  title: string;
  onClose: () => void;
}

/**
 * Fetches a PDF from the API and renders it in a full-screen iframe overlay.
 * Revokes the blob URL on close.
 */
export function PdfPreviewModal({ pdfPath, title, onClose }: Readonly<PdfPreviewModalProps>) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPdf = useCallback(async (path: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(path, { responseType: 'blob' });
      const blob = res.data instanceof Blob
        ? res.data
        : new Blob([res.data], { type: 'application/pdf' });
      setBlobUrl(URL.createObjectURL(blob));
    } catch {
      setError('No se pudo cargar el PDF.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (pdfPath) {
      fetchPdf(pdfPath);
    }
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfPath]);

  const handleClose = () => {
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    setBlobUrl(null);
    onClose();
  };

  if (!pdfPath) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} aria-hidden="true" />

      {/* Modal */}
      <div className="relative z-10 flex h-[85vh] w-[70vw] flex-col rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
          <span className="text-sm font-semibold text-gray-900">{title}</span>
          <button
            type="button"
            onClick={handleClose}
            className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            aria-label="Cerrar"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Body */}
        {loading && (
          <div className="flex flex-1 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-primary,#3a5b1e)] border-t-transparent" />
          </div>
        )}
        {error && (
          <div className="flex flex-1 items-center justify-center text-sm text-red-600">{error}</div>
        )}
        {blobUrl && !loading && (
          <iframe src={blobUrl} className="flex-1 rounded-b-xl" title="Previsualizacion PDF" />
        )}
      </div>
    </div>,
    document.body,
  );
}
