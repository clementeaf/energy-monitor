import { useState } from 'react';

/* ── Placeholder data ── */

const REPLICA_STATUS = [
  { label: 'Sincronización', value: 'activa', ok: true },
  { label: 'Lag actual', value: '42 s (umbral 300 s)', ok: true },
  { label: 'Última réplica exitosa', value: '10-07 09:15:22', ok: true },
  { label: 'Volumen replicado 24h', value: '214 GB', ok: true },
];

const LAG_BAR_DATA = [38, 42, 55, 120, 88, 65, 42, 38, 44, 60, 78, 95, 110, 88, 55, 42, 38, 45, 50, 42, 38, 44, 42, 38];

const REPLICA_USERS = [
  { usuario: 'etl_pasa', tenant: 'PASA / ETL diario', permisos: 'SELECT', ultimaConexion: '2026-07-17 09:00', vol: '4.2 GB' },
  { usuario: 'analytics_ro', tenant: 'Globe Power / BI', permisos: 'SELECT', ultimaConexion: '2026-07-17 08:30', vol: '1.1 GB' },
  { usuario: 'bi_siemens', tenant: 'Siemens / reporting', permisos: 'SELECT', ultimaConexion: '2026-07-16 18:00', vol: '320 MB' },
  { usuario: 'audit_reader', tenant: 'Auditoría interna', permisos: 'SELECT', ultimaConexion: '2026-07-15 14:00', vol: '88 MB' },
];

const SCHEMA_CHANGES = [
  {
    tabla: 'readings',
    tipo: 'columna nueva',
    deteccion: '2026-07-10',
    despliegue: '2026-07-17',
    notifPASA: 'enviada',
    ok: true,
    detail: 'Columna "quality_flag" agregada. Backward compatible.',
  },
  {
    tabla: 'meters',
    tipo: 'columna renombrada',
    deteccion: '2026-07-01',
    despliegue: '2026-07-08',
    notifPASA: 'enviada',
    ok: true,
    detail: '"serial_no" → "serial_number". ETL PASA actualizado.',
  },
  {
    tabla: 'invoices',
    tipo: 'tipo modificado',
    deteccion: '2026-07-14',
    despliegue: '2026-07-17',
    notifPASA: 'pendiente',
    ok: false,
    detail: '"amount" NUMERIC(10,2) → NUMERIC(14,4). Plazo 30 días no cumplido.',
  },
];

const DATA_CONTRACTS = [
  { integracion: 'PASA ETL', versionActual: 'v3', versionesSoportadas: 'v2, v3', esquema: 'readings_v3.json', deprecacion: 'v2 → 2026-12-31' },
  { integracion: 'Siemens IoT', versionActual: 'v2', versionesSoportadas: 'v2', esquema: 'iot_v2.json', deprecacion: '—' },
  { integracion: 'BACnet Bridge', versionActual: 'v1', versionesSoportadas: 'v1', esquema: 'bacnet_v1.json', deprecacion: '—' },
  { integracion: 'Analytics BI', versionActual: 'v3', versionesSoportadas: 'v2, v3', esquema: 'bi_v3.json', deprecacion: 'v2 → 2026-09-30' },
];

/* SVG lag histogram */
const W = 380;
const H = 100;
const PAD = { top: 10, right: 10, bottom: 18, left: 36 };
const bW = (W - PAD.left - PAD.right) / LAG_BAR_DATA.length - 1;
const maxLag = 300;
const cH = H - PAD.top - PAD.bottom;

function toBarH(v: number) { return (v / maxLag) * cH; }
function toBarX(i: number) { return PAD.left + i * ((W - PAD.left - PAD.right) / LAG_BAR_DATA.length); }
function toBarY(v: number) { return PAD.top + cH - toBarH(v); }
const threshY = PAD.top;

/* ── Page ── */

export function ReplicaDatosPage() {
  const [expandedSchema, setExpandedSchema] = useState<number | null>(null);

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto overflow-x-hidden">
      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold text-foreground">7.10 Réplica de Datos</h1>
        <p className="text-[12px] text-muted">Estado de la réplica NRT, monitoreo de lag, acceso por tenant y contratos de datos versionados</p>
      </div>

      {/* Row 1 */}
      <div className="flex gap-3">
        {/* Estado réplica */}
        <div className="panel w-1/2 min-w-0 p-3">
          <h3 className="text-[13px] font-semibold text-foreground">Estado de la réplica (NRT)</h3>
          <p className="mb-3 text-[11px] text-muted">alerta si el lag supera el umbral (&gt; 5 min)</p>
          <ul className="space-y-2">
            {REPLICA_STATUS.map((s, i) => (
              <li key={i} className="animate-fade-in flex items-start gap-2 text-[13px]" style={{ animationDelay: `${i * 30}ms` }}>
                <span className={`mt-0.5 flex-shrink-0 text-[11px] ${s.ok ? 'text-emerald-500' : 'text-red-500'}`}>{s.ok ? '✓' : '✕'}</span>
                <span className="text-muted">{s.label}:</span>
                <span className="font-medium text-foreground">{s.value}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 rounded border border-emerald-200 bg-emerald-50 px-3 py-2">
            <p className="text-[11px] font-medium text-emerald-700">Réplica operando dentro de parámetros normales</p>
            <p className="text-[10px] text-emerald-600 mt-0.5">Próxima ventana de mantenimiento: 2026-07-20 02:00 CLT</p>
          </div>
          <span className="block text-right text-[10px] text-muted mt-2">[DAT-01, DAT-26]</span>
        </div>

        {/* Histograma lag */}
        <div className="panel flex w-1/2 min-w-0 flex-col p-3">
          <div className="shrink-0">
            <h3 className="text-[13px] font-semibold text-foreground">Histograma de lag de réplica</h3>
            <p className="mb-2 text-[11px] text-muted">lag en segundos · últimas 24h</p>
            <div className="mb-1 flex items-center gap-3">
              <span className="flex items-center gap-1 text-[11px] text-muted">
                <span className="inline-block h-3 w-3 rounded-sm bg-brand" /> lag (s)
              </span>
              <span className="flex items-center gap-1 text-[11px] text-muted">
                <span className="inline-block h-0.5 w-4 bg-red-400" style={{ borderTop: '2px dashed #ef4444' }} /> umbral 300 s
              </span>
            </div>
          </div>
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-h-0 flex-1" preserveAspectRatio="none">
            {[0, 100, 200, 300].map((v) => (
              <line key={v} x1={PAD.left} x2={W - PAD.right} y1={PAD.top + cH - (v / maxLag) * cH} y2={PAD.top + cH - (v / maxLag) * cH} stroke="#e5e7eb" strokeWidth={0.5} />
            ))}
            <line x1={PAD.left} x2={W - PAD.right} y1={threshY} y2={threshY} stroke="#ef4444" strokeWidth={1.5} strokeDasharray="5,3" />
            <text x={W - PAD.right - 2} y={threshY - 3} textAnchor="end" fontSize={8} fill="#ef4444">300 s</text>
            {LAG_BAR_DATA.map((v, i) => (
              <rect
                key={i}
                x={toBarX(i)}
                y={toBarY(v)}
                width={Math.max(bW, 1)}
                height={toBarH(v)}
                fill={v > 250 ? '#f97316' : '#3b82f6'}
                rx={1}
              />
            ))}
            {[0, 100, 200, 300].map((v) => (
              <text key={v} x={PAD.left - 4} y={PAD.top + cH - (v / maxLag) * cH + 3} textAnchor="end" fontSize={8} fill="#9ca3af">{v}</text>
            ))}
            {[0, 6, 12, 18, 23].map((h) => (
              <text key={h} x={toBarX(h) + bW / 2} y={H - 2} textAnchor="middle" fontSize={8} fill="#9ca3af">{h}h</text>
            ))}
          </svg>
          <span className="block shrink-0 pt-1 text-right text-[10px] text-muted">[DAT-01, DAT-26]</span>
        </div>
      </div>

      {/* Row 2 */}
      <div className="flex gap-3">
        {/* Acceso réplica */}
        <div className="panel w-1/2 min-w-0 p-3">
          <h3 className="text-[13px] font-semibold text-foreground">Acceso a réplica por tenant / proceso ETL de PASA</h3>
          <p className="mb-3 text-[11px] text-muted">gestión de acceso con revocación individual (auditada)</p>
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border text-left text-[11px] font-medium uppercase tracking-wider text-muted">
                <th className="sticky top-0 bg-white px-3 py-2">Usuario</th>
                <th className="sticky top-0 bg-white px-3 py-2">Tenant / proceso</th>
                <th className="sticky top-0 bg-white px-3 py-2">Permisos</th>
                <th className="sticky top-0 bg-white px-3 py-2">Última conexión</th>
                <th className="sticky top-0 bg-white px-3 py-2">Vol. consultado</th>
                <th className="sticky top-0 bg-white px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {REPLICA_USERS.map((u, i) => (
                <tr key={u.usuario} className="animate-fade-in transition-colors hover:bg-surface" style={{ animationDelay: `${i * 30}ms` }}>
                  <td className="px-3 py-2 font-mono text-[12px] font-medium text-foreground">{u.usuario}</td>
                  <td className="px-3 py-2 text-[11px] text-muted">{u.tenant}</td>
                  <td className="px-3 py-2">
                    <span className="inline-block rounded bg-blue-100 px-1.5 py-0.5 font-mono text-[10px] font-medium text-blue-700">{u.permisos}</span>
                  </td>
                  <td className="px-3 py-2 text-[11px] text-muted">{u.ultimaConexion}</td>
                  <td className="px-3 py-2 text-[11px] font-mono text-foreground">{u.vol}</td>
                  <td className="px-3 py-2">
                    <button type="button" className="text-[10px] text-red-500 hover:underline">Revocar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <span className="block text-right text-[10px] text-muted mt-2">[DAT-01, CYB-03, DAT-14]</span>
        </div>

        {/* Monitor cambios de esquema */}
        <div className="panel w-1/2 min-w-0 p-3">
          <h3 className="text-[13px] font-semibold text-foreground">Monitor de cambios de esquema</h3>
          <p className="mb-3 text-[11px] text-muted">badge rojo si el plazo de aviso de 30 días no se cumple (DAT-13)</p>
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border text-left text-[11px] font-medium uppercase tracking-wider text-muted">
                <th className="sticky top-0 bg-white px-3 py-2">Tabla / endpoint</th>
                <th className="sticky top-0 bg-white px-3 py-2">Tipo</th>
                <th className="sticky top-0 bg-white px-3 py-2">Detección</th>
                <th className="sticky top-0 bg-white px-3 py-2">Despliegue</th>
                <th className="sticky top-0 bg-white px-3 py-2">Notif. PASA</th>
                <th className="sticky top-0 bg-white px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {SCHEMA_CHANGES.map((s, i) => (
                <>
                  <tr
                    key={i}
                    className="animate-fade-in cursor-pointer transition-colors hover:bg-surface"
                    style={{ animationDelay: `${i * 30}ms` }}
                    onClick={() => setExpandedSchema(expandedSchema === i ? null : i)}
                  >
                    <td className="px-3 py-2 font-mono text-[12px] font-medium text-foreground">{s.tabla}</td>
                    <td className="px-3 py-2 text-[11px] text-muted">{s.tipo}</td>
                    <td className="px-3 py-2 text-[11px] text-muted">{s.deteccion}</td>
                    <td className="px-3 py-2 text-[11px] text-muted">{s.despliegue}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${s.notifPASA === 'enviada' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {s.notifPASA}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-[10px] text-brand">{expandedSchema === i ? '▲' : '▼'}</td>
                  </tr>
                  {expandedSchema === i && (
                    <tr key={`${i}-detail`}>
                      <td colSpan={6} className="bg-surface px-4 py-2 text-[12px] text-muted">
                        {s.detail}
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
          <span className="block text-right text-[10px] text-muted mt-2">[DAT-13, DAT-25]</span>
        </div>
      </div>

      {/* Row 3 */}
      <div className="flex gap-3">
        {/* Contratos de datos */}
        <div className="panel w-1/2 min-w-0 p-3">
          <h3 className="text-[13px] font-semibold text-foreground">Contratos de datos versionados</h3>
          <p className="mb-3 text-[11px] text-muted">backward compatibility · deprecación de versiones antiguas (INT-06)</p>
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border text-left text-[11px] font-medium uppercase tracking-wider text-muted">
                <th className="sticky top-0 bg-white px-3 py-2">Integración</th>
                <th className="sticky top-0 bg-white px-3 py-2">Versión actual</th>
                <th className="sticky top-0 bg-white px-3 py-2">Versiones soportadas</th>
                <th className="sticky top-0 bg-white px-3 py-2">Esquema</th>
                <th className="sticky top-0 bg-white px-3 py-2">Deprecación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {DATA_CONTRACTS.map((c, i) => (
                <tr key={c.integracion} className="animate-fade-in transition-colors hover:bg-surface" style={{ animationDelay: `${i * 30}ms` }}>
                  <td className="px-3 py-2 font-medium text-foreground">{c.integracion}</td>
                  <td className="px-3 py-2">
                    <span className="inline-block rounded bg-blue-100 px-1.5 py-0.5 font-mono text-[10px] font-medium text-blue-700">{c.versionActual}</span>
                  </td>
                  <td className="px-3 py-2 font-mono text-[11px] text-muted">{c.versionesSoportadas}</td>
                  <td className="px-3 py-2">
                    <button type="button" className="font-mono text-[10px] text-brand hover:underline">{c.esquema}</button>
                  </td>
                  <td className="px-3 py-2 text-[11px] text-muted">{c.deprecacion}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <span className="block text-right text-[10px] text-muted mt-2">[DAT-25, INT-06]</span>
        </div>

        {/* Alerta 30 días */}
        <div className="panel w-1/2 min-w-0 p-3">
          <h3 className="text-[13px] font-semibold text-foreground">Alerta de anticipación de 30 días</h3>
          <p className="mb-3 text-[11px] text-muted">aviso formal a PASA por cambio de esquema (DAT-13)</p>
          <ul className="space-y-3">
            <li className="animate-fade-in flex items-start gap-2 text-[13px]" style={{ animationDelay: '0ms' }}>
              <span className="mt-0.5 text-amber-500 flex-shrink-0">⚠</span>
              <span className="text-foreground">2 cambios detectados sin notificar</span>
            </li>
            <li className="animate-fade-in flex items-start gap-2 text-[13px]" style={{ animationDelay: '30ms' }}>
              <span className="mt-0.5 text-red-500 flex-shrink-0">✕</span>
              <span className="text-foreground">
                1 incumple el plazo de 30 días
                <span className="ml-1.5 inline-block rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700">plazo vencido</span>
              </span>
            </li>
            <li className="animate-fade-in flex items-start gap-2 text-[13px]" style={{ animationDelay: '60ms' }}>
              <span className="mt-0.5 text-blue-500 flex-shrink-0">ℹ</span>
              <span className="text-muted">Calcula si el despliegue respeta el aviso basado en fecha de detección vs. despliegue</span>
            </li>
          </ul>
          <div className="mt-4 rounded border border-red-200 bg-red-50 p-3">
            <p className="text-[11px] font-medium text-red-700 mb-1">invoices · tipo modificado</p>
            <p className="text-[10px] text-red-600">Detectado: 2026-07-14 · Despliegue: 2026-07-17 · Plazo requerido: 2026-08-13</p>
            <p className="text-[10px] text-red-600 mt-0.5">El cambio se desplegó 27 días antes de cumplir el aviso a PASA.</p>
          </div>
          <div className="mt-3">
            <button type="button" className="rounded-md bg-brand px-4 py-2 text-[13px] font-medium text-white hover:bg-brand/90">
              Notificar a PASA ahora
            </button>
          </div>
          <span className="block text-right text-[10px] text-muted mt-2">[DAT-13]</span>
        </div>
      </div>
    </div>
  );
}
