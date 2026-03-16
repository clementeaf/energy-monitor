import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router';
import { Card } from '../../components/ui/Card';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { SectionBanner } from '../../components/ui/SectionBanner';
import { Skeleton } from '../../components/ui/Skeleton';
import { TogglePills } from '../../components/ui/TogglePills';
import { useAllMetersLatest } from '../../hooks/queries/useMeters';
import { useBuildings } from '../../hooks/queries/useBuildings';
import { useAlerts } from '../../hooks/queries/useAlerts';
import { useClickOutside } from '../../hooks/useClickOutside';
import { useOperatorFilter } from '../../hooks/useOperatorFilter';
import type { MeterLatestReading, Alert } from '../../types';

// =============================================================================
// Monitoring tab helpers
// =============================================================================

function formatVal(v: number | null, decimals = 1): string {
  return v !== null ? v.toFixed(decimals) : '—';
}

function getStatus(row: MeterLatestReading): { label: string; color: string } {
  const age = Date.now() - new Date(row.timestamp).getTime();
  if (age < 30 * 60_000) return { label: 'Online', color: 'text-emerald-600 bg-emerald-50' };
  if (age < 120 * 60_000) return { label: 'Delay', color: 'text-amber-600 bg-amber-50' };
  return { label: 'Offline', color: 'text-red-600 bg-red-50' };
}

const skeletonColumns = ['Medidor', 'Tienda', 'Potencia (kW)', 'Voltaje L1 (V)', 'Corriente L1 (A)', 'FP', 'Estado'];

function SkeletonRows() {
  return (
    <div className="overflow-auto">
      <table className="min-w-full text-sm">
        <thead className="sticky top-0 z-10 bg-white">
          <tr className="border-b border-pa-border">
            {skeletonColumns.map((col, i) => (
              <th
                key={col}
                className={`whitespace-nowrap px-3 py-2.5 text-[13px] font-semibold text-pa-navy ${i === 0 || i === 1 ? 'text-left' : 'text-right'}`}
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
                <td key={col} className={`px-3 py-3 ${j === 0 || j === 1 ? 'text-left' : 'text-right'}`}>
                  <Skeleton className={`inline-block h-4 ${j === 0 ? 'w-16' : j === 1 ? 'w-28' : j === 6 ? 'w-14 rounded-full' : 'w-12'}`} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const baseMeterColumns: Column<MeterLatestReading>[] = [
  { label: 'Medidor', value: (r) => r.meterId, align: 'left' },
  { label: 'Tienda', value: (r) => r.storeName, align: 'left' },
  { label: 'Potencia (kW)', value: (r) => formatVal(r.powerKw) },
  { label: 'Voltaje L1 (V)', value: (r) => formatVal(r.voltageL1) },
  { label: 'Corriente L1 (A)', value: (r) => formatVal(r.currentL1, 2) },
  { label: 'FP', value: (r) => formatVal(r.powerFactor, 3) },
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
  },
];

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

function ChevronDown({ className = 'h-3 w-3 opacity-50' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 5l3 3 3-3" />
    </svg>
  );
}

function useAnchorPos(btnRef: React.RefObject<HTMLElement | null>, open: boolean) {
  const [pos, setPos] = useState({ top: 0, left: 0 });
  useEffect(() => {
    if (!open || !btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 4, left: rect.left });
  }, [btnRef, open]);
  return pos;
}

function FilterDropdown({
  label,
  options,
  selected,
  onToggle,
  displayFn,
}: {
  label: string;
  options: string[];
  selected: Set<string>;
  onToggle: (value: string) => void;
  displayFn?: (value: string) => string;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  useClickOutside([btnRef, panelRef], () => setOpen(false), open);
  const pos = useAnchorPos(btnRef, open);

  const active = selected.size > 0 && selected.size < options.length;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1 ${active ? 'text-pa-blue' : ''}`}
      >
        {label}
        {active && <span className="text-xs font-normal">({selected.size})</span>}
        <ChevronDown />
      </button>
      {open && createPortal(
        <div
          ref={panelRef}
          className="fixed z-50 max-h-60 min-w-40 overflow-auto rounded border border-pa-border bg-white shadow-lg"
          style={{ top: pos.top, left: pos.left }}
        >
          {options.map((opt) => (
            <label
              key={opt}
              className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-[13px] font-normal text-pa-text hover:bg-gray-100"
            >
              <input
                type="checkbox"
                checked={selected.has(opt)}
                onChange={() => onToggle(opt)}
                className="accent-pa-blue"
              />
              {displayFn ? displayFn(opt) : opt}
            </label>
          ))}
        </div>,
        document.body,
      )}
    </>
  );
}

// Date filter types & constants

type SortDir = 'asc' | 'desc' | null;
type DateMode = 'exact' | 'range' | null;
type TimeMode = 'exact' | 'range' | null;

interface DateFilterState {
  sort: SortDir;
  dateMode: DateMode;
  dateExact: string;
  dateFrom: string;
  dateTo: string;
  timeMode: TimeMode;
  timeExact: string;
  timeFrom: string;
  timeTo: string;
}

const EMPTY_DATE_FILTER: DateFilterState = {
  sort: null, dateMode: null, dateExact: '', dateFrom: '', dateTo: '',
  timeMode: null, timeExact: '', timeFrom: '', timeTo: '',
};

function isDateFilterActive(f: DateFilterState): boolean {
  return f.sort !== null || f.dateMode !== null || f.timeMode !== null;
}

const sectionTitle = 'mb-1 text-xs font-semibold uppercase tracking-wide text-pa-text-muted';
const radioBtn = 'flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-[13px] text-pa-text hover:bg-gray-100';
const inputClass = 'w-full rounded border border-pa-border bg-white px-2 py-1 text-[13px] text-pa-text focus:border-pa-blue focus:outline-none';
const clearBtn = 'mt-2 w-full rounded bg-gray-100 px-2 py-1.5 text-xs text-pa-text-muted hover:text-pa-text transition-colors';

function DateFilterDropdown({
  state,
  onChange,
}: {
  state: DateFilterState;
  onChange: (next: DateFilterState) => void;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  useClickOutside([btnRef, panelRef], () => setOpen(false), open);
  const pos = useAnchorPos(btnRef, open);

  const active = isDateFilterActive(state);
  const patch = (partial: Partial<DateFilterState>) => onChange({ ...state, ...partial });

  const setDateMode = (mode: DateMode) => {
    if (mode === state.dateMode) patch({ dateMode: null, dateExact: '', dateFrom: '', dateTo: '' });
    else if (mode === 'exact') patch({ dateMode: 'exact', dateFrom: '', dateTo: '' });
    else patch({ dateMode: 'range', dateExact: '' });
  };

  const setTimeMode = (mode: TimeMode) => {
    if (mode === state.timeMode) patch({ timeMode: null, timeExact: '', timeFrom: '', timeTo: '' });
    else if (mode === 'exact') patch({ timeMode: 'exact', timeFrom: '', timeTo: '' });
    else patch({ timeMode: 'range', timeExact: '' });
  };

  const setSortDir = (dir: SortDir) => patch({ sort: state.sort === dir ? null : dir });
  const clear = () => onChange(EMPTY_DATE_FILTER);

  let badge = '';
  const parts: string[] = [];
  if (state.sort) parts.push(state.sort === 'asc' ? '↑' : '↓');
  if (state.dateMode === 'exact' && state.dateExact) parts.push(state.dateExact);
  if (state.dateMode === 'range' && (state.dateFrom || state.dateTo)) parts.push('rango');
  if (state.timeMode === 'exact' && state.timeExact) parts.push(state.timeExact);
  if (state.timeMode === 'range' && (state.timeFrom || state.timeTo)) parts.push('hrs');
  if (parts.length) badge = parts.join(' · ');

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1 ${active ? 'text-pa-blue' : ''}`}
      >
        Fecha
        {badge && <span className="text-xs font-normal">({badge})</span>}
        <ChevronDown />
      </button>

      {open && createPortal(
        <div
          ref={panelRef}
          className="fixed z-50 w-64 rounded border border-pa-border bg-white shadow-lg"
          style={{ top: pos.top, left: pos.left }}
        >
          <div className="space-y-3 p-3">
            <div>
              <div className={sectionTitle}>Ordenar</div>
              <div className="flex gap-1">
                <label className={radioBtn}>
                  <input type="checkbox" checked={state.sort === 'asc'} onChange={() => setSortDir('asc')} className="accent-pa-blue" />
                  Ascendente
                </label>
                <label className={radioBtn}>
                  <input type="checkbox" checked={state.sort === 'desc'} onChange={() => setSortDir('desc')} className="accent-pa-blue" />
                  Descendente
                </label>
              </div>
            </div>

            <hr className="border-pa-border" />

            <div>
              <div className={sectionTitle}>Filtrar por fecha</div>
              <div className="space-y-2">
                <label className={radioBtn}>
                  <input type="checkbox" checked={state.dateMode === 'exact'} onChange={() => setDateMode('exact')} className="accent-pa-blue" />
                  Fecha exacta
                </label>
                {state.dateMode === 'exact' && (
                  <input type="date" value={state.dateExact} onChange={(e) => patch({ dateExact: e.target.value })} className={inputClass} />
                )}
                <label className={radioBtn}>
                  <input type="checkbox" checked={state.dateMode === 'range'} onChange={() => setDateMode('range')} className="accent-pa-blue" />
                  Rango de fechas
                </label>
                {state.dateMode === 'range' && (
                  <div className="flex items-center gap-2">
                    <input type="date" value={state.dateFrom} onChange={(e) => patch({ dateFrom: e.target.value })} className={inputClass} />
                    <span className="text-xs text-pa-text-muted">–</span>
                    <input type="date" value={state.dateTo} onChange={(e) => patch({ dateTo: e.target.value })} className={inputClass} />
                  </div>
                )}
              </div>
            </div>

            <hr className="border-pa-border" />

            <div>
              <div className={sectionTitle}>Filtrar por hora</div>
              <div className="space-y-2">
                <label className={radioBtn}>
                  <input type="checkbox" checked={state.timeMode === 'exact'} onChange={() => setTimeMode('exact')} className="accent-pa-blue" />
                  Hora exacta
                </label>
                {state.timeMode === 'exact' && (
                  <input type="time" value={state.timeExact} onChange={(e) => patch({ timeExact: e.target.value })} className={inputClass} />
                )}
                <label className={radioBtn}>
                  <input type="checkbox" checked={state.timeMode === 'range'} onChange={() => setTimeMode('range')} className="accent-pa-blue" />
                  Rango de horas
                </label>
                {state.timeMode === 'range' && (
                  <div className="flex items-center gap-2">
                    <input type="time" value={state.timeFrom} onChange={(e) => patch({ timeFrom: e.target.value })} className={inputClass} />
                    <span className="text-xs text-pa-text-muted">–</span>
                    <input type="time" value={state.timeTo} onChange={(e) => patch({ timeTo: e.target.value })} className={inputClass} />
                  </div>
                )}
              </div>
            </div>

            {active && (
              <button type="button" onClick={clear} className={clearBtn}>
                Limpiar filtros de fecha
              </button>
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

// Date filter pure functions

function toLocalDate(ts: string): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function toLocalTime(ts: string): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function passesDateFilter(ts: string, f: DateFilterState): boolean {
  if (f.dateMode === 'exact' && f.dateExact) {
    if (toLocalDate(ts) !== f.dateExact) return false;
  }
  if (f.dateMode === 'range') {
    const d = toLocalDate(ts);
    if (f.dateFrom && d < f.dateFrom) return false;
    if (f.dateTo && d > f.dateTo) return false;
  }
  if (f.timeMode === 'exact' && f.timeExact) {
    if (toLocalTime(ts) !== f.timeExact) return false;
  }
  if (f.timeMode === 'range') {
    const t = toLocalTime(ts);
    if (f.timeFrom && t < f.timeFrom) return false;
    if (f.timeTo && t > f.timeTo) return false;
  }
  return true;
}

function applySortDir(data: Alert[], dir: SortDir): Alert[] {
  if (!dir) return data;
  const sorted = [...data];
  sorted.sort((a, b) => {
    const ta = new Date(a.timestamp).getTime();
    const tb = new Date(b.timestamp).getTime();
    return dir === 'asc' ? ta - tb : tb - ta;
  });
  return sorted;
}

type FilterKey = 'meterId' | 'buildingName' | 'storeName' | 'alertType' | 'severity' | 'field' | 'threshold';
type Filters = Record<FilterKey, Set<string>>;

// =============================================================================
// Alerts tab content
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

  const initialFilters = useMemo((): Filters => {
    const base: Filters = { meterId: new Set(), buildingName: new Set(), storeName: new Set(), alertType: new Set(), severity: new Set(), field: new Set(), threshold: new Set() };
    const qMeterId = searchParams.get('meter_id');
    if (qMeterId) base.meterId = new Set([qMeterId]);
    return base;
  }, [searchParams]);

  const initialDateFilter = useMemo((): DateFilterState => {
    const qDate = searchParams.get('date');
    const qDateFrom = searchParams.get('date_from');
    const qDateTo = searchParams.get('date_to');
    if (qDate) return { ...EMPTY_DATE_FILTER, dateMode: 'exact', dateExact: qDate };
    if (qDateFrom || qDateTo) return { ...EMPTY_DATE_FILTER, dateMode: 'range', dateFrom: qDateFrom ?? '', dateTo: qDateTo ?? '' };
    return EMPTY_DATE_FILTER;
  }, [searchParams]);

  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [dateFilter, setDateFilter] = useState<DateFilterState>(initialDateFilter);

  const uniqueValues = useMemo(() => {
    const sets: Record<FilterKey, Set<string>> = {
      meterId: new Set(), buildingName: new Set(), storeName: new Set(), alertType: new Set(), severity: new Set(), field: new Set(), threshold: new Set(),
    };
    for (const a of alerts) {
      sets.meterId.add(a.meterId);
      if (a.buildingName) sets.buildingName.add(a.buildingName);
      if (a.storeName) sets.storeName.add(a.storeName);
      sets.alertType.add(a.alertType);
      sets.severity.add(a.severity);
      sets.field.add(a.field);
      if (a.threshold != null) sets.threshold.add(String(a.threshold));
    }
    return Object.fromEntries(
      Object.entries(sets).map(([k, s]) => [k, [...s].sort()]),
    ) as Record<FilterKey, string[]>;
  }, [alerts]);

  const toggle = useCallback((key: FilterKey, value: string) => {
    setFilters((prev) => {
      const next = new Set(prev[key]);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return { ...prev, [key]: next };
    });
  }, []);

  const processed = useMemo(() => {
    let result = alerts;
    result = result.filter((a) => {
      if (filters.meterId.size && !filters.meterId.has(a.meterId)) return false;
      if (filters.buildingName.size && !filters.buildingName.has(a.buildingName)) return false;
      if (filters.storeName.size && !filters.storeName.has(a.storeName)) return false;
      if (filters.alertType.size && !filters.alertType.has(a.alertType)) return false;
      if (filters.severity.size && !filters.severity.has(a.severity)) return false;
      if (filters.field.size && !filters.field.has(a.field)) return false;
      if (filters.threshold.size && !filters.threshold.has(String(a.threshold))) return false;
      return true;
    });
    if (dateFilter.dateMode || dateFilter.timeMode) {
      result = result.filter((a) => passesDateFilter(a.timestamp, dateFilter));
    }
    result = applySortDir(result, dateFilter.sort);
    return result;
  }, [alerts, filters, dateFilter]);

  const makeHeaderRender = useCallback(
    (label: string, key: FilterKey, displayFn?: (v: string) => string) => () => (
      <FilterDropdown
        label={label}
        options={uniqueValues[key]}
        selected={filters[key]}
        onToggle={(v) => toggle(key, v)}
        displayFn={displayFn}
      />
    ),
    [uniqueValues, filters, toggle],
  );

  const columns: Column<Alert>[] = useMemo(() => [
    { label: 'Edificio', value: (r) => r.buildingName, align: 'left', headerRender: makeHeaderRender('Edificio', 'buildingName'), className: 'w-[10%]' },
    { label: 'Operador', value: (r) => r.storeName || '–', align: 'left', headerRender: makeHeaderRender('Operador', 'storeName'), className: 'w-[10%]' },
    { label: 'Medidor', value: (r) => r.meterId, align: 'left', headerRender: makeHeaderRender('Medidor', 'meterId'), className: 'w-[7%]' },
    {
      label: 'Fecha',
      value: (r) => new Date(r.timestamp).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' }),
      align: 'left',
      headerRender: () => <DateFilterDropdown state={dateFilter} onChange={setDateFilter} />,
      className: 'w-[10%]',
    },
    { label: 'Tipo', value: (r) => typeLabel[r.alertType] ?? r.alertType, align: 'left', headerRender: makeHeaderRender('Tipo', 'alertType', (v) => typeLabel[v] ?? v), className: 'w-[11%]' },
    {
      label: 'Severidad',
      value: (r) => (<span className={severityClass[r.severity] ?? ''}>{severityLabel[r.severity] ?? r.severity}</span>),
      align: 'left',
      headerRender: makeHeaderRender('Severidad', 'severity', (v) => severityLabel[v] ?? v),
      className: 'w-[8%]',
    },
    { label: 'Campo', value: (r) => r.field, align: 'left', headerRender: makeHeaderRender('Campo', 'field'), className: 'w-[8%]' },
    { label: 'Valor', value: (r) => r.value?.toFixed(2) ?? '–', className: 'w-[6%]' },
    { label: 'Umbral', value: (r) => r.threshold?.toFixed(2) ?? '–', headerRender: makeHeaderRender('Umbral', 'threshold'), className: 'w-[6%]' },
    { label: 'Mensaje', value: (r) => r.message ?? '–', align: 'left', className: 'w-[24%] truncate' },
  ], [makeHeaderRender, dateFilter]);

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
      infiniteScroll
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

function MonitoringTab({ operatorMeterIds, isFilteredMode }: { operatorMeterIds: Set<string> | null; isFilteredMode: boolean }) {
  const { data: buildings } = useBuildings();
  const buildingNames = useMemo(() => {
    if (!buildings) return [];
    return [...new Set(buildings.map((b) => b.buildingName))].sort();
  }, [buildings]);

  const { data: allMeters, isLoading, isError } = useAllMetersLatest(buildingNames);

  const [buildingFilter, setBuildingFilter] = useState<Set<string>>(new Set());

  const filteredData = useMemo(() => {
    let result = allMeters;
    if (isFilteredMode && operatorMeterIds) {
      result = result.filter((m) => operatorMeterIds.has(m.meterId));
    }
    if (buildingFilter.size > 0) {
      result = result.filter((m) => buildingFilter.has(m.buildingName));
    }
    return result;
  }, [allMeters, isFilteredMode, operatorMeterIds, buildingFilter]);

  const uniqueBuildings = useMemo(() => {
    return [...new Set(allMeters.map((m) => m.buildingName))].sort();
  }, [allMeters]);

  const toggleBuilding = useCallback((value: string) => {
    setBuildingFilter((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }, []);

  const columns: Column<MeterLatestReading>[] = useMemo(() => [
    {
      label: 'Edificio',
      value: (r) => r.buildingName,
      align: 'left' as const,
      headerRender: () => (
        <FilterDropdown
          label="Edificio"
          options={uniqueBuildings}
          selected={buildingFilter}
          onToggle={toggleBuilding}
        />
      ),
    },
    ...baseMeterColumns,
  ], [uniqueBuildings, buildingFilter, toggleBuilding]);

  if (isLoading) return <SkeletonRows />;

  return (
    <DataTable
      data={filteredData}
      columns={columns}
      rowKey={(r) => r.meterId}
      maxHeight=""
      pageSize={30}
      infiniteScroll
      emptyMessage={isError ? 'Error al cargar datos' : 'Sin datos'}
    />
  );
}

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
        <SectionBanner title="Monitoreo" className="mb-3 justify-between">
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
