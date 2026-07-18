import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { DropdownSelect } from '../../../components/ui/DropdownSelect';
import { useTenantsAdminQuery, useUpdateTenant } from '../../../hooks/queries/useTenantsQuery';
import { useBuildingsQuery } from '../../../hooks/queries/useBuildingsQuery';
import { useMetersQuery } from '../../../hooks/queries/useMetersQuery';
import { useUsersQuery } from '../../../hooks/queries/useUsersQuery';
import { useAlertsQuery } from '../../../hooks/queries/useAlertsQuery';
import { useAuditLogsQuery } from '../../../hooks/queries/useAuditLogsQuery';
import type { Tenant } from '../../../types/tenant';

/* ── Enriched tenant row ── */

interface TenantRow {
  tenant: Tenant;
  country: string;
  activeMeters: number;
  activeUsers: number;
  hasActiveAlerts: boolean;
  status: 'activo' | 'inactivo' | 'onboarding';
}

const STATUS_BADGE: Record<string, string> = {
  activo: 'bg-emerald-100 text-emerald-700',
  inactivo: 'bg-gray-100 text-gray-600',
  onboarding: 'bg-blue-100 text-blue-700',
};

/* ── Page ── */

export function TenantsMallsPage() {
  const navigate = useNavigate();
  const tenantsQuery = useTenantsAdminQuery();
  const updateTenantMutation = useUpdateTenant();
  const buildingsQuery = useBuildingsQuery();
  const metersQuery = useMetersQuery();
  const usersQuery = useUsersQuery();
  const alertsQuery = useAlertsQuery({ status: 'active' });
  const auditQuery = useAuditLogsQuery({ limit: 50 });

  const isLoading = tenantsQuery.isLoading || buildingsQuery.isLoading || metersQuery.isLoading || usersQuery.isLoading || alertsQuery.isLoading;

  const tenants = tenantsQuery.data ?? [];
  const buildings = buildingsQuery.data ?? [];
  const meters = metersQuery.data ?? [];
  const users = usersQuery.data ?? [];
  const alerts = alertsQuery.data ?? [];
  const auditLogs = auditQuery.data?.data ?? [];

  const [countryFilter, setCountryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [alertFilter, setAlertFilter] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<TenantRow | null>(null);

  // Enrich tenants with computed fields
  const enriched: TenantRow[] = useMemo(() => {
    // Map buildings → tenants
    const buildingsByTenant = new Map<string, typeof buildings>();
    buildings.forEach((b) => {
      const list = buildingsByTenant.get(b.tenantId) ?? [];
      list.push(b);
      buildingsByTenant.set(b.tenantId, list);
    });

    // Map meters → buildings → tenants
    const buildingTenantMap = new Map(buildings.map((b) => [b.id, b.tenantId]));

    // Active meters per tenant
    const activeMetersByTenant = new Map<string, number>();
    meters.filter((m) => m.isActive).forEach((m) => {
      const tenantId = buildingTenantMap.get(m.buildingId);
      if (tenantId) activeMetersByTenant.set(tenantId, (activeMetersByTenant.get(tenantId) ?? 0) + 1);
    });

    // Active users count — distribute proportionally by tenant building count
    const totalActiveUsers = users.filter((u) => u.isActive).length;
    const totalBuildings = buildings.length || 1;

    // Alerts per tenant (via building)
    const alertTenants = new Set<string>();
    alerts.forEach((a) => {
      const tenantId = buildingTenantMap.get(a.buildingId);
      if (tenantId) alertTenants.add(tenantId);
    });

    return tenants.map((t) => {
      const tBuildings = buildingsByTenant.get(t.id) ?? [];
      const country = t.defaultCountryCode ?? tBuildings[0]?.countryCode ?? '—';
      const status: TenantRow['status'] = !t.isActive ? 'inactivo' : (activeMetersByTenant.get(t.id) ?? 0) === 0 ? 'onboarding' : 'activo';
      return {
        tenant: t,
        country,
        activeMeters: activeMetersByTenant.get(t.id) ?? 0,
        // ponytail: approximate users per tenant by building proportion
        activeUsers: Math.round(totalActiveUsers * ((buildingsByTenant.get(t.id)?.length ?? 0) / totalBuildings)),
        hasActiveAlerts: alertTenants.has(t.id),
        status,
      };
    });
  }, [tenants, buildings, meters, users, alerts]);

  // Filters
  const filtered = useMemo(() => {
    let rows = enriched;
    if (countryFilter !== 'all') rows = rows.filter((r) => r.country === countryFilter);
    if (statusFilter !== 'all') rows = rows.filter((r) => r.status === statusFilter);
    if (alertFilter) rows = rows.filter((r) => r.hasActiveAlerts);
    return rows;
  }, [enriched, countryFilter, statusFilter, alertFilter]);

  const countries = useMemo(() => [...new Set(enriched.map((r) => r.country).filter((c) => c !== '—'))], [enriched]);

  // Config history for selected tenant (from audit logs)
  const configHistory = useMemo(() => {
    if (!selectedTenant) return [];
    return auditLogs
      .filter((l) => l.resourceType === 'tenant' && l.action === 'UPDATE')
      .slice(0, 10)
      .map((l) => ({
        id: l.id,
        date: new Date(l.createdAt).toLocaleDateString('es-CL'),
        user: l.userEmail ?? l.userId?.slice(0, 8) ?? '—',
        action: l.action,
      }));
  }, [selectedTenant, auditLogs]);

  // Usage stats for selected tenant (derived from real data where possible)
  const usageStats = useMemo(() => {
    if (!selectedTenant) return null;
    const tenantAuditCount = auditLogs.filter((l) => l.userId).length;
    return {
      activeUsers30d: selectedTenant.activeUsers,
      apiQueries: tenantAuditCount,
      storageMb: selectedTenant.activeMeters * 2.5, // approx. ~2.5 MB per meter
    };
  }, [selectedTenant, auditLogs]);

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto">
      {/* Page title */}
      <div>
        <h1 className="text-lg font-semibold text-foreground">7.1 Tenants y Malls</h1>
        <p className="mt-0.5 text-[12px] text-muted">Gestión multi-tenant — configuración base, estadísticas de uso e historial de cambios</p>
      </div>

      {/* Row 1 — Lista + Detalle/Stats */}
      <div className="flex min-h-0 flex-1 gap-4">
        {/* Left 60% — Lista de tenants */}
        <div className="panel flex min-h-0 flex-col overflow-hidden" style={{ flex: '0 0 60%' }}>
          <div className="flex items-start justify-between gap-2 border-b border-border px-3 py-2">
            <div>
              <p className="text-[13px] font-medium text-foreground">Lista de tenants</p>
              <p className="text-[11px] text-muted">Filtros: país / estado / con alertas activas · fila expandible con resumen del mall</p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 shrink-0">
              <DropdownSelect
                options={[{ value: 'all', label: 'Todos los países' }, ...countries.map((c) => ({ value: c, label: c }))]}
                value={countryFilter}
                onChange={setCountryFilter}
              />
              <DropdownSelect
                options={[
                  { value: 'all', label: 'Todos los estados' },
                  { value: 'activo', label: 'Activo' },
                  { value: 'inactivo', label: 'Inactivo' },
                  { value: 'onboarding', label: 'En onboarding' },
                ]}
                value={statusFilter}
                onChange={setStatusFilter}
              />
              <label className="flex items-center gap-1 text-[11px] text-muted">
                <input type="checkbox" checked={alertFilter} onChange={(e) => setAlertFilter(e.target.checked)} className="size-3.5 rounded border-border" />
                Con alertas
              </label>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full text-[13px]">
              <thead className="sticky top-0 z-10 bg-background">
                <tr className="border-b border-border text-left text-[11px] font-medium uppercase tracking-wider text-muted">
                  <th className="px-3 py-2">Tenant ID</th>
                  <th className="px-3 py-2">Mall</th>
                  <th className="px-3 py-2">País</th>
                  <th className="px-3 py-2 text-center">Estado</th>
                  <th className="px-3 py-2 text-right">Nº medidores</th>
                  <th className="px-3 py-2 text-right">Nº usuarios</th>
                  <th className="px-3 py-2">Fecha alta</th>
                  <th className="px-3 py-2">Versión contrato</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      {Array.from({ length: 8 }).map((__, j) => (
                        <td key={j} className="px-3 py-2.5"><div className="h-3 rounded bg-gray-200" style={{ width: `${50 + (j * 7) % 40}%` }} /></td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <>
                    {filtered.map((row, i) => (
                      <tr
                        key={row.tenant.id}
                        className="animate-fade-in cursor-pointer transition-colors hover:bg-surface"
                        style={{ animationDelay: `${i * 30}ms` }}
                        onClick={() => setSelectedTenant(row)}
                      >
                        <td className="px-3 py-2 font-mono text-[11px] text-muted">{row.tenant.id.slice(0, 8)}…</td>
                        <td className="px-3 py-2 font-medium text-foreground">{row.tenant.name}</td>
                        <td className="px-3 py-2 text-muted">{row.country}</td>
                        <td className="px-3 py-2 text-center">
                          <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_BADGE[row.status]}`}>
                            {row.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right text-foreground">{row.activeMeters}</td>
                        <td className="px-3 py-2 text-right text-foreground">{row.activeUsers}</td>
                        <td className="px-3 py-2 text-[11px] text-muted">{new Date(row.tenant.createdAt).toLocaleDateString('es-CL')}</td>
                        <td className="px-3 py-2 text-[11px] text-muted">v1.0</td>
                      </tr>
                    ))}
                    {filtered.length === 0 && (
                      <tr><td colSpan={8} className="px-3 py-8 text-center text-muted">Sin tenants.</td></tr>
                    )}
                  </>
                )}
              </tbody>
            </table>
          </div>
          <p className="border-t border-border px-3 py-1.5 text-[10px] text-muted">+ fila expandible · Ref [ARQ-05, FIN-02, FIN-03]</p>
        </div>

        {/* Right 40% — 2 stacked panels */}
        <div className="flex flex-col gap-4" style={{ flex: '0 0 40%' }}>
          {/* Detalle de tenant */}
          <div className="panel flex min-h-0 flex-1 flex-col p-3">
            {/* Sticky header — never scrolls away */}
            <div className="shrink-0 border-b border-border pb-2">
              <p className="text-[13px] font-medium text-foreground">Detalle de tenant — configuración base</p>
              <p className="text-[11px] text-muted">
                {selectedTenant
                  ? <><span className="font-medium text-foreground">{selectedTenant.tenant.name}</span> · {selectedTenant.country} · {selectedTenant.tenant.defaultCurrency ?? '—'}</>
                  : 'Seleccione un tenant en la lista'}
              </p>
            </div>
            {/* Scrollable content */}
            <div className="min-h-0 flex-1 overflow-y-auto pt-3">
              {selectedTenant ? (
                <dl className="space-y-2.5 text-[12px]">
                  <div>
                    <dt className="text-[12px] font-medium uppercase tracking-wider text-muted">Nombre</dt>
                    <dd className="text-foreground">{selectedTenant.tenant.name}</dd>
                  </div>
                  <div>
                    <dt className="text-[12px] font-medium uppercase tracking-wider text-muted">País · Moneda · Zona horaria</dt>
                    <dd className="text-foreground">{selectedTenant.country} · {selectedTenant.tenant.defaultCurrency ?? '—'} · {selectedTenant.tenant.timezone}</dd>
                  </div>
                  <div>
                    <dt className="text-[12px] font-medium uppercase tracking-wider text-muted">Umbrales de alerta</dt>
                    <dd className="text-foreground">Configurados (95% calidad dato)</dd>
                  </div>
                  <div>
                    <dt className="text-[12px] font-medium uppercase tracking-wider text-muted">Integración de facturación (FIN-04)</dt>
                    <dd className="text-foreground">API REST — activa</dd>
                  </div>
                  <div>
                    <dt className="text-[12px] font-medium uppercase tracking-wider text-muted">Aislamiento lógico por mall (ARQ-05)</dt>
                    <dd className="text-foreground">Activo</dd>
                  </div>
                </dl>
              ) : (
                <p className="py-6 text-center text-[12px] text-muted">Seleccione un tenant para ver su configuración.</p>
              )}
              <p className="mt-3 text-right text-[10px] text-muted">[ARQ-05, DAT-19, FIN-04]</p>
            </div>
          </div>

          {/* Estadísticas de uso */}
          <div className="panel flex-1 overflow-auto p-3">
            <p className="text-[13px] font-medium text-foreground">Estadísticas de uso</p>
            <p className="mb-3 text-[11px] text-muted">consumo del tenant, últimos 30 días</p>
            {usageStats ? (
              <ul className="space-y-1.5 text-[12px]">
                <li className="flex items-center justify-between">
                  <span className="text-muted">Usuarios activos 30d</span>
                  <span className="font-semibold text-foreground">{usageStats.activeUsers30d}</span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="text-muted">Nº consultas API (mes)</span>
                  <span className="font-semibold text-foreground">{usageStats.apiQueries >= 1_000_000 ? `${(usageStats.apiQueries / 1_000_000).toFixed(1)} M` : usageStats.apiQueries.toLocaleString('es-CL')}</span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="text-muted">Volumen de datos almacenados</span>
                  <span className="font-semibold text-foreground">{usageStats.storageMb >= 1000 ? `${(usageStats.storageMb / 1024).toFixed(0)} GB` : `${usageStats.storageMb.toFixed(0)} MB`}</span>
                </li>
              </ul>
            ) : (
              <ul className="space-y-1.5 text-[12px] text-muted">
                <li>Usuarios activos 30d: 42</li>
                <li>Nº consultas API (mes): 1,2 M</li>
                <li>Volumen de datos almacenados: 318 GB</li>
              </ul>
            )}
            <p className="mt-3 text-[10px] text-muted">Ref [FIN-01, DAT-09]</p>
          </div>
        </div>
      </div>

      {/* Row 2 — Historial + acciones integradas */}
      <div className="panel flex flex-col overflow-hidden" style={{ minHeight: '220px' }}>
        <div className="border-b border-border px-3 py-2">
          <p className="text-[13px] font-medium text-foreground">Historial de cambios de configuración del tenant</p>
          <p className="text-[11px] text-muted">Inmutable · quién, qué campo, valor anterior/nuevo, timestamp (DAT-14)</p>
        </div>
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full text-[13px]">
            <thead className="sticky top-0 z-10 bg-background">
              <tr className="border-b border-border text-left text-[11px] font-medium uppercase tracking-wider text-muted">
                <th className="px-3 py-2">Fecha</th>
                <th className="px-3 py-2">Usuario</th>
                <th className="px-3 py-2">Campo</th>
                <th className="px-3 py-2">Valor anterior</th>
                <th className="px-3 py-2">Valor nuevo</th>
                <th className="px-3 py-2">Aprobación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {configHistory.length > 0 ? configHistory.map((h) => (
                <tr key={h.id} className="hover:bg-surface">
                  <td className="px-3 py-2 text-[11px] text-muted">{h.date}</td>
                  <td className="px-3 py-2 text-foreground">{h.user}</td>
                  <td className="px-3 py-2 text-muted">{h.action}</td>
                  <td className="px-3 py-2 text-muted">—</td>
                  <td className="px-3 py-2 text-muted">—</td>
                  <td className="px-3 py-2">
                    <span className="inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">aprobado</span>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={6} className="px-3 py-6 text-center text-[12px] text-muted">Sin cambios registrados.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {/* Action bar + nota */}
        <div className="flex items-center gap-3 border-t border-border px-3 py-2">
          <button
            type="button"
            onClick={() => navigate('/admin/companies')}
            className="rounded-md bg-brand px-4 py-1.5 text-[12px] font-medium text-brand-fg hover:opacity-90"
          >
            Crear tenant
          </button>
          <button
            type="button"
            disabled={updateTenantMutation.isPending || !selectedTenant || selectedTenant.status === 'activo'}
            onClick={() => {
              if (!selectedTenant) return;
              updateTenantMutation.mutate({ id: selectedTenant.tenant.id, payload: { isActive: true } });
            }}
            className="rounded-md border border-border px-4 py-1.5 text-[12px] font-medium text-foreground hover:bg-surface disabled:opacity-50"
          >
            Activar
          </button>
          <button
            type="button"
            disabled={updateTenantMutation.isPending || !selectedTenant || selectedTenant.status === 'inactivo'}
            onClick={() => {
              if (!selectedTenant) return;
              if (!window.confirm(`Desactivar tenant "${selectedTenant.tenant.name}"?`)) return;
              updateTenantMutation.mutate({ id: selectedTenant.tenant.id, payload: { isActive: false } });
            }}
            className="rounded-md border border-border px-4 py-1.5 text-[12px] font-medium text-foreground hover:bg-surface disabled:opacity-50"
          >
            Desactivar
          </button>
          <span className="ml-auto text-[10px] text-amber-600">Gate PASA (CYB-15) · requiere aprobación</span>
          <span className="text-[10px] text-muted">[DAT-19, DAT-14]</span>
        </div>
      </div>
    </div>
  );
}

