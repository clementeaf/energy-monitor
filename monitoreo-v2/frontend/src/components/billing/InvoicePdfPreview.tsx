import { useEffect, useState } from 'react';
import api from '../../services/api';
import { API_ROUTES } from '../../services/routes';

interface InvoicePdfPreviewProps {
  invoiceId: string;
}

/**
 * Loads invoice HTML via authenticated API (includes x-tenant-id) and renders in iframe.
 * @param props - Invoice id to preview
 * @returns Preview iframe or loading/error state
 */
export function InvoicePdfPreview({ invoiceId }: Readonly<InvoicePdfPreviewProps>) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    setBlobUrl(null);
    setError(null);

    api
      .get<string>(`${API_ROUTES.invoices}/${invoiceId}/pdf`, { responseType: 'text' })
      .then((response) => {
        const html = typeof response.data === 'string' ? response.data : String(response.data);
        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
      })
      .catch(() => {
        setError('No se pudo cargar la factura.');
      });

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [invoiceId]);

  if (error) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-danger">{error}</div>
    );
  }

  if (!blobUrl) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
      </div>
    );
  }

  return (
    <iframe
      src={blobUrl}
      className="h-full w-full rounded border-0"
      title="Previsualizacion factura"
    />
  );
}
