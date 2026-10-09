import { useState } from 'react';
import { useNavigate } from 'react-router';
import { QueryStateView } from '../../components/ui/QueryStateView';
import { LoadCurveChart } from './LoadCurveChart';
import { formatDateTime, formatMillonesClp, formatNumber, formatPeriodo } from './format';
import { PORTFOLIO_CURVE } from './fleet';
import { sumarMargenes } from './tariffs';
import { useEmsAlertas, useEmsFleet, useLoadCurves, type LoadRange } from './useEmsFleet';

const CENTRO_COLORS: Record<string, string> = {
  operativo: 'var(--color-accent)',
  advertencia: 'var(--color-warning)',
  alarma: 'var(--color-danger)',
};

const RANGOS: { key: LoadRange; label: string }[] = [
  { key: 'hoy', label: 'Hoy' },
  { key: '7dias', label: '7 días' },
  { key: '30dias', label: '30 días' },
];

export function ResumenPage() {
  const navigate = useNavigate();
  const fleet = useEmsFleet();
  const { activas: alertas, criticas: alertasCriticas } = useEmsAlertas();
  const [bannerVisible, setBannerVisible] = useState(true);

  const { centros, remarcadores } = fleet;
  const consumoMesMwh = centros.reduce((sum, c) => sum + c.consumoMesKwh, 0) / 1000;
  const conectados = remarcadores.filter((r) => r.estado === 'conectado').length;
  const caidos = remarcadores.filter((r) => r.estado === 'caido').length;
  const sinSenal = remarcadores.filter((r) => r.estado === 'sin_senal').length;
  const sinConexion = remarcadores.filter((r) => r.estado !== 'conectado');
  const maxConsumo = Math.max(...centros.map((c) => c.consumoMesKwh), 1);
  const periodo = formatPeriodo(fleet.periodo);
  const margenTotal = sumarMargenes(centros.flatMap((c) => (c.margen ? [c.margen] : [])));

  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-foreground">Resumen</h1>
          <p className="text-xs text-muted">Periodo: {periodo}</p>
        </div>
        <span className="flex items-center gap-1.5 text-xs font-medium text-success">
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
          En vivo
        </span>
      </div>

      <div className="flex shrink-0 flex-col">
        <QueryStateView phase={fleet.phase} error={fleet.error} refetch={fleet.refetch}>
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <KpiCard label="Consumo del mes" value={formatNumber(consumoMesMwh, 1)} unit="MWh" delta="Último mes con lecturas" onClick={() => navigate('/consumo')} />
              <KpiCard label="Gasto en compra" value={formatMillonesClp(margenTotal.costoCompraClp)} delta={`Venta ${formatMillonesClp(margenTotal.precioVentaClp)}`} onClick={() => navigate('/margenes')} />
              <KpiCard label="Margen estimado" value={formatMillonesClp(margenTotal.margenClp)} delta={`${formatNumber(margenTotal.margenPct, 1)}% sobre venta`} positive onClick={() => navigate('/margenes')} />
              <KpiCard label="Centros activos" value={String(centros.length)} delta={`${centros.filter((c) => c.estado === 'operativo').length} operativos`} positive onClick={() => navigate('/centros')} />
              <KpiCard label="Remarcadores" value={String(conectados)} unit={`/${remarcadores.length}`} delta={`${caidos} caídos · ${sinSenal} sin señal`} negative={caidos + sinSenal > 0} onClick={() => navigate('/remarcadores')} />
              <KpiCard label="Alertas activas" value={String(alertas.length)} delta={`${alertasCriticas} críticas`} negative={alertasCriticas > 0} onClick={() => navigate('/alertas')} />
            </div>

            {sinConexion.length > 0 && bannerVisible && (
              <div className="flex items-center justify-between rounded-lg border border-warning/30 bg-warning-bg px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-warning">⚠</span>
                  <div>
                    <p className="text-sm font-medium text-foreground">Sin conexión · {sinConexion.length} remarcadores</p>
                    <p className="text-xs text-muted">
                      {sinConexion[0].code} ({sinConexion[0].centroName}) sin lecturas desde {formatDateTime(sinConexion[0].ultimaLectura)}. Revisa la flota.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button type="button" className="text-xs font-medium text-foreground hover:underline" onClick={() => navigate('/remarcadores')}>
                    Ver flota
                  </button>
                  <button type="button" className="text-muted hover:text-foreground" onClick={() => setBannerVisible(false)} aria-label="Cerrar aviso">
                    ×
                  </button>
                </div>
              </div>
            )}

            <div className="grid gap-4 lg:grid-cols-5">
              <div className="rounded-xl border border-card-border bg-card p-4 lg:col-span-3">
                <CurvaCargaGlobal centrosActivos={centros.length} />
              </div>

              <div className="rounded-xl border border-card-border bg-card p-4 lg:col-span-2">
                <h2 className="text-sm font-semibold text-card-fg">Centros por consumo</h2>
                <p className="mb-3 text-xs text-card-muted">Acumulado del mes · haz clic para abrir el centro</p>
                <div className="space-y-3">
                  {[...centros].sort((a, b) => b.consumoMesKwh - a.consumoMesKwh).map((c) => (
                    <button key={c.id} type="button" onClick={() => navigate(`/centros/${c.id}`)} className="flex w-full items-center gap-3 text-left hover:opacity-80">
                      <span className="w-36 truncate text-xs text-card-fg">{c.name}</span>
                      <div className="flex-1">
                        <div className="h-2 rounded-full bg-raised">
                          <div className="h-2 rounded-full transition-all" style={{ width: `${(c.consumoMesKwh / maxConsumo) * 100}%`, backgroundColor: CENTRO_COLORS[c.estado] }} />
                        </div>
                      </div>
                      <span className="w-20 text-right font-mono text-xs text-card-muted">{formatNumber(c.consumoMesKwh / 1000, 1)} MWh</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </QueryStateView>
      </div>
    </div>
  );
}

function CurvaCargaGlobal({ centrosActivos }: Readonly<{ centrosActivos: number }>) {
  const [rango, setRango] = useState<LoadRange>('hoy');
  const { phase, curves } = useLoadCurves(rango);
  const points = curves.get(PORTFOLIO_CURVE) ?? [];
  const peak = points.reduce((best, point) => (point.kw > best.kw ? point : best), { timestamp: '', kw: 0 });

  return (
    <>
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-sm font-semibold text-card-fg">Curva de carga global</h2>
          <p className="mb-3 text-xs text-card-muted">Demanda total de los {centrosActivos} centros</p>
        </div>
        <div className="flex rounded-lg border border-card-border bg-surface">
          {RANGOS.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => setRango(r.key)}
              className={`px-3 py-1 text-xs font-medium transition-colors ${rango === r.key ? 'bg-card-fg text-card rounded-lg' : 'text-card-muted hover:text-card-fg'}`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
      <QueryStateView phase={phase} error={null} variant="widget">
        <LoadCurveChart series={[{ label: 'Potencia (kW)', color: 'var(--color-accent)', points }]} filled />
        {peak.kw > 0 && (
          <p className="mt-1 px-1 text-[10px] text-card-muted">Pico {formatDateTime(peak.timestamp)} · {formatNumber(peak.kw, 1)} kW</p>
        )}
      </QueryStateView>
    </>
  );
}

function KpiCard({ label, value, unit, delta, positive, negative, onClick }: Readonly<{
  label: string; value: string; unit?: string; delta?: string; positive?: boolean; negative?: boolean; onClick?: () => void;
}>) {
  const deltaColor = negative ? 'text-danger' : positive ? 'text-success' : 'text-muted';
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag type={onClick ? 'button' : undefined} onClick={onClick} className={`rounded-xl border border-card-border bg-card px-4 py-3 text-left ${onClick ? 'cursor-pointer transition-colors hover:border-accent/50' : ''}`}>
      <p className="text-xs text-card-muted">{label}</p>
      <p className="mt-1 font-mono text-2xl font-bold text-card-fg tabular-nums">
        {value}
        {unit && <span className="ml-0.5 text-sm font-normal text-card-muted">{unit}</span>}
      </p>
      {delta && <p className={`mt-1 text-[11px] ${deltaColor}`}>{delta}</p>}
    </Tag>
  );
}
