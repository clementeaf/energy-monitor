import type { ReactElement } from 'react';

export interface PillOption<T extends string> {
  key: T;
  label: string;
  disabled?: boolean;
}

interface PillToggleProps<T extends string> {
  options: readonly PillOption<T>[];
  value: T;
  onChange: (key: T) => void;
  size?: 'sm' | 'md';
  className?: string;
}

const SIZE_CLS: Record<'sm' | 'md', { track: string; item: string }> = {
  sm: { track: 'p-0.5', item: 'px-2.5 py-1 text-[11px]' },
  md: { track: 'p-1', item: 'px-3.5 py-1.5 text-xs' },
};

/**
 * Handle-style segmented control with rounded-full pills.
 * @param options - Selectable segments
 * @param value - Active segment key
 * @param onChange - Called when user selects a segment
 * @param size - Compact or default sizing
 * @param className - Optional wrapper classes
 */
export function PillToggle<T extends string>({
  options,
  value,
  onChange,
  size = 'md',
  className = '',
}: Readonly<PillToggleProps<T>>): ReactElement {
  const sizing = SIZE_CLS[size];

  return (
    <div
      className={`inline-flex rounded-full border border-border bg-surface ${sizing.track} ${className}`}
      role="tablist"
    >
      {options.map((opt) => {
        const active = opt.key === value;
        return (
          <button
            key={opt.key}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={opt.disabled}
            onClick={() => onChange(opt.key)}
            className={`rounded-full font-medium transition-all duration-150 ${sizing.item} ${
              opt.disabled
                ? 'cursor-not-allowed opacity-40'
                : active
                  ? 'bg-background text-foreground shadow-sm ring-1 ring-border'
                  : 'text-muted hover:text-foreground'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
