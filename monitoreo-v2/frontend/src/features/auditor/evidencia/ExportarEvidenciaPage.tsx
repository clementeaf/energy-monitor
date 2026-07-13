import { useState, useMemo } from 'react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { DropdownSelect } from '../../../components/ui/DropdownSelect';
import { Button } from '../../../components/ui/Button';
import { useBuildingsQuery } from '../../../hooks/queries/useBuildingsQuery';
import { useReportsQuery, useGenerateReport } from '../../../hooks/queries/useReportsQuery';
import type { ReportFormat } from '../../../types/report';

/* ── Content types ── */

interface ContentDef { key: string; label: string; defaultChecked: boolean }

const CONTENT_TYPES: ContentDef[] = [
  { key: 'consumption', label: 'Datos de consumo', defaultChecked: true },
  { key: 'reconciliation', label: 'Cuadratura', defaultChecked: true },
  { key: 'audit', label: 'Pista de auditoría', defaultChecked: true },
  { key: 'quality', label: 'Scorecard de calidad', defaultChecked: false },
  { key: 'lineage', label: 'Linaje de lecturas', defaultChecked: false },
];

/* ── Helpers ── */

function computePeriodRange(months: number): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to);
  from.setMonth(from.getMonth() - months);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

/* ── Page ── */

export function ExportarEvidenciaPage() {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(CONTENT_TYPES.filter((c) => c.defaultChecked).map((c) => c.key)),
  );
  const [mallFilter, setMallFilter] = useState('all');
  const [periodMonths, setPeriodMonths] = useState('1');

  const periodRange = useMemo(() => computePeriodRange(Number(periodMonths)), [periodMonths]);

  const buildingsQuery = useBuildingsQuery();
  const reportsQuery = useReportsQuery({ reportType: 'evidence' });
  const generateReport = useGenerateReport();

  const buildings = buildingsQuery.data ?? [];

  // History from reports backend
  const history = useMemo(
    () => [...(reportsQuery.data ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 20),
    [reportsQuery.data],
  );

  const toggleContent = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const handleGenerate = () => {
    const buildingId = mallFilter === 'all' ? undefined : mallFilter;
    generateReport.mutate({
      reportType: 'evidence',
      format: 'csv' as ReportFormat,
      periodStart: periodRange.from,
      periodEnd: periodRange.to,
      buildingId,
    });
  };

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto">
      <PageHeader title="Exportar Evidencia" eyebrow="Auditoría" />

      <div className="flex gap-4">
        {/* Configurator */}
        <div className="panel w-80 shrink-0 space-y-4 p-4">
          <div>
            <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted">Contenido a incluir</h3>
            <div className="space-y-1.5">
              {CONTENT_TYPES.map((ct) => (
                <label key={ct.key} className="flex items-center gap-2 text-[12px] text-foreground">
                  <input
                    type="checkbox"
                    checked={selected.has(ct.key)}
                    onChange={() => toggleContent(ct.key)}
                    className="rounded border-border"
                  />
                  {ct.label}
                </label>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted">Mall</h3>
            <DropdownSelect
              className="w-full"
              options={[{ value: 'all', label: 'Todos' }, ...buildings.map((b) => ({ value: b.id, label: b.name }))]}
              value={mallFilter}
              onChange={setMallFilter}
            />
          </div>

          <div>
            <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted">Período</h3>
            <DropdownSelect
              className="w-full"
              options={[
                { value: '1', label: 'Último mes' },
                { value: '3', label: 'Último trimestre' },
                { value: '12', label: 'Último año' },
              ]}
              value={periodMonths}
              onChange={setPeriodMonths}
            />
          </div>

          <p className="text-[10px] text-muted">
            El paquete incluye sello de tiempo, hash SHA-256 y firma de la plataforma.
            Formato: PDF (ejecutivo) + CSV (datos) en ZIP firmado.
            Verificación integridad con herramienta pública.
          </p>

          <Button
            disabled={selected.size === 0}
            loading={generateReport.isPending}
            className="w-full"
            onClick={handleGenerate}
          >
            Generar paquete de evidencia
          </Button>
        </div>

        {/* History */}
        <div className="panel min-w-0 flex-1 p-4">
          <h3 className="mb-3 text-[13px] font-medium text-foreground">Historial de evidencias ({history.length})</h3>
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border text-left text-[11px] font-medium uppercase tracking-wider text-muted">
                <th className="px-3 py-2">Fecha</th>
                <th className="px-3 py-2">Formato</th>
                <th className="px-3 py-2">Período</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2">Descarga</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {history.map((report) => (
                <tr key={report.id} className="transition-colors hover:bg-surface">
                  <td className="px-3 py-2 text-muted">{new Date(report.createdAt).toLocaleDateString('es-CL')}</td>
                  <td className="px-3 py-2 text-[11px] uppercase text-muted">{report.format}</td>
                  <td className="px-3 py-2 text-muted">{report.periodStart} — {report.periodEnd}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${report.fileUrl ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {report.fileUrl ? 'Listo' : 'Generando'}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {report.fileUrl ? (
                      (() => {
                        const createdMs = new Date(report.createdAt).getTime();
                        const expiresMs = createdMs + 90 * 86_400_000;
                        const daysLeft = Math.max(0, Math.ceil((expiresMs - Date.now()) / 86_400_000));
                        return daysLeft > 0
                          ? <a href={report.fileUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-brand hover:underline">Descargar ({daysLeft}d)</a>
                          : <span className="text-[10px] text-red-500">Expirado</span>;
                      })()
                    ) : <span className="text-[10px] text-muted">—</span>}
                  </td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr><td colSpan={5} className="px-3 py-8 text-center text-muted">Sin evidencias exportadas.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
