import { useState, useMemo } from 'react';
import { PageHeader } from '../../../components/ui/PageHeader';
// ponytail: PillToggle replaced with native selects per wireframe
import { Button } from '../../../components/ui/Button';
import { useReportsQuery, useGenerateReport } from '../../../hooks/queries/useReportsQuery';
import { useBuildingsQuery } from '../../../hooks/queries/useBuildingsQuery';
import type { ReportFormat, PlatformReportType } from '../../../types/report';

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
  { key: 'ppt', label: 'PPT' },
  { key: 'excel', label: 'Excel' },
  { key: 'csv', label: 'CSV' },
];

const METRIC_OPTIONS: SelectOption[] = [
  { key: 'consumption', label: 'Consumo' },
  { key: 'billing', label: 'Costo' },
  { key: 'quality', label: 'Intensidad' },
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
  const [sections, setSections] = useState<Set<string>>(
    () => new Set(REPORT_SECTIONS.filter((s) => s.defaultChecked).map((s) => s.key)),
  );
  const [historySearch] = useState('');
  const [selectedBuildingId, setSelectedBuildingId] = useState('');

  const buildingsQuery = useBuildingsQuery();
  const buildings = buildingsQuery.data ?? [];
  const reportsQuery = useReportsQuery();
  const generateReport = useGenerateReport();

  const reports = reportsQuery.data ?? [];

  // Sorted + filtered history (newest first)
  const sortedReports = useMemo(() => {
    const sorted = [...reports].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (!historySearch) return sorted;
    const q = historySearch.toLowerCase();
    return sorted.filter((r) =>
      r.reportType.toLowerCase().includes(q)
      || r.periodStart.includes(q)
      || r.createdAt.includes(q),
    );
  }, [reports, historySearch]);

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
    <div className="flex h-full flex-col gap-2 overflow-hidden">
      <PageHeader
        title="3.4 Reportes Ejecutivos"
        description="Configurador de reportes con vista previa, generación e historial de archivos"
      />

      <div className="relative min-h-0 flex-1">
        <div className="absolute inset-0 flex gap-3">
        {/* Left column: Configurator + Sections */}
        <div className="flex min-w-0 flex-1 flex-col gap-3 overflow-y-auto">
          {/* Configurador de reporte */}
          <div className="panel px-3 py-2.5">
            <p className="text-[12px] font-medium uppercase tracking-wider text-muted">Configurador de reporte</p>
            <p className="text-[11px] text-muted">los filtros determinan el contenido a generar</p>
            <div className="mt-3 space-y-3">
              <ConfigField label="Alcance geográfico (Portafolio / País / Mall)">
                <select value={scope} onChange={(e) => setScope(e.target.value)} className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-[11px] text-foreground outline-none">
                  {SCOPE_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
                </select>
                {scope === 'building' && (
                  <select value={selectedBuildingId} onChange={(e) => setSelectedBuildingId(e.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-[11px] text-foreground outline-none">
                    <option value="">Seleccionar centro...</option>
                    {buildings.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                )}
              </ConfigField>
              <ConfigField label="Período (Mes / Trimestre / Año / Rango)">
                <select value={period} onChange={(e) => setPeriod(e.target.value)} className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-[11px] text-foreground outline-none">
                  {PERIOD_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
                </select>
              </ConfigField>
              <ConfigField label="Comparación (vs. anterior / año anterior / sin)">
                <select value={comparison} onChange={(e) => setComparison(e.target.value)} className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-[11px] text-foreground outline-none">
                  {COMPARISON_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
                </select>
              </ConfigField>
              <ConfigField label="Métrica principal (Consumo / Costo / Intensidad)">
                <select value={metric} onChange={(e) => setMetric(e.target.value)} className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-[11px] text-foreground outline-none">
                  {METRIC_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
                </select>
              </ConfigField>
              <ConfigField label="Formato de salida (PDF / PPT / Excel)">
                <select value={format} onChange={(e) => setFormat(e.target.value)} className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-[11px] text-foreground outline-none">
                  {FORMAT_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
                </select>
              </ConfigField>
            </div>
            <p className="mt-2 text-right text-[11px] text-muted">[FIN-07, DAT-28]</p>
          </div>

          {/* Secciones a incluir */}
          <div className="panel px-3 py-2.5">
            <p className="text-[12px] font-medium uppercase tracking-wider text-muted">Secciones a incluir (checkboxes)</p>
            <p className="text-[11px] text-muted">todas activadas por defecto</p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
              {REPORT_SECTIONS.map((s) => (
                <label key={s.key} className="flex items-center gap-1.5 text-[11px] text-foreground">
                  <input type="checkbox" checked={sections.has(s.key)} onChange={() => toggleSection(s.key)} className="rounded border-border" />
                  {s.label}
                </label>
              ))}
            </div>
            <p className="mt-2 text-right text-[11px] text-muted">[FIN-07, DAT-28]</p>
          </div>
        </div>

        {/* Right column: Preview + Buttons + History */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
          {/* Vista previa del reporte */}
          <div className="panel shrink-0 px-3 py-2.5">
            <p className="text-[12px] font-medium uppercase tracking-wider text-muted">Vista previa del reporte</p>
            <p className="text-[11px] text-muted">miniatura de portada e índice</p>
            <div className="mt-2 text-[11px] text-muted">
              <p>• Portada + logo</p>
              <p>• Índice de secciones seleccionadas:</p>
              <ul className="ml-3 mt-1 space-y-0.5">
                {REPORT_SECTIONS.filter((s) => sections.has(s.key)).map((s) => (
                  <li key={s.key} className="text-foreground">— {s.label}</li>
                ))}
              </ul>
              {sections.size === 0 && <p className="mt-1 text-subtle">Seleccione al menos una sección</p>}
            </div>
            <p className="mt-2 text-right text-[11px] text-muted">[FIN-07]</p>
          </div>

          {/* Action buttons */}
          <div className="flex shrink-0 gap-2">
            <Button onClick={handleGenerate} loading={generateReport.isPending} className="flex-1">
              Generar reporte
            </Button>
            <button type="button" className="flex-1 rounded-lg border border-border px-3 py-2 text-[11px] font-medium text-foreground transition-colors hover:bg-surface">
              Programar envío
            </button>
          </div>

          {/* Historial de reportes */}
          <div className="panel flex min-h-0 flex-1 flex-col overflow-hidden px-3 py-2.5">
            <p className="shrink-0 text-[12px] font-medium uppercase tracking-wider text-muted">Historial de reportes</p>
            <p className="shrink-0 text-[11px] text-muted">retención de archivos ≥ 12 meses</p>
            <div className="mt-2 flex min-h-0 flex-1 flex-col overflow-hidden text-[11px]">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border text-left text-[12px] font-medium uppercase tracking-wider text-muted">
                    <th className="px-2 py-1.5">Fecha</th>
                    <th className="px-2 py-1.5">Usuario</th>
                    <th className="px-2 py-1.5">Alcance</th>
                    <th className="px-2 py-1.5">Formato</th>
                    <th className="px-2 py-1.5 text-center">Estado</th>
                  </tr>
                </thead>
              </table>
              <div className="min-h-0 flex-1 overflow-y-auto">
                <table className="w-full">
                  <tbody className="divide-y divide-border">
                    {sortedReports.map((report, i) => (
                      <tr key={report.id} className="animate-fade-in transition-colors hover:bg-surface" style={{ animationDelay: `${i * 30}ms` }}>
                        <td className="px-2 py-1.5 text-foreground">{new Date(report.createdAt).toLocaleDateString('es-CL')}</td>
                        <td className="px-2 py-1.5 text-muted">{(report as unknown as Record<string, unknown>).userEmail as string ?? '—'}</td>
                        <td className="px-2 py-1.5 text-muted">{(report as unknown as Record<string, unknown>).scope as string ?? 'Portafolio'}</td>
                        <td className="px-2 py-1.5 uppercase text-muted">{report.format}</td>
                        <td className="px-2 py-1.5 text-center">
                          <span className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-medium ${STATUS_STYLE[report.fileUrl ? 'ready' : 'generating'] ?? ''}`}>
                            {STATUS_LABEL[report.fileUrl ? 'ready' : 'generating'] ?? '—'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {sortedReports.length === 0 && (
                      <tr><td colSpan={5} className="px-2 py-6 text-center text-muted">No hay reportes generados aún.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <p className="mt-1 shrink-0 text-right text-[11px] text-muted">[DAT-12, DAT-08]</p>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}

function ConfigField({ label, children }: Readonly<{ label: string; children: React.ReactNode }>) {
  return (
    <div>
      <p className="mb-1 text-[10px] text-muted">{label}</p>
      {children}
    </div>
  );
}

