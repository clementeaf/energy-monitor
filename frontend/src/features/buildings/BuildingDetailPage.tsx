import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Card } from '../../components/ui/Card';
import { BuildingDetailSkeleton } from '../../components/ui/Skeleton';
import { useBuilding } from '../../hooks/queries/useBuildings';
import { useBilling } from '../../hooks/queries/useBilling';
import { useMetersByBuilding } from '../../hooks/queries/useMeters';
import { BillingChart } from './components/BillingChart';
import { BillingTable } from './components/BillingTable';
import { MetersTable } from './components/MetersTable';

type DetailTab = 'billing' | 'meters';

const tabs: { key: DetailTab; label: string }[] = [
  { key: 'billing', label: 'Detalle Facturación' },
  { key: 'meters', label: 'Listado Remarcadores' },
];

export function BuildingDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { data: months, isLoading: loadingBuilding } = useBuilding(id!);
  const { data: billing, isLoading: loadingBilling } = useBilling(id!);
  const { data: meters, isLoading: loadingMeters } = useMetersByBuilding(id!);
  const [activeTab, setActiveTab] = useState<DetailTab>('billing');

  if (loadingBuilding || loadingBilling || loadingMeters) return <BuildingDetailSkeleton />;
  if (!months || months.length === 0) return <p className="text-muted">Edificio no encontrado</p>;

  const latest = months[0];

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0">
        <div className="mb-2 flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className="px-3 py-1 text-sm text-muted hover:text-text"
          >
            &larr; Volver
          </button>
          <span className="text-sm font-semibold text-text">{latest.buildingName}</span>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pb-4">
        {billing && billing.length > 0 && (
          <>
            <Card>
              <h2 className="mb-3 text-sm font-semibold text-text">Facturación mensual 2025</h2>
              <BillingChart data={billing} />
            </Card>

            <Card className="flex flex-col overflow-hidden">
              <div className="shrink-0 border-b border-border">
                <nav className="flex gap-4">
                  {tabs.map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`pb-2 text-sm font-semibold transition-colors ${
                        activeTab === tab.key
                          ? 'border-b-2 border-text text-text'
                          : 'text-muted hover:text-text'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </nav>
              </div>

              <div className="mt-3">
                {activeTab === 'billing' && (
                  <BillingTable data={billing} />
                )}
                {activeTab === 'meters' && meters && meters.length > 0 && (
                  <MetersTable data={meters} />
                )}
                {activeTab === 'meters' && (!meters || meters.length === 0) && (
                  <p className="py-8 text-center text-sm text-muted">Sin datos de remarcadores</p>
                )}
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
