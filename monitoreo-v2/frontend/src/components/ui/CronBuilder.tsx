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

const PRESET_DESCRIPTIONS: Record<string, string> = {
  '0 * * * *': 'Cada hora, al minuto 0',
  '0 8 * * *': 'Todos los dias a las 08:00',
  '0 8 * * 1': 'Cada lunes a las 08:00',
  '0 8 1 * *': 'El dia 1 de cada mes a las 08:00',
};

const MONTH_NAMES = ['', 'ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const DAY_NAMES = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

function describeMinute(minute: string): string | null {
  if (minute === '*') return 'cada minuto';
  if (minute.startsWith('*/')) return `cada ${minute.slice(2)} minutos`;
  return null;
}

function describeHour(hour: string, minute: string): string | null {
  if (hour === '*') return null;
  if (hour.startsWith('*/')) return `cada ${hour.slice(2)} horas`;
  const m = minute === '*' ? '00' : minute.padStart(2, '0');
  return `a las ${hour.padStart(2, '0')}:${m}`;
}

function describeField(value: string, names: string[], prefix: string, offset: number): string | null {
  if (value === '*') return null;
  const idx = parseInt(value, 10);
  if (idx >= offset && idx < offset + names.length) return `${prefix}${names[idx - offset]}`;
  return `${prefix}${value}`;
}

/** Translate a 5-field cron expression into a human-readable Spanish description. */
function describeCron(cron: string): string {
  const preset = PRESET_DESCRIPTIONS[cron];
  if (preset) return preset;

  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return 'Expresion cron invalida';

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  const segments = [
    describeMinute(minute),
    describeHour(hour, minute),
    dayOfMonth !== '*' ? `dia ${dayOfMonth} del mes` : null,
    describeField(month, MONTH_NAMES.slice(1), 'en ', 1),
    describeField(dayOfWeek, DAY_NAMES, 'los ', 0),
  ].filter(Boolean) as string[];

  return segments.length > 0 ? segments.join(', ') : 'Cada minuto';
}
