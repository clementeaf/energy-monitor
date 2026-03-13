import { useState, useCallback } from 'react';
import { keepPreviousData } from '@tanstack/react-query';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { BuildingsPageSkeleton } from '../../components/ui/Skeleton';
import { useBillingSummary, useBillingDetail } from '../../hooks/queries/useBilling';
import { BillingSummaryTable } from './components/BillingSummaryTable';
import { BillingDetailTable, BILLING_DETAIL_PAGE_SIZE } from './components/BillingDetailTable';

/**
 * Vista de facturación: resumen por centro/mes y detalle por local/medidor con paginación.
 */
export function BillingPage() {
  const [detailPage, setDetailPage] = useState(0);

  const { data: summaryData, isLoading: summaryLoading } = useBillingSummary();
  const { data: detailData, isLoading: detailLoading } = useBillingDetail(
    {
      limit: BILLING_DETAIL_PAGE_SIZE,
      offset: detailPage * BILLING_DETAIL_PAGE_SIZE,
    },
    { placeholderData: keepPreviousData },
  );

  const handleDetailPageChange = useCallback((page: number) => {
    setDetailPage(Math.max(0, page));
  }, []);

  const hasNextDetailPage = (detailData?.length ?? 0) >= BILLING_DETAIL_PAGE_SIZE;
  const isLoading = summaryLoading && detailLoading;

  if (isLoading && !summaryData && !detailData) {
    return (
      <div className="flex h-full flex-col overflow-hidden">
        <PageHeader title="Facturación" />
        <BuildingsPageSkeleton />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <PageHeader title="Facturación" />
      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-auto pb-6">
        <section>
          <h2 className="mb-2 text-lg font-semibold text-text">Resumen por centro y mes</h2>
          <Card className="overflow-hidden p-0">
            <BillingSummaryTable
              data={summaryData ?? []}
              isLoading={summaryLoading}
            />
          </Card>
        </section>
        <section>
          <h2 className="mb-2 text-lg font-semibold text-text">Detalle por local y medidor</h2>
          <Card className="overflow-hidden p-4">
            <BillingDetailTable
              data={detailData ?? []}
              isLoading={detailLoading}
              page={detailPage}
              onPageChange={handleDetailPageChange}
              hasNextPage={hasNextDetailPage}
            />
          </Card>
        </section>
      </div>
    </div>
  );
}
