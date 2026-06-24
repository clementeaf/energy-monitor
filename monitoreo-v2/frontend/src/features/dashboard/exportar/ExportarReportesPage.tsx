import { useState, useMemo } from 'react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { PillToggle } from '../../../components/ui/PillToggle';
import { Button } from '../../../components/ui/Button';
import { useReportsQuery, useGenerateReport } from '../../../hooks/queries/useReportsQuery';
import type { Report, ReportFormat } from '../../../types/report';

/* ── Config options (pure data) ── */

interface SelectOption { key: string; label: string }

interface ContentType { key: string; label: string; estimatedRows: number; estimatedSizeKb: number }

const CONTENT_TYPES: ContentType[] = [
  { key: 'consumption', label: 'Consumos agregados por mall', estimatedRows: 50, estimatedSizeKb: 120 },
  { key: 'billing', label: 'Costos y facturación', estimatedRows: 30, estimatedSizeKb: 80 },
  { key: 'quality', label: 'Calidad del dato', estimatedRows: 40, estimatedSizeKb: 95 },
  { key: 'coverage', label: 'Cobertura de medición', estimatedRows: 25, estimatedSizeKb: 60 },
  { key: 'alerts_compliance', label: 'Resumen de alarmas del período', estimatedRows: 100, estimatedSizeKb: 200 },
];

const SCOPE_OPTIONS: SelectOption[] = [
  { key: 'portfolio', label: 'Portafolio' },
  { key: 'country', label: 'País' },
  { key: 'building', label: 'Centro específico' },
];

const PERIOD_OPTIONS: SelectOption[] = [
  { key: 'month', label: 'Mes actual' },
  { key: 'quarter', label: 'Trimestre' },
  { key: 'year', label: 'Año' },
  { key: '12m', label: 'Últimos 12m' },
];

const GRANULARITY_OPTIONS: SelectOption[] = [
  { key: 'monthly', label: 'Mensual' },
  { key: 'weekly', label: 'Semanal' },
];

const FORMAT_OPTIONS: SelectOption[] = [
  { key: 'pdf', label: 'PDF ejecutivo' },
  { key: 'excel', label: 'Excel' },
  { key: 'csv', label: 'CSV' },
];

const CURRENCY_OPTIONS: SelectOption[] = [
  { key: 'CLP', label: 'CLP' },
  { key: 'UF', label: 'UF' },
  { key: 'USD', label: 'USD' },
];

/* ── Queue status styling ── */

const QUEUE_STATUS: Record<string, { label: string; style: string }> = {
  queued: { label: 'En cola', style: 'bg-gray-100 text-gray-700' },
  generating: { label: 'Generando', style: 'bg-amber-100 text-amber-700' },
  ready: { label: 'Listo', style: 'bg-emerald-100 text-emerald-700' },
  error: { label: 'Error', style: 'bg-red-100 text-red-700' },
};

/* ── Page ── */

export function ExportarReportesPage() {
  const [selectedContent, setSelectedContent] = useState<Set<string>>(
    () => new Set(['consumption']),
  );
  const [scope, setScope] = useState('portfolio');
  const [period, setPeriod] = useState('month');
  const [granularity, setGranularity] = useState('monthly');
  const [format, setFormat] = useState('excel');
  const [currency, setCurrency] = useState('CLP');

  const reportsQuery = useReportsQuery();
  const generateReport = useGenerateReport();

  const reports = reportsQuery.data ?? [];

  // Queue (recent exports, newest first)
  const queue = useMemo(
    () => [...reports].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 10),
    [reports],
  );

  // Preview summary
  const selectedTypes = CONTENT_TYPES.filter((t) => selectedContent.has(t.key));
  const totalRows = selectedTypes.reduce((sum, t) => sum + t.estimatedRows, 0);
  const totalSizeKb = selectedTypes.reduce((sum, t) => sum + t.estimatedSizeKb, 0);

  const toggleContent = (key: string) => {
    setSelectedContent((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const handleExport = () => {
    const now = new Date();
    const periodStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const periodEnd = now.toISOString().slice(0, 10);
    selectedTypes.forEach((ct) => {
      generateReport.mutate({
        reportType: ct.key as Report['reportType'],
        format: format as ReportFormat,
        periodStart,
        periodEnd,
      });
    });
  };

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden">
      <PageHeader
        title="Exportar Reportes"
        eyebrow="Exportar"
      />

      <div className="flex min-h-0 flex-1 gap-4 overflow-hidden">
        {/* Left: Configurator */}
        <div className="flex w-80 shrink-0 flex-col gap-3 overflow-y-auto">
          <ConfigSection title="Tipo de contenido">
            <div className="space-y-1.5">
              {CONTENT_TYPES.map((ct) => (
                <label key={ct.key} className="flex items-center gap-2 text-[12px] text-foreground">
                  <input
                    type="checkbox"
                    checked={selectedContent.has(ct.key)}
                    onChange={() => toggleContent(ct.key)}
                    className="rounded border-border"
                  />
                  {ct.label}
                </label>
              ))}
            </div>
          </ConfigSection>

          <ConfigSection title="Alcance">
            <PillToggle
              options={SCOPE_OPTIONS.map((o) => ({ key: o.key, label: o.label }))}
              value={scope}
              onChange={setScope}
              size="sm"
            />
          </ConfigSection>

          <ConfigSection title="Período">
            <PillToggle
              options={PERIOD_OPTIONS.map((o) => ({ key: o.key, label: o.label }))}
              value={period}
              onChange={setPeriod}
              size="sm"
            />
          </ConfigSection>

          <ConfigSection title="Granularidad">
            <PillToggle
              options={GRANULARITY_OPTIONS.map((o) => ({ key: o.key, label: o.label }))}
              value={granularity}
              onChange={setGranularity}
              size="sm"
            />
          </ConfigSection>

          <ConfigSection title="Formato">
            <PillToggle
              options={FORMAT_OPTIONS.map((o) => ({ key: o.key, label: o.label }))}
              value={format}
              onChange={setFormat}
              size="sm"
            />
          </ConfigSection>

          <ConfigSection title="Moneda">
            <PillToggle
              options={CURRENCY_OPTIONS.map((o) => ({ key: o.key, label: o.label }))}
              value={currency}
              onChange={setCurrency}
              size="sm"
            />
          </ConfigSection>

          <Button
            onClick={handleExport}
            loading={generateReport.isPending}
            disabled={selectedContent.size === 0}
            className="mt-2 w-full"
          >
            Exportar datos
          </Button>

          <p className="text-[10px] text-muted">
            Solo datos agregados por mall y período. Datos crudos y trazabilidad individual
            requieren perfil auditor.
          </p>
        </div>

        {/* Right: Preview + Queue */}
        <div className="flex min-w-0 flex-1 flex-col gap-4 overflow-hidden">
          {/* Preview */}
          <div className="panel shrink-0 p-4">
            <h3 className="mb-3 text-[13px] font-medium text-foreground">Vista previa del contenido</h3>
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-border text-left text-[10px] font-medium uppercase tracking-wider text-muted">
                  <th className="pb-2">Tipo</th>
                  <th className="pb-2 text-right">Filas estimadas</th>
                  <th className="pb-2 text-right">Tamaño aprox.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {selectedTypes.map((ct) => (
                  <tr key={ct.key}>
                    <td className="py-1.5 text-foreground">{ct.label}</td>
                    <td className="py-1.5 text-right text-muted">{ct.estimatedRows}</td>
                    <td className="py-1.5 text-right text-muted">{ct.estimatedSizeKb} KB</td>
                  </tr>
                ))}
                {selectedTypes.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-4 text-center text-muted">
                      Selecciona al menos un tipo de contenido.
                    </td>
                  </tr>
                )}
              </tbody>
              {selectedTypes.length > 0 && (
                <tfoot className="border-t border-border">
                  <tr className="font-medium text-foreground">
                    <td className="pt-2">Total</td>
                    <td className="pt-2 text-right">{totalRows}</td>
                    <td className="pt-2 text-right">{totalSizeKb} KB</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Queue */}
          <div className="panel flex min-h-0 flex-1 flex-col overflow-hidden">
            <h3 className="shrink-0 px-4 py-3 text-[13px] font-medium text-foreground">
              Cola de exportaciones
            </h3>
            <div className="min-h-0 flex-1 overflow-auto">
              <table className="w-full text-[13px]">
                <thead className="sticky top-0 z-10 bg-background">
                  <tr className="border-b border-border text-left text-[11px] font-medium uppercase tracking-wider text-muted">
                    <th className="px-4 py-2">Fecha</th>
                    <th className="px-3 py-2">Tipo</th>
                    <th className="px-3 py-2">Formato</th>
                    <th className="px-3 py-2 text-center">Estado</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {queue.map((report) => {
                    const status = report.fileUrl ? 'ready' : 'generating';
                    const statusDef = QUEUE_STATUS[status] ?? QUEUE_STATUS.generating;
                    return (
                      <tr key={report.id} className="transition-colors hover:bg-surface">
                        <td className="px-4 py-2 text-foreground">
                          {new Date(report.createdAt).toLocaleDateString('es-CL')}
                        </td>
                        <td className="px-3 py-2 capitalize text-foreground">{report.reportType}</td>
                        <td className="px-3 py-2 uppercase text-muted">{report.format}</td>
                        <td className="px-3 py-2 text-center">
                          <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${statusDef.style}`}>
                            {statusDef.label}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          {report.fileUrl && (
                            <a
                              href={report.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] text-brand hover:underline"
                            >
                              Descargar
                            </a>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {queue.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted">
                        No hay exportaciones recientes.
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

/* ── Config section wrapper ── */

function ConfigSection({ title, children }: Readonly<{ title: string; children: React.ReactNode }>) {
  return (
    <div className="panel px-3 py-2.5">
      <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted">{title}</p>
      {children}
    </div>
  );
}
