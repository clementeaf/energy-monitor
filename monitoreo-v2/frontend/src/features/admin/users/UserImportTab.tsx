import { useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { QueryStateView } from '../../../components/ui/QueryStateView';
import { Th, Td } from '../../../components/ui/TablePrimitives';
import { TableStateBody } from '../../../components/ui/TableStateBody';
import { useQueryState } from '../../../hooks/useQueryState';
import {
  downloadUserImportTemplate,
  useCommitUserImport,
  useUserImportJobsQuery,
  useUserImportPreviewQuery,
  useValidateUserImport,
} from '../../../hooks/queries/useUserImportQuery';
import type { CommitUserImportResponse, UserImportSummary } from '../../../types/user-import';
import { getFetchErrorMessage } from '../../../lib/fetchError';
import { UserImportDropzone } from './UserImportDropzone';
import {
  formatUserImportErrorCodes,
  USER_IMPORT_JOB_STATUS_LABELS,
  USER_IMPORT_STATUS_LABELS,
} from './user-import-labels';

type ImportStep = 'upload' | 'preview' | 'done';

interface UserImportTabProps {
  onViewUsers: () => void;
}

const ROWS_PAGE = 25;

/**
 * Summary cards for import validation counts.
 */
function SummaryCards({ summary }: Readonly<{ summary: UserImportSummary }>) {
  const items = [
    { label: 'Total filas', value: summary.totalRows, className: 'text-foreground' },
    { label: 'Válidas', value: summary.validRows, className: 'text-green-700' },
    { label: 'Errores', value: summary.errorRows, className: 'text-red-700' },
    { label: 'Duplicadas', value: summary.duplicateRows, className: 'text-amber-700' },
  ];
  return (
    <div className="flex flex-wrap gap-3">
      {items.map((item) => (
        <div key={item.label} className="panel flex-1 min-w-[120px] px-4 py-3">
          <p className="text-xs text-muted">{item.label}</p>
          <p className={`text-2xl font-semibold tabular-nums ${item.className}`}>{item.value}</p>
        </div>
      ))}
    </div>
  );
}

/**
 * Status badge for import staging rows.
 */
function RowStatusBadge({ status }: Readonly<{ status: string }>) {
  const styles: Record<string, string> = {
    valid: 'bg-green-50 text-green-800',
    error: 'bg-red-50 text-red-800',
    duplicate: 'bg-amber-50 text-amber-800',
    created: 'bg-blue-50 text-blue-800',
  };
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] ?? 'bg-surface text-muted'}`}>
      {USER_IMPORT_STATUS_LABELS[status] ?? status}
    </span>
  );
}

/**
 * Bulk user import wizard: upload, preview, commit.
 */
export function UserImportTab({ onViewUsers }: Readonly<UserImportTabProps>) {
  const [step, setStep] = useState<ImportStep>('upload');
  const [jobId, setJobId] = useState<string | null>(null);
  const [summary, setSummary] = useState<UserImportSummary | null>(null);
  const [filename, setFilename] = useState<string>('');
  const [ageVerified, setAgeVerified] = useState(false);
  const [rowsOffset, setRowsOffset] = useState(0);
  const [statusFilter, setStatusFilter] = useState<'valid' | 'error' | 'duplicate' | ''>('');
  const [commitResult, setCommitResult] = useState<CommitUserImportResponse | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const validateMutation = useValidateUserImport();
  const commitMutation = useCommitUserImport();
  const jobsQuery = useUserImportJobsQuery();
  const rowsQuery = useUserImportPreviewQuery(jobId, {
    limit: ROWS_PAGE,
    offset: rowsOffset,
    status: statusFilter || undefined,
  });
  const rowsQs = useQueryState(rowsQuery, {
    isEmpty: (data) => data === undefined || data.data.length === 0,
  });

  const handleFileSelected = (file: File): void => {
    setUploadError(null);
    setFilename(file.name);
    validateMutation.mutate(file, {
      onSuccess: (result) => {
        setJobId(result.jobId);
        setSummary(result.summary);
        setStep('preview');
        setAgeVerified(false);
        setRowsOffset(0);
        setCommitResult(null);
      },
      onError: (error) => {
        setUploadError(getFetchErrorMessage(error));
      },
    });
  };

  const handleCommit = (): void => {
    if (!jobId || !ageVerified) return;
    commitMutation.mutate(
      { jobId, payload: { ageVerified: true } },
      {
        onSuccess: (result) => {
          setCommitResult(result);
          setStep('done');
        },
      },
    );
  };

  const resetWizard = (): void => {
    setStep('upload');
    setJobId(null);
    setSummary(null);
    setFilename('');
    setAgeVerified(false);
    setCommitResult(null);
    setUploadError(null);
    setRowsOffset(0);
    setStatusFilter('');
  };

  const validCount = summary?.validRows ?? 0;

  return (
    <div className="max-w-3xl space-y-4">
      {step === 'upload' && (
        <section className="space-y-4">
          <div className="panel p-4 text-sm text-muted">
            <p className="font-medium text-foreground">Columnas requeridas</p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li><code className="text-xs">email</code> — correo único por empresa</li>
              <li><code className="text-xs">auth_provider</code> — microsoft o google</li>
              <li><code className="text-xs">role_slug</code> — slug del rol (ej. operator)</li>
            </ul>
            <p className="mt-2">Opcionales: display_name, building_codes (separados por coma), phone.</p>
            <button
              type="button"
              onClick={() => { void downloadUserImportTemplate(); }}
              className="mt-3 text-sm font-medium text-brand underline hover:opacity-80"
            >
              Descargar plantilla CSV
            </button>
          </div>

          <UserImportDropzone
            onFileSelected={handleFileSelected}
            onReject={setUploadError}
            disabled={validateMutation.isPending}
          />

          {validateMutation.isPending ? (
            <p className="text-sm text-muted" role="status">Validando {filename}…</p>
          ) : null}
          {uploadError ? (
            <p className="text-sm text-red-700" role="alert">{uploadError}</p>
          ) : null}
        </section>
      )}

      {step === 'preview' && summary && jobId ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-foreground">{filename}</p>
              <p className="text-xs text-muted">Revise las filas antes de confirmar la creación.</p>
            </div>
            <Button variant="secondary" onClick={resetWizard}>Subir otro archivo</Button>
          </div>

          <SummaryCards summary={summary} />

          <div className="flex flex-wrap gap-2">
            {(['', 'valid', 'error', 'duplicate'] as const).map((value) => {
              const label = value === '' ? 'Todas' : USER_IMPORT_STATUS_LABELS[value];
              const active = statusFilter === value;
              return (
                <button
                  key={value || 'all'}
                  type="button"
                  onClick={() => { setStatusFilter(value); setRowsOffset(0); }}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    active ? 'bg-brand text-brand-fg' : 'bg-surface text-muted hover:text-foreground'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <div className="max-h-[50vh] overflow-auto panel">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="sticky top-0 z-10 bg-surface">
                <tr>
                  <Th>#</Th>
                  <Th>Email</Th>
                  <Th>Nombre</Th>
                  <Th>Rol</Th>
                  <Th>Estado</Th>
                  <Th>Errores</Th>
                </tr>
              </thead>
              <TableStateBody
                phase={rowsQs.phase}
                colSpan={6}
                error={rowsQs.error}
                onRetry={() => { void rowsQuery.refetch(); }}
                emptyMessage="No hay filas con este filtro."
                skeletonWidths={['w-8', 'w-32', 'w-24', 'w-16', 'w-16', 'w-28']}
              >
                {(rowsQuery.data?.data ?? []).map((row) => (
                  <tr key={row.id} className="hover:bg-surface">
                    <Td>{row.rowNumber}</Td>
                    <Td className="font-medium">{row.email ?? '—'}</Td>
                    <Td>{row.displayName ?? '—'}</Td>
                    <Td>{row.roleSlug ?? '—'}</Td>
                    <Td><RowStatusBadge status={row.status} /></Td>
                    <Td className="max-w-xs truncate text-xs text-muted" title={formatUserImportErrorCodes(row.errorCodes)}>
                      {formatUserImportErrorCodes(row.errorCodes)}
                    </Td>
                  </tr>
                ))}
              </TableStateBody>
            </table>
          </div>

          {rowsQuery.data && rowsQuery.data.total > ROWS_PAGE ? (
            <div className="flex items-center justify-between text-xs text-muted">
              <span>
                Mostrando {rowsOffset + 1}–{Math.min(rowsOffset + ROWS_PAGE, rowsQuery.data.total)} de {rowsQuery.data.total}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  disabled={rowsOffset === 0}
                  onClick={() => { setRowsOffset(Math.max(0, rowsOffset - ROWS_PAGE)); }}
                >
                  Anterior
                </Button>
                <Button
                  variant="secondary"
                  disabled={rowsOffset + ROWS_PAGE >= rowsQuery.data.total}
                  onClick={() => { setRowsOffset(rowsOffset + ROWS_PAGE); }}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          ) : null}

          <div className="panel p-4 space-y-3">
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={ageVerified}
                onChange={(event) => { setAgeVerified(event.target.checked); }}
                className="mt-0.5"
              />
              <span>
                Confirmo que todos los usuarios importados son mayores de 14 años (Ley 21.719).
              </span>
            </label>
            <Button
              onClick={handleCommit}
              disabled={!ageVerified || validCount === 0 || commitMutation.isPending}
              loading={commitMutation.isPending}
            >
              Crear {validCount} usuario{validCount === 1 ? '' : 's'}
            </Button>
            {commitMutation.isError ? (
              <p className="text-sm text-red-700" role="alert">{getFetchErrorMessage(commitMutation.error)}</p>
            ) : null}
          </div>
        </section>
      ) : null}

      {step === 'done' && commitResult ? (
        <section className="panel border-green-200 bg-green-50/80 p-6 space-y-4">
          <h3 className="text-lg font-semibold text-green-900">Importación completada</h3>
          <ul className="text-sm text-green-900 space-y-1">
            <li>{commitResult.created} usuario{commitResult.created === 1 ? '' : 's'} creado{commitResult.created === 1 ? '' : 's'}</li>
            <li>{commitResult.skipped} duplicado{commitResult.skipped === 1 ? '' : 's'} omitido{commitResult.skipped === 1 ? '' : 's'}</li>
            {commitResult.failed > 0 ? (
              <li className="text-red-800">{commitResult.failed} fila{commitResult.failed === 1 ? '' : 's'} con error al crear</li>
            ) : null}
          </ul>
          <div className="flex flex-wrap gap-2">
            <Button onClick={onViewUsers}>Ver usuarios</Button>
            <Button variant="secondary" onClick={resetWizard}>Nueva importación</Button>
          </div>
        </section>
      ) : null}

      <section className="panel p-4">
        <button
          type="button"
          onClick={() => { setHistoryOpen((open) => !open); }}
          className="flex w-full items-center justify-between text-sm font-medium text-foreground"
        >
          Historial de importaciones
          <span className="text-muted">{historyOpen ? '▲' : '▼'}</span>
        </button>
        {historyOpen ? (
          <QueryStateView phase={jobsQuery.isLoading ? 'loading' : jobsQuery.isError ? 'error' : 'ready'} error={jobsQuery.error} onRetry={() => { void jobsQuery.refetch(); }} variant="widget">
            {jobsQuery.data?.data.length === 0 ? (
              <p className="py-4 text-sm text-muted">No hay importaciones previas.</p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted">
                      <th className="pb-2 pr-4">Fecha</th>
                      <th className="pb-2 pr-4">Archivo</th>
                      <th className="pb-2 pr-4">Estado</th>
                      <th className="pb-2">Creados</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobsQuery.data?.data.map((job) => (
                      <tr key={job.id} className="border-t border-border">
                        <td className="py-2 pr-4">{new Date(job.createdAt).toLocaleString('es-CL')}</td>
                        <td className="py-2 pr-4">{job.originalFilename}</td>
                        <td className="py-2 pr-4">{USER_IMPORT_JOB_STATUS_LABELS[job.status] ?? job.status}</td>
                        <td className="py-2 tabular-nums">{job.createdRows}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </QueryStateView>
        ) : null}
      </section>
    </div>
  );
}
