import { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Card } from '../../components/ui/Card';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { Drawer } from '../../components/ui/Drawer';
import { PillButton } from '../../components/ui/PillButton';
import { PillDropdown } from '../../components/ui/PillDropdown';
import { SectionBanner } from '../../components/ui/SectionBanner';
import { TogglePills } from '../../components/ui/TogglePills';
import { BuildingDetailSkeleton } from '../../components/ui/Skeleton';
import { useBuilding } from '../../hooks/queries/useBuildings';
import { useBilling, useBillingStores } from '../../hooks/queries/useBilling';
import { useMetersByBuilding } from '../../hooks/queries/useMeters';
import { fmtClp, fmtNum, monthName } from '../../lib/formatters';
import { sumByKey, maxByKey } from '../../lib/aggregations';
import { BillingChart } from './components/BillingChart';
import { BillingTable } from './components/BillingTable';
import { MetersTable } from './components/MetersTable';
import type { BillingMetricKey } from './components/billingMetrics';
import { billingMetrics, billingMetricKeys } from './components/billingMetrics';
import type { BillingStoreBreakdown } from '../../types';

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
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  const { data: storeBreakdown, isLoading: loadingStores } = useBillingStores(id!, selectedMonth);

  const drawerColumns: Column<BillingStoreBreakdown>[] = useMemo(() => [
    { label: 'Tienda', value: (r) => r.storeName, total: () => 'Total', align: 'left' as const },
    { label: 'Consumo (kWh)', value: (r) => fmtNum(r.totalKwh), total: (d) => fmtNum(sumByKey(d, 'totalKwh')) },
    { label: 'Energía ($)', value: (r) => fmtClp(r.energiaClp), total: (d) => fmtClp(sumByKey(d, 'energiaClp')) },
    { label: 'Dda. máx. (kW)', value: (r) => fmtNum(r.ddaMaxKw), total: (d) => fmtNum(maxByKey(d, 'ddaMaxKw')) },
    { label: 'Dda. punta (kW)', value: (r) => fmtNum(r.ddaMaxPuntaKw), total: (d) => fmtNum(maxByKey(d, 'ddaMaxPuntaKw')) },
    { label: 'Neto ($)', value: (r) => fmtClp(r.totalNetoClp), total: (d) => fmtClp(sumByKey(d, 'totalNetoClp')) },
    { label: 'IVA ($)', value: (r) => fmtClp(r.ivaClp), total: (d) => fmtClp(sumByKey(d, 'ivaClp')) },
    { label: 'Total c/IVA ($)', value: (r) => fmtClp(r.totalConIvaClp), total: (d) => fmtClp(sumByKey(d, 'totalConIvaClp')) },
  ], []);

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
                <BillingTable
                  data={billing}
                  highlightMetric={chartMetric}
                  hoveredMetric={hoveredMetric}
                  onRowClick={(row) => setSelectedMonth(row.month)}
                />
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

      <Drawer
        open={!!selectedMonth}
        onClose={() => setSelectedMonth(null)}
        title={`Detalle por Tienda — ${selectedMonth ? monthName(selectedMonth) : ''}`}
        size="lg"
      >
        {loadingStores && <p className="py-8 text-center text-sm text-pa-text-muted">Cargando...</p>}
        {!loadingStores && storeBreakdown && storeBreakdown.length > 0 && (
          <DataTable
            data={storeBreakdown}
            columns={drawerColumns}
            footer
            rowKey={(r) => r.storeName}
            maxHeight="max-h-[70vh]"
          />
        )}
        {!loadingStores && storeBreakdown && storeBreakdown.length === 0 && (
          <p className="py-8 text-center text-sm text-pa-text-muted">Sin desglose para este mes</p>
        )}
      </Drawer>
    </div>
  );
}
