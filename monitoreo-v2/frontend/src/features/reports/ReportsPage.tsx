import { useMemo, useState } from 'react';
import { DropdownSelect } from '../../components/ui/DropdownSelect';
import { TableStateBody } from '../../components/ui/TableStateBody';
import { Drawer } from '../../components/ui/Drawer';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useQueryState } from '../../hooks/useQueryState';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';
import { usePermissions } from '../../hooks/usePermissions';
import { useBuildingsQuery } from '../../hooks/queries/useBuildingsQuery';
import {
  useReportsQuery,
  useScheduledReportsQuery,
  useGenerateReport,
  useDeleteReport,
  useCreateScheduledReport,
  useDeleteScheduledReport,
  useUpdateScheduledReport,
} from '../../hooks/queries/useReportsQuery';
import { useReportExportHref } from '../../hooks/useReportExportHref';
import { PageHeader } from '../../components/ui/PageHeader';
import type {
  PlatformReportType,
  ReportFormat,
  GenerateReportPayload,
  CreateScheduledReportPayload,
  Report,
  ScheduledReport,
} from '../../types/report';

const REPORT_TYPES: { value: PlatformReportType; label: string }[] = [
  { value: 'executive', label: 'Ejecutivo' },
  { value: 'consumption', label: 'Consumo' },
  { value: 'demand', label: 'Demanda' },
  { value: 'billing', label: 'Facturación' },
  { value: 'quality', label: 'Calidad eléctrica' },
  { value: 'alerts_compliance', label: 'Alertas y cumplimiento' },
  { value: 'sla', label: 'SLA' },
  { value: 'esg', label: 'ESG' },
  { value: 'benchmark', label: 'Benchmark' },
  { value: 'inventory', label: 'Inventario' },
];

const FORMAT_LABELS: Record<ReportFormat, string> = {
  pdf: 'PDF',
  excel: 'Excel',
  csv: 'CSV',
};

function labelForReportType(t: PlatformReportType): string {
  return REPORT_TYPES.find((x) => x.value === t)?.label ?? t;
}

function ReportRow({
  row,
  canSchedule,
  onDelete,
}: Readonly<{
  row: Report;
  canSchedule: boolean;
  onDelete: () => void;
}>) {
  const exportHref = useReportExportHref(row.id);

  return (
    <tr className="hover:bg-surface">
      <td className="px-4 py-3 text-foreground">{labelForReportType(row.reportType)}</td>
      <td className="px-4 py-3 text-muted">
        {row.periodStart} — {row.periodEnd}
      </td>
      <td className="px-4 py-3">{FORMAT_LABELS[row.format]}</td>
      <td className="px-4 py-3 text-muted">
        {new Date(row.createdAt).toLocaleString('es-CL')}
      </td>
      <td className="px-4 py-3 text-right">
        <a
          href={exportHref}
          target="_blank"
          rel="noreferrer"
          className="mr-3 text-sm font-medium text-brand hover:underline"
        >
          Descargar
        </a>
        {canSchedule && (
          <button
            type="button"
            onClick={onDelete}
            className="text-sm text-red-600 hover:underline"
          >
            Eliminar
          </button>
        )}
      </td>
    </tr>
  );
}

export function ReportsPage() {
  const { has, hasAny } = usePermissions();
  const canRead = hasAny('reports:read', 'reports:view_own');
  const canCreate = has('reports', 'create');
  const canSchedule = has('reports', 'update');

  const [reportFilters, setReportFilters] = useState<{ buildingId?: string; reportType?: PlatformReportType }>({});
  const reportsQuery = useReportsQuery(reportFilters, { enabled: canRead });
  const scheduledQuery = useScheduledReportsQuery({}, { enabled: canRead });
  const buildingsQuery = useBuildingsQuery();

  const reportsQs = useQueryState(reportsQuery, {
    isEmpty: (d) => !d || d.length === 0,
  });
  const scheduledQs = useQueryState(scheduledQuery, {
    isEmpty: (d) => !d || d.length === 0,
  });

  const allReports = reportsQuery.data ?? [];
  const { visible: visibleReports, hasMore: hasMoreReports, sentinelRef: reportsSentinelRef, total: totalReports } = useInfiniteScroll(allReports, [reportFilters.buildingId, reportFilters.reportType]);

  const allScheduled = scheduledQuery.data ?? [];
  const { visible: visibleScheduled, hasMore: hasMoreScheduled, sentinelRef: scheduledSentinelRef, total: totalScheduled } = useInfiniteScroll(allScheduled, []);

  const [generateOpen, setGenerateOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [deletingReport, setDeletingReport] = useState<Report | null>(null);
  const [deletingScheduled, setDeletingScheduled] = useState<ScheduledReport | null>(null);

  const generateMutation = useGenerateReport();
  const deleteReportMutation = useDeleteReport();
  const createScheduledMutation = useCreateScheduledReport();
  const deleteScheduledMutation = useDeleteScheduledReport();
  const updateScheduledMutation = useUpdateScheduledReport();

  const buildingOptions = useMemo(
    () => buildingsQuery.data ?? [],
    [buildingsQuery.data],
  );

  return (
    <div className="flex h-full flex-col gap-8">
      {!canRead ? (
        <div className="flex flex-1 items-center justify-center text-muted">
          No tiene permisos para ver reportes.
        </div>
      ) : (
        <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <PageHeader title="Reportes" eyebrow="Reportes" />
        <div className="flex flex-wrap items-center gap-3">
          <DropdownSelect
            options={[
              { value: '', label: 'Todos los edificios' },
              ...buildingOptions.map((b) => ({ value: b.id, label: b.name })),
            ]}
            value={reportFilters.buildingId ?? ''}
            onChange={(val) => setReportFilters({ ...reportFilters, buildingId: val || undefined })}
            className="w-48"
          />
          <DropdownSelect
            options={[
              { value: '', label: 'Todos los tipos' },
              ...REPORT_TYPES.map((t) => ({ value: t.value, label: t.label })),
            ]}
            value={reportFilters.reportType ?? ''}
            onChange={(val) => setReportFilters({ ...reportFilters, reportType: (val || undefined) as PlatformReportType | undefined })}
            className="w-48"
          />
          {canCreate && (
            <button
              type="button"
              onClick={() => setGenerateOpen(true)}
              className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-brand-fg hover:opacity-90"
            >
              Generar reporte
            </button>
          )}
          {canSchedule && (
            <button
              type="button"
              onClick={() => setScheduleOpen(true)}
              className="rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-surface"
            >
              Programar reporte
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-6">
        {/* Reportes generados */}
        <section className="flex-1 min-w-[300px]">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Reportes generados</h2>
          <div className="overflow-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-background">
                <tr className="bg-surface text-left text-xs font-medium uppercase tracking-wider text-muted">
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Periodo</th>
                  <th className="px-4 py-3">Formato</th>
                  <th className="px-4 py-3">Creado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <TableStateBody
                phase={reportsQs.phase}
                colSpan={5}
                error={reportsQs.error}
                onRetry={reportsQs.refetch}
                emptyMessage="No hay reportes generados"
                skeletonWidths={['w-20', 'w-32', 'w-16', 'w-24', 'w-24']}
              >
                {visibleReports.map((row) => (
                  <ReportRow
                    key={row.id}
                    row={row}
                    canSchedule={canSchedule}
                    onDelete={() => setDeletingReport(row)}
                  />
                ))}
              </TableStateBody>
            </table>
            {hasMoreReports && <div ref={reportsSentinelRef} className="h-4" />}
          </div>
          {totalReports > 0 && <p className="px-2 py-1 text-xs text-muted">Mostrando {visibleReports.length} de {totalReports}</p>}
        </section>

        {/* Reportes programados */}
        <section className="flex-1 min-w-[300px]">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Reportes programados</h2>
          <div className="overflow-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-background">
                <tr className="bg-surface text-left text-xs font-medium uppercase tracking-wider text-muted">
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Cron</th>
                  <th className="px-4 py-3">Activo</th>
                  <th className="px-4 py-3">Próxima ejecución</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <TableStateBody
                phase={scheduledQs.phase}
                colSpan={5}
                error={scheduledQs.error}
                onRetry={scheduledQs.refetch}
                emptyMessage="No hay reportes programados"
                skeletonWidths={['w-20', 'w-24', 'w-12', 'w-28', 'w-20']}
              >
                {visibleScheduled.map((row) => (
                  <tr key={row.id} className="hover:bg-surface">
                    <td className="px-4 py-3">{labelForReportType(row.reportType)}</td>
                    <td className="px-4 py-3 font-mono text-xs text-foreground">{row.cronExpression}</td>
                    <td className="px-4 py-3">
                      {canSchedule ? (
                        <button
                          type="button"
                          onClick={() =>
                            updateScheduledMutation.mutate({
                              id: row.id,
                              payload: { isActive: !row.isActive },
                            })
                          }
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            row.isActive ? 'bg-green-100 text-green-800' : 'bg-raised text-muted'
                          }`}
                        >
                          {row.isActive ? 'Sí' : 'No'}
                        </button>
                      ) : (
                        <span>{row.isActive ? 'Sí' : 'No'}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {row.nextRunAt ? new Date(row.nextRunAt).toLocaleString('es-CL') : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {canSchedule && (
                        <button
                          type="button"
                          onClick={() => setDeletingScheduled(row)}
                          className="text-sm text-red-600 hover:underline"
                        >
                          Eliminar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </TableStateBody>
            </table>
            {hasMoreScheduled && <div ref={scheduledSentinelRef} className="h-4" />}
          </div>
          {totalScheduled > 0 && <p className="px-2 py-1 text-xs text-muted">Mostrando {visibleScheduled.length} de {totalScheduled}</p>}
        </section>
      </div>

      <GenerateDrawer
        open={generateOpen}
        buildings={buildingOptions}
        onClose={() => setGenerateOpen(false)}
        onSubmit={(payload) => {
          generateMutation.mutate(payload, { onSuccess: () => setGenerateOpen(false) });
        }}
        isPending={generateMutation.isPending}
      />

      <ScheduleDrawer
        open={scheduleOpen}
        buildings={buildingOptions}
        onClose={() => setScheduleOpen(false)}
        onSubmit={(payload) => {
          createScheduledMutation.mutate(payload, { onSuccess: () => setScheduleOpen(false) });
        }}
        isPending={createScheduledMutation.isPending}
      />

      <ConfirmDialog
        open={!!deletingReport}
        onClose={() => setDeletingReport(null)}
        onConfirm={() => {
          if (!deletingReport) return;
          deleteReportMutation.mutate(deletingReport.id, { onSuccess: () => setDeletingReport(null) });
        }}
        title="Eliminar reporte"
        message="¿Eliminar este registro de reporte? La descarga dejará de estar disponible."
        isPending={deleteReportMutation.isPending}
      />

      <ConfirmDialog
        open={!!deletingScheduled}
        onClose={() => setDeletingScheduled(null)}
        onConfirm={() => {
          if (!deletingScheduled) return;
          deleteScheduledMutation.mutate(deletingScheduled.id, {
            onSuccess: () => setDeletingScheduled(null),
          });
        }}
        title="Eliminar programación"
        message="¿Eliminar esta programación de reportes?"
        isPending={deleteScheduledMutation.isPending}
      />
        </>
      )}
    </div>
  );
}

function GenerateDrawer({
  open,
  buildings,
  onClose,
  onSubmit,
  isPending,
}: {
  open: boolean;
  buildings: Array<{ id: string; name: string }>;
  onClose: () => void;
  onSubmit: (p: GenerateReportPayload) => void;
  isPending: boolean;
}) {
  const [reportType, setReportType] = useState<PlatformReportType>('consumption');
  const [buildingId, setBuildingId] = useState('');
  const [periodStart, setPeriodStart] = useState(() => new Date().toISOString().slice(0, 10));
  const [periodEnd, setPeriodEnd] = useState(() => new Date().toISOString().slice(0, 10));
  const [format, setFormat] = useState<ReportFormat>('pdf');

  const handleSubmit = (): void => {
    onSubmit({
      reportType,
      buildingId: buildingId || null,
      periodStart,
      periodEnd,
      format,
    });
  };

  return (
    <Drawer open={open} title="Generar reporte" onClose={onClose} footer={
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-border px-4 py-2 text-sm text-foreground hover:bg-surface"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending}
          className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-brand-fg hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? 'Generando…' : 'Generar'}
        </button>
      </div>
    }>
      <div className="flex flex-col gap-4 text-sm">
        <div className="flex flex-col gap-1">
          <span className="text-muted">Tipo</span>
          <DropdownSelect
            options={REPORT_TYPES.map((t) => ({ value: t.value, label: t.label }))}
            value={reportType}
            onChange={(val) => setReportType(val as PlatformReportType)}
            className="w-full"
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-muted">Edificio (opcional)</span>
          <DropdownSelect
            options={[
              { value: '', label: 'Todos (según permisos)' },
              ...buildings.map((b) => ({ value: b.id, label: b.name })),
            ]}
            value={buildingId}
            onChange={(val) => setBuildingId(val)}
            className="w-full"
          />
        </div>
        <div className="flex gap-3">
          <label className="flex flex-1 flex-col gap-1">
            <span className="text-muted">Inicio</span>
            <input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} className="input-field" />
          </label>
          <label className="flex flex-1 flex-col gap-1">
            <span className="text-muted">Fin</span>
            <input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} className="input-field" />
          </label>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-muted">Formato de exportación</span>
          <DropdownSelect
            options={(Object.keys(FORMAT_LABELS) as ReportFormat[]).map((f) => ({ value: f, label: FORMAT_LABELS[f] }))}
            value={format}
            onChange={(val) => setFormat(val as ReportFormat)}
            className="w-full"
          />
        </div>
      </div>
    </Drawer>
  );
}

function ScheduleDrawer({
  open,
  buildings,
  onClose,
  onSubmit,
  isPending,
}: {
  open: boolean;
  buildings: Array<{ id: string; name: string }>;
  onClose: () => void;
  onSubmit: (p: CreateScheduledReportPayload) => void;
  isPending: boolean;
}) {
  const [reportType, setReportType] = useState<PlatformReportType>('consumption');
  const [buildingId, setBuildingId] = useState('');
  const [format, setFormat] = useState<ReportFormat>('pdf');
  const [cronExpression, setCronExpression] = useState('0 8 * * 1');
  const [recipientsRaw, setRecipientsRaw] = useState('');

  const handleSubmit = (): void => {
    const recipients = recipientsRaw
      .split(/[,;\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (recipients.length === 0) return;
    const payload: CreateScheduledReportPayload = {
      reportType,
      buildingId: buildingId || null,
      format,
      cronExpression,
      recipients,
      isActive: true,
    };
    onSubmit(payload);
  };

  return (
    <Drawer open={open} title="Programar reporte" onClose={onClose} footer={
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-border px-4 py-2 text-sm text-foreground hover:bg-surface"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending}
          className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-brand-fg hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    }>
      <div className="flex flex-col gap-4 text-sm">
        <p className="text-xs text-muted">
          Use una expresión cron (5 campos: minuto hora día mes día-semana). Ejemplo: 0 8 * * 1 = lunes 08:00.
        </p>
        <div className="flex flex-col gap-1">
          <span className="text-muted">Tipo</span>
          <DropdownSelect
            options={REPORT_TYPES.map((t) => ({ value: t.value, label: t.label }))}
            value={reportType}
            onChange={(val) => setReportType(val as PlatformReportType)}
            className="w-full"
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-muted">Edificio (opcional)</span>
          <DropdownSelect
            options={[
              { value: '', label: 'Todos (según permisos)' },
              ...buildings.map((b) => ({ value: b.id, label: b.name })),
            ]}
            value={buildingId}
            onChange={(val) => setBuildingId(val)}
            className="w-full"
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-muted">Formato</span>
          <DropdownSelect
            options={(Object.keys(FORMAT_LABELS) as ReportFormat[]).map((f) => ({ value: f, label: FORMAT_LABELS[f] }))}
            value={format}
            onChange={(val) => setFormat(val as ReportFormat)}
            className="w-full"
          />
        </div>
        <label className="flex flex-col gap-1">
          <span className="text-muted">Cron</span>
          <input value={cronExpression} onChange={(e) => setCronExpression(e.target.value)} className="input-field font-mono text-xs" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-muted">Destinatarios (emails, separados por coma)</span>
          <input value={recipientsRaw} onChange={(e) => setRecipientsRaw(e.target.value)} placeholder="a@empresa.cl, b@empresa.cl" className="input-field" />
        </label>
      </div>
    </Drawer>
  );
}
