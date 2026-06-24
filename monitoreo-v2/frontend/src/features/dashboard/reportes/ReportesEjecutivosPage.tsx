import { useState, useMemo } from 'react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { PillToggle } from '../../../components/ui/PillToggle';
import { Button } from '../../../components/ui/Button';
import { useBuildingsQuery } from '../../../hooks/queries/useBuildingsQuery';
import { useReportsQuery, useGenerateReport } from '../../../hooks/queries/useReportsQuery';
import type { Report, ReportFormat, PlatformReportType } from '../../../types/report';

/* ── Config options (pure data) ── */

interface SelectOption { key: string; label: string }

const SCOPE_OPTIONS: SelectOption[] = [
  { key: 'portfolio', label: 'Portafolio completo' },
  { key: 'country', label: 'Por país' },
  { key: 'building', label: 'Centro específico' },
];

const PERIOD_OPTIONS: SelectOption[] = [
  { key: 'month', label: 'Mes' },
  { key: 'quarter', label: 'Trimestre' },
  { key: 'year', label: 'Año' },
];

const COMPARISON_OPTIONS: SelectOption[] = [
  { key: 'previous', label: 'vs. período anterior' },
  { key: 'yoy', label: 'vs. mismo período año anterior' },
  { key: 'none', label: 'Sin comparación' },
];

const FORMAT_OPTIONS: SelectOption[] = [
  { key: 'pdf', label: 'PDF' },
  { key: 'excel', label: 'Excel' },
  { key: 'csv', label: 'CSV' },
];

const METRIC_OPTIONS: SelectOption[] = [
  { key: 'consumption', label: 'Consumo' },
  { key: 'billing', label: 'Costo' },
  { key: 'quality', label: 'Intensidad' },
];

const LANGUAGE_OPTIONS: SelectOption[] = [
  { key: 'es', label: 'Español' },
  { key: 'en', label: 'Inglés' },
];

interface SectionDef { key: string; label: string; defaultChecked: boolean }

const REPORT_SECTIONS: SectionDef[] = [
  { key: 'kpis', label: 'KPIs ejecutivos', defaultChecked: true },
  { key: 'trends', label: 'Tendencia de consumo', defaultChecked: true },
  { key: 'ranking', label: 'Ranking de malls', defaultChecked: true },
  { key: 'costs', label: 'Análisis de costos', defaultChecked: true },
  { key: 'quality', label: 'Calidad del dato', defaultChecked: true },
  { key: 'alerts', label: 'Resumen de alarmas', defaultChecked: true },
  { key: 'coverage', label: 'Mapa de cobertura', defaultChecked: false },
];

/* ── Report status badges ── */

const STATUS_STYLE: Record<string, string> = {
  generating: 'bg-amber-100 text-amber-700',
  ready: 'bg-emerald-100 text-emerald-700',
  error: 'bg-red-100 text-red-700',
};

const STATUS_LABEL: Record<string, string> = {
  generating: 'Generando',
  ready: 'Listo',
  error: 'Error',
};

/* ── Period helpers ── */

function periodRange(periodKey: string): { start: string; end: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const RANGES: Record<string, () => { start: string; end: string }> = {
    month: () => ({
      start: new Date(year, month, 1).toISOString().slice(0, 10),
      end: new Date(year, month + 1, 0).toISOString().slice(0, 10),
    }),
    quarter: () => {
      const qStart = Math.floor(month / 3) * 3;
      return {
        start: new Date(year, qStart, 1).toISOString().slice(0, 10),
        end: new Date(year, qStart + 3, 0).toISOString().slice(0, 10),
      };
    },
    year: () => ({
      start: `${year}-01-01`,
      end: `${year}-12-31`,
    }),
  };

  return (RANGES[periodKey] ?? RANGES.month)();
}

/* ── Page ── */

export function ReportesEjecutivosPage() {
  const [scope, setScope] = useState('portfolio');
  const [period, setPeriod] = useState('month');
  const [comparison, setComparison] = useState('previous');
  const [format, setFormat] = useState<string>('pdf');
  const [metric, setMetric] = useState('consumption');
  const [language, setLanguage] = useState('es');
  const [sections, setSections] = useState<Set<string>>(
    () => new Set(REPORT_SECTIONS.filter((s) => s.defaultChecked).map((s) => s.key)),
  );

  const buildingsQuery = useBuildingsQuery();
  const reportsQuery = useReportsQuery();
  const generateReport = useGenerateReport();

  const reports = reportsQuery.data ?? [];

  // Sorted history (newest first)
  const sortedReports = useMemo(
    () => [...reports].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [reports],
  );

  const toggleSection = (key: string) => {
    setSections((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const handleGenerate = () => {
    const range = periodRange(period);
    generateReport.mutate({
      reportType: metric as PlatformReportType,
      format: format as ReportFormat,
      periodStart: range.start,
      periodEnd: range.end,
    });
  };

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden">
      <PageHeader
        title="Reportes Ejecutivos"
        eyebrow="Reportes"
        actions={
          <button
            type="button"
            onClick={() => { /* scroll to history */ }}
            className="text-[12px] text-brand hover:underline"
          >
            Revisar historial
          </button>
        }
      />

      <div className="flex min-h-0 flex-1 gap-4 overflow-hidden">
        {/* Left: Configurator */}
        <div className="flex w-80 shrink-0 flex-col gap-3 overflow-y-auto">
          <ConfigSection title="Alcance geográfico">
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

          <ConfigSection title="Comparación">
            <PillToggle
              options={COMPARISON_OPTIONS.map((o) => ({ key: o.key, label: o.label }))}
              value={comparison}
              onChange={setComparison}
              size="sm"
            />
          </ConfigSection>

          <ConfigSection title="Secciones a incluir">
            <div className="space-y-1.5">
              {REPORT_SECTIONS.map((s) => (
                <label key={s.key} className="flex items-center gap-2 text-[12px] text-foreground">
                  <input
                    type="checkbox"
                    checked={sections.has(s.key)}
                    onChange={() => toggleSection(s.key)}
                    className="rounded border-border"
                  />
                  {s.label}
                </label>
              ))}
            </div>
          </ConfigSection>

          <ConfigSection title="Métrica principal">
            <PillToggle
              options={METRIC_OPTIONS.map((o) => ({ key: o.key, label: o.label }))}
              value={metric}
              onChange={setMetric}
              size="sm"
            />
          </ConfigSection>

          <ConfigSection title="Formato de salida">
            <PillToggle
              options={FORMAT_OPTIONS.map((o) => ({ key: o.key, label: o.label }))}
              value={format}
              onChange={setFormat}
              size="sm"
            />
          </ConfigSection>

          <ConfigSection title="Idioma">
            <PillToggle
              options={LANGUAGE_OPTIONS.map((o) => ({ key: o.key, label: o.label }))}
              value={language}
              onChange={setLanguage}
              size="sm"
            />
          </ConfigSection>

          <Button
            onClick={handleGenerate}
            loading={generateReport.isPending}
            className="mt-2 w-full"
          >
            Generar reporte
          </Button>
        </div>

        {/* Right: Preview + History */}
        <div className="flex min-w-0 flex-1 flex-col gap-4 overflow-hidden">
          {/* Preview */}
          <div className="panel flex shrink-0 flex-col p-4">
            <h3 className="mb-3 text-[13px] font-medium text-foreground">Vista previa</h3>
            <div className="grid grid-cols-3 gap-3">
              {REPORT_SECTIONS.filter((s) => sections.has(s.key)).map((s) => (
                <div
                  key={s.key}
                  className="flex aspect-[3/4] items-center justify-center rounded-lg border border-border bg-surface/50 text-center text-[11px] text-muted"
                >
                  {s.label}
                </div>
              ))}
            </div>
            {sections.size === 0 && (
              <p className="py-6 text-center text-[12px] text-muted">
                Selecciona al menos una sección.
              </p>
            )}
          </div>

          {/* History */}
          <div className="panel flex min-h-0 flex-1 flex-col overflow-hidden">
            <h3 className="shrink-0 px-4 py-3 text-[13px] font-medium text-foreground">
              Historial de reportes generados
            </h3>
            <div className="min-h-0 flex-1 overflow-auto">
              <table className="w-full text-[13px]">
                <thead className="sticky top-0 z-10 bg-background">
                  <tr className="border-b border-border text-left text-[11px] font-medium uppercase tracking-wider text-muted">
                    <th className="px-4 py-2">Fecha</th>
                    <th className="px-3 py-2">Tipo</th>
                    <th className="px-3 py-2">Período</th>
                    <th className="px-3 py-2">Formato</th>
                    <th className="px-3 py-2 text-center">Estado</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sortedReports.map((report) => (
                    <ReportRow key={report.id} report={report} />
                  ))}
                  {sortedReports.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-muted">
                        No hay reportes generados aún.
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

/* ── Report row ── */

function ReportRow({ report }: Readonly<{ report: Report }>) {
  const status = report.fileUrl ? 'ready' : 'generating';
  const badgeClass = STATUS_STYLE[status] ?? '';
  const badgeLabel = STATUS_LABEL[status] ?? status;

  return (
    <tr className="transition-colors hover:bg-surface">
      <td className="px-4 py-2 text-foreground">
        {new Date(report.createdAt).toLocaleDateString('es-CL')}
      </td>
      <td className="px-3 py-2 capitalize text-foreground">{report.reportType}</td>
      <td className="px-3 py-2 text-muted">
        {report.periodStart.slice(0, 7)} — {report.periodEnd.slice(0, 7)}
      </td>
      <td className="px-3 py-2 uppercase text-muted">{report.format}</td>
      <td className="px-3 py-2 text-center">
        <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${badgeClass}`}>
          {badgeLabel}
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
}
