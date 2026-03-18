import { useState, useRef } from 'react';
import { useClickOutside } from '../../hooks/useClickOutside';

export type DateFilter = { type: 'all' } | { type: 'exact'; date: string } | { type: 'range'; from: string; to: string };

export function DateFilterDropdown({
  label,
  onChangeFilter,
  activeFilter,
}: {
  label: string;
  onChangeFilter: (filter: DateFilter) => void;
  activeFilter: DateFilter;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'all' | 'exact' | 'range'>(activeFilter.type);
  const [exactDate, setExactDate] = useState(activeFilter.type === 'exact' ? activeFilter.date : '');
  const [fromDate, setFromDate] = useState(activeFilter.type === 'range' ? activeFilter.from : '');
  const [toDate, setToDate] = useState(activeFilter.type === 'range' ? activeFilter.to : '');
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false), open);

  const isFiltered = activeFilter.type !== 'all';

  function apply() {
    if (mode === 'exact' && exactDate) {
      onChangeFilter({ type: 'exact', date: exactDate });
    } else if (mode === 'range' && fromDate && toDate) {
      onChangeFilter({ type: 'range', from: fromDate, to: toDate });
    } else {
      onChangeFilter({ type: 'all' });
    }
    setOpen(false);
  }

  function clear() {
    setMode('all');
    setExactDate('');
    setFromDate('');
    setToDate('');
    onChangeFilter({ type: 'all' });
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 whitespace-nowrap font-medium transition-colors hover:text-text"
      >
        {label}
        <svg className="h-3 w-3 shrink-0 opacity-40" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
        {isFiltered && <span className="ml-0.5 h-1.5 w-1.5 rounded-full bg-blue-600" />}
      </button>

      {open && (
        <div className="absolute left-0 z-30 mt-1 w-64 rounded border border-border bg-white p-3 shadow-lg">
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="dateMode" checked={mode === 'all'} onChange={() => setMode('all')} className="accent-blue-600" />
              <span className="text-text">Todas</span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="dateMode" checked={mode === 'exact'} onChange={() => setMode('exact')} className="accent-blue-600" />
              <span className="text-text">Fecha exacta</span>
            </label>
            {mode === 'exact' && (
              <input
                type="date"
                value={exactDate}
                onChange={(e) => setExactDate(e.target.value)}
                className="rounded border border-border px-2 py-1 text-sm text-text outline-none focus:border-blue-400"
              />
            )}
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="dateMode" checked={mode === 'range'} onChange={() => setMode('range')} className="accent-blue-600" />
              <span className="text-text">Rango de fechas</span>
            </label>
            {mode === 'range' && (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-12 text-xs text-muted">Desde</span>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="w-full rounded border border-border px-2 py-1 text-sm text-text outline-none focus:border-blue-400"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-12 text-xs text-muted">Hasta</span>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="w-full rounded border border-border px-2 py-1 text-sm text-text outline-none focus:border-blue-400"
                  />
                </div>
              </div>
            )}
          </div>
          <div className="mt-3 flex justify-between">
            <button onClick={clear} className="text-xs text-muted hover:text-text transition-colors">Limpiar</button>
            <button onClick={apply} className="rounded bg-pa-navy px-3 py-1 text-xs font-medium text-white hover:bg-pa-navy/90 transition-colors">Aplicar</button>
          </div>
        </div>
      )}
    </div>
  );
}
