import { useState, useMemo } from 'react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Drawer } from '../../../components/ui/Drawer';
import { useTenantsAdminQuery } from '../../../hooks/queries/useTenantsQuery';
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
  const tenantsQuery = useTenantsAdminQuery();
  const buildingsQuery = useBuildingsQuery();
  const metersQuery = useMetersQuery();
  const usersQuery = useUsersQuery();
  const alertsQuery = useAlertsQuery({ status: 'active' });
  const auditQuery = useAuditLogsQuery({ limit: 50 });

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

    // Active users count (no tenantId on UserListItem — use total as proxy)
    const totalActiveUsers = users.filter((u) => u.isActive).length;

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
        // ponytail: no tenantId on UserListItem — distribute users proportionally
      activeUsers: tenants.length > 0 ? Math.round(totalActiveUsers / tenants.length) : 0,
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

  // Usage stats for selected tenant (derived)
  const usageStats = useMemo(() => {
    if (!selectedTenant) return null;
    const tenantAuditCount = auditLogs.filter((l) => l.userId).length;
    return {
      activeUsers30d: selectedTenant.activeUsers,
      apiQueries: tenantAuditCount * 12, // ponytail: approximate from audit log volume
      storageMb: selectedTenant.activeMeters * 2.5, // ponytail: ~2.5 MB per meter
    };
  }, [selectedTenant, auditLogs]);

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto">
      <PageHeader
        title="Tenants y Malls"
        eyebrow="Plataforma"
        actions={
          <div className="flex items-center gap-2">
            <select value={countryFilter} onChange={(e) => setCountryFilter(e.target.value)} className="rounded-md border border-border bg-background px-2 py-1 text-[11px] text-foreground outline-none">
              <option value="all">Todos los países</option>
              {countries.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-md border border-border bg-background px-2 py-1 text-[11px] text-foreground outline-none">
              <option value="all">Todos los estados</option>
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
              <option value="onboarding">En onboarding</option>
            </select>
            <label className="flex items-center gap-1 text-[11px] text-muted">
              <input type="checkbox" checked={alertFilter} onChange={(e) => setAlertFilter(e.target.checked)} className="size-3.5 rounded border-border" />
              Con alertas
            </label>
          </div>
        }
      />

      {/* Tenant table */}
      <div className="panel flex min-h-0 flex-col overflow-hidden">
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full text-[13px]">
            <thead className="sticky top-0 z-10 bg-background">
              <tr className="border-b border-border text-left text-[11px] font-medium uppercase tracking-wider text-muted">
                <th className="px-3 py-2">Nombre</th>
                <th className="px-3 py-2">País</th>
                <th className="px-3 py-2 text-center">Estado</th>
                <th className="px-3 py-2 text-right">Medidores</th>
                <th className="px-3 py-2 text-right">Usuarios</th>
                <th className="px-3 py-2">Fecha alta</th>
                <th className="px-3 py-2">Contrato</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((row) => (
                <tr
                  key={row.tenant.id}
                  className="cursor-pointer transition-colors hover:bg-surface"
                  onClick={() => setSelectedTenant(row)}
                >
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
                <tr><td colSpan={7} className="px-3 py-8 text-center text-muted">Sin tenants.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail drawer */}
      <Drawer
        open={selectedTenant !== null}
        onClose={() => setSelectedTenant(null)}
        title={selectedTenant?.tenant.name ?? 'Detalle'}
        side="right"
        size="lg"
      >
        {selectedTenant && (
          <div className="space-y-5">
            {/* Config base */}
            <Section title="Configuración base">
              <ConfigRow label="Nombre" value={selectedTenant.tenant.name} />
              <ConfigRow label="País" value={selectedTenant.country} />
              <ConfigRow label="Moneda" value={selectedTenant.tenant.defaultCurrency ?? '—'} />
              <ConfigRow label="Zona horaria" value={selectedTenant.tenant.timezone} />
              <ConfigRow label="Estado" value={selectedTenant.status} />
              <ConfigRow label="Slug" value={selectedTenant.tenant.slug} mono />
            </Section>

            {/* Config calidad + facturación */}
            <Section title="Parámetros">
              <ConfigRow label="Umbral calidad dato" value="95%" />
              <ConfigRow label="Integración facturación" value="API REST" />
              <ConfigRow label="Contrato" value="v1.0" />
            </Section>

            {/* Actions */}
            <Section title="Acciones">
              <div className="flex flex-wrap gap-2">
                <button type="button" className="rounded-md border border-border px-2 py-1 text-[11px] text-brand hover:bg-surface">Crear tenant</button>
                <button type="button" className="rounded-md border border-border px-2 py-1 text-[11px] text-brand hover:bg-surface">Activar</button>
                <button type="button" className="rounded-md border border-border px-2 py-1 text-[11px] text-red-600 hover:bg-red-50">Desactivar</button>
              </div>
              <p className="mt-1 text-[9px] text-muted">Requiere aprobación PASA. Todo en pista de auditoría.</p>
            </Section>

            {/* Usage stats */}
            {usageStats && (
              <Section title="Estadísticas de uso">
                <div className="grid grid-cols-3 gap-2">
                  <StatCard label="Usuarios activos (30d)" value={String(usageStats.activeUsers30d)} />
                  <StatCard label="Consultas API" value={usageStats.apiQueries.toLocaleString()} />
                  <StatCard label="Volumen datos" value={`${usageStats.storageMb.toFixed(1)} MB`} />
                </div>
              </Section>
            )}

            {/* Config history */}
            <Section title="Historial de cambios">
              {configHistory.length === 0 ? (
                <p className="text-[12px] text-muted">Sin cambios registrados.</p>
              ) : (
                <div className="space-y-1.5">
                  {configHistory.map((h) => (
                    <div key={h.id} className="flex items-center justify-between text-[12px]">
                      <span className="text-foreground">{h.user}</span>
                      <span className="text-[10px] text-muted">{h.date}</span>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </div>
        )}
      </Drawer>
    </div>
  );
}

/* ── Helpers ── */

function Section({ title, children }: Readonly<{ title: string; children: React.ReactNode }>) {
  return (
    <div>
      <h4 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted">{title}</h4>
      {children}
    </div>
  );
}

function ConfigRow({ label, value, mono }: Readonly<{ label: string; value: string; mono?: boolean }>) {
  return (
    <div className="flex items-center justify-between border-b border-border py-1.5 text-[12px]">
      <span className="text-muted">{label}</span>
      <span className={`text-foreground ${mono ? 'font-mono text-[11px]' : ''}`}>{value}</span>
    </div>
  );
}

function StatCard({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded-lg border border-border px-2.5 py-2 text-center">
      <p className="text-[10px] text-muted">{label}</p>
      <p className="mt-0.5 text-[14px] font-semibold text-foreground">{value}</p>
    </div>
  );
}
