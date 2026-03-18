import { useState, useRef } from 'react';
import { useClickOutside } from '../../hooks/useClickOutside';

export interface NumericRange { min: number; max: number }

export function RangeFilterDropdown({
  label,
  dataMin,
  dataMax,
  activeRange,
  onChangeRange,
  format,
}: {
  label: string;
  dataMin: number;
  dataMax: number;
  activeRange: NumericRange;
  onChangeRange: (range: NumericRange) => void;
  format?: (v: number) => string;
}) {
  const [open, setOpen] = useState(false);
  const [localMin, setLocalMin] = useState(activeRange.min);
  const [localMax, setLocalMax] = useState(activeRange.max);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false), open);

  const isFiltered = activeRange.min !== dataMin || activeRange.max !== dataMax;
  const fmt_ = format ?? ((v: number) => v.toLocaleString('es-CL'));

  function handleOpen() {
    setLocalMin(activeRange.min);
    setLocalMax(activeRange.max);
    setOpen((o) => !o);
  }

  function apply() {
    onChangeRange({ min: localMin, max: localMax });
    setOpen(false);
  }

  function clear() {
    setLocalMin(dataMin);
    setLocalMax(dataMax);
    onChangeRange({ min: dataMin, max: dataMax });
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={handleOpen}
        className="flex items-center gap-1 whitespace-nowrap font-medium transition-colors hover:text-text"
      >
        {label}
        <svg className="h-3 w-3 shrink-0 opacity-40" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
        {isFiltered && <span className="ml-0.5 h-1.5 w-1.5 rounded-full bg-blue-600" />}
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-1 w-64 rounded border border-border bg-white p-3 shadow-lg">
          <div className="mb-2 flex justify-between text-[11px] text-muted">
            <span>{fmt_(localMin)}</span>
            <span>{fmt_(localMax)}</span>
          </div>
          <div className="relative h-6">
            <input
              type="range"
              min={dataMin}
              max={dataMax}
              step={1}
              value={localMin}
              onChange={(e) => {
                const v = Number(e.target.value);
                setLocalMin(Math.min(v, localMax));
              }}
              className="pointer-events-none absolute inset-0 w-full appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-pa-navy"
            />
            <input
              type="range"
              min={dataMin}
              max={dataMax}
              step={1}
              value={localMax}
              onChange={(e) => {
                const v = Number(e.target.value);
                setLocalMax(Math.max(v, localMin));
              }}
              className="pointer-events-none absolute inset-0 w-full appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-pa-navy"
            />
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
