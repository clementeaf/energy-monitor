const BADGE_MAP = {
  operativo:   { label: 'Operativo',    icon: '✓', cls: 'text-success bg-success-bg' },
  advertencia: { label: 'Advertencia',  icon: '⚠', cls: 'text-warning bg-warning-bg' },
  alarma:      { label: 'Alarma',       icon: '✕', cls: 'text-danger bg-danger-bg' },
  conectado:   { label: 'Conectado',    icon: '⚡', cls: 'text-success bg-success-bg' },
  sin_senal:   { label: 'Sin señal',    icon: '⚠', cls: 'text-warning bg-warning-bg' },
  caido:       { label: 'Caído',        icon: '✕', cls: 'text-danger bg-danger-bg' },
  mantencion:  { label: 'Mantención',   icon: '⚙', cls: 'text-info-ink bg-info-bg' },
} as const;

type BadgeEstado = keyof typeof BADGE_MAP;

export function StatusBadge({ estado }: Readonly<{ estado: BadgeEstado }>) {
  const b = BADGE_MAP[estado];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${b.cls}`}>
      {b.icon} {b.label}
    </span>
  );
}
