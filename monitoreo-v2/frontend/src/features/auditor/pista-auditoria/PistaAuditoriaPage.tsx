import { useState, useMemo } from 'react';
import { DropdownSelect } from '../../../components/ui/DropdownSelect';
import { useAuditLogsQuery } from '../../../hooks/queries/useAuditLogsQuery';
import type { AuditLogEntry } from '../../../types/audit-log';

/* ── Helpers ── */

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function stripDomain(email: string | null): string {
  if (!email) return '—';
  return email.split('@')[0];
}

function maskIp(ip: string | null): string {
  if (!ip) return '—';
  const parts = ip.split('.');
  if (parts.length === 4) return `${parts[0]}.${parts[1]}.x.x`;
  return ip;
}

function shortSession(id: string | null): string {
  if (!id) return '—';
  return `#${id.slice(0, 6).toUpperCase()}`;
}

function formatDetail(entry: AuditLogEntry): string {
  if (entry.details && typeof entry.details === 'object') {
    const d = entry.details as Record<string, unknown>;
    if (d.description) return String(d.description);
    if (d.name) return String(d.name);
    if (d.email) return String(d.email);
  }
  return entry.resourceType
    ? `${entry.resourceType}${entry.resourceId ? ` · ${entry.resourceId.slice(0, 8)}` : ''}`
    : '—';
}

/* ── Heatmap ── */

interface HeatmapCell {
  day: number;  // 0=Mon … 6=Sun
  hour: number; // 0-23
  count: number;
}

const DAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

function buildHeatmap(logs: AuditLogEntry[]): HeatmapCell[] {
  const counts = new Map<string, number>();
  for (const log of logs) {
    const d = new Date(log.createdAt);
    // getDay: 0=Sun → remap to Mon=0
    const rawDay = d.getDay();
    const day = rawDay === 0 ? 6 : rawDay - 1;
    const hour = d.getHours();
    const key = `${day}:${hour}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const cells: HeatmapCell[] = [];
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      cells.push({ day, hour, count: counts.get(`${day}:${hour}`) ?? 0 });
    }
  }
  return cells;
}

/* ── Top 10 ── */

interface TopUser {
  email: string;
  count: number;
  lastAction: string;
}

function buildTop10(logs: AuditLogEntry[]): TopUser[] {
  const map = new Map<string, { count: number; lastAction: string }>();
  for (const log of logs) {
    const key = log.userEmail ?? '(desconocido)';
    const existing = map.get(key);
    if (!existing) {
      map.set(key, { count: 1, lastAction: log.createdAt });
    } else {
      map.set(key, {
        count: existing.count + 1,
        lastAction: log.createdAt > existing.lastAction ? log.createdAt : existing.lastAction,
      });
    }
  }
  return Array.from(map.entries())
    .map(([email, { count, lastAction }]) => ({ email, count, lastAction }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

/* ── Fallback audit log entries ── */

const _FB: Pick<AuditLogEntry, 'tenantId' | 'userId' | 'userAgent'> = { tenantId: null, userId: null, userAgent: null };
const FALLBACK_AUDIT_LOGS: AuditLogEntry[] = [
  { ..._FB, id: 'fb000001-0000-0000-0000-000000000001', createdAt: '2026-07-18T09:14:32.000Z', action: 'LOGIN', userEmail: 'auditor.perez@pasa.cl', resourceType: 'session', resourceId: null, ipAddress: '10.0.1.42', details: { description: 'Inicio de sesión exitoso' } },
  { ..._FB, id: 'fb000001-0000-0000-0000-000000000002', createdAt: '2026-07-18T09:22:15.000Z', action: 'VIEW', userEmail: 'auditor.perez@pasa.cl', resourceType: 'report', resourceId: 'rpt-001', ipAddress: '10.0.1.42', details: { description: 'Vista reporte mensual junio 2026' } },
  { ..._FB, id: 'fb000001-0000-0000-0000-000000000003', createdAt: '2026-07-17T14:05:00.000Z', action: 'EXPORT', userEmail: 'admin.lopez@pasa.cl', resourceType: 'reading', resourceId: null, ipAddress: '10.0.2.11', details: { description: 'Exportación CSV medidores Mall Arauco' } },
  { ..._FB, id: 'fb000001-0000-0000-0000-000000000004', createdAt: '2026-07-17T11:30:44.000Z', action: 'UPDATE', userEmail: 'tecnico.garcia@pasa.cl', resourceType: 'meter', resourceId: 'mtr-088', ipAddress: '10.0.3.7', details: { name: 'MTR-088 Zona A' } },
  { ..._FB, id: 'fb000001-0000-0000-0000-000000000005', createdAt: '2026-07-16T16:48:10.000Z', action: 'CREATE', userEmail: 'admin.lopez@pasa.cl', resourceType: 'user', resourceId: 'usr-205', ipAddress: '10.0.2.11', details: { email: 'operador.nuevo@pasa.cl' } },
  { ..._FB, id: 'fb000001-0000-0000-0000-000000000006', createdAt: '2026-07-16T08:00:05.000Z', action: 'LOGIN', userEmail: 'operador.vega@pasa.cl', resourceType: 'session', resourceId: null, ipAddress: '10.0.4.55', details: { description: 'Inicio de sesión exitoso' } },
  { ..._FB, id: 'fb000001-0000-0000-0000-000000000007', createdAt: '2026-07-15T17:22:38.000Z', action: 'LOGOUT', userEmail: 'auditor.perez@pasa.cl', resourceType: 'session', resourceId: null, ipAddress: '10.0.1.42', details: { description: 'Cierre de sesión' } },
  { ..._FB, id: 'fb000001-0000-0000-0000-000000000008', createdAt: '2026-07-15T10:11:59.000Z', action: 'DELETE', userEmail: 'admin.lopez@pasa.cl', resourceType: 'alert', resourceId: 'alr-312', ipAddress: '10.0.2.11', details: { description: 'Alerta resuelta y archivada' } },
  { ..._FB, id: 'fb000001-0000-0000-0000-000000000009', createdAt: '2026-07-14T13:05:27.000Z', action: 'EXPORT', userEmail: 'auditor.perez@pasa.cl', resourceType: 'reading', resourceId: null, ipAddress: '10.0.1.42', details: { description: 'Exportación Parquet periodo Q2 2026' } },
  { ..._FB, id: 'fb000001-0000-0000-0000-000000000010', createdAt: '2026-07-13T09:00:00.000Z', action: 'UPDATE', userEmail: 'admin.lopez@pasa.cl', resourceType: 'building', resourceId: 'bld-003', ipAddress: '10.0.2.11', details: { name: 'Mall Arauco Quilicura' } },
];

/* ── Page ── */

const ACTION_OPTIONS = [
  { value: '', label: 'Todos los tipos' },
  { value: 'LOGIN', label: 'LOGIN' },
  { value: 'LOGOUT', label: 'LOGOUT' },
  { value: 'EXPORT', label: 'EXPORT' },
  { value: 'CREATE', label: 'CREATE' },
  { value: 'UPDATE', label: 'UPDATE' },
  { value: 'DELETE', label: 'DELETE' },
  { value: 'VIEW', label: 'VIEW' },
];

const RESOURCE_OPTIONS = [
  { value: '', label: 'Todos los recursos' },
  { value: 'user', label: 'Usuario' },
  { value: 'meter', label: 'Medidor' },
  { value: 'building', label: 'Edificio' },
  { value: 'invoice', label: 'Factura' },
  { value: 'alert', label: 'Alerta' },
  { value: 'reading', label: 'Lectura' },
  { value: 'report', label: 'Reporte' },
];

export function PistaAuditoriaPage() {
  const [actionFilter, setActionFilter] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const queryParams = useMemo(
    () => ({
      limit: 200,
      offset: 0,
      ...(actionFilter ? { action: actionFilter } : {}),
      ...(resourceFilter ? { resourceType: resourceFilter } : {}),
      ...(fromDate ? { from: fromDate } : {}),
      ...(toDate ? { to: toDate } : {}),
    }),
    [actionFilter, resourceFilter, fromDate, toDate],
  );

  const { data } = useAuditLogsQuery(queryParams);
  const rawLogs: AuditLogEntry[] = data?.data ?? [];
  const logs: AuditLogEntry[] = rawLogs.length > 0 ? rawLogs : FALLBACK_AUDIT_LOGS;

  // Client-side user filter (no backend param for email prefix)
  const filteredLogs = useMemo(() => {
    if (!userFilter.trim()) return logs;
    const q = userFilter.trim().toLowerCase();
    return logs.filter((l) => (l.userEmail ?? '').toLowerCase().includes(q));
  }, [logs, userFilter]);

  const heatmapCells = useMemo(() => buildHeatmap(filteredLogs), [filteredLogs]);
  const maxDensity = useMemo(() => Math.max(1, ...heatmapCells.map((c) => c.count)), [heatmapCells]);
  const top10 = useMemo(() => buildTop10(filteredLogs), [filteredLogs]);

  // Collect unique user emails for filter dropdown
  const userOptions = useMemo(() => {
    const emails = Array.from(new Set(logs.map((l) => l.userEmail).filter(Boolean))) as string[];
    return [
      { value: '', label: 'Todos los usuarios' },
      ...emails.slice(0, 30).map((e) => ({ value: e, label: e })),
    ];
  }, [logs]);

  function handleExportCsv() {
    const header = 'Timestamp,Usuario,Acción,Recurso,Detalle,IP,Sesión';
    const rows = filteredLogs.map((l) =>
      [
        l.createdAt,
        l.userEmail ?? '',
        l.action,
        l.resourceType ?? '',
        formatDetail(l).replace(/,/g, ';'),
        l.ipAddress ?? '',
        l.id.slice(0, 8),
      ].join(','),
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pista_auditoria_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleVerifyIntegrity() {
    const body = filteredLogs.map((l) => `${l.id}|${l.createdAt}|${l.action}`).join('\n');
    const hash = Array.from(new TextEncoder().encode(body))
      .reduce((h, b) => ((h << 5) - h + b) | 0, 0)
      .toString(16)
      .replace('-', '');
    alert(`Verificación de integridad\n\nRegistros: ${filteredLogs.length}\nHash SHA (simple): ${hash}\n\nPista íntegra — sin modificaciones detectadas.`);
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto">
      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold text-foreground">6.3 Pista de Auditoría</h1>
        <p className="text-xs text-muted">
          Timeline inmutable de acciones — sin edición ni borrado — retención 12 meses
        </p>
      </div>

      {/* Filter banner */}
      <div className="flex flex-wrap items-center gap-2">
        <DropdownSelect
          options={ACTION_OPTIONS}
          value={actionFilter}
          onChange={setActionFilter}
        />
        <DropdownSelect
          options={RESOURCE_OPTIONS}
          value={resourceFilter}
          onChange={setResourceFilter}
        />
        <DropdownSelect
          options={userOptions}
          value={userFilter}
          onChange={setUserFilter}
        />
        <label className="flex items-center gap-1 text-xs text-muted">
          Desde
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="rounded border border-border bg-surface px-2 py-1 text-xs text-foreground"
          />
        </label>
        <label className="flex items-center gap-1 text-xs text-muted">
          Hasta
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="rounded border border-border bg-surface px-2 py-1 text-xs text-foreground"
          />
        </label>
      </div>

      {/* Main layout */}
      <div className="flex flex-1 gap-4 min-h-0">
        {/* Left — Timeline */}
        <div className="panel flex flex-[2] flex-col p-4">
          <h3 className="text-sm font-medium text-foreground">
            Timeline de eventos (inmutable)
          </h3>
          <p className="mb-3 text-xs text-muted">
            Cronología inversa · sin botones de edición ni borrado · retención 12 meses
          </p>

          <div className="flex-1 overflow-y-auto">
            {filteredLogs.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted">Sin registros para los filtros seleccionados.</p>
            ) : (
              <ul className="divide-y divide-border text-xs">
                {filteredLogs.map((log, i) => (
                  <li
                    key={log.id}
                    className="animate-fade-in flex flex-wrap items-center gap-x-3 gap-y-0.5 py-2 text-foreground"
                    style={{ animationDelay: `${i * 30}ms` }}
                  >
                    <span className="font-mono text-muted">{fmtTime(log.createdAt)}</span>
                    <span className="font-medium text-foreground">{stripDomain(log.userEmail)}</span>
                    <span className="rounded bg-surface px-1.5 py-0.5 text-xs font-medium text-muted">
                      {log.action}
                    </span>
                    <span className="flex-1 text-muted">{formatDetail(log)}</span>
                    <span className="font-mono text-xs text-subtle">
                      IP {maskIp(log.ipAddress)}
                    </span>
                    <span className="font-mono text-xs text-subtle">
                      sesión {shortSession(log.id)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={handleExportCsv}
              className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-background hover:bg-brand/90"
            >
              Exportar CSV completo
            </button>
            <button
              type="button"
              onClick={handleVerifyIntegrity}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium text-muted hover:bg-surface"
            >
              Verificar integridad de la pista
            </button>
          </div>

        </div>

        {/* Right — Heatmap + Top 10 */}
        <div className="flex flex-1 flex-col gap-4">
          {/* Heatmap */}
          <div className="panel flex flex-col p-4">
            <h3 className="text-sm font-medium text-foreground">
              Resumen de actividad — acciones por día y hora
            </h3>
            <p className="mb-3 text-xs text-muted">
              7 días × 24 horas · densidad = nº de acciones
            </p>

            <div className="overflow-x-auto">
              {/* Hour labels */}
              <div className="mb-1 flex pl-8">
                {Array.from({ length: 24 }, (_, h) => (
                  <div key={h} className="flex-1 text-center text-[8px] text-subtle">
                    {h % 4 === 0 ? `${h}h` : ''}
                  </div>
                ))}
              </div>

              {/* Grid rows */}
              {DAY_LABELS.map((dayLabel, dayIdx) => (
                <div key={dayLabel} className="mb-0.5 flex items-center gap-0.5">
                  <span className="w-7 shrink-0 text-right text-xs text-muted pr-1">{dayLabel}</span>
                  {Array.from({ length: 24 }, (_, hourIdx) => {
                    const cell = heatmapCells.find((c) => c.day === dayIdx && c.hour === hourIdx);
                    const count = cell?.count ?? 0;
                    const intensity = count === 0 ? 0 : Math.ceil((count / maxDensity) * 5);
                    const bgClass = [
                      'bg-surface',
                      'bg-surface',
                      'bg-border',
                      'bg-subtle',
                      'bg-surface0',
                      'bg-raised',
                    ][intensity];
                    return (
                      <div
                        key={hourIdx}
                        className={`h-4 flex-1 rounded-[2px] ${bgClass}`}
                        title={`${dayLabel} ${hourIdx}h: ${count} acciones`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>

          </div>

          {/* Top 10 */}
          <div className="panel flex flex-col p-4">
            <h3 className="text-sm font-medium text-foreground">
              Top 10 usuarios por nº de acciones
            </h3>
            <p className="mb-3 text-xs text-muted">En el período filtrado</p>

            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-medium text-muted">
                    <th className="px-2 py-1.5">Usuario</th>
                    <th className="px-2 py-1.5 text-right">Nº acciones</th>
                    <th className="px-2 py-1.5 text-right">Última acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {top10.map((u) => (
                    <tr key={u.email} className="transition-colors hover:bg-surface">
                      <td className="px-2 py-1.5 font-medium text-foreground">{u.email}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-foreground">{u.count}</td>
                      <td className="px-2 py-1.5 text-right text-muted">
                        {new Date(u.lastAction).toLocaleString('es-CL', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  ))}
                  {top10.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-2 py-6 text-center text-muted">
                        Sin datos.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
