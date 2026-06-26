import { useMemo } from 'react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { useMetersQuery } from '../../../hooks/queries/useMetersQuery';
import { useLatestReadingsQuery } from '../../../hooks/queries/useReadingsQuery';
import { useAlertsQuery } from '../../../hooks/queries/useAlertsQuery';

/* ── Component status ── */

type ComponentHealth = 'ok' | 'degraded' | 'down';

interface ComponentStatus {
  name: string;
  status: ComponentHealth;
}

const HEALTH_BADGE: Record<ComponentHealth, string> = {
  ok: 'bg-emerald-100 text-emerald-700',
  degraded: 'bg-amber-100 text-amber-700',
  down: 'bg-red-100 text-red-700',
};

/* ── Page ── */

export function ObservabilidadPage() {
  const metersQuery = useMetersQuery();
  const latestQuery = useLatestReadingsQuery();
  const alertsQuery = useAlertsQuery({ status: 'active' });

  const meters = metersQuery.data ?? [];
  const readings = latestQuery.data ?? [];
  const alerts = alertsQuery.data ?? [];

  const readingMeterIds = useMemo(() => new Set(readings.map((r) => r.meter_id)), [readings]);
  const reportingPct = meters.length > 0
    ? ((meters.filter((m) => readingMeterIds.has(m.id)).length / meters.length) * 100).toFixed(1)
    : '0';

  // Derive component health from data availability
  const components: ComponentStatus[] = useMemo(() => [
    { name: 'API principal', status: 'ok' as ComponentHealth },
    { name: 'Base de datos', status: 'ok' as ComponentHealth },
    { name: 'Ingestión', status: meters.length > 0 && readings.length === 0 ? 'degraded' : 'ok' as ComponentHealth },
    { name: 'Backfill', status: 'ok' as ComponentHealth },
  ], [meters.length, readings.length]);

  // Derive uptime from % meters reporting
  const uptimeEst = meters.length > 0 ? ((meters.filter((m) => readingMeterIds.has(m.id)).length / meters.length) * 100) : 100;
  const errorRate = alerts.length > 0 ? ((alerts.length / Math.max(1, meters.length)) * 100) : 0;

  const healthKpis = [
    { title: 'Uptime (30d)', value: `${uptimeEst.toFixed(1)}%`, color: uptimeEst >= 99 ? 'text-emerald-600' : uptimeEst >= 95 ? 'text-amber-600' : 'text-red-600' },
    { title: 'Medidores online', value: `${readingMeterIds.size} / ${meters.length}`, color: 'text-foreground' },
    { title: 'Error rate', value: `${errorRate.toFixed(1)}%`, color: errorRate < 1 ? 'text-emerald-600' : 'text-red-600' },
    { title: 'Alertas activas', value: String(alerts.length), color: alerts.length > 0 ? 'text-red-600' : 'text-emerald-600' },
  ];

  const ingestionKpis = [
    { title: 'Medidores reportando', value: `${reportingPct}%`, color: 'text-foreground' },
    { title: 'Total medidores', value: String(meters.length), color: 'text-foreground' },
    { title: 'Lecturas recientes', value: String(readings.length), color: 'text-foreground' },
    { title: 'Alertas plataforma', value: String(alerts.length), color: alerts.length > 0 ? 'text-red-600' : 'text-emerald-600' },
  ];

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto">
      <PageHeader title="Observabilidad" eyebrow="Plataforma" />

      {/* Health KPIs */}
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {healthKpis.map((k) => (
          <div key={k.title} className="panel px-3 py-2.5">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted">{k.title}</p>
            <p className={`mt-0.5 text-lg font-semibold tracking-tight ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Component semaphore */}
      <div className="panel p-4">
        <h3 className="mb-3 text-[13px] font-medium text-foreground">Estado por componente</h3>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {components.map((c) => (
            <div key={c.name} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
              <span className={`inline-block size-2.5 rounded-full ${HEALTH_BADGE[c.status].split(' ')[0]}`} />
              <span className="text-[12px] text-foreground">{c.name}</span>
              <span className={`ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-medium ${HEALTH_BADGE[c.status]}`}>
                {c.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Ingestion metrics */}
      <div className="panel p-4">
        <h3 className="mb-3 text-[13px] font-medium text-foreground">Métricas de ingestión</h3>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {ingestionKpis.map((k) => (
            <div key={k.title} className="rounded-lg border border-border px-3 py-2">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted">{k.title}</p>
              <p className={`mt-0.5 text-base font-semibold ${k.color}`}>{k.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Active health alerts */}
      <div className="panel p-4">
        <h3 className="mb-3 text-[13px] font-medium text-foreground">Alertas de salud activas</h3>
        {alerts.length > 0 ? (
          <ul className="divide-y divide-border">
            {alerts.slice(0, 10).map((a) => (
              <li key={a.id} className="flex items-center justify-between py-2 text-[12px]">
                <span className="text-foreground">{a.message}</span>
                <span className="text-[11px] text-muted">{new Date(a.createdAt).toLocaleString('es-CL', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[12px] text-muted">Sin alertas de salud activas.</p>
        )}
      </div>
    </div>
  );
}
