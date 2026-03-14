import { useParams } from 'react-router';
import { Card } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import { BuildingDetailSkeleton } from '../../components/ui/Skeleton';
import { useBuilding } from '../../hooks/queries/useBuildings';
import { useBilling } from '../../hooks/queries/useBilling';
import { BillingChart } from './components/BillingChart';
import { BillingTable } from './components/BillingTable';

export function BuildingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: months, isLoading: loadingBuilding } = useBuilding(id!);
  const { data: billing, isLoading: loadingBilling } = useBilling(id!);

  if (loadingBuilding || loadingBilling) return <BuildingDetailSkeleton />;
  if (!months || months.length === 0) return <p className="text-muted">Edificio no encontrado</p>;

  const latest = months[0];

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0">
        <PageHeader
          title=""
          showBack
          breadcrumbs={[
            { label: 'Edificios', to: '/' },
            { label: latest.buildingName },
          ]}
        />
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pb-4">
        {billing && billing.length > 0 && (
          <>
            <Card>
              <h2 className="mb-3 text-sm font-semibold text-text">Facturación mensual 2025</h2>
              <BillingChart data={billing} />
            </Card>

            <Card className="flex flex-col overflow-hidden">
              <h2 className="mb-3 shrink-0 text-sm font-semibold text-text">Detalle facturación</h2>
              <div className="max-h-72 overflow-y-auto">
                <BillingTable data={billing} />
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
