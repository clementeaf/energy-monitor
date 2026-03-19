import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router';
import { Card } from '../../components/ui/Card';
import { ColumnFilterDropdown } from '../../components/ui/ColumnFilterDropdown';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { DateFilterDropdown, type DateFilter } from '../../components/ui/DateFilterDropdown';
import { RangeFilterDropdown, type NumericRange } from '../../components/ui/RangeFilterDropdown';
import { SectionBanner } from '../../components/ui/SectionBanner';
import { Skeleton } from '../../components/ui/Skeleton';
import { TogglePills } from '../../components/ui/TogglePills';
import { useAllMetersLatest } from '../../hooks/queries/useMeters';
import { useBuildings } from '../../hooks/queries/useBuildings';
import { useAlerts } from '../../hooks/queries/useAlerts';
import { useOperatorFilter } from '../../hooks/useOperatorFilter';
import type { MeterLatestReading, Alert } from '../../types';

// =============================================================================
// Monitoring tab helpers
// =============================================================================

function formatVal(v: number | null, decimals = 1): string {
  return v !== null ? v.toFixed(decimals) : '—';
}

const STATUS_THRESHOLDS = [
  { maxMs: 30 * 60_000, label: 'Online', color: 'text-emerald-600 bg-emerald-50' },
  { maxMs: 120 * 60_000, label: 'Delay', color: 'text-amber-600 bg-amber-50' },
  { maxMs: Infinity, label: 'Offline', color: 'text-red-600 bg-red-50' },
];

function getStatus(row: MeterLatestReading): { label: string; color: string } {
  const age = Date.now() - new Date(row.timestamp).getTime();
  return STATUS_THRESHOLDS.find((t) => age < t.maxMs) ?? STATUS_THRESHOLDS[STATUS_THRESHOLDS.length - 1];
}

const skeletonColumns = ['Activo Inmobiliario', 'Medidor', 'Tienda', 'Potencia Activa (kW)', 'Voltaje L1 (V)', 'Corriente L1 (A)', 'FP', 'Estado'];

function SkeletonRows() {
  return (
    <div className="overflow-auto">
      <table className="min-w-full text-sm">
        <thead className="sticky top-0 z-10 bg-white">
          <tr className="border-b border-pa-border">
            {skeletonColumns.map((col, i) => (
              <th
                key={col}
                className={`whitespace-nowrap px-3 py-2.5 text-[13px] font-semibold text-pa-navy ${i <= 2 ? 'text-left' : 'text-right'}`}
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 8 }).map((_, i) => (
            <tr key={i} className="border-b border-pa-border">
              {skeletonColumns.map((col, j) => (
                <td key={col} className={`px-3 py-3 ${j <= 2 ? 'text-left' : 'text-right'}`}>
                  <Skeleton className={`inline-block h-4 ${j === 0 ? 'w-20' : j === 1 ? 'w-16' : j === 2 ? 'w-28' : j === 7 ? 'w-14 rounded-full' : 'w-12'}`} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// =============================================================================
// Alerts tab helpers
// =============================================================================

const severityLabel: Record<string, string> = {
  critical: 'Crítico',
  warning: 'Advertencia',
  info: 'Info',
};

const severityClass: Record<string, string> = {
  critical: 'text-red-500 font-semibold',
  warning: 'text-amber-500',
  info: 'text-blue-400',
};

const typeLabel: Record<string, string> = {
  CURRENT_HIGH: 'Corriente alta',
  CURRENT_NEGATIVE: 'Corriente negativa',
  VOLTAGE_OUT_OF_RANGE: 'Voltaje fuera de rango',
  POWER_FACTOR_LOW: 'Factor potencia bajo',
};

// =============================================================================
// Monitoring tab — cascading filters
// =============================================================================

function MonitoringTab({ operatorMeterIds, isFilteredMode }: { operatorMeterIds: Set<string> | null; isFilteredMode: boolean }) {
  const { data: buildings } = useBuildings();
  const buildingNames = useMemo(() => {
    if (!buildings) return [];
    return [...new Set(buildings.map((b) => b.buildingName))].sort();
  }, [buildings]);

  const { data: allMeters, isLoading, isError } = useAllMetersLatest(buildingNames);

  // Base data after operator mode filtering
  const baseData = useMemo(() => {
    if (isFilteredMode && operatorMeterIds) {
      return allMeters.filter((m) => operatorMeterIds.has(m.meterId));
    }
    return allMeters;
  }, [allMeters, isFilteredMode, operatorMeterIds]);

  // Column filter state
  const allBuildings = useMemo(() => [...new Set(baseData.map((m) => m.buildingName))].sort(), [baseData]);
  const allMeterIds = useMemo(() => [...new Set(baseData.map((m) => m.meterId))].sort(), [baseData]);
  const allStores = useMemo(() => [...new Set(baseData.map((m) => m.storeName))].sort(), [baseData]);
  const allStatuses = useMemo(() => [...new Set(baseData.map((m) => getStatus(m).label))].sort(), [baseData]);

  const [visibleBuildings, setVisibleBuildings] = useState<Set<string>>(() => new Set(allBuildings));
  const [visibleMeterIds, setVisibleMeterIds] = useState<Set<string>>(() => new Set(allMeterIds));
  const [visibleStores, setVisibleStores] = useState<Set<string>>(() => new Set(allStores));
  const [visibleStatuses, setVisibleStatuses] = useState<Set<string>>(() => new Set(allStatuses));

  // Range filter state
  const powerVals = useMemo(() => baseData.map((m) => m.powerKw ?? 0), [baseData]);
  const powerMin = useMemo(() => Math.min(...(powerVals.length ? powerVals : [0])), [powerVals]);
  const powerMax = useMemo(() => Math.max(...(powerVals.length ? powerVals : [0])), [powerVals]);
  const [powerRange, setPowerRange] = useState<NumericRange>({ min: powerMin, max: powerMax });

  const voltVals = useMemo(() => baseData.map((m) => m.voltageL1 ?? 0), [baseData]);
  const voltMin = useMemo(() => Math.min(...(voltVals.length ? voltVals : [0])), [voltVals]);
  const voltMax = useMemo(() => Math.max(...(voltVals.length ? voltVals : [0])), [voltVals]);
  const [voltRange, setVoltRange] = useState<NumericRange>({ min: voltMin, max: voltMax });

  const currVals = useMemo(() => baseData.map((m) => m.currentL1 ?? 0), [baseData]);
  const currMin = useMemo(() => Math.min(...(currVals.length ? currVals : [0])), [currVals]);
  const currMax = useMemo(() => Math.max(...(currVals.length ? currVals : [0])), [currVals]);
  const [currRange, setCurrRange] = useState<NumericRange>({ min: currMin, max: currMax });

  const pfVals = useMemo(() => baseData.map((m) => Math.round((m.powerFactor ?? 0) * 1000)), [baseData]);
  const pfMin = useMemo(() => Math.min(...(pfVals.length ? pfVals : [0])), [pfVals]);
  const pfMax = useMemo(() => Math.max(...(pfVals.length ? pfVals : [0])), [pfVals]);
  const [pfRange, setPfRange] = useState<NumericRange>({ min: pfMin, max: pfMax });

  // Sync sets when data changes
  const buildingsKey = allBuildings.join('\0');
  const meterIdsKey = allMeterIds.join('\0');
  const storesKey = allStores.join('\0');
  const statusesKey = allStatuses.join('\0');
  useEffect(() => { setVisibleBuildings(new Set(allBuildings)); }, [buildingsKey]);
  useEffect(() => { setVisibleMeterIds(new Set(allMeterIds)); }, [meterIdsKey]);
  useEffect(() => { setVisibleStores(new Set(allStores)); }, [storesKey]);
  useEffect(() => { setVisibleStatuses(new Set(allStatuses)); }, [statusesKey]);
  useEffect(() => { setPowerRange({ min: powerMin, max: powerMax }); }, [powerMin, powerMax]);
  useEffect(() => { setVoltRange({ min: voltMin, max: voltMax }); }, [voltMin, voltMax]);
  useEffect(() => { setCurrRange({ min: currMin, max: currMax }); }, [currMin, currMax]);
  useEffect(() => { setPfRange({ min: pfMin, max: pfMax }); }, [pfMin, pfMax]);

  // Numeric filter helper
  const matchesNumeric = useCallback((m: MeterLatestReading): boolean => {
    const p = m.powerKw ?? 0;
    const v = m.voltageL1 ?? 0;
    const c = m.currentL1 ?? 0;
    const pf = Math.round((m.powerFactor ?? 0) * 1000);
    return p >= powerRange.min && p <= powerRange.max &&
      v >= voltRange.min && v <= voltRange.max &&
      c >= currRange.min && c <= currRange.max &&
      pf >= pfRange.min && pf <= pfRange.max;
  }, [powerRange, voltRange, currRange, pfRange]);

  // Cascading: available options for each filter = values present in data filtered by ALL OTHER filters
  const availableBuildings = useMemo(() => {
    const subset = baseData.filter((m) =>
      visibleMeterIds.has(m.meterId) && visibleStores.has(m.storeName) &&
      visibleStatuses.has(getStatus(m).label) && matchesNumeric(m),
    );
    return [...new Set(subset.map((m) => m.buildingName))].sort();
  }, [baseData, visibleMeterIds, visibleStores, visibleStatuses, matchesNumeric]);

  const availableMeterIds = useMemo(() => {
    const subset = baseData.filter((m) =>
      visibleBuildings.has(m.buildingName) && visibleStores.has(m.storeName) &&
      visibleStatuses.has(getStatus(m).label) && matchesNumeric(m),
    );
    return [...new Set(subset.map((m) => m.meterId))].sort();
  }, [baseData, visibleBuildings, visibleStores, visibleStatuses, matchesNumeric]);

  const availableStores = useMemo(() => {
    const subset = baseData.filter((m) =>
      visibleBuildings.has(m.buildingName) && visibleMeterIds.has(m.meterId) &&
      visibleStatuses.has(getStatus(m).label) && matchesNumeric(m),
    );
    return [...new Set(subset.map((m) => m.storeName))].sort();
  }, [baseData, visibleBuildings, visibleMeterIds, visibleStatuses, matchesNumeric]);

  const availableStatuses = useMemo(() => {
    const subset = baseData.filter((m) =>
      visibleBuildings.has(m.buildingName) && visibleMeterIds.has(m.meterId) &&
      visibleStores.has(m.storeName) && matchesNumeric(m),
    );
    return [...new Set(subset.map((m) => getStatus(m).label))].sort();
  }, [baseData, visibleBuildings, visibleMeterIds, visibleStores, matchesNumeric]);

  // Toggle helpers
  const toggleBuilding = useCallback((b: string) => {
    setVisibleBuildings((prev) => { const n = new Set(prev); if (n.has(b)) n.delete(b); else n.add(b); return n; });
  }, []);
  const toggleMeterId = useCallback((m: string) => {
    setVisibleMeterIds((prev) => { const n = new Set(prev); if (n.has(m)) n.delete(m); else n.add(m); return n; });
  }, []);
  const toggleStore = useCallback((s: string) => {
    setVisibleStores((prev) => { const n = new Set(prev); if (n.has(s)) n.delete(s); else n.add(s); return n; });
  }, []);
  const toggleStatus = useCallback((s: string) => {
    setVisibleStatuses((prev) => { const n = new Set(prev); if (n.has(s)) n.delete(s); else n.add(s); return n; });
  }, []);

  // Final filtered data
  const filteredData = useMemo(() => {
    return baseData.filter((m) =>
      visibleBuildings.has(m.buildingName) &&
      visibleMeterIds.has(m.meterId) &&
      visibleStores.has(m.storeName) &&
      visibleStatuses.has(getStatus(m).label) &&
      matchesNumeric(m),
    );
  }, [baseData, visibleBuildings, visibleMeterIds, visibleStores, visibleStatuses, matchesNumeric]);

  const fmtRange = useCallback((v: number) => formatVal(v), []);
  const fmtPfRange = useCallback((v: number) => (v / 1000).toFixed(3), []);

  const columns: Column<MeterLatestReading>[] = useMemo(() => [
    {
      label: 'Activo Inmobiliario',
      value: (r) => r.buildingName,
      align: 'left' as const,
      sortKey: (r) => r.buildingName,
      headerRender: () => (
        <ColumnFilterDropdown
          label="Activo Inmobiliario"
          items={availableBuildings}
          visible={visibleBuildings}
          onToggle={toggleBuilding}
          onSelectAll={() => setVisibleBuildings(new Set(availableBuildings))}
          onDeselectAll={() => setVisibleBuildings(new Set())}
        />
      ),
    },
    {
      label: 'Medidor',
      value: (r) => r.meterId,
      align: 'left' as const,
      className: 'whitespace-nowrap',
      sortKey: (r) => r.meterId,
      headerRender: () => (
        <ColumnFilterDropdown
          label="Medidor"
          items={availableMeterIds}
          visible={visibleMeterIds}
          onToggle={toggleMeterId}
          onSelectAll={() => setVisibleMeterIds(new Set(availableMeterIds))}
          onDeselectAll={() => setVisibleMeterIds(new Set())}
        />
      ),
    },
    {
      label: 'Tienda',
      value: (r) => r.storeName,
      align: 'left' as const,
      className: 'truncate max-w-[180px]',
      sortKey: (r) => r.storeName,
      headerRender: () => (
        <ColumnFilterDropdown
          label="Tienda"
          items={availableStores}
          visible={visibleStores}
          onToggle={toggleStore}
          onSelectAll={() => setVisibleStores(new Set(availableStores))}
          onDeselectAll={() => setVisibleStores(new Set())}
        />
      ),
    },
    {
      label: 'Potencia Activa (kW)',
      value: (r) => formatVal(r.powerKw),
      sortKey: (r) => r.powerKw,
      headerRender: () => (
        <RangeFilterDropdown
          label="Potencia Activa (kW)"
          dataMin={powerMin}
          dataMax={powerMax}
          activeRange={powerRange}
          onChangeRange={setPowerRange}
          format={fmtRange}
        />
      ),
    },
    {
      label: 'Voltaje L1 (V)',
      value: (r) => formatVal(r.voltageL1),
      sortKey: (r) => r.voltageL1,
      headerRender: () => (
        <RangeFilterDropdown
          label="Voltaje L1 (V)"
          dataMin={voltMin}
          dataMax={voltMax}
          activeRange={voltRange}
          onChangeRange={setVoltRange}
          format={fmtRange}
        />
      ),
    },
    {
      label: 'Corriente L1 (A)',
      value: (r) => formatVal(r.currentL1, 2),
      sortKey: (r) => r.currentL1,
      headerRender: () => (
        <RangeFilterDropdown
          label="Corriente L1 (A)"
          dataMin={currMin}
          dataMax={currMax}
          activeRange={currRange}
          onChangeRange={setCurrRange}
          format={fmtRange}
        />
      ),
    },
    {
      label: 'FP',
      value: (r) => formatVal(r.powerFactor, 3),
      sortKey: (r) => r.powerFactor,
      headerRender: () => (
        <RangeFilterDropdown
          label="FP"
          dataMin={pfMin}
          dataMax={pfMax}
          activeRange={pfRange}
          onChangeRange={setPfRange}
          format={fmtPfRange}
        />
      ),
    },
    {
      label: 'Estado',
      value: (r) => {
        const status = getStatus(r);
        return (
          <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${status.color}`}>
            {status.label}
          </span>
        );
      },
      sortKey: (r) => getStatus(r).label,
      headerRender: () => (
        <ColumnFilterDropdown
          label="Estado"
          items={availableStatuses}
          visible={visibleStatuses}
          onToggle={toggleStatus}
          onSelectAll={() => setVisibleStatuses(new Set(availableStatuses))}
          onDeselectAll={() => setVisibleStatuses(new Set())}
        />
      ),
    },
  ], [
    availableBuildings, visibleBuildings, toggleBuilding,
    availableMeterIds, visibleMeterIds, toggleMeterId,
    availableStores, visibleStores, toggleStore,
    availableStatuses, visibleStatuses, toggleStatus,
    powerMin, powerMax, powerRange, fmtRange,
    voltMin, voltMax, voltRange,
    currMin, currMax, currRange,
    pfMin, pfMax, pfRange, fmtPfRange,
  ]);

  if (isLoading) return <SkeletonRows />;

  return (
    <DataTable
      data={filteredData}
      columns={columns}
      rowKey={(r) => r.meterId}
      maxHeight=""
      pageSize={30}
      emptyMessage={isError ? 'Error al cargar datos' : 'Sin datos'}
    />
  );
}

// =============================================================================
// Alerts tab — cascading filters
// =============================================================================

function AlertsTab({ operatorMeterIds, isFilteredMode }: { operatorMeterIds: Set<string> | null; isFilteredMode: boolean }) {
  const [searchParams] = useSearchParams();
  const { data: rawAlerts = [], isLoading } = useAlerts();

  const alerts = useMemo(() => {
    if (isFilteredMode && operatorMeterIds) {
      return rawAlerts.filter((a) => operatorMeterIds.has(a.meterId));
    }
    return rawAlerts;
  }, [rawAlerts, isFilteredMode, operatorMeterIds]);

  // All unique values
  const allBuildings = useMemo(() => [...new Set(alerts.filter((a) => a.buildingName).map((a) => a.buildingName))].sort(), [alerts]);
  const allOperators = useMemo(() => [...new Set(alerts.filter((a) => a.storeName).map((a) => a.storeName))].sort(), [alerts]);
  const allMeterIds = useMemo(() => [...new Set(alerts.map((a) => a.meterId))].sort(), [alerts]);
  const allTypes = useMemo(() => [...new Set(alerts.map((a) => a.alertType))].sort(), [alerts]);
  const allSeverities = useMemo(() => [...new Set(alerts.map((a) => a.severity))].sort(), [alerts]);
  const allFields = useMemo(() => [...new Set(alerts.map((a) => a.field))].sort(), [alerts]);

  // Column filter state — initialize from URL params
  const initialMeterFilter = useMemo(() => {
    const qMeterId = searchParams.get('meter_id');
    return qMeterId ? new Set([qMeterId]) : new Set<string>(allMeterIds);
  }, []);

  const [visibleBuildings, setVisibleBuildings] = useState<Set<string>>(() => new Set(allBuildings));
  const [visibleOperators, setVisibleOperators] = useState<Set<string>>(() => new Set(allOperators));
  const [visibleMeterIds, setVisibleMeterIds] = useState<Set<string>>(initialMeterFilter);
  const [visibleTypes, setVisibleTypes] = useState<Set<string>>(() => new Set(allTypes));
  const [visibleSeverities, setVisibleSeverities] = useState<Set<string>>(() => new Set(allSeverities));
  const [visibleFields, setVisibleFields] = useState<Set<string>>(() => new Set(allFields));

  // Date filter
  const initialDateFilter = useMemo((): DateFilter => {
    const qDate = searchParams.get('date');
    const qDateFrom = searchParams.get('date_from');
    const qDateTo = searchParams.get('date_to');
    if (qDate) return { type: 'exact', date: qDate };
    if (qDateFrom && qDateTo) return { type: 'range', from: qDateFrom, to: qDateTo };
    return { type: 'all' };
  }, []);
  const [dateFilter, setDateFilter] = useState<DateFilter>(initialDateFilter);

  // Range filters for value / threshold
  const valVals = useMemo(() => alerts.filter((a) => a.value != null).map((a) => Math.round(a.value!)), [alerts]);
  const valMin = useMemo(() => Math.min(...(valVals.length ? valVals : [0])), [valVals]);
  const valMax = useMemo(() => Math.max(...(valVals.length ? valVals : [0])), [valVals]);
  const [valRange, setValRange] = useState<NumericRange>({ min: valMin, max: valMax });

  const thrVals = useMemo(() => alerts.filter((a) => a.threshold != null).map((a) => Math.round(a.threshold!)), [alerts]);
  const thrMin = useMemo(() => Math.min(...(thrVals.length ? thrVals : [0])), [thrVals]);
  const thrMax = useMemo(() => Math.max(...(thrVals.length ? thrVals : [0])), [thrVals]);
  const [thrRange, setThrRange] = useState<NumericRange>({ min: thrMin, max: thrMax });

  // Sync sets when data changes
  const buildingsKey = allBuildings.join('\0');
  const operatorsKey = allOperators.join('\0');
  const meterIdsKey = allMeterIds.join('\0');
  const typesKey = allTypes.join('\0');
  const severitiesKey = allSeverities.join('\0');
  const fieldsKey = allFields.join('\0');
  useEffect(() => { setVisibleBuildings(new Set(allBuildings)); }, [buildingsKey]);
  useEffect(() => { setVisibleOperators(new Set(allOperators)); }, [operatorsKey]);
  // Only sync meterIds if no URL param was used
  useEffect(() => {
    if (!searchParams.get('meter_id')) setVisibleMeterIds(new Set(allMeterIds));
  }, [meterIdsKey]);
  useEffect(() => { setVisibleTypes(new Set(allTypes)); }, [typesKey]);
  useEffect(() => { setVisibleSeverities(new Set(allSeverities)); }, [severitiesKey]);
  useEffect(() => { setVisibleFields(new Set(allFields)); }, [fieldsKey]);
  useEffect(() => { setValRange({ min: valMin, max: valMax }); }, [valMin, valMax]);
  useEffect(() => { setThrRange({ min: thrMin, max: thrMax }); }, [thrMin, thrMax]);

  // Toggle helpers
  const toggleBuilding = useCallback((b: string) => {
    setVisibleBuildings((prev) => { const n = new Set(prev); if (n.has(b)) n.delete(b); else n.add(b); return n; });
  }, []);
  const toggleOperator = useCallback((o: string) => {
    setVisibleOperators((prev) => { const n = new Set(prev); if (n.has(o)) n.delete(o); else n.add(o); return n; });
  }, []);
  const toggleMeterId = useCallback((m: string) => {
    setVisibleMeterIds((prev) => { const n = new Set(prev); if (n.has(m)) n.delete(m); else n.add(m); return n; });
  }, []);
  const toggleType = useCallback((t: string) => {
    setVisibleTypes((prev) => { const n = new Set(prev); if (n.has(t)) n.delete(t); else n.add(t); return n; });
  }, []);
  const toggleSeverity = useCallback((s: string) => {
    setVisibleSeverities((prev) => { const n = new Set(prev); if (n.has(s)) n.delete(s); else n.add(s); return n; });
  }, []);
  const toggleField = useCallback((f: string) => {
    setVisibleFields((prev) => { const n = new Set(prev); if (n.has(f)) n.delete(f); else n.add(f); return n; });
  }, []);

  // Date filter helper
  const matchesDate = useCallback((ts: string): boolean => {
    if (dateFilter.type === 'all') return true;
    const d = ts.slice(0, 10);
    if (dateFilter.type === 'exact') return d === dateFilter.date;
    return d >= dateFilter.from && d <= dateFilter.to;
  }, [dateFilter]);

  // Numeric filter helper
  const matchesNumeric = useCallback((a: Alert): boolean => {
    const v = Math.round(a.value ?? 0);
    const t = Math.round(a.threshold ?? 0);
    return v >= valRange.min && v <= valRange.max &&
      t >= thrRange.min && t <= thrRange.max;
  }, [valRange, thrRange]);

  // Cascading available options
  const availableBuildings = useMemo(() => {
    const subset = alerts.filter((a) =>
      visibleOperators.has(a.storeName) && visibleMeterIds.has(a.meterId) &&
      visibleTypes.has(a.alertType) && visibleSeverities.has(a.severity) &&
      visibleFields.has(a.field) && matchesDate(a.timestamp) && matchesNumeric(a),
    );
    return [...new Set(subset.filter((a) => a.buildingName).map((a) => a.buildingName))].sort();
  }, [alerts, visibleOperators, visibleMeterIds, visibleTypes, visibleSeverities, visibleFields, matchesDate, matchesNumeric]);

  const availableOperators = useMemo(() => {
    const subset = alerts.filter((a) =>
      visibleBuildings.has(a.buildingName) && visibleMeterIds.has(a.meterId) &&
      visibleTypes.has(a.alertType) && visibleSeverities.has(a.severity) &&
      visibleFields.has(a.field) && matchesDate(a.timestamp) && matchesNumeric(a),
    );
    return [...new Set(subset.filter((a) => a.storeName).map((a) => a.storeName))].sort();
  }, [alerts, visibleBuildings, visibleMeterIds, visibleTypes, visibleSeverities, visibleFields, matchesDate, matchesNumeric]);

  const availableMeterIds = useMemo(() => {
    const subset = alerts.filter((a) =>
      visibleBuildings.has(a.buildingName) && visibleOperators.has(a.storeName) &&
      visibleTypes.has(a.alertType) && visibleSeverities.has(a.severity) &&
      visibleFields.has(a.field) && matchesDate(a.timestamp) && matchesNumeric(a),
    );
    return [...new Set(subset.map((a) => a.meterId))].sort();
  }, [alerts, visibleBuildings, visibleOperators, visibleTypes, visibleSeverities, visibleFields, matchesDate, matchesNumeric]);

  const availableTypes = useMemo(() => {
    const subset = alerts.filter((a) =>
      visibleBuildings.has(a.buildingName) && visibleOperators.has(a.storeName) &&
      visibleMeterIds.has(a.meterId) && visibleSeverities.has(a.severity) &&
      visibleFields.has(a.field) && matchesDate(a.timestamp) && matchesNumeric(a),
    );
    return [...new Set(subset.map((a) => a.alertType))].sort();
  }, [alerts, visibleBuildings, visibleOperators, visibleMeterIds, visibleSeverities, visibleFields, matchesDate, matchesNumeric]);

  const availableSeverities = useMemo(() => {
    const subset = alerts.filter((a) =>
      visibleBuildings.has(a.buildingName) && visibleOperators.has(a.storeName) &&
      visibleMeterIds.has(a.meterId) && visibleTypes.has(a.alertType) &&
      visibleFields.has(a.field) && matchesDate(a.timestamp) && matchesNumeric(a),
    );
    return [...new Set(subset.map((a) => a.severity))].sort();
  }, [alerts, visibleBuildings, visibleOperators, visibleMeterIds, visibleTypes, visibleFields, matchesDate, matchesNumeric]);

  const availableFields = useMemo(() => {
    const subset = alerts.filter((a) =>
      visibleBuildings.has(a.buildingName) && visibleOperators.has(a.storeName) &&
      visibleMeterIds.has(a.meterId) && visibleTypes.has(a.alertType) &&
      visibleSeverities.has(a.severity) && matchesDate(a.timestamp) && matchesNumeric(a),
    );
    return [...new Set(subset.map((a) => a.field))].sort();
  }, [alerts, visibleBuildings, visibleOperators, visibleMeterIds, visibleTypes, visibleSeverities, matchesDate, matchesNumeric]);

  // Final filtered data
  const processed = useMemo(() => {
    return alerts.filter((a) =>
      visibleBuildings.has(a.buildingName) &&
      visibleOperators.has(a.storeName) &&
      visibleMeterIds.has(a.meterId) &&
      visibleTypes.has(a.alertType) &&
      visibleSeverities.has(a.severity) &&
      visibleFields.has(a.field) &&
      matchesDate(a.timestamp) &&
      matchesNumeric(a),
    );
  }, [alerts, visibleBuildings, visibleOperators, visibleMeterIds, visibleTypes, visibleSeverities, visibleFields, matchesDate, matchesNumeric]);

  const fmtAlertVal = useCallback((v: number) => v.toFixed(2), []);

  const columns: Column<Alert>[] = useMemo(() => [
    {
      label: 'Activo Inmobiliario',
      value: (r) => r.buildingName,
      align: 'left' as const,
      className: 'w-[10%]',
      sortKey: (r) => r.buildingName,
      headerRender: () => (
        <ColumnFilterDropdown
          label="Activo Inmobiliario"
          items={availableBuildings}
          visible={visibleBuildings}
          onToggle={toggleBuilding}
          onSelectAll={() => setVisibleBuildings(new Set(availableBuildings))}
          onDeselectAll={() => setVisibleBuildings(new Set())}
        />
      ),
    },
    {
      label: 'Operador',
      value: (r) => r.storeName || '–',
      align: 'left' as const,
      className: 'w-[10%]',
      sortKey: (r) => r.storeName,
      headerRender: () => (
        <ColumnFilterDropdown
          label="Operador"
          items={availableOperators}
          visible={visibleOperators}
          onToggle={toggleOperator}
          onSelectAll={() => setVisibleOperators(new Set(availableOperators))}
          onDeselectAll={() => setVisibleOperators(new Set())}
        />
      ),
    },
    {
      label: 'Medidor',
      value: (r) => r.meterId,
      align: 'left' as const,
      className: 'w-[7%]',
      sortKey: (r) => r.meterId,
      headerRender: () => (
        <ColumnFilterDropdown
          label="Medidor"
          items={availableMeterIds}
          visible={visibleMeterIds}
          onToggle={toggleMeterId}
          onSelectAll={() => setVisibleMeterIds(new Set(availableMeterIds))}
          onDeselectAll={() => setVisibleMeterIds(new Set())}
        />
      ),
    },
    {
      label: 'Fecha',
      value: (r) => new Date(r.timestamp).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' }),
      align: 'left' as const,
      className: 'w-[10%]',
      sortKey: (r) => r.timestamp,
      headerRender: () => (
        <DateFilterDropdown
          label="Fecha"
          activeFilter={dateFilter}
          onChangeFilter={setDateFilter}
        />
      ),
    },
    {
      label: 'Tipo',
      value: (r) => typeLabel[r.alertType] ?? r.alertType,
      align: 'left' as const,
      className: 'w-[11%]',
      sortKey: (r) => r.alertType,
      headerRender: () => (
        <ColumnFilterDropdown
          label="Tipo"
          items={availableTypes}
          visible={visibleTypes}
          onToggle={toggleType}
          onSelectAll={() => setVisibleTypes(new Set(availableTypes))}
          onDeselectAll={() => setVisibleTypes(new Set())}
        />
      ),
    },
    {
      label: 'Severidad',
      value: (r) => (<span className={severityClass[r.severity] ?? ''}>{severityLabel[r.severity] ?? r.severity}</span>),
      align: 'left' as const,
      className: 'w-[8%]',
      sortKey: (r) => r.severity,
      headerRender: () => (
        <ColumnFilterDropdown
          label="Severidad"
          items={availableSeverities}
          visible={visibleSeverities}
          onToggle={toggleSeverity}
          onSelectAll={() => setVisibleSeverities(new Set(availableSeverities))}
          onDeselectAll={() => setVisibleSeverities(new Set())}
        />
      ),
    },
    {
      label: 'Campo',
      value: (r) => r.field,
      align: 'left' as const,
      className: 'w-[8%]',
      sortKey: (r) => r.field,
      headerRender: () => (
        <ColumnFilterDropdown
          label="Campo"
          items={availableFields}
          visible={visibleFields}
          onToggle={toggleField}
          onSelectAll={() => setVisibleFields(new Set(availableFields))}
          onDeselectAll={() => setVisibleFields(new Set())}
        />
      ),
    },
    {
      label: 'Valor',
      value: (r) => r.value?.toFixed(2) ?? '–',
      className: 'w-[6%]',
      sortKey: (r) => r.value,
      headerRender: () => (
        <RangeFilterDropdown
          label="Valor"
          dataMin={valMin}
          dataMax={valMax}
          activeRange={valRange}
          onChangeRange={setValRange}
          format={fmtAlertVal}
        />
      ),
    },
    {
      label: 'Umbral',
      value: (r) => r.threshold?.toFixed(2) ?? '–',
      className: 'w-[6%]',
      sortKey: (r) => r.threshold,
      headerRender: () => (
        <RangeFilterDropdown
          label="Umbral"
          dataMin={thrMin}
          dataMax={thrMax}
          activeRange={thrRange}
          onChangeRange={setThrRange}
          format={fmtAlertVal}
        />
      ),
    },
    { label: 'Mensaje', value: (r) => r.message ?? '–', align: 'left' as const, className: 'w-[24%] truncate' },
  ], [
    availableBuildings, visibleBuildings, toggleBuilding,
    availableOperators, visibleOperators, toggleOperator,
    availableMeterIds, visibleMeterIds, toggleMeterId,
    dateFilter,
    availableTypes, visibleTypes, toggleType,
    availableSeverities, visibleSeverities, toggleSeverity,
    availableFields, visibleFields, toggleField,
    valMin, valMax, valRange, fmtAlertVal,
    thrMin, thrMax, thrRange,
  ]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-pa-text-muted">
        Cargando alertas...
      </div>
    );
  }

  return (
    <DataTable
      data={processed}
      columns={columns}
      rowKey={(r) => String(r.id)}
      pageSize={30}
      maxHeight=""
      emptyMessage="Sin alertas detectadas"
      tableClassName="table-fixed"
    />
  );
}

// =============================================================================
// Main page
// =============================================================================

type Tab = 'monitoring' | 'alerts';

const tabOptions: { value: Tab; label: string }[] = [
  { value: 'monitoring', label: 'Monitoreo' },
  { value: 'alerts', label: 'Alertas' },
];

export function RealtimePage() {
  const { isFilteredMode, needsSelection, operatorMeterIds } = useOperatorFilter();
  const [activeTab, setActiveTab] = useState<Tab>('monitoring');

  if (needsSelection) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-pa-text-muted">Selecciona un operador o tienda en el sidebar para ver sus medidores.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <SectionBanner title="Monitoreo" className="mb-3 flex-wrap justify-between gap-2">
          <TogglePills options={tabOptions} value={activeTab} onChange={setActiveTab} />
        </SectionBanner>
        {activeTab === 'monitoring' ? (
          <MonitoringTab operatorMeterIds={operatorMeterIds} isFilteredMode={isFilteredMode} />
        ) : (
          <AlertsTab operatorMeterIds={operatorMeterIds} isFilteredMode={isFilteredMode} />
        )}
      </Card>
    </div>
  );
}
