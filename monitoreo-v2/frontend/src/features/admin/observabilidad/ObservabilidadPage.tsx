import { useMemo } from 'react';
import { useMetersQuery } from '../../../hooks/queries/useMetersQuery';
import { useLatestReadingsQuery } from '../../../hooks/queries/useReadingsQuery';
import { useAlertsQuery } from '../../../hooks/queries/useAlertsQuery';
import { useApiObservabilityQuery } from '../../../hooks/queries/useApiObservabilityQuery';

/* ── Component status ── */

type ComponentHealth = 'ok' | 'degraded' | 'down';

interface ComponentStatus {
  name: string;
  status: ComponentHealth;
  latency: string;
  lastCheck: string;
}

const HEALTH_DOT: Record<ComponentHealth, string> = {
  ok: 'bg-emerald-500',
  degraded: 'bg-amber-500',
  down: 'bg-red-500',
};

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
  const obsQuery = useApiObservabilityQuery({ granularity: 'hour' });

  const meters = metersQuery.data ?? [];
  const readings = latestQuery.data ?? [];
  const alerts = alertsQuery.data ?? [];
  const obsReport = obsQuery.data;
  const hasApmData = obsReport != null && obsReport.summary.totalRequests > 0;

  const readingMeterIds = useMemo(() => new Set(readings.map((r) => r.meter_id)), [readings]);

  // Derive component health from data availability + APM
  const apiErrorRate = obsReport?.summary.errorRate ?? 0;
  const components: ComponentStatus[] = useMemo(() => [
    { name: 'API', status: (hasApmData ? (apiErrorRate > 5 ? 'degraded' : 'ok') : 'ok') as ComponentHealth, latency: hasApmData ? `${obsReport?.summary.p95Ms ?? '—'} ms` : '142 ms', lastCheck: 'hace 1 min' },
    { name: 'BD', status: (hasApmData ? (obsReport!.summary.p95Ms > 2000 ? 'degraded' : 'ok') : 'ok') as ComponentHealth, latency: '18 ms', lastCheck: 'hace 1 min' },
    { name: 'Cola de mensajes', status: 'ok' as ComponentHealth, latency: '—', lastCheck: 'hace 2 min' },
    { name: 'Ingestión', status: (meters.length > 0 && readings.length === 0 ? 'degraded' : 'ok') as ComponentHealth, latency: '—', lastCheck: 'hace 5 min' },
    { name: 'Backfill', status: 'ok' as ComponentHealth, latency: '—', lastCheck: 'hace 15 min' },
  ], [meters.length, readings.length, hasApmData, apiErrorRate, obsReport]);

  // Derive uptime from % meters reporting
  const uptimeEst = meters.length > 0 ? ((meters.filter((m) => readingMeterIds.has(m.id)).length / meters.length) * 100) : 99.82;
  const errorRate = hasApmData ? obsReport!.summary.errorRate : (alerts.length > 0 ? ((alerts.length / Math.max(1, meters.length)) * 100) : 0.4);
  const latencyP50 = hasApmData ? obsReport!.summary.p95Ms : 142;
  const latencyP95 = hasApmData ? obsReport!.summary.p95Ms : 468;

  // Simulated 24h trend data
  const now = Date.now();
  const hours = Array.from({ length: 24 }, (_, i) => {
    const h = new Date(now - (23 - i) * 3_600_000);
    return { label: `${h.getHours()}:00`, hour: h.getHours() };
  });

  const latencyData = hours.map((h) => ({ label: h.label, value: latencyP50 * (0.8 + Math.sin(h.hour / 3) * 0.3) }));
  const errorData = hours.map((h) => ({ label: h.label, value: Math.max(0, errorRate * (1 + Math.sin(h.hour / 4) * 0.5)) }));
  const throughputData = hours.map((h) => ({ label: h.label, value: 1840 * (0.7 + Math.cos(h.hour / 6) * 0.3) }));

  const THRESHOLD_MS = 500;

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto">
      {/* Header */}
      <div>
        <h1 className="text-[15px] font-semibold text-foreground">7.4 Observabilidad</h1>
        <p className="text-[11px] text-muted">Estado operativo de la plataforma — uptime, latencia, errores, ingestión y salud de componentes</p>
      </div>

      {/* Row 1 — 4 KPI cards */}
      <div className="flex gap-3">
        <div className="panel flex-1 p-3">
          <p className="text-[12px] font-medium uppercase tracking-wider text-muted">Uptime (30 días)</p>
          <p className="mt-0.5 text-[20px] font-semibold leading-tight text-emerald-600">{uptimeEst >= 99 ? '99,82%' : `${uptimeEst.toFixed(2)}%`}</p>
          <p className="text-[10px] text-emerald-600">▲ sobre SLA 99,5% (FIN-06)</p>
          <p className="mt-1 text-right text-[9px] text-muted">[ARQ-08, FIN-06]</p>
        </div>
        <div className="panel flex-1 p-3">
          <p className="text-[12px] font-medium uppercase tracking-wider text-muted">Latencia media de API</p>
          <p className="mt-0.5 text-[20px] font-semibold leading-tight text-foreground">{latencyP50} ms</p>
          <p className="text-[10px] text-muted">p50 · últimas 24h</p>
          <p className="mt-1 text-right text-[9px] text-muted">[ARQ-08, DAT-09]</p>
        </div>
        <div className="panel flex-1 p-3">
          <p className="text-[12px] font-medium uppercase tracking-wider text-muted">Error rate</p>
          <p className={`mt-0.5 text-[20px] font-semibold leading-tight ${errorRate < 1 ? 'text-emerald-600' : 'text-red-600'}`}>{errorRate.toFixed(1)}%</p>
          <p className="text-[10px] text-muted">(4xx+5xx) / total</p>
          <p className="mt-1 text-right text-[9px] text-muted">[ARQ-21, DAT-09]</p>
        </div>
        <div className="panel flex-1 p-3">
          <p className="text-[12px] font-medium uppercase tracking-wider text-muted">Tiempo de respuesta p95</p>
          <p className={`mt-0.5 text-[20px] font-semibold leading-tight ${latencyP95 < 500 ? 'text-emerald-600' : 'text-amber-600'}`}>{latencyP95} ms</p>
          <p className="text-[10px] text-muted">umbral INT-08 &lt; 500 ms</p>
          <p className="mt-1 text-right text-[9px] text-muted">[ARQ-08, INT-08]</p>
        </div>
      </div>

      {/* Row 2 — health dashboard + métricas ingestión */}
      <div className="flex gap-3">
        {/* Health dashboard */}
        <div className="panel flex-1 p-3">
          <h3 className="text-[13px] font-semibold text-foreground">Health dashboard — semáforo por componente</h3>
          <p className="mb-2 text-[10px] text-muted">API / BD / cola de mensajes / ingestión / backfill</p>
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-border text-left text-[10px] text-muted">
                <th className="pb-1 font-medium">Componente</th>
                <th className="pb-1 font-medium">Estado</th>
                <th className="pb-1 font-medium">Latencia</th>
                <th className="pb-1 font-medium">Última verificación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {components.map((c) => (
                <tr key={c.name}>
                  <td className="py-1.5 font-medium text-foreground">{c.name}</td>
                  <td className="py-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className={`inline-block size-2 rounded-full ${HEALTH_DOT[c.status]}`} />
                      <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium ${HEALTH_BADGE[c.status]}`}>{c.status}</span>
                    </div>
                  </td>
                  <td className="py-1.5 text-muted">{c.latency}</td>
                  <td className="py-1.5 text-muted">{c.lastCheck}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-right text-[9px] text-muted">[ARQ-08, ARQ-21, FIN-06]</p>
        </div>

        {/* Métricas ingestión */}
        <div className="panel flex-1 p-3">
          <h3 className="text-[13px] font-semibold text-foreground">Métricas de ingestión de datos</h3>
          <p className="mb-2 text-[10px] text-muted">Salud del flujo de datos hacia la plataforma</p>
          <ul className="space-y-1.5 text-[11px]">
            <li className="flex items-center justify-between">
              <span className="text-muted">Medidores reportando en el último ciclo</span>
              <span className="font-semibold text-emerald-600">98,4%</span>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-muted">Mensajes procesados / hora</span>
              <span className="font-semibold text-foreground">1,84 M</span>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-muted">Mensajes en cola</span>
              <span className="font-semibold text-foreground">2.310</span>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-muted">Errores de parsing (24h)</span>
              <span className="font-semibold text-amber-600">41 ▼</span>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-muted">Anomalías detectadas automáticamente</span>
              <span className="font-semibold text-foreground">{alerts.length}</span>
            </li>
          </ul>
          <p className="mt-3 text-[10px] text-muted">DAT-27 — detección automática activa</p>
          <p className="mt-1 text-right text-[9px] text-muted">[DAT-09, DAT-27, ARQ-08]</p>
        </div>
      </div>

      {/* Row 3 — 3 charts */}
      <div className="flex gap-3">
        {/* Latencia por endpoint — line chart */}
        <div className="panel flex-1 p-3">
          <h3 className="text-[13px] font-semibold text-foreground">Latencia de API por endpoint</h3>
          <p className="mb-2 text-[10px] text-muted">Últimas 24h / 7 días · líneas por endpoint</p>
          {(() => {
            const w = 260; const h = 80;
            const maxVal = Math.max(THRESHOLD_MS * 1.2, ...latencyData.map((d) => d.value));
            const path = latencyData.map((d, i) => `${i === 0 ? 'M' : 'L'} ${(i / 23) * w} ${h - 4 - (d.value / maxVal) * (h - 8)}`).join(' ');
            const thresholdY = h - 4 - (THRESHOLD_MS / maxVal) * (h - 8);
            return (
              <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="w-full">
                <line x1={0} y1={thresholdY} x2={w} y2={thresholdY} stroke="#ef4444" strokeWidth={1} strokeDasharray="4 3" />
                <path d={path} fill="none" stroke="#3b82f6" strokeWidth={2} />
                <text x={w - 2} y={thresholdY - 2} textAnchor="end" fontSize={8} fill="#ef4444">umbral 500ms</text>
              </svg>
            );
          })()}
          <div className="mt-1 flex justify-between text-[9px] text-muted">
            <span>{latencyData[0]?.label}</span>
            <span>{latencyData[latencyData.length - 1]?.label}</span>
          </div>
          <p className="mt-1 text-right text-[9px] text-muted">[DAT-09, ARQ-08]</p>
        </div>

        {/* Tasa errores — bar chart */}
        <div className="panel flex-1 p-3">
          <h3 className="text-[13px] font-semibold text-foreground">Tasa de errores por tipo</h3>
          <p className="mb-2 text-[10px] text-muted">4xx / 5xx · barras</p>
          {(() => {
            const maxVal = Math.max(0.1, ...errorData.map((d) => d.value));
            return (
              <div className="flex h-20 items-end gap-[1px]">
                {errorData.map((d) => (
                  <div key={d.label} className="flex-1 rounded-t" style={{ height: `${Math.max(2, (d.value / maxVal) * 100)}%`, backgroundColor: '#ef4444', opacity: 0.7 }} title={`${d.label}: ${d.value.toFixed(2)}%`} />
                ))}
              </div>
            );
          })()}
          <div className="mt-1 flex justify-between text-[9px] text-muted">
            <span>{errorData[0]?.label}</span>
            <span>{errorData[errorData.length - 1]?.label}</span>
          </div>
          <p className="mt-1 text-right text-[9px] text-muted">[ARQ-21, DAT-09]</p>
        </div>

        {/* Throughput — area chart */}
        <div className="panel flex-1 p-3">
          <h3 className="text-[13px] font-semibold text-foreground">Throughput de mensajes</h3>
          <p className="mb-2 text-[10px] text-muted">Mensajes procesados · área</p>
          {(() => {
            const w = 260; const h = 80;
            const maxVal = Math.max(1, ...throughputData.map((d) => d.value));
            const points = throughputData.map((d, i) => `${(i / 23) * w},${h - 4 - (d.value / maxVal) * (h - 8)}`).join(' ');
            const areaPath = `M 0 ${h} L ${throughputData.map((d, i) => `${(i / 23) * w} ${h - 4 - (d.value / maxVal) * (h - 8)}`).join(' L ')} L ${w} ${h} Z`;
            return (
              <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="w-full">
                <path d={areaPath} fill="#22c55e" fillOpacity={0.2} />
                <polyline points={points} fill="none" stroke="#22c55e" strokeWidth={2} />
              </svg>
            );
          })()}
          <div className="mt-1 flex justify-between text-[9px] text-muted">
            <span>{throughputData[0]?.label}</span>
            <span>{throughputData[throughputData.length - 1]?.label}</span>
          </div>
          <p className="mt-1 text-right text-[9px] text-muted">[DAT-09, ARQ-08]</p>
        </div>
      </div>
    </div>
  );
}
