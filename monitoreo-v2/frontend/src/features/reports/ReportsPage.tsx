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
import { reportsEndpoints } from '../../services/endpoints';
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
        <div className="flex flex-1 items-center justify-center text-gray-500">
          No tiene permisos para ver reportes.
        </div>
      ) : (
        <>
      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold text-gray-900">Reportes</h1>
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
                className="rounded-md bg-[var(--color-primary,#3D3BF3)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                Generar reporte
              </button>
            )}
            {canSchedule && (
              <button
                type="button"
                onClick={() => setScheduleOpen(true)}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
              >
                Programar reporte
              </button>
            )}
          </div>
        </div>

        <div className="overflow-auto rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-white">
              <tr className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
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
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-800">{labelForReportType(row.reportType)}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {row.periodStart} — {row.periodEnd}
                  </td>
                  <td className="px-4 py-3">{FORMAT_LABELS[row.format]}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(row.createdAt).toLocaleString('es-CL')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <a
                      href={reportsEndpoints.exportHref(row.id)}
                      target="_blank"
                      rel="noreferrer"
                      className="mr-3 text-sm font-medium text-[var(--color-primary,#3D3BF3)] hover:underline"
                    >
                      Descargar
                    </a>
                    {canSchedule && (
                      <button
                        type="button"
                        onClick={() => setDeletingReport(row)}
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
          {hasMoreReports && <div ref={reportsSentinelRef} className="h-4" />}
        </div>
        {totalReports > 0 && <p className="px-4 py-2 text-xs text-pa-text-muted">Mostrando {visibleReports.length} de {totalReports}</p>}
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Reportes programados</h2>
        <div className="overflow-auto rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-white">
              <tr className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
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
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">{labelForReportType(row.reportType)}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">{row.cronExpression}</td>
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
                          row.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {row.isActive ? 'Sí' : 'No'}
                      </button>
                    ) : (
                      <span>{row.isActive ? 'Sí' : 'No'}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
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
        {totalScheduled > 0 && <p className="px-4 py-2 text-xs text-pa-text-muted">Mostrando {visibleScheduled.length} de {totalScheduled}</p>}
      </section>

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
          className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending}
          className="rounded-md bg-[var(--color-primary,#3D3BF3)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? 'Generando…' : 'Generar'}
        </button>
      </div>
    }>
      <div className="flex flex-col gap-4 text-sm">
        <label className="flex flex-col gap-1">
          <span className="text-gray-600">Tipo</span>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value as PlatformReportType)}
            className="input-field"
          >
            {REPORT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-gray-600">Edificio (opcional)</span>
          <select
            value={buildingId}
            onChange={(e) => setBuildingId(e.target.value)}
            className="input-field"
          >
            <option value="">Todos (según permisos)</option>
            {buildings.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </label>
        <div className="flex gap-3">
          <label className="flex flex-1 flex-col gap-1">
            <span className="text-gray-600">Inicio</span>
            <input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} className="input-field" />
          </label>
          <label className="flex flex-1 flex-col gap-1">
            <span className="text-gray-600">Fin</span>
            <input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} className="input-field" />
          </label>
        </div>
        <label className="flex flex-col gap-1">
          <span className="text-gray-600">Formato de exportación</span>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value as ReportFormat)}
            className="input-field"
          >
            {(Object.keys(FORMAT_LABELS) as ReportFormat[]).map((f) => (
              <option key={f} value={f}>{FORMAT_LABELS[f]}</option>
            ))}
          </select>
        </label>
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
          className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending}
          className="rounded-md bg-[var(--color-primary,#3D3BF3)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    }>
      <div className="flex flex-col gap-4 text-sm">
        <p className="text-xs text-gray-500">
          Use una expresión cron (5 campos: minuto hora día mes día-semana). Ejemplo: 0 8 * * 1 = lunes 08:00.
        </p>
        <label className="flex flex-col gap-1">
          <span className="text-gray-600">Tipo</span>
          <select value={reportType} onChange={(e) => setReportType(e.target.value as PlatformReportType)} className="input-field">
            {REPORT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-gray-600">Edificio (opcional)</span>
          <select value={buildingId} onChange={(e) => setBuildingId(e.target.value)} className="input-field">
            <option value="">Todos (según permisos)</option>
            {buildings.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-gray-600">Formato</span>
          <select value={format} onChange={(e) => setFormat(e.target.value as ReportFormat)} className="input-field">
            {(Object.keys(FORMAT_LABELS) as ReportFormat[]).map((f) => (
              <option key={f} value={f}>{FORMAT_LABELS[f]}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-gray-600">Cron</span>
          <input value={cronExpression} onChange={(e) => setCronExpression(e.target.value)} className="input-field font-mono text-xs" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-gray-600">Destinatarios (emails, separados por coma)</span>
          <input value={recipientsRaw} onChange={(e) => setRecipientsRaw(e.target.value)} placeholder="a@empresa.cl, b@empresa.cl" className="input-field" />
        </label>
      </div>
    </Drawer>
  );
}
