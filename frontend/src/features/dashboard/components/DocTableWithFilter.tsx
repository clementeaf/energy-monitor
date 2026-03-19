import { useState, useMemo, useEffect } from 'react';
import { ColumnFilterDropdown } from '../../../components/ui/ColumnFilterDropdown';
import { DataTable, type Column } from '../../../components/ui/DataTable';
import { DateFilterDropdown, type DateFilter } from '../../../components/ui/DateFilterDropdown';
import { RangeFilterDropdown, type NumericRange } from '../../../components/ui/RangeFilterDropdown';
import { fmtClp, fmtDate } from '../../../lib/formatters';
import { PdfActions } from './PdfActions';
import type { BillingDocumentDetail } from '../../../types';

const OVERDUE_PERIODS = [
  { value: 'all', label: 'Todos' },
  { value: '1-30', label: '1-30 días' },
  { value: '31-60', label: '31-60 días' },
  { value: '61-90', label: '61-90 días' },
  { value: '90+', label: '90+ días' },
];

const PERIOD_RANGES: Record<string, (days: number) => boolean> = {
  '1-30': (d) => d >= 1 && d <= 30,
  '31-60': (d) => d >= 31 && d <= 60,
  '61-90': (d) => d >= 61 && d <= 90,
  '90+': (d) => d > 90,
};

function daysOverdue(dueDate: string): number {
  const due = new Date(dueDate);
  const now = new Date();
  return Math.max(0, Math.floor((now.getTime() - due.getTime()) / 86_400_000));
}

function matchesPeriod(dueDate: string, period: string): boolean {
  return period === 'all' || (PERIOD_RANGES[period]?.(daysOverdue(dueDate)) ?? true);
}

export function DocTableWithFilter({
  data,
  showPeriodFilter,
  initialPeriod,
}: {
  data: BillingDocumentDetail[];
  showPeriodFilter?: boolean;
  initialPeriod?: string | null;
}) {
  const allBuildings = useMemo(() => [...new Set(data.map((r) => r.buildingName))].sort(), [data]);
  const allOperators = useMemo(() => [...new Set(data.map((r) => r.operatorName))].sort(), [data]);
  const allDocs = useMemo(() => [...new Set(data.map((r) => r.docNumber))].sort(), [data]);

  const [visibleBuildings, setVisibleBuildings] = useState<Set<string>>(() => new Set(allBuildings));
  const [visibleOperators, setVisibleOperators] = useState<Set<string>>(() => new Set(allOperators));
  const [visibleDocs, setVisibleDocs] = useState<Set<string>>(() => new Set(allDocs));
  const [dateFilter, setDateFilter] = useState<DateFilter>({ type: 'all' });
  const netoValues = useMemo(() => data.map((r) => r.totalNetoClp ?? 0), [data]);
  const netoMin = useMemo(() => Math.min(...netoValues), [netoValues]);
  const netoMax = useMemo(() => Math.max(...netoValues), [netoValues]);
  const [netoRange, setNetoRange] = useState<NumericRange>({ min: netoMin, max: netoMax });
  useEffect(() => { setNetoRange({ min: netoMin, max: netoMax }); }, [netoMin, netoMax]);

  const ivaValues = useMemo(() => data.map((r) => r.ivaClp ?? 0), [data]);
  const ivaMin = useMemo(() => Math.min(...ivaValues), [ivaValues]);
  const ivaMax = useMemo(() => Math.max(...ivaValues), [ivaValues]);
  const [ivaRange, setIvaRange] = useState<NumericRange>({ min: ivaMin, max: ivaMax });
  useEffect(() => { setIvaRange({ min: ivaMin, max: ivaMax }); }, [ivaMin, ivaMax]);

  const totalValues = useMemo(() => data.map((r) => r.totalClp), [data]);
  const totalMin = useMemo(() => Math.min(...totalValues), [totalValues]);
  const totalMax = useMemo(() => Math.max(...totalValues), [totalValues]);
  const [totalRange, setTotalRange] = useState<NumericRange>({ min: totalMin, max: totalMax });
  useEffect(() => { setTotalRange({ min: totalMin, max: totalMax }); }, [totalMin, totalMax]);
  const [period, setPeriod] = useState(initialPeriod ?? 'all');

  const buildingsKey = allBuildings.join('\0');
  const operatorsKey = allOperators.join('\0');
  const docsKey = allDocs.join('\0');
  useEffect(() => { setVisibleBuildings(new Set(allBuildings)); }, [buildingsKey]);
  useEffect(() => { setVisibleOperators(new Set(allOperators)); }, [operatorsKey]);
  useEffect(() => { setVisibleDocs(new Set(allDocs)); }, [docsKey]);

  useEffect(() => {
    if (initialPeriod != null) setPeriod(initialPeriod);
  }, [initialPeriod]);

  function matchesDateFilter(dueDate: string): boolean {
    if (dateFilter.type === 'all') return true;
    const d = dueDate.slice(0, 10);
    if (dateFilter.type === 'exact') return d === dateFilter.date;
    return d >= dateFilter.from && d <= dateFilter.to;
  }

  function matchesNumeric(r: BillingDocumentDetail): boolean {
    return (r.totalNetoClp ?? 0) >= netoRange.min &&
      (r.totalNetoClp ?? 0) <= netoRange.max &&
      (r.ivaClp ?? 0) >= ivaRange.min &&
      (r.ivaClp ?? 0) <= ivaRange.max &&
      r.totalClp >= totalRange.min &&
      r.totalClp <= totalRange.max;
  }

  function matchesPeriodFilter(r: BillingDocumentDetail): boolean {
    return !showPeriodFilter || matchesPeriod(r.dueDate, period);
  }

  const availableBuildings = useMemo(() => {
    const subset = data.filter((r) =>
      visibleOperators.has(r.operatorName) && visibleDocs.has(r.docNumber) &&
      matchesDateFilter(r.dueDate) && matchesNumeric(r) && matchesPeriodFilter(r),
    );
    return [...new Set(subset.map((r) => r.buildingName))].sort();
  }, [data, visibleOperators, visibleDocs, dateFilter, netoRange, ivaRange, totalRange, period]);

  const availableOperators = useMemo(() => {
    const subset = data.filter((r) =>
      visibleBuildings.has(r.buildingName) && visibleDocs.has(r.docNumber) &&
      matchesDateFilter(r.dueDate) && matchesNumeric(r) && matchesPeriodFilter(r),
    );
    return [...new Set(subset.map((r) => r.operatorName))].sort();
  }, [data, visibleBuildings, visibleDocs, dateFilter, netoRange, ivaRange, totalRange, period]);

  const availableDocs = useMemo(() => {
    const subset = data.filter((r) =>
      visibleBuildings.has(r.buildingName) && visibleOperators.has(r.operatorName) &&
      matchesDateFilter(r.dueDate) && matchesNumeric(r) && matchesPeriodFilter(r),
    );
    return [...new Set(subset.map((r) => r.docNumber))].sort();
  }, [data, visibleBuildings, visibleOperators, dateFilter, netoRange, ivaRange, totalRange, period]);

  function handleToggleBuilding(b: string) {
    setVisibleBuildings((prev) => {
      const next = new Set(prev);
      if (next.has(b)) next.delete(b); else next.add(b);
      return next;
    });
  }

  function handleToggleOperator(o: string) {
    setVisibleOperators((prev) => {
      const next = new Set(prev);
      if (next.has(o)) next.delete(o); else next.add(o);
      return next;
    });
  }

  function handleToggleDoc(d: string) {
    setVisibleDocs((prev) => {
      const next = new Set(prev);
      if (next.has(d)) next.delete(d); else next.add(d);
      return next;
    });
  }

  const filtered = data.filter((r) =>
    visibleBuildings.has(r.buildingName) &&
    visibleOperators.has(r.operatorName) &&
    visibleDocs.has(r.docNumber) &&
    matchesDateFilter(r.dueDate) &&
    matchesNumeric(r) &&
    matchesPeriodFilter(r),
  );

  const columns: Column<BillingDocumentDetail>[] = useMemo(() => [
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
          onToggle={handleToggleBuilding}
          onSelectAll={() => setVisibleBuildings(new Set(availableBuildings))}
          onDeselectAll={() => setVisibleBuildings(new Set())}
        />
      ),
    },
    {
      label: 'Operador',
      value: (r) => r.operatorName,
      align: 'left' as const,
      sortKey: (r) => r.operatorName,
      headerRender: () => (
        <ColumnFilterDropdown
          label="Operador"
          items={availableOperators}
          visible={visibleOperators}
          onToggle={handleToggleOperator}
          onSelectAll={() => setVisibleOperators(new Set(availableOperators))}
          onDeselectAll={() => setVisibleOperators(new Set())}
        />
      ),
    },
    {
      label: 'N° Doc',
      value: (r) => r.docNumber,
      align: 'left' as const,
      sortKey: (r) => r.docNumber,
      headerRender: () => (
        <ColumnFilterDropdown
          label="N° Doc"
          items={availableDocs}
          visible={visibleDocs}
          onToggle={handleToggleDoc}
          onSelectAll={() => setVisibleDocs(new Set(availableDocs))}
          onDeselectAll={() => setVisibleDocs(new Set())}
        />
      ),
    },
    {
      label: 'Vencimiento',
      value: (r) => fmtDate(r.dueDate),
      className: 'whitespace-nowrap',
      sortKey: (r) => r.dueDate,
      headerRender: () => (
        <DateFilterDropdown
          label="Vencimiento"
          activeFilter={dateFilter}
          onChangeFilter={setDateFilter}
        />
      ),
    },
    {
      label: 'Neto',
      value: (r) => fmtClp(r.totalNetoClp),
      total: (d) => fmtClp(d.reduce((s, r) => s + (r.totalNetoClp ?? 0), 0)),
      sortKey: (r) => r.totalNetoClp,
      headerRender: () => (
        <RangeFilterDropdown
          label="Neto"
          dataMin={netoMin}
          dataMax={netoMax}
          activeRange={netoRange}
          onChangeRange={setNetoRange}
          format={fmtClp}
        />
      ),
    },
    {
      label: 'IVA',
      value: (r) => fmtClp(r.ivaClp),
      total: (d) => fmtClp(d.reduce((s, r) => s + (r.ivaClp ?? 0), 0)),
      sortKey: (r) => r.ivaClp,
      headerRender: () => (
        <RangeFilterDropdown
          label="IVA"
          dataMin={ivaMin}
          dataMax={ivaMax}
          activeRange={ivaRange}
          onChangeRange={setIvaRange}
          format={fmtClp}
        />
      ),
    },
    {
      label: 'Total',
      value: (r) => fmtClp(r.totalClp),
      total: (d) => fmtClp(d.reduce((s, r) => s + r.totalClp, 0)),
      sortKey: (r) => r.totalClp,
      headerRender: () => (
        <RangeFilterDropdown
          label="Total"
          dataMin={totalMin}
          dataMax={totalMax}
          activeRange={totalRange}
          onChangeRange={setTotalRange}
          format={fmtClp}
        />
      ),
    },
    { label: 'PDF', value: (r) => <PdfActions row={r} />, align: 'center' as const, className: 'w-20' },
  ], [availableBuildings, visibleBuildings, availableOperators, visibleOperators, availableDocs, visibleDocs, dateFilter, netoMin, netoMax, netoRange, ivaMin, ivaMax, ivaRange, totalMin, totalMax, totalRange]);

  return (
    <div className="flex h-full flex-col gap-2">
      {showPeriodFilter && (
        <div className="flex gap-1">
          {OVERDUE_PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                period === p.value
                  ? 'bg-pa-navy text-white'
                  : 'bg-gray-100 text-pa-text-muted hover:bg-gray-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}
      <div className="min-h-0 flex-1">
        <DataTable
          data={filtered}
          columns={columns}
          rowKey={(r) => r.docNumber}
          footer
          maxHeight="max-h-full"
        />
      </div>
    </div>
  );
}
