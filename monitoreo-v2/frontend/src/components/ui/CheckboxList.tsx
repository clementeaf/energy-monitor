import { useCallback } from 'react';

export interface CheckboxListOption {
  value: string;
  label: string;
}

interface CheckboxListProps {
  options: CheckboxListOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  maxHeight?: string;
  className?: string;
}

export function CheckboxList({ options, selected, onChange, maxHeight = '10rem', className = '' }: Readonly<CheckboxListProps>) {
  const toggle = useCallback((value: string) => {
    onChange(
      selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value],
    );
  }, [selected, onChange]);

  return (
    <div
      className={`space-y-0.5 overflow-y-auto rounded-md border border-gray-200 bg-white p-1.5 ${className}`}
      style={{ maxHeight }}
    >
      {options.length === 0 && (
        <p className="px-2 py-1.5 text-xs text-gray-400">Sin opciones disponibles</p>
      )}
      {options.map((opt) => {
        const checked = selected.includes(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => toggle(opt.value)}
            className={`flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors ${
              checked ? 'bg-gray-50 text-gray-900' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <span
              className={`flex size-4 shrink-0 items-center justify-center rounded border transition-colors ${
                checked
                  ? 'border-[var(--color-primary,#3D3BF3)] bg-[var(--color-primary,#3D3BF3)]'
                  : 'border-gray-300 bg-white'
              }`}
            >
              {checked && (
                <svg className="size-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </span>
            <span className="truncate">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
