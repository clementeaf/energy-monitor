import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { QueryStateView } from '../../components/ui/QueryStateView';
import { StockChart } from '../../components/charts/StockChart';
import { useReadingsQuery } from '../../hooks/queries/useReadingsQuery';
import type { Reading } from '../../types/reading';
import { startOfDay, toNumber, type Remarcador } from './fleet';
import { formatDateTime, formatNumber } from './format';
import { StatusBadge } from './StatusBadge';
import { useEmsFleet } from './useEmsFleet';
import { useRemarcadorActions } from './useRemarcadorActions';

type Metric = 'potencia' | 'energia' | 'voltaje' | 'corriente' | 'factorPotencia';

interface MetricDefinition {
  label: string;
  unit: string;
  decimals: number;
  series: (readings: Reading[]) => [number, number][];
}

function seriesOf(column: keyof Reading): (readings: Reading[]) => [number, number][] {
  return (readings) =>
    readings.flatMap((reading) => {
      const value = toNumber(reading[column] as string | null);
      return value === null ? [] : [[new Date(reading.timestamp).getTime(), value] as [number, number]];
    });
}

function energyPerInterval(readings: Reading[]): [number, number][] {
  return readings.slice(1).map((reading, i) => [
    new Date(reading.timestamp).getTime(),
    Math.max(0, Number(reading.energy_kwh_total) - Number(readings[i].energy_kwh_total)),
  ]);
}

const METRICS: Record<Metric, MetricDefinition> = {
  potencia: { label: 'Potencia', unit: 'kW', decimals: 2, series: seriesOf('power_kw') },
  energia: { label: 'Energía por intervalo', unit: 'kWh', decimals: 2, series: energyPerInterval },
  voltaje: { label: 'Voltaje L1', unit: 'V', decimals: 1, series: seriesOf('voltage_l1') },
  corriente: { label: 'Corriente L1', unit: 'A', decimals: 1, series: seriesOf('current_l1') },
  factorPotencia: { label: 'Factor de potencia', unit: '', decimals: 3, series: seriesOf('power_factor') },
};

const CONNECTION_LABEL = { conectado: 'Conectado', sin_senal: 'Sin señal', caido: 'Caído', mantencion: 'Mantención' } as const;

const SECONDARY_BUTTON = 'rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-foreground hover:bg-raised';
const ACCENT_BUTTON = 'rounded-lg border border-accent bg-accent px-3 py-2 text-xs font-medium text-accent-ink hover:opacity-90';

export function RemarcadorDetailPage() {
  const { remarcadorId = '' } = useParams<{ remarcadorId: string }>();
  const navigate = useNavigate();
  const fleet = useEmsFleet();
  const [selectedMetric, setSelectedMetric] = useState<Metric>('potencia');
  const [isConfirmingReinicio, setIsConfirmingReinicio] = useState(false);
  const actions = useRemarcadorActions();
  const range = useMemo(() => {
    const now = new Date();
    return { from: startOfDay(now).toISOString(), to: now.toISOString() };
  }, []);
  const readingsQuery = useReadingsQuery({ meterId: remarcadorId, ...range }, !!remarcadorId);
  const rem = fleet.remarcadores.find((r) => r.id === remarcadorId);

  const readings = useMemo(
    () => [...(readingsQuery.data ?? [])].sort((a, b) => a.timestamp.localeCompare(b.timestamp)),
    [readingsQuery.data],
  );
  const meta = METRICS[selectedMetric];
  const points = useMemo(() => meta.series(readings), [meta, readings]);
  const values = points.map(([, value]) => value);
  const last = readings[readings.length - 1];
  const first = readings[0];
  const energiaHoy = first && last ? Number(last.energy_kwh_total) - Number(first.energy_kwh_total) : null;
  const peakHoy = readings.length > 0 ? Math.max(...readings.map((r) => Number(r.power_kw))) : null;

  const stockOptions = useMemo(() => ({
    series: [{
      type: 'areaspline' as const,
      name: meta.label,
      data: points,
      tooltip: { valueSuffix: meta.unit ? ` ${meta.unit}` : '', valueDecimals: meta.decimals },
      fillOpacity: 0.15,
      lineWidth: 2,
      color: 'var(--color-accent)',
    }],
    yAxis: { title: { text: meta.unit || meta.label } },
    rangeSelector: {
      buttons: [
        { type: 'hour' as const, count: 3, text: '3h' },
        { type: 'hour' as const, count: 6, text: '6h' },
        { type: 'hour' as const, count: 12, text: '12h' },
        { type: 'all' as const, text: 'Hoy' },
      ],
      selected: 3,
    },
  }), [points, meta]);

  return (
    <QueryStateView phase={fleet.phase} error={fleet.error} refetch={fleet.refetch}>
      {rem ? (
        <div className="flex h-full flex-col gap-4 overflow-y-auto p-4 md:overflow-hidden md:p-6">
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
            <div>
              <button type="button" onClick={() => navigate('/remarcadores')} className="flex items-center gap-1 text-xs text-muted hover:text-foreground">
                ← Volver a Remarcadores
              </button>
              <h1 className="mt-1 font-mono text-lg font-bold text-foreground">{rem.code}</h1>
              <div className="mt-1 flex flex-wrap gap-2">
                <StatusBadge estado={rem.estado} />
                <Tag>{rem.name}</Tag>
                <Tag>{rem.centroName}</Tag>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => navigate(`/centros/${rem.centroId}`)} className={SECONDARY_BUTTON}>
                Ir al centro
              </button>
              <button type="button" onClick={() => actions.forzarLectura([rem])} className={SECONDARY_BUTTON}>
                ↻ Forzar lectura
              </button>
              {rem.estado === 'mantencion' ? (
                <button type="button" onClick={() => actions.reactivar(rem)} className={ACCENT_BUTTON}>
                  ✓ Reactivar
                </button>
              ) : (
                <button type="button" onClick={() => actions.marcarMantencion([rem])} className={SECONDARY_BUTTON}>
                  ⚙ Mantención
                </button>
              )}
              <button type="button" onClick={() => setIsConfirmingReinicio(true)} className="rounded-lg bg-danger px-3 py-2 text-xs font-medium text-background hover:opacity-90">
                Reiniciar
              </button>
            </div>
          </div>

          <EstadoBanner remarcador={rem} onVerAlerta={() => navigate('/alertas')} onRecuperar={() => actions.recuperar(rem)} />

          <ConfirmDialog
            open={isConfirmingReinicio}
            onClose={() => setIsConfirmingReinicio(false)}
            onConfirm={() => { setIsConfirmingReinicio(false); actions.reiniciar(rem); }}
            title={`Reiniciar ${rem.code}`}
            message="El equipo dejará de reportar durante unos 2 minutos. La acción queda registrada en la bitácora."
            confirmLabel="Reiniciar"
          />

          <div className="grid shrink-0 grid-cols-3 gap-3 lg:grid-cols-6">
            <KpiCard label="Potencia actual" value={formatNumber(toNumber(last?.power_kw), 1)} unit="kW" />
            <KpiCard label="Energía hoy" value={formatNumber(energiaHoy, 1)} unit="kWh" />
            <KpiCard label="Voltaje L1" value={formatNumber(toNumber(last?.voltage_l1), 1)} unit="V" />
            <KpiCard label="Corriente L1" value={formatNumber(toNumber(last?.current_l1), 1)} unit="A" />
            <KpiCard label="Factor potencia" value={formatNumber(toNumber(last?.power_factor), 3)} />
            <KpiCard label="Peak hoy" value={formatNumber(peakHoy, 1)} unit="kW" />
          </div>

          <div className="shrink-0">
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value as Metric)}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-foreground"
            >
              {(Object.keys(METRICS) as Metric[]).map((key) => (
                <option key={key} value={key}>{METRICS[key].label} ({METRICS[key].unit || '—'})</option>
              ))}
            </select>
          </div>

          <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-5">
            <div className="flex flex-col rounded-xl border border-card-border bg-card lg:col-span-3">
              <div className="flex shrink-0 items-start justify-between px-4 pt-4">
                <div>
                  <h2 className="text-sm font-semibold text-card-fg">{meta.label} · hoy</h2>
                  <p className="text-xs text-card-muted">{rem.code} — {readings.length} lecturas</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-lg font-bold text-card-fg tabular-nums">
                    {formatNumber(values.length > 0 ? values[values.length - 1] : null, meta.decimals)} <span className="text-xs font-normal text-card-muted">{meta.unit}</span>
                  </p>
                  <p className="text-[10px] text-card-muted">
                    prom: {formatNumber(values.length > 0 ? values.reduce((s, v) => s + v, 0) / values.length : null, meta.decimals)} · max: {formatNumber(values.length > 0 ? Math.max(...values) : null, meta.decimals)}
                  </p>
                </div>
              </div>
              <div className="min-h-0 flex-1">
                <QueryStateView phase={readingsQuery.isError ? 'error' : readingsQuery.isPending ? 'loading' : points.length === 0 ? 'empty' : 'ready'} error={readingsQuery.error} refetch={() => void readingsQuery.refetch()} variant="widget" emptyDescription="Sin lecturas hoy para este remarcador.">
                  <StockChart options={stockOptions} className="h-full" />
                </QueryStateView>
              </div>
            </div>

            <div className="flex flex-col gap-4 overflow-y-auto lg:col-span-2">
              <div className="rounded-xl border border-card-border bg-card p-4">
                <h2 className="text-sm font-semibold text-card-fg">Estado del dispositivo</h2>
                <div className="mt-3 space-y-2">
                  <FichaRow label="Conexión" value={CONNECTION_LABEL[rem.estado]} />
                  <FichaRow label="Última lectura" value={formatDateTime(rem.ultimaLectura)} />
                  <FichaRow label="Centro" value={rem.centroName} />
                  <FichaRow label="Código" value={rem.code} />
                  <FichaRow label="ID remarcador" value={rem.idRemarcador ?? '—'} />
                  <FichaRow label="Fuente" value={rem.fuente ?? '—'} />
                  <FichaRow label="Protocolo" value={rem.protocolo ?? '—'} />
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex h-full items-center justify-center text-sm text-muted">Remarcador no encontrado.</div>
      )}
    </QueryStateView>
  );
}

function KpiCard({ label, value, unit }: Readonly<{ label: string; value: string; unit?: string }>) {
  return (
    <div className="rounded-xl border border-card-border bg-card px-3 py-2.5">
      <p className="text-[11px] text-card-muted">{label}</p>
      <p className="mt-0.5 font-mono text-base font-bold text-card-fg tabular-nums">
        {value}{unit && <span className="ml-0.5 text-xs font-normal text-card-muted">{unit}</span>}
      </p>
    </div>
  );
}

function Tag({ children }: Readonly<{ children: React.ReactNode }>) {
  return <span className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted">{children}</span>;
}

function FichaRow({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="flex items-center justify-between border-b border-card-border pb-2 last:border-0">
      <span className="text-xs text-card-muted">{label}</span>
      <span className="font-mono text-xs font-medium text-card-fg">{value}</span>
    </div>
  );
}

function EstadoBanner({ remarcador, onVerAlerta, onRecuperar }: Readonly<{ remarcador: Remarcador; onVerAlerta: () => void; onRecuperar: () => void }>) {
  if (remarcador.estado === 'caido') {
    return (
      <div className="flex shrink-0 items-center justify-between gap-4 rounded-lg border border-danger/30 bg-danger-bg px-4 py-3">
        <div>
          <p className="text-sm font-medium text-foreground">Dispositivo sin conexión</p>
          <p className="text-xs text-muted">Sin lecturas desde {formatDateTime(remarcador.ultimaLectura)}. La plataforma ya generó la alerta de desconexión: al recuperar el equipo, la alerta se cierra sola.</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button type="button" onClick={onVerAlerta} className="text-xs font-medium text-foreground hover:underline">Ver la alerta</button>
          <button type="button" onClick={onRecuperar} className={ACCENT_BUTTON}>✓ Marcar recuperado</button>
        </div>
      </div>
    );
  }
  if (remarcador.estado === 'sin_senal') {
    return (
      <div className="flex shrink-0 items-center justify-between gap-4 rounded-lg border border-warning/30 bg-warning-bg px-4 py-3">
        <div>
          <p className="text-sm font-medium text-foreground">Señal degradada</p>
          <p className="text-xs text-muted">Las lecturas llegan con retraso: la última es de {formatDateTime(remarcador.ultimaLectura)}.</p>
        </div>
        <button type="button" onClick={onRecuperar} className={SECONDARY_BUTTON}>Reintentar enlace</button>
      </div>
    );
  }
  if (remarcador.estado === 'mantencion') {
    return (
      <div className="shrink-0 rounded-lg border border-info/30 bg-info-bg px-4 py-3">
        <p className="text-sm font-medium text-foreground">Equipo en mantención</p>
        <p className="text-xs text-muted">Mientras dure la intervención no se generan alertas de desconexión para este equipo.</p>
      </div>
    );
  }
  return null;
}
