import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Card } from '../../components/ui/Card';
import { PillButton } from '../../components/ui/PillButton';
import { PillDropdown } from '../../components/ui/PillDropdown';
import { SectionBanner } from '../../components/ui/SectionBanner';
import { TogglePills } from '../../components/ui/TogglePills';
import { BuildingDetailSkeleton } from '../../components/ui/Skeleton';
import { useBuilding } from '../../hooks/queries/useBuildings';
import { useBilling } from '../../hooks/queries/useBilling';
import { useMetersByBuilding } from '../../hooks/queries/useMeters';
import { BillingChart } from './components/BillingChart';
import { BillingTable } from './components/BillingTable';
import { MetersTable } from './components/MetersTable';
import type { BillingMetricKey } from './components/billingMetrics';
import { billingMetrics, billingMetricKeys } from './components/billingMetrics';

type DetailTab = 'billing' | 'meters';

const TAB_OPTIONS: { value: DetailTab; label: string }[] = [
  { value: 'billing', label: 'Detalle Facturación' },
  { value: 'meters', label: 'Listado Remarcadores' },
];

const metricDropdownItems = billingMetricKeys.map((k) => ({ value: k, label: billingMetrics[k].label }));

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
        <PillButton onClick={() => navigate(-1)}>&larr; Volver</PillButton>
        <h2 className="text-[13px] font-bold uppercase tracking-wide text-pa-navy">{latest.buildingName}</h2>
      </div>

      {billing && billing.length > 0 && (
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
          {/* Fila 1: gráfico */}
          <Card className="flex shrink-0 flex-col">
            <SectionBanner title="" inline className="mb-3">
              <PillDropdown
                items={metricDropdownItems}
                value={chartMetric}
                onChange={setChartMetric}
                onHover={setHoveredMetric}
              />
            </SectionBanner>
            <BillingChart data={billing} metric={chartMetric} />
          </Card>

          {/* Fila 2: tabla, ocupa resto */}
          <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <SectionBanner title="" inline className="mb-3">
              <TogglePills options={TAB_OPTIONS} value={activeTab} onChange={setActiveTab} />
            </SectionBanner>

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
