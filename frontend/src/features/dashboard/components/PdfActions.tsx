import { useState } from 'react';
import { createPortal } from 'react-dom';
import { fetchBillingPdf } from '../../../services/endpoints';
import type { BillingDocumentDetail } from '../../../types';

export function PdfActions({ row }: { row: BillingDocumentDetail }) {
  const [loading, setLoading] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  async function getBlob() {
    return fetchBillingPdf(row.operatorName, row.buildingName, row.month);
  }

  async function handleDownload() {
    setLoading(true);
    try {
      const blob = await getBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${row.operatorName}-${row.month.slice(0, 7)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  }

  async function handlePreview() {
    setPreviewing(true);
    try {
      const raw = await getBlob();
      const blob = raw.type === 'application/pdf' ? raw : new Blob([raw], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
    } catch {
      // silent fail
    } finally {
      setPreviewing(false);
    }
  }

  function closePreview() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  }

  const spinner = (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );

  return (
    <>
      <div className="flex items-center justify-center gap-1.5">
        <button
          onClick={handleDownload}
          disabled={loading}
          className="text-pa-blue hover:text-pa-navy disabled:opacity-40 transition-colors"
          title="Descargar PDF"
        >
          {loading ? spinner : (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V3" />
            </svg>
          )}
        </button>
        <button
          onClick={handlePreview}
          disabled={previewing}
          className="text-pa-blue hover:text-pa-navy disabled:opacity-40 transition-colors"
          title="Previsualizar PDF"
        >
          {previewing ? spinner : (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          )}
        </button>
      </div>

      {previewUrl && createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={closePreview} aria-hidden="true" />
          <div className="relative z-10 flex h-[85vh] w-[70vw] flex-col rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-pa-border px-5 py-3">
              <span className="text-sm font-semibold text-pa-navy">{row.operatorName} — {row.month.slice(0, 7)}</span>
              <button onClick={closePreview} className="rounded p-1 text-muted hover:bg-gray-100 hover:text-text transition-colors" aria-label="Cerrar">
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            <iframe src={previewUrl} className="flex-1 rounded-b-xl" title="Previsualización PDF" />
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
