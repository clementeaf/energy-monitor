import { useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { DropdownSelect } from '../../../components/ui/DropdownSelect';
import { PageHeader } from '../../../components/ui/PageHeader';
import { usePermissions } from '../../../hooks/usePermissions';
import {
  useBreachReportsQuery,
  useCreateBreachReport,
  useUpdateBreachReport,
} from '../../../hooks/queries/useBreachReportsQuery';
import type { BreachReport, BreachReportSeverity } from '../../../types/breach-report';

const SEVERITY_LABELS: Record<BreachReportSeverity, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
  critical: 'Critica',
};

/**
 * Ley 21.719 breach reports with 24h agency notification deadline.
 */
export function BreachReportsPage() {
  const { has } = usePermissions();
  const canRead = has('audit', 'read');

  const query = useBreachReportsQuery({ enabled: canRead });
  const createMutation = useCreateBreachReport();
  const updateMutation = useUpdateBreachReport();

  const [createOpen, setCreateOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [dataTypes, setDataTypes] = useState('');
  const [estimatedSubjects, setEstimatedSubjects] = useState('');
  const [severity, setSeverity] = useState<BreachReportSeverity>('medium');
  const [detectedAt, setDetectedAt] = useState(new Date().toISOString().slice(0, 16));

  if (!canRead) {
    return <div className="py-12 text-center text-muted">No tiene permisos para ver reportes de brecha.</div>;
  }

  const reports = query.data ?? [];
  const openReports = reports.filter((r) => r.status === 'open');

  const handleCreate = (): void => {
    const types = dataTypes.split(',').map((t) => t.trim()).filter(Boolean);
    if (!description.trim() || types.length === 0) return;
    createMutation.mutate(
      {
        description: description.trim(),
        dataTypesAffected: types,
        severity,
        detectedAt: new Date(detectedAt).toISOString(),
        estimatedSubjects: estimatedSubjects ? parseInt(estimatedSubjects, 10) : undefined,
      },
      {
        onSuccess: () => {
          setCreateOpen(false);
          setDescription('');
          setDataTypes('');
          setEstimatedSubjects('');
        },
      },
    );
  };

  const markNotified = (report: BreachReport): void => {
    updateMutation.mutate({
      id: report.id,
      payload: { status: 'notified', agencyNotifiedAt: new Date().toISOString() },
    });
  };

  const markResolved = (report: BreachReport): void => {
    updateMutation.mutate({
      id: report.id,
      payload: { status: 'resolved', resolutionNotes: 'Cerrado desde panel admin' },
    });
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Reportes de brecha de seguridad"
        eyebrow="Administración"
       
      />

      <Button onClick={() => { setCreateOpen(true); }}>Registrar brecha</Button>

      {openReports.length > 0 && (
        <div className="rounded-lg border border-warning/30 bg-warning/10 p-4">
          <h2 className="mb-2 font-medium text-warning">{openReports.length} brecha(s) abiertas</h2>
        </div>
      )}

      {query.isPending && <p className="text-sm text-muted">Cargando...</p>}

      <div className="space-y-3">
        {reports.map((report) => (
          <div key={report.id} className="rounded-lg border border-border bg-background p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium text-foreground">{SEVERITY_LABELS[report.severity]} — {report.status}</p>
                <p className="mt-1 text-sm text-muted">{report.description}</p>
                <p className="mt-1 text-xs text-subtle">
                  Detectado: {new Date(report.detectedAt).toLocaleString('es-CL')}
                  {' · '}Deadline Agencia: {new Date(report.notificationDeadline).toLocaleString('es-CL')}
                </p>
                <p className="text-xs text-subtle">Reportado por: {report.reportedByEmail}</p>
              </div>
              <div className="flex gap-2">
                {report.status === 'open' && (
                  <Button variant="secondary" onClick={() => { markNotified(report); }} loading={updateMutation.isPending}>
                    Marcar notificado
                  </Button>
                )}
                {report.status !== 'resolved' && (
                  <Button variant="secondary" onClick={() => { markResolved(report); }} loading={updateMutation.isPending}>
                    Resolver
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal open={createOpen} onClose={() => { setCreateOpen(false); }} title="Nuevo reporte de brecha">
        <div className="space-y-3">
          <label className="block text-sm font-medium">Descripcion
            <textarea value={description} onChange={(e) => { setDescription(e.target.value); }} rows={3} className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm" />
          </label>
          <label className="block text-sm font-medium">Tipos de datos afectados (coma-separados)
            <input value={dataTypes} onChange={(e) => { setDataTypes(e.target.value); }} placeholder="email, telefono" className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm" />
          </label>
          <label className="block text-sm font-medium">Titulares estimados
            <input type="number" value={estimatedSubjects} onChange={(e) => { setEstimatedSubjects(e.target.value); }} min={0} className="mt-1 w-32 rounded-md border border-border px-3 py-2 text-sm" />
          </label>
          <label className="block text-sm font-medium">Severidad
            <DropdownSelect
              options={Object.entries(SEVERITY_LABELS).map(([value, label]) => ({ value, label }))}
              value={severity}
              onChange={(v) => { setSeverity(v as BreachReportSeverity); }}
              className="mt-1 w-full"
            />
          </label>
          <label className="block text-sm font-medium">Fecha deteccion
            <input type="datetime-local" value={detectedAt} onChange={(e) => { setDetectedAt(e.target.value); }} className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm" />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => { setCreateOpen(false); }}>Cancelar</Button>
            <Button onClick={handleCreate} loading={createMutation.isPending}>Crear (inicia timer 24h)</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
