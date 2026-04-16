import { useMemo } from 'react';

interface CronBuilderProps {
  value: string;
  onChange: (cron: string) => void;
  disabled?: boolean;
  className?: string;
}

interface Preset {
  label: string;
  cron: string;
}

const PRESETS: Preset[] = [
  { label: 'Cada hora', cron: '0 * * * *' },
  { label: 'Diario 8:00', cron: '0 8 * * *' },
  { label: 'Semanal lunes', cron: '0 8 * * 1' },
  { label: 'Mensual dia 1', cron: '0 8 1 * *' },
];

export function CronBuilder({ value, onChange, disabled = false, className = '' }: Readonly<CronBuilderProps>) {
  const description = useMemo(() => describeCron(value), [value]);
  const activePreset = PRESETS.find((p) => p.cron === value);

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Preset buttons */}
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((preset) => {
          const isActive = preset.cron === value;
          return (
            <button
              key={preset.cron}
              type="button"
              disabled={disabled}
              onClick={() => { onChange(preset.cron); }}
              className={
                'rounded-md border px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ' +
                (isActive
                  ? 'border-[var(--color-primary,#3D3BF3)] bg-[var(--color-primary,#3D3BF3)] text-white'
                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50')
              }
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      {/* Custom input */}
      <div>
        <label className="block">
          <span className="text-sm font-medium text-gray-700">
            Expresion Cron {!activePreset && '(personalizada)'}
          </span>
          <input
            value={value}
            onChange={(e) => { onChange(e.target.value); }}
            disabled={disabled}
            placeholder="* * * * *"
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm disabled:bg-gray-50 disabled:cursor-not-allowed"
          />
        </label>
      </div>

      {/* Human-readable description */}
      {value.trim() && (
        <p className="text-sm text-gray-500">
          <span className="font-medium">Ejecuta:</span>{' '}
          {description}
        </p>
      )}
    </div>
  );
}

/**
 * Translate a cron expression into a human-readable Spanish description.
 * Supports standard 5-field cron (minute hour day-of-month month day-of-week).
 */
function describeCron(cron: string): string {
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return 'Expresion cron invalida';

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  // Exact presets
  if (cron === '0 * * * *') return 'Cada hora, al minuto 0';
  if (cron === '0 8 * * *') return 'Todos los dias a las 08:00';
  if (cron === '0 8 * * 1') return 'Cada lunes a las 08:00';
  if (cron === '0 8 1 * *') return 'El dia 1 de cada mes a las 08:00';

  const segments: string[] = [];

  // Minute
  if (minute === '*') {
    segments.push('cada minuto');
  } else if (minute!.startsWith('*/')) {
    segments.push(`cada ${minute!.slice(2)} minutos`);
  }

  // Hour
  if (hour !== '*') {
    if (hour!.startsWith('*/')) {
      segments.push(`cada ${hour!.slice(2)} horas`);
    } else {
      const m = minute === '*' ? '00' : minute!.padStart(2, '0');
      segments.push(`a las ${hour!.padStart(2, '0')}:${m}`);
    }
  }

  // Day of month
  if (dayOfMonth !== '*') {
    segments.push(`dia ${dayOfMonth} del mes`);
  }

  // Month
  if (month !== '*') {
    const monthNames = ['', 'ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    const idx = parseInt(month!, 10);
    segments.push(idx >= 1 && idx <= 12 ? `en ${monthNames[idx]}` : `mes ${month}`);
  }

  // Day of week
  if (dayOfWeek !== '*') {
    const dayNames = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    const idx = parseInt(dayOfWeek!, 10);
    segments.push(idx >= 0 && idx <= 6 ? `los ${dayNames[idx]}` : `dia semana ${dayOfWeek}`);
  }

  return segments.length > 0 ? segments.join(', ') : 'Cada minuto';
}
