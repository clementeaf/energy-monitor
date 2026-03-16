import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router';
import { useAlerts } from '../../hooks/queries/useAlerts';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { useClickOutside } from '../../hooks/useClickOutside';
import { useOperatorFilter } from '../../hooks/useOperatorFilter';
import type { Alert } from '../../types';

// =============================================================================
// Constants
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
// Chevron icon (shared)
// =============================================================================

function ChevronDown({ className = 'h-3 w-3 opacity-50' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 5l3 3 3-3" />
    </svg>
  );
}

// =============================================================================
// useAnchorPos — compute fixed position from a button ref
// =============================================================================

function useAnchorPos(btnRef: React.RefObject<HTMLElement | null>, open: boolean) {
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!open || !btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 4, left: rect.left });
  }, [btnRef, open]);

  return pos;
}

// =============================================================================
// FilterDropdown (checkbox-based, for Medidor/Tipo/Severidad/Campo/Umbral)
// =============================================================================

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

// =============================================================================
// DateFilter state type
// =============================================================================

type SortDir = 'asc' | 'desc' | null;
type DateMode = 'exact' | 'range' | null;
type TimeMode = 'exact' | 'range' | null;

interface DateFilterState {
  sort: SortDir;
  dateMode: DateMode;
  dateExact: string;       // YYYY-MM-DD
  dateFrom: string;        // YYYY-MM-DD
  dateTo: string;          // YYYY-MM-DD
  timeMode: TimeMode;
  timeExact: string;       // HH:MM
  timeFrom: string;        // HH:MM
  timeTo: string;          // HH:MM
}

const EMPTY_DATE_FILTER: DateFilterState = {
  sort: null,
  dateMode: null,
  dateExact: '',
  dateFrom: '',
  dateTo: '',
  timeMode: null,
  timeExact: '',
  timeFrom: '',
  timeTo: '',
};

function parseDateFilterFromParams(params: URLSearchParams): DateFilterState {
  const qDate = params.get('date');
  const qDateFrom = params.get('date_from');
  const qDateTo = params.get('date_to');
  if (qDate) return { ...EMPTY_DATE_FILTER, dateMode: 'exact', dateExact: qDate };
  if (qDateFrom || qDateTo) return { ...EMPTY_DATE_FILTER, dateMode: 'range', dateFrom: qDateFrom ?? '', dateTo: qDateTo ?? '' };
  return EMPTY_DATE_FILTER;
}

function isDateFilterActive(f: DateFilterState): boolean {
  return f.sort !== null || f.dateMode !== null || f.timeMode !== null;
}

// =============================================================================
// DateFilterDropdown
// =============================================================================

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
    if (mode === state.dateMode) {
      patch({ dateMode: null, dateExact: '', dateFrom: '', dateTo: '' });
    } else if (mode === 'exact') {
      patch({ dateMode: 'exact', dateFrom: '', dateTo: '' });
    } else {
      patch({ dateMode: 'range', dateExact: '' });
    }
  };

  const setTimeMode = (mode: TimeMode) => {
    if (mode === state.timeMode) {
      patch({ timeMode: null, timeExact: '', timeFrom: '', timeTo: '' });
    } else if (mode === 'exact') {
      patch({ timeMode: 'exact', timeFrom: '', timeTo: '' });
    } else {
      patch({ timeMode: 'range', timeExact: '' });
    }
  };

  const setSortDir = (dir: SortDir) => {
    patch({ sort: state.sort === dir ? null : dir });
  };

  const clear = () => {
    onChange(EMPTY_DATE_FILTER);
  };

  // Badge summary
  const badgeRules: Array<{ test: () => boolean; label: () => string }> = [
    { test: () => !!state.sort, label: () => state.sort === 'asc' ? '↑' : '↓' },
    { test: () => state.dateMode === 'exact' && !!state.dateExact, label: () => state.dateExact },
    { test: () => state.dateMode === 'range' && !!(state.dateFrom || state.dateTo), label: () => 'rango' },
    { test: () => state.timeMode === 'exact' && !!state.timeExact, label: () => state.timeExact },
    { test: () => state.timeMode === 'range' && !!(state.timeFrom || state.timeTo), label: () => 'hrs' },
  ];
  const badge = badgeRules.filter((r) => r.test()).map((r) => r.label()).join(' · ');

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

            {/* ---- Sort ---- */}
            <div>
              <div className={sectionTitle}>Ordenar</div>
              <div className="flex gap-1">
                <label className={radioBtn}>
                  <input
                    type="checkbox"
                    checked={state.sort === 'asc'}
                    onChange={() => setSortDir('asc')}
                    className="accent-pa-blue"
                  />
                  Ascendente
                </label>
                <label className={radioBtn}>
                  <input
                    type="checkbox"
                    checked={state.sort === 'desc'}
                    onChange={() => setSortDir('desc')}
                    className="accent-pa-blue"
                  />
                  Descendente
                </label>
              </div>
            </div>

            <hr className="border-pa-border" />

            {/* ---- Date filter ---- */}
            <div>
              <div className={sectionTitle}>Filtrar por fecha</div>
              <div className="space-y-2">
                <label className={radioBtn}>
                  <input
                    type="checkbox"
                    checked={state.dateMode === 'exact'}
                    onChange={() => setDateMode('exact')}
                    className="accent-pa-blue"
                  />
                  Fecha exacta
                </label>
                {state.dateMode === 'exact' && (
                  <input
                    type="date"
                    value={state.dateExact}
                    onChange={(e) => patch({ dateExact: e.target.value })}
                    className={inputClass}
                  />
                )}

                <label className={radioBtn}>
                  <input
                    type="checkbox"
                    checked={state.dateMode === 'range'}
                    onChange={() => setDateMode('range')}
                    className="accent-pa-blue"
                  />
                  Rango de fechas
                </label>
                {state.dateMode === 'range' && (
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={state.dateFrom}
                      onChange={(e) => patch({ dateFrom: e.target.value })}
                      className={inputClass}
                      placeholder="Desde"
                    />
                    <span className="text-xs text-pa-text-muted">–</span>
                    <input
                      type="date"
                      value={state.dateTo}
                      onChange={(e) => patch({ dateTo: e.target.value })}
                      className={inputClass}
                      placeholder="Hasta"
                    />
                  </div>
                )}
              </div>
            </div>

            <hr className="border-pa-border" />

            {/* ---- Time filter ---- */}
            <div>
              <div className={sectionTitle}>Filtrar por hora</div>
              <div className="space-y-2">
                <label className={radioBtn}>
                  <input
                    type="checkbox"
                    checked={state.timeMode === 'exact'}
                    onChange={() => setTimeMode('exact')}
                    className="accent-pa-blue"
                  />
                  Hora exacta
                </label>
                {state.timeMode === 'exact' && (
                  <input
                    type="time"
                    value={state.timeExact}
                    onChange={(e) => patch({ timeExact: e.target.value })}
                    className={inputClass}
                  />
                )}

                <label className={radioBtn}>
                  <input
                    type="checkbox"
                    checked={state.timeMode === 'range'}
                    onChange={() => setTimeMode('range')}
                    className="accent-pa-blue"
                  />
                  Rango de horas
                </label>
                {state.timeMode === 'range' && (
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      value={state.timeFrom}
                      onChange={(e) => patch({ timeFrom: e.target.value })}
                      className={inputClass}
                    />
                    <span className="text-xs text-pa-text-muted">–</span>
                    <input
                      type="time"
                      value={state.timeTo}
                      onChange={(e) => patch({ timeTo: e.target.value })}
                      className={inputClass}
                    />
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

// =============================================================================
// Date filter logic (pure functions)
// =============================================================================

/** Extract YYYY-MM-DD from a timestamp string in local time */
function toLocalDate(ts: string): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Extract HH:MM from a timestamp string in local time */
function toLocalTime(ts: string): string {
  const d = new Date(ts);
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${min}`;
}

function passesDateFilter(ts: string, f: DateFilterState): boolean {
  // Date filters
  if (f.dateMode === 'exact' && f.dateExact) {
    if (toLocalDate(ts) !== f.dateExact) return false;
  }
  if (f.dateMode === 'range') {
    const d = toLocalDate(ts);
    if (f.dateFrom && d < f.dateFrom) return false;
    if (f.dateTo && d > f.dateTo) return false;
  }

  // Time filters
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

// =============================================================================
// Checkbox filters types
// =============================================================================

type FilterKey = 'meterId' | 'alertType' | 'severity' | 'field' | 'threshold';
type Filters = Record<FilterKey, Set<string>>;

// =============================================================================
// AlertsPage
// =============================================================================

export function AlertsPage() {
  const [searchParams] = useSearchParams();
  const { isFilteredMode, needsSelection, operatorMeterIds } = useOperatorFilter();
  const { data: rawAlerts = [], isLoading } = useAlerts();

  // Filter alerts to operator's meters in filtered modes
  const alerts = useMemo(() => {
    if (isFilteredMode && operatorMeterIds) {
      return rawAlerts.filter((a) => operatorMeterIds.has(a.meterId));
    }
    return rawAlerts;
  }, [rawAlerts, isFilteredMode, operatorMeterIds]);

  // Pre-set filters from URL query params (?meter_id=X&date=YYYY-MM-DD or &date_from=&date_to=)
  const initialFilters = useMemo((): Filters => {
    const base: Filters = { meterId: new Set(), alertType: new Set(), severity: new Set(), field: new Set(), threshold: new Set() };
    const qMeterId = searchParams.get('meter_id');
    if (qMeterId) base.meterId = new Set([qMeterId]);
    return base;
  }, [searchParams]);

  const initialDateFilter = useMemo(
    () => parseDateFilterFromParams(searchParams),
    [searchParams],
  );

  // Checkbox filters
  const [filters, setFilters] = useState<Filters>(initialFilters);

  // Date column filter
  const [dateFilter, setDateFilter] = useState<DateFilterState>(initialDateFilter);

  // Unique values per filterable column
  const uniqueValues = useMemo(() => {
    const sets: Record<FilterKey, Set<string>> = {
      meterId: new Set(),
      alertType: new Set(),
      severity: new Set(),
      field: new Set(),
      threshold: new Set(),
    };
    for (const a of alerts) {
      sets.meterId.add(a.meterId);
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

  // Pipeline: checkbox filters → date filter → sort
  const processed = useMemo(() => {
    let result = alerts;

    // 1. Checkbox filters
    const FILTER_CHECKS: Array<[FilterKey, (a: Alert) => string]> = [
      ['meterId', (a) => a.meterId],
      ['alertType', (a) => a.alertType],
      ['severity', (a) => a.severity],
      ['field', (a) => a.field],
      ['threshold', (a) => String(a.threshold)],
    ];
    result = result.filter((a) =>
      FILTER_CHECKS.every(([key, get]) => !filters[key].size || filters[key].has(get(a))),
    );

    // 2. Date/time filters
    if (dateFilter.dateMode || dateFilter.timeMode) {
      result = result.filter((a) => passesDateFilter(a.timestamp, dateFilter));
    }

    // 3. Sort
    result = applySortDir(result, dateFilter.sort);

    return result;
  }, [alerts, filters, dateFilter]);

  // Header render factories
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
    {
      label: 'Medidor',
      value: (r) => r.meterId,
      align: 'left',
      headerRender: makeHeaderRender('Medidor', 'meterId'),
      className: 'w-[8%]',
    },
    {
      label: 'Fecha',
      value: (r) => new Date(r.timestamp).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' }),
      align: 'left',
      headerRender: () => (
        <DateFilterDropdown state={dateFilter} onChange={setDateFilter} />
      ),
      className: 'w-[12%]',
    },
    {
      label: 'Tipo',
      value: (r) => typeLabel[r.alertType] ?? r.alertType,
      align: 'left',
      headerRender: makeHeaderRender('Tipo', 'alertType', (v) => typeLabel[v] ?? v),
      className: 'w-[13%]',
    },
    {
      label: 'Severidad',
      value: (r) => (
        <span className={severityClass[r.severity] ?? ''}>
          {severityLabel[r.severity] ?? r.severity}
        </span>
      ),
      align: 'left',
      headerRender: makeHeaderRender('Severidad', 'severity', (v) => severityLabel[v] ?? v),
      className: 'w-[10%]',
    },
    {
      label: 'Campo',
      value: (r) => r.field,
      align: 'left',
      headerRender: makeHeaderRender('Campo', 'field'),
      className: 'w-[10%]',
    },
    { label: 'Valor', value: (r) => r.value?.toFixed(2) ?? '–', className: 'w-[7%]' },
    {
      label: 'Umbral',
      value: (r) => r.threshold?.toFixed(2) ?? '–',
      headerRender: makeHeaderRender('Umbral', 'threshold'),
      className: 'w-[7%]',
    },
    { label: 'Mensaje', value: (r) => r.message ?? '–', align: 'left', className: 'w-[33%] truncate' },
  ], [makeHeaderRender, dateFilter]);

  if (needsSelection) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-pa-text-muted">Selecciona un operador o tienda en el sidebar para ver sus alertas.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-pa-text-muted">
        Cargando alertas...
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <div className="rounded-xl bg-white p-4">
        <DataTable
          data={processed}
          columns={columns}
          rowKey={(r) => String(r.id)}
          pageSize={10}
          maxHeight="max-h-[70vh]"
          emptyMessage="Sin alertas detectadas"
          tableClassName="table-fixed"
        />
      </div>
    </div>
  );
}
