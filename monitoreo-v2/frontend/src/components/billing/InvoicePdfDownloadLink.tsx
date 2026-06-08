import type { ReactNode } from 'react';
import { useInvoicePdfUrl } from '../../hooks/useInvoicePdfUrl';

interface InvoicePdfDownloadLinkProps {
  invoiceId: string;
  className?: string;
  title?: string;
  children: ReactNode;
}

/**
 * Download link for invoice PDF with tenant scoping for super_admin.
 * @param props - Invoice id and anchor attributes
 * @returns External link to invoice PDF endpoint
 */
export function InvoicePdfDownloadLink({
  invoiceId,
  className,
  title,
  children,
}: Readonly<InvoicePdfDownloadLinkProps>) {
  const pdfUrl = useInvoicePdfUrl(invoiceId);

  return (
    <a
      href={pdfUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      title={title}
    >
      {children}
    </a>
  );
}
