import { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Card } from '../../components/ui/Card';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { Drawer } from '../../components/ui/Drawer';
import { PillButton } from '../../components/ui/PillButton';
import { PillDropdown } from '../../components/ui/PillDropdown';
import { SectionBanner } from '../../components/ui/SectionBanner';
import { TogglePills } from '../../components/ui/TogglePills';
import { BuildingDetailSkeleton } from '../../components/ui/Skeleton';
import { useBuilding } from '../../hooks/queries/useBuildings';
import { useBilling, useBillingStores, useBillingAllStores } from '../../hooks/queries/useBilling';
import { useMetersByBuilding } from '../../hooks/queries/useMeters';
import { useCreateStore, useUpdateStore, useDeleteStore } from '../../hooks/queries/useStores';
import { useOperatorFilter } from '../../hooks/useOperatorFilter';
import { useAppStore } from '../../store/useAppStore';
import { fmtClp, fmtNum, monthName } from '../../lib/formatters';
import { sumByKey, maxByKey } from '../../lib/aggregations';
import { BillingChart } from './components/BillingChart';
import { BillingTable } from './components/BillingTable';
import { MeterForm } from './components/MeterForm';
import { MetersTable } from './components/MetersTable';
import { OperatorsTab } from './components/OperatorsTab';
import type { BillingMetricKey } from './components/billingMetrics';
import { billingMetrics, billingMetricKeys } from './components/billingMetrics';
import type { BillingStoreBreakdown, MeterListItem } from '../../types';

type DetailTab = 'billing' | 'meters' | 'operators';

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
  const { isFilteredMode, isTecnico, operatorMeterIds, selectedOperator, selectedStoreName } = useOperatorFilter();
  const userMode = useAppStore((s) => s.userMode);
  const isHolding = userMode === 'holding';
  const hideBilling = isTecnico;
  const [activeTab, setActiveTab] = useState<DetailTab>(hideBilling ? 'meters' : 'billing');
  const [chartMetric, setChartMetric] = useState<BillingMetricKey>('totalConIvaClp');
  const [hoveredMetric, setHoveredMetric] = useState<BillingMetricKey | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  // Meter CRUD state
  const [meterDrawer, setMeterDrawer] = useState<'create' | 'edit' | null>(null);
  const [editingMeter, setEditingMeter] = useState<MeterListItem | null>(null);
  const [deletingMeter, setDeletingMeter] = useState<MeterListItem | null>(null);
  const createStoreMutation = useCreateStore();
  const updateStoreMutation = useUpdateStore();
  const deleteStoreMutation = useDeleteStore();

  const { data: storeBreakdown, isLoading: loadingStores } = useBillingStores(id!, selectedMonth);

  // Operator name for filtering store breakdowns
  const filterOpName = selectedOperator ?? selectedStoreName ?? null;

  // Fetch all months' store breakdowns when in filtered mode to compute operator-level billing
  const billingMonths = useMemo(() => billing?.map((b) => b.month) ?? [], [billing]);
  const { data: allStoresData } = useBillingAllStores(id!, billingMonths, isFilteredMode && !!filterOpName);

  // Aggregate store breakdowns into BillingMonthlySummary per month, filtered by operator
  const operatorBilling = useMemo(() => {
    if (!allStoresData || !filterOpName) return null;
    return allStoresData.map(({ month, stores }) => {
      const opStores = stores.filter((s) => s.storeName === filterOpName);
      const sum = (key: keyof BillingStoreBreakdown) =>
        opStores.reduce((acc, s) => acc + ((s[key] as number) ?? 0), 0);
      const max = (key: keyof BillingStoreBreakdown) =>
        opStores.reduce((acc, s) => Math.max(acc, (s[key] as number) ?? 0), 0);
      return {
        month,
        totalMeters: opStores.length,
        totalKwh: sum('totalKwh'),
        energiaClp: sum('energiaClp'),
        ddaMaxKw: max('ddaMaxKw'),
        ddaMaxPuntaKw: max('ddaMaxPuntaKw'),
        kwhTroncal: sum('kwhTroncal'),
        kwhServPublico: sum('kwhServPublico'),
        cargoFijoClp: sum('cargoFijoClp'),
        totalNetoClp: sum('totalNetoClp'),
        ivaClp: sum('ivaClp'),
        montoExentoClp: sum('montoExentoClp'),
        totalConIvaClp: sum('totalConIvaClp'),
      };
    });
  }, [allStoresData, filterOpName]);

  // Use operator-level billing in filtered mode, building-level otherwise
  const effectiveBilling = (isFilteredMode && operatorBilling) ? operatorBilling : billing;

  // Filter meters to operator's meters in multi_operador mode
  const filteredMeters = useMemo(() => {
    if (!meters) return meters;
    if (isFilteredMode && operatorMeterIds) {
      return meters.filter((m) => operatorMeterIds.has(m.meterId));
    }
    return meters;
  }, [meters, isFilteredMode, operatorMeterIds]);

  // Filter store breakdown to operator's stores in multi_operador mode
  const filteredStoreBreakdown = useMemo(() => {
    if (!storeBreakdown) return storeBreakdown;
    if (isFilteredMode && selectedOperator) {
      return storeBreakdown.filter((s) => s.storeName === selectedOperator);
    }
    return storeBreakdown;
  }, [storeBreakdown, isFilteredMode, selectedOperator]);

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

  // Build tab options dynamically
  const tabOptions = (() => {
    let opts = [...TAB_OPTIONS];
    if (hideBilling) opts = opts.filter((t) => t.value !== 'billing');
    if (isHolding) opts.push({ value: 'operators', label: 'Operadores' });
    return opts;
  })();

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="mb-3 ml-4 flex shrink-0 items-center gap-3">
        <PillButton onClick={() => navigate(-1)}>&larr; Volver</PillButton>
        <h2 className="text-[13px] font-bold uppercase tracking-wide text-pa-navy">{latest.buildingName}</h2>
        {/* Context "+" button for holding */}
        {isHolding && activeTab === 'meters' && (
          <PillButton onClick={() => setMeterDrawer('create')}>+ Remarcador</PillButton>
        )}
      </div>

      {effectiveBilling && effectiveBilling.length > 0 && (
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
          {/* Fila 1: gráfico (hidden in filtered modes) */}
          {!hideBilling && (
            <Card className="flex shrink-0 flex-col">
              <SectionBanner title="" inline className="mb-3">
                <PillDropdown
                  items={metricDropdownItems}
                  value={chartMetric}
                  onChange={setChartMetric}
                  onHover={setHoveredMetric}
                  align="left"
                />
              </SectionBanner>
              <BillingChart data={effectiveBilling} metric={chartMetric} />
            </Card>
          )}

          {/* Fila 2: tabla, ocupa resto */}
          <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <SectionBanner title="" inline className="mb-3">
              <TogglePills options={tabOptions} value={activeTab} onChange={setActiveTab} />
            </SectionBanner>

            <div className="min-h-0 flex-1 overflow-hidden">
              {activeTab === 'billing' && !hideBilling && (
                <BillingTable
                  data={effectiveBilling}
                  highlightMetric={chartMetric}
                  hoveredMetric={hoveredMetric}
                  onRowClick={(row) => setSelectedMonth(row.month)}
                />
              )}
              {activeTab === 'meters' && filteredMeters && filteredMeters.length > 0 && (
                <MetersTable
                  data={filteredMeters}
                  buildingName={latest.buildingName}
                  isHolding={isHolding}
                  onEdit={(m) => { setEditingMeter(m); setMeterDrawer('edit'); }}
                  onDelete={(m) => setDeletingMeter(m)}
                />
              )}
              {activeTab === 'meters' && (!filteredMeters || filteredMeters.length === 0) && (
                <p className="py-8 text-center text-sm text-muted">Sin datos de remarcadores</p>
              )}
              {activeTab === 'operators' && isHolding && (
                <OperatorsTab buildingName={latest.buildingName} />
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Billing store breakdown drawer */}
      <Drawer
        open={!!selectedMonth}
        onClose={() => setSelectedMonth(null)}
        title={`Detalle por Tienda — ${selectedMonth ? monthName(selectedMonth) : ''}`}
        size="lg"
      >
        {loadingStores && <p className="py-8 text-center text-sm text-pa-text-muted">Cargando...</p>}
        {!loadingStores && filteredStoreBreakdown && filteredStoreBreakdown.length > 0 && (
          <DataTable
            data={filteredStoreBreakdown}
            columns={drawerColumns}
            footer
            rowKey={(r) => r.storeName}
            maxHeight="max-h-[70vh]"
          />
        )}
        {!loadingStores && filteredStoreBreakdown && filteredStoreBreakdown.length === 0 && (
          <p className="py-8 text-center text-sm text-pa-text-muted">Sin desglose para este mes</p>
        )}
      </Drawer>

      {/* Meter create/edit drawer */}
      <Drawer
        open={meterDrawer !== null}
        onClose={() => { setMeterDrawer(null); setEditingMeter(null); }}
        title={meterDrawer === 'edit' ? `Editar Remarcador — ${editingMeter?.meterId}` : 'Nuevo Remarcador'}
        size="sm"
      >
        <MeterForm
          buildingName={latest.buildingName}
          initial={editingMeter ? { meterId: editingMeter.meterId, storeName: editingMeter.storeName, storeTypeId: 0 } : undefined}
          loading={createStoreMutation.isPending || updateStoreMutation.isPending}
          onSubmit={(data) => {
            if (meterDrawer === 'edit' && editingMeter) {
              updateStoreMutation.mutate(
                { meterId: editingMeter.meterId, data: { storeName: data.storeName, storeTypeId: data.storeTypeId } },
                { onSuccess: () => { setMeterDrawer(null); setEditingMeter(null); } },
              );
            } else {
              createStoreMutation.mutate(data, {
                onSuccess: () => { setMeterDrawer(null); },
              });
            }
          }}
        />
      </Drawer>

      {/* Meter delete confirm */}
      <ConfirmDialog
        open={!!deletingMeter}
        title="Eliminar Remarcador"
        message={`Se eliminará el medidor "${deletingMeter?.meterId}" y sus datos de facturación. Esta acción no se puede deshacer.`}
        onConfirm={() => {
          deleteStoreMutation.mutate(deletingMeter!.meterId, {
            onSuccess: () => setDeletingMeter(null),
          });
        }}
        onCancel={() => setDeletingMeter(null)}
        loading={deleteStoreMutation.isPending}
      />
    </div>
  );
}
