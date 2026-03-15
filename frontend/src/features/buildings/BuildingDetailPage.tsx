import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Card } from '../../components/ui/Card';
import { BuildingDetailSkeleton } from '../../components/ui/Skeleton';
import { useBuilding } from '../../hooks/queries/useBuildings';
import { useBilling } from '../../hooks/queries/useBilling';
import { useMetersByBuilding } from '../../hooks/queries/useMeters';
import { BillingChart } from './components/BillingChart';
import { BillingMetricSelector } from './components/BillingMetricSelector';
import { BillingTable } from './components/BillingTable';
import { MetersTable } from './components/MetersTable';
import type { BillingMetricKey } from './components/billingMetrics';

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
  const [chartMetric, setChartMetric] = useState<BillingMetricKey>('totalConIvaClp');
  const [hoveredMetric, setHoveredMetric] = useState<BillingMetricKey | null>(null);

  if (loadingBuilding || loadingBilling || loadingMeters) return <BuildingDetailSkeleton />;
  if (!months || months.length === 0) return <p className="text-muted">Edificio no encontrado</p>;

  const latest = months[0];

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="mb-3 flex shrink-0 items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="rounded-full border border-pa-blue px-2.5 py-0.5 text-[11px] font-medium text-pa-blue transition-colors hover:bg-pa-blue hover:text-white"
        >
          &larr; Volver
        </button>
        <h2 className="text-[13px] font-bold uppercase tracking-wide text-pa-navy">{latest.buildingName}</h2>
      </div>

      {billing && billing.length > 0 && (
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
          {/* Fila 1: gráfico */}
          <Card className="flex shrink-0 flex-col">
            <div className="mb-3 flex w-fit items-center gap-3 rounded-lg bg-pa-bg-alt px-4 py-2.5">
              <h2 className="text-[13px] font-bold uppercase tracking-wide text-pa-navy">Facturación Mensual</h2>
              <BillingMetricSelector value={chartMetric} onChange={setChartMetric} onHover={setHoveredMetric} />
            </div>
            <BillingChart data={billing} metric={chartMetric} />
          </Card>

          {/* Fila 2: tabla, ocupa resto */}
          <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="mb-3 flex w-fit shrink-0 items-center gap-2 rounded-lg bg-pa-bg-alt px-4 py-2.5">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`rounded-full px-3 py-1 text-[13px] font-bold uppercase tracking-wide transition-colors ${
                    activeTab === tab.key
                      ? 'bg-pa-navy text-white'
                      : 'text-pa-navy hover:bg-pa-navy/10'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="min-h-0 flex-1 overflow-hidden">
              {activeTab === 'billing' && (
                <BillingTable data={billing} highlightMetric={chartMetric} hoveredMetric={hoveredMetric} />
              )}
              {activeTab === 'meters' && meters && meters.length > 0 && (
                <MetersTable data={meters} buildingName={latest.buildingName} />
              )}
              {activeTab === 'meters' && (!meters || meters.length === 0) && (
                <p className="py-8 text-center text-sm text-muted">Sin datos de remarcadores</p>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
