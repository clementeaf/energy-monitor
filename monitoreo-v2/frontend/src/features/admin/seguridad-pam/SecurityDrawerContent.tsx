/* ── Drawer content for security detail panels ── */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function SecurityDrawerContent({ type, data, auditLogs, pamUsageHistory }: Readonly<{ type: string; data: any; auditLogs: any[]; pamUsageHistory: any[] }>) {
  if (type === 'breach') {
    return (
      <dl className="space-y-3 text-sm">
        <Row label="Descripción" value={data.description} />
        <Row label="Estado" value={data.status} />
        <Row label="Fecha" value={new Date(data.createdAt).toLocaleString('es-CL')} />
        <Row label="Reportado por" value={data.reportedBy ?? '—'} />
        <Row label="ID" value={data.id} mono />
      </dl>
    );
  }
  if (type === 'audit') {
    return (
      <dl className="space-y-3 text-sm">
        <Row label="Acción" value={data.action} />
        <Row label="Recurso" value={data.resourceType} />
        <Row label="ID recurso" value={data.resourceId ?? '—'} mono />
        <Row label="Usuario" value={data.userEmail ?? data.userId ?? '—'} />
        <Row label="Fecha" value={new Date(data.createdAt).toLocaleString('es-CL')} />
        {data.changes && <Row label="Cambios" value={JSON.stringify(data.changes, null, 2)} mono />}
        <Row label="ID" value={data.id} mono />
      </dl>
    );
  }
  if (type === 'tls') {
    return (
      <dl className="space-y-3 text-sm">
        <Row label="Servicio" value={data.service} />
        <Row label="Días restantes" value={`${data.days}d`} />
        <Row label="Emisor" value={data.issuer} />
        <Row label="Algoritmo" value={data.algorithm} />
        <Row label="Renovación automática" value={data.autoRenew ? 'Sí' : 'No'} />
      </dl>
    );
  }
  if (type === 'pamUsage') {
    return (
      <dl className="space-y-3 text-sm">
        <Row label="Usuario" value={data.user} />
        <Row label="Recurso" value={data.resource} />
        <Row label="Acción" value={data.action} />
        <Row label="Fecha" value={data.date} />
        <Row label="ID" value={data.id} mono />
      </dl>
    );
  }
  if (type === 'incident') {
    return (
      <dl className="space-y-3 text-sm">
        <Row label="Descripción" value={data.description} />
        <Row label="Tipo" value={data.type} />
        <Row label="Severidad" value={data.severity} />
        <Row label="Estado" value={data.status} />
        <Row label="Fecha" value={data.date} />
        <Row label="Responsable" value={data.responsible} />
        <Row label="ID" value={data.id} mono />
      </dl>
    );
  }
  if (type === 'pam') {
    return (
      <dl className="space-y-3 text-sm">
        <Row label="Nombre" value={data.displayName} />
        <Row label="Email" value={data.email} />
        <Row label="Rol" value={data.role?.name ?? data.role?.slug ?? '—'} />
        <Row label="Estado PAM" value={data.pamStatus} />
        <Row label="Última revisión" value={data.lastReview?.toLocaleDateString('es-CL') ?? '—'} />
        <Row label="Próxima revisión" value={data.nextReview?.toLocaleDateString('es-CL') ?? '—'} />
        <Row label="Días hasta revisión" value={String(data.daysUntilReview ?? '—')} />
        <Row label="Activo" value={data.isActive ? 'Sí' : 'No'} />
        <Row label="Creado" value={new Date(data.createdAt).toLocaleString('es-CL')} />
        <Row label="ID" value={data.id} mono />
      </dl>
    );
  }
  // suppress unused var warnings
  void auditLogs; void pamUsageHistory;
  return <p className="text-xs text-muted">Sin detalle disponible.</p>;
}

export function drawerTitle(type?: string): string {
  const titles: Record<string, string> = {
    breach: 'Reporte de brecha',
    audit: 'Registro de auditoría',
    tls: 'Certificado TLS',
    pamUsage: 'Actividad PAM',
    incident: 'Incidente de seguridad',
    pam: 'Cuenta privilegiada',
  };
  return titles[type ?? ''] ?? 'Detalle';
}

function Row({ label, value, mono }: Readonly<{ label: string; value: string; mono?: boolean }>) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted">{label}</dt>
      <dd className={`mt-0.5 text-foreground ${mono ? 'font-mono text-xs' : ''}`}>{value}</dd>
    </div>
  );
}
